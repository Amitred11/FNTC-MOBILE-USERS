// screens/MySubscriptionScreen.js (Cleaned)

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSubscription, useTheme, useAlert, useMessage } from '../../contexts';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNowStrict } from 'date-fns';
import * as Animatable from 'react-native-animatable';

// --- Helpers & Constants ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// --- Sub-Components (Memoized for Performance) ---

const FeatureItem = React.memo(({ text }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.featureItem}>
      <Ionicons name="checkmark-circle-outline" size={20} color={theme.success} style={styles.featureIcon} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
});

const CancellationInfoCard = React.memo(({ plan, effectiveDate, onReactivate }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const timeRemaining = useMemo(() => formatDistanceToNowStrict(new Date(effectiveDate), { addSuffix: true }), [effectiveDate]);

  return (
    <Animatable.View animation="fadeIn" duration={500} style={styles.cancellationCard}>
      <View style={styles.cancellationHeader}>
        <Ionicons name="warning" size={24} color={theme.warning} />
        <Text style={styles.cancellationTitle}>Subscription Ending Soon</Text>
      </View>
      <Text style={styles.cancellationPlanName}>{plan.name}</Text>
      <Text style={styles.cancellationText}>
        Your plan is scheduled to be cancelled{' '}
        <Text style={{ fontWeight: 'bold' }}>{timeRemaining}</Text>. You will lose access on{' '}
        {formatDate(effectiveDate)}. If you want a refund, please create a support ticket.
      </Text>
      <TouchableOpacity style={styles.keepPlanBigButton} onPress={onReactivate}>
        <Ionicons name="heart-outline" size={20} color={theme.textOnPrimary} />
        <Text style={styles.keepPlanButtonText}>Keep My Plan</Text>
      </TouchableOpacity>
    </Animatable.View>
  );
});

