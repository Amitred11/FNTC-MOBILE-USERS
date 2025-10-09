// screens/subscription/MySubscriptionScreen.js (Corrected)
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

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
        {formatDate(effectiveDate)}.
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
        <TouchableOpacity onPress={onAction} style={styles.actionButton}>
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </Animatable.View>
  );
});

export default function MySubscriptionScreen() {
  const {
    subscriptionStatus,
    pendingPlanId,
    cancelPlanChange,
    activePlan,
    scheduledPlanChange,
    startDate,
    renewalDate,
    cancellationEffectiveDate,
    paymentHistory,
    isLoading,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
  } = useSubscription();

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

  const { pendingBill, dueBill, overdueBill } = useMemo(() => ({
    pendingBill: paymentHistory.find(item => item.type === 'bill' && item.status === 'Pending Verification'),
    dueBill: paymentHistory.find(item => item.type === 'bill' && item.status === 'Due'),
    overdueBill: paymentHistory.find(item => item.type === 'bill' && item.status === 'Overdue'),
  }), [paymentHistory]);

  const isAwaitingFirstBill = useMemo(() =>
    subscriptionStatus === 'active' &&
    !dueBill && !overdueBill && !pendingBill,
    [subscriptionStatus, dueBill, overdueBill, pendingBill]
  );
  
  const isPendingCash = useMemo(() => 
    pendingBill?.payments?.some(p => p.method === 'Cash' && p.status === 'Pending Verification'),
    [pendingBill]
  );

  const handlePayNow = useCallback(() => {
    navigation.navigate('PayBills');
  }, [navigation]);

  const handleActionWithConfirmation = useCallback((config) => {
    showAlert(config.title, config.message, [
        { text: config.cancelText || 'Go Back', style: 'cancel' },
        { text: config.confirmText, style: config.confirmStyle || 'default', onPress: config.onConfirm }
    ]);
  }, [showAlert]);

  const handleCancelPendingChangeRequest = useCallback(() => {
    handleActionWithConfirmation({
        title: 'Cancel Plan Change Request',
        message: 'Are you sure you want to withdraw your request? It has not been approved yet.',
        confirmText: 'Yes, Withdraw',
        confirmStyle: 'destructive',
        onConfirm: async () => {
            try { await cancelPlanChange(); showMessage('Request Withdrawn Successfully'); }
            catch (e) { showAlert('Action Failed', e.response?.data?.message || 'Could not withdraw the request.'); }
        }
    });
  }, [handleActionWithConfirmation, cancelPlanChange, showMessage, showAlert]);

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
            try { await cancelSubscription(); }
            catch (e) { showAlert('Error', 'Could not schedule cancellation.'); }
        }
    });
  }, [handleActionWithConfirmation, cancelSubscription, showAlert]);

  const handleChangePlan = useCallback(() => {
    handleActionWithConfirmation({
        title: "Change Subscription Plan",
        message: "You will be taken to the plan selection screen to choose a new plan.",
        confirmText: "Proceed",
        onConfirm: () => navigation.navigate('Subscription', { isChangingPlan: true })
    });
  }, [handleActionWithConfirmation, navigation]);

  const handleChat = useCallback(() => {
    navigation.navigate('LiveChatScreen');
  }, [navigation]);

  const { percentage, statusText } = useMemo(() => {
    if (!startDate || !renewalDate) return { percentage: 0, statusText: 'N/A' };
    const today = new Date();
    const start = new Date(startDate);
    const renewal = new Date(renewalDate);

    if (isAwaitingFirstBill) {
        return { percentage: 0, statusText: 'Awaiting Bill' };
    }

    const totalDuration = renewal.getTime() - start.getTime();
    const elapsedDuration = today.getTime() - start.getTime();
    let calculatedPercentage = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 100;
    calculatedPercentage = Math.max(0, Math.min(100, Math.round(calculatedPercentage)));

    if (overdueBill) return { percentage: 100, statusText: 'Overdue' };
    if (pendingBill) return { percentage: calculatedPercentage, statusText: 'Verifying' };
    if (dueBill) {
        const dueDate = new Date(dueBill.dueDate);
        const daysLeft = Math.max(0, Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)));
        return { percentage: calculatedPercentage, statusText: daysLeft > 0 ? `${daysLeft}d to Pay` : 'Due Today' };
    }

    return { percentage: calculatedPercentage, statusText: 'All Paid' };
  }, [startDate, renewalDate, paymentHistory, pendingBill, dueBill, overdueBill, isAwaitingFirstBill]);

  const isActionInProgress = !!cancellationEffectiveDate || !!scheduledPlanChange || subscriptionStatus === 'pending_change';

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}><View style={styles.emptyStateContainer}><ActivityIndicator size="large" color={theme.primary} /></View></SafeAreaView>
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
        
        {isAwaitingFirstBill && (
            <InfoNotice
                icon="checkmark-circle"
                color={theme.success}
                title="Your Plan is Active!"
            >
                Welcome aboard! Your <Text style={{ fontWeight: 'bold' }}>{activePlan.name}</Text> plan is now active. Your first bill will be generated approximately 7 days before your renewal date.
            </InfoNotice>
        )}

        {overdueBill && subscriptionStatus === 'active' && !cancellationEffectiveDate && (
          <InfoNotice 
            icon="alert-circle" 
            color={theme.danger} 
            title="Payment Overdue - Action Required"
            actionText="Pay Now"
            onAction={handlePayNow}
          >
            Your bill of{' '}
            <Text style={{ fontWeight: 'bold' }}>₱{(overdueBill.amount ?? 0).toFixed(2)}</Text> is overdue. Please pay within 1 week to avoid service suspension.
          </InfoNotice>
        )}
        {isPendingCash && !cancellationEffectiveDate && (
          <InfoNotice 
            icon="wallet-outline" 
            color={theme.primary} 
            title="Cash Collection Scheduled"
          >
            Our collector will visit you to collect a payment of{' '}
            <Text style={{ fontWeight: 'bold' }}>₱{pendingBill.amount.toFixed(2)}</Text>.
            Your payment status will be updated upon collection.
          </InfoNotice>
        )}

        {subscriptionStatus === 'pending_change' && pendingPlanId && !cancellationEffectiveDate && (
          <InfoNotice icon="time-outline" color={theme.warning} title="Request Under Review" actionText="Cancel Request" onAction={handleCancelPendingChangeRequest}>
            Your request to switch to the <Text style={{ fontWeight: 'bold' }}>{pendingPlanId.name}</Text> plan is being processed by our team.
          </InfoNotice>
        )}

        {scheduledPlanChange?.plan && !cancellationEffectiveDate && (
          <InfoNotice
            icon="information-circle-outline"
            color={theme.primary}
            title="Plan Change Scheduled"
            actionText="Chat with Admin"
            onAction={handleChat}
          >
            Your plan will switch to <Text style={{ fontWeight: 'bold' }}>{scheduledPlanChange.plan.name}</Text> on {formatDate(scheduledPlanChange.effectiveDate)}.
            To cancel this change, please contact support.
          </InfoNotice>
        )}

        <View style={styles.planCard}>
          <Text style={styles.planCardLabel}>CURRENT PLAN</Text>
          <Text style={styles.planName}>{activePlan.name}</Text>
          <Text style={styles.planPrice}>{activePlan.priceLabel}</Text>
        </View>

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
        
        {!isActionInProgress && !pendingBill && (
          <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.changePlanButton} onPress={handleChangePlan}>
                  <Text style={styles.changePlanButtonText}>Change Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
              </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 120 },
    fallbackText: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
    fallbackSubText: { color: theme.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
    emptyStateContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
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
    planCardLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
    planName: { color: theme.textOnPrimary, fontSize: 28, fontWeight: 'bold', marginTop: 4 },
    planPrice: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 18, fontWeight: '500', marginTop: 8 },
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
    cancellationPlanName: { color: theme.text, fontSize: 24, fontWeight: 'bold', marginVertical: 5 },
    cancellationText: { color: theme.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 20, marginTop: 5, textAlign: 'center' },
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
    actionsContainer: { marginTop: 10 },
    changePlanButton: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 14, marginBottom: 15, padding: 16 },
    changePlanButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    cancelButton: { alignItems: 'center', backgroundColor: theme.danger, borderRadius: 14, padding: 16 },
    cancelButtonText: { color: theme.textOnPrimary, fontSize: 15, fontWeight: '600' },
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
    actionButton: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      marginLeft: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    actionButtonText: { color: theme.primary, fontSize: 14, fontWeight: 'bold' },
  });