const InfoNotice = React.memo(({ icon, color, title, onAction, actionText, children }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <Animatable.View animation="fadeInDown" duration={600} style={[styles.noticeCard, { borderLeftColor: color, backgroundColor: `${color}1A` }]}>
      <Ionicons name={icon} size={24} color={color} style={styles.noticeIcon} />
      <View style={styles.noticeTextContainer}>
        <Text style={[styles.noticeTitle, { color }]}>{title}</Text>
        <Text style={styles.noticeBody}>{children}</Text>
      </View>
      {onAction && actionText && (
        <TouchableOpacity onPress={onAction} style={styles.reactivateButton}>
          <Text style={styles.reactivateButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </Animatable.View>
  );
});

// --- Main Screen Component ---
export default function MySubscriptionScreen() {
  const {
    activePlan,
    scheduledPlanChange,
    startDate,
    renewalDate,
    cancellationEffectiveDate,
    cancelScheduledChange, 
    paymentHistory,
    isLoading,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
  } = useSubscription();
  // --- FIX END ---

  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { showAlert } = useAlert();
  const { showMessage } = useMessage();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshSubscription(false); 
    }, [refreshSubscription])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSubscription(true);
    setRefreshing(false);
  }, [refreshSubscription]);
  
  const handleActionWithConfirmation = useCallback((config) => {
    showAlert(config.title, config.message, [
        { text: config.cancelText || 'Go Back', style: 'cancel' },
        { text: config.confirmText, style: config.confirmStyle || 'default', onPress: config.onConfirm }
    ]);
  }, [showAlert]);
  
  const handleCancelPlanChange = useCallback(() => {
    handleActionWithConfirmation({
        title: 'Cancel Plan Change',
        message: 'Are you sure you want to withdraw your request to change plans? Your current plan will remain active.',
        confirmText: 'Yes, Cancel Change',
        confirmStyle: 'destructive',
        onConfirm: async () => {
            try { 
                await cancelScheduledChange(); 
                showMessage('Request Cancelled Successfully'); 
            } 
            catch (e) { 
                showAlert('Action Failed', e.response?.data?.message || 'Could not cancel the request.');
            }
        }
    });
  }, [handleActionWithConfirmation, cancelScheduledChange, showMessage, showAlert]);

  const handleReactivate = useCallback(() => {
    handleActionWithConfirmation({
        title: 'Keep Subscription',
        message: 'Are you sure you want to keep your plan? This will cancel your pending cancellation.',
        confirmText: 'Yes, Keep Plan',
        onConfirm: async () => {
            try { await reactivateSubscription(); showMessage('Subscription Reactivated'); }
            catch (e) { showAlert('Error', 'Could not reactivate.'); }
        }
    });
  }, [handleActionWithConfirmation, reactivateSubscription, showMessage, showAlert]);

  const handleCancel = useCallback(() => {
    handleActionWithConfirmation({
        title: 'Cancel Subscription',
        message: 'Your plan will be cancelled at the end of your current billing period. You will retain access until then. Are you sure?',
        cancelText: 'Keep Plan',
        confirmText: 'Yes, Cancel',
        confirmStyle: 'destructive',
        onConfirm: async () => {
            try { await cancelSubscription(); navigation.navigate('Support'); }
            catch (e) { showAlert('Error', 'Could not schedule cancellation.'); }
        }
    });
  }, [handleActionWithConfirmation, cancelSubscription, navigation, showAlert]);

  const handleChangePlan = useCallback(() => {
    handleActionWithConfirmation({
        title: "Change Subscription Plan",
        message: "You will be taken to the plan selection screen to choose a new plan.",
        confirmText: "Proceed",
        onConfirm: () => navigation.navigate('Subscription', { isChangingPlan: true })
    });
  }, [handleActionWithConfirmation, navigation]);


  const { percentage, statusText } = useMemo(() => {
    if (!startDate || !renewalDate) return { percentage: 0, statusText: 'N/A' };

    const today = new Date();
    const start = new Date(startDate);
    const renewal = new Date(renewalDate);

    const totalDuration = renewal.getTime() - start.getTime();
    const elapsedDuration = today.getTime() - start.getTime();
    let calculatedPercentage = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 100;
    calculatedPercentage = Math.max(0, Math.min(100, Math.round(calculatedPercentage)));


    const overdueBill = paymentHistory.find(b => b.type === 'bill' && b.status === 'Overdue');
    if (overdueBill) {
        return { percentage: 100, statusText: 'Overdue' };
    }
    
    const pendingBill = paymentHistory.find(b => b.type === 'bill' && b.status === 'Pending Verification');
    if (pendingBill) {
        return { percentage: calculatedPercentage, statusText: 'Verifying' };
    }

    const dueBill = paymentHistory.find(b => b.type === 'bill' && b.status === 'Due');
    if (dueBill) {
        const dueDate = new Date(dueBill.dueDate);
        const daysLeft = Math.max(0, Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)));
        const text = daysLeft > 0 ? `${daysLeft}d to Pay` : 'Due Today';
        return { percentage: calculatedPercentage, statusText: text };
    }
    
    return { percentage: calculatedPercentage, statusText: 'All Paid' };

  }, [startDate, renewalDate, paymentHistory]);
  
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!activePlan) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyStateContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
            <Ionicons name="alert-circle-outline" size={60} color={theme.textSecondary} />
            <Text style={styles.fallbackText}>No active subscription found.</Text>
            <Text style={styles.fallbackSubText}>Pull down to refresh.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />} showsVerticalScrollIndicator={false}>
        {scheduledPlanChange?.plan && !cancellationEffectiveDate && (
          <InfoNotice icon="information-circle-outline" color={theme.primary} title="Plan Change Scheduled" actionText="Cancel Change" onAction={handleCancelPlanChange}>
            Your plan will switch to <Text style={{ fontWeight: 'bold' }}>{scheduledPlanChange.plan.name}</Text> on {formatDate(scheduledPlanChange.effectiveDate)}.
          </InfoNotice>
        )}

        {cancellationEffectiveDate ? (
          <CancellationInfoCard plan={activePlan} effectiveDate={cancellationEffectiveDate} onReactivate={handleReactivate} />
        ) : (
          <View style={styles.planCard}>
            <Text style={styles.planCardLabel}>CURRENT PLAN</Text>
            <Text style={styles.planName}>{activePlan.name}</Text>
            <Text style={styles.planPrice}>{activePlan.priceLabel}</Text>
          </View>
        )}

        <View style={styles.usageCard}>
          <Text style={styles.sectionTitle}>Billing Cycle</Text>
          <View style={styles.chartContainer}>
            <AnimatedCircularProgress size={160} width={16} fill={percentage} tintColor={theme.primary} backgroundColor={theme.border} rotation={0} lineCap="round" padding={10}>
              {() => (
                <View style={styles.chartTextContainer}>
                  <Text style={styles.daysLeft}>{statusText}</Text>
                  <Text style={styles.daysLeftLabel}>Payment Status</Text>
                </View>
              )}
            </AnimatedCircularProgress>
          </View>
          <View style={styles.dateInfoContainer}>
            <View style={styles.dateInfo}><Text style={styles.dateLabel}>Start Date</Text><Text style={styles.dateValue}>{formatDate(startDate)}</Text></View>
            <View style={styles.dateInfo}><Text style={styles.dateLabel}>Next Renewal</Text><Text style={styles.dateValue}>{formatDate(renewalDate)}</Text></View>
          </View>   
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>Plan Inclusions</Text>
          <View style={styles.featuresList}>
            {activePlan.features?.map((feature, index) => <FeatureItem key={index} text={feature} />)}
          </View>
        </View>

        {!cancellationEffectiveDate && !scheduledPlanChange && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.changePlanButton} onPress={handleChangePlan}><Text style={styles.changePlanButtonText}>Change Plan</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}><Text style={styles.cancelButtonText}>Cancel Subscription</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 120 },
    fallbackText: {
      color: theme.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 15,
      textAlign: 'center',
    },
    fallbackSubText: {
      color: theme.textSecondary,
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    emptyStateContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 30,
    },

    // Standard Plan Card
    planCard: {
      backgroundColor: theme.primary,
      borderRadius: 20,
      elevation: 8,
      marginBottom: 20,
      padding: 25,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    planCardLabel: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    planName: { color: theme.textOnPrimary, fontSize: 28, fontWeight: 'bold', marginTop: 4 },
    planPrice: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 18, fontWeight: '500', marginTop: 8 },

    // Cancellation Info Card
    cancellationCard: {
      alignItems: 'center',
      backgroundColor: `${theme.warning}20`,
      borderColor: theme.warning,
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 20,
      padding: 25,
    },
    cancellationHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
    cancellationTitle: { color: theme.warning, fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    cancellationPlanName: {
      color: theme.text,
      fontSize: 24,
      fontWeight: 'bold',
      marginVertical: 5,
    },
    cancellationText: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 20,
      marginTop: 5,
      textAlign: 'center',
    },
    keepPlanBigButton: {
      alignItems: 'center',
      backgroundColor: theme.success,
      borderRadius: 14,
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      padding: 16,
      width: '100%',
    },
    keepPlanButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },

    // Usage Card
    usageCard: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 20,
      padding: 20,
    },
    sectionTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    chartContainer: { alignItems: 'center', marginBottom: 20 },
    chartTextContainer: { alignItems: 'center', justifyContent: 'center' },
    daysLeft: { color: theme.primary, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    daysLeftLabel: { color: theme.textSecondary, fontSize: 12, marginTop: -5 },
    dateInfoContainer: {
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 20,
    },
    dateInfo: { alignItems: 'center', flex: 1 },
    dateLabel: { color: theme.textSecondary, fontSize: 13, marginBottom: 4 },
    dateValue: { color: theme.text, fontSize: 12, fontWeight: '600' },

    // Features Card
    featuresCard: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 20,
      padding: 20,
    },
    featuresList: { marginTop: 10 },
    featureItem: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
    featureIcon: { marginRight: 12 },
    featureText: { color: theme.text, flex: 1, fontSize: 15, lineHeight: 22 },

    // Action Buttons
    actionsContainer: { marginTop: 10 },
    changePlanButton: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 14,
      marginBottom: 15,
      padding: 16,
    },
    changePlanButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    cancelButton: {
      alignItems: 'center',
      backgroundColor: theme.danger,
      borderRadius: 14,
      padding: 16,
    },
    cancelButtonText: { color: theme.textOnPrimary, fontSize: 15, fontWeight: '600' },

    // Generic Notice Card
    noticeCard: {
      alignItems: 'center',
      borderLeftWidth: 5,
      borderRadius: 16,
      flexDirection: 'row',
      marginBottom: 20,
      padding: 15,
    },
    noticeIcon: { marginRight: 15 },
    noticeTextContainer: { flex: 1 },
    noticeTitle: { fontSize: 16, fontWeight: 'bold' },
    noticeBody: { color: theme.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
    reactivateButton: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      marginLeft: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    reactivateButtonText: { color: theme.primary, fontSize: 14, fontWeight: 'bold' },
  });