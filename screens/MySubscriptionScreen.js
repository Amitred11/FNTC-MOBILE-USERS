// screens/MySubscriptionScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription, useTheme, useAlert, useMessage } from '../contexts';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const FeatureItem = ({ text, theme }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.success} style={styles.featureIcon} />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
};

export default function MySubscriptionScreen() {
     const { 
        activePlan, 
        paymentHistory,
        cancelSubscription, 
        startDate,
        renewalDate, 
        isLoading,
        refreshSubscription,
        dataUsage 
    } = useSubscription();
    
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const { showMessage } = useMessage();
    const navigation = useNavigation();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshSubscription().finally(() => setRefreshing(false));
    }, [refreshSubscription]);

    const handleCancel = () => {
        showAlert( "Cancel Subscription", "Are you sure you want to cancel your plan? This will take effect at the end of your current billing cycle.",
            [
                { text: 'Keep Plan', style: 'cancel' },
                { text: 'Yes, Cancel', style: 'destructive',
                    onPress: async () => {
                        try {
                            await cancelSubscription();
                            showMessage('Subscription Cancelled', 'Your plan has been scheduled for cancellation.');
                        } catch (error) {
                            showAlert('Error', 'Could not cancel subscription. Please try again.', [{ text: 'OK' }]);
                        }
                    }, 
                }
            ]
        );
    };
    
    // --- THIS IS THE FIX ---
    const handleChangePlan = () => {
        showAlert(
            "Change Subscription Plan",
            "You will be taken to the plan selection screen. After you confirm, your request will be submitted for approval and may take a few hours to reflect on your account.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Proceed",
                    onPress: () => {
                        // This navigation logic is correct. It takes the user to the start
                        // of the change plan flow.
                        navigation.navigate('Subscription', { isChangingPlan: true });
                    }
                }
            ]
        );
    };


    if (isLoading && !refreshing) {
        return ( <SafeAreaView style={styles.container}><View style={styles.emptyStateContainer}><ActivityIndicator size="large" color={theme.primary} /></View></SafeAreaView> );
    }

    const dueBill = paymentHistory.find(bill => bill.type === 'bill' && (bill.status === 'Due' || bill.status === 'Overdue'));

    const getUsagePercentage = () => {
    if (!startDate || !renewalDate) {
          return { percentage: 0, statusText: 'N/A' };
        }

        // Apply the fix here as well
    const start = new Date(startDate);
    const renewal = new Date(renewalDate);
    const today = new Date();
    const totalCycleDuration = renewal.getTime() - start.getTime();
    const elapsedDuration = today.getTime() - start.getTime();
    let percentage = totalCycleDuration > 0 ? (elapsedDuration / totalCycleDuration) * 100 : 100;
    percentage = Math.max(0, Math.min(100, percentage));

    let statusText = '';
    if (dueBill) {
      if (dueBill.status === 'Overdue') {
        statusText = 'Overdue';
      } else {
        const dueDate = new Date(dueBill.dueDate);
        const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            // Handle case where due date is today or passed but not yet overdue (grace period)
        statusText = daysLeft >= 0 ? `${daysLeft}d to Pay` : 'Grace Period';
          }
        } else {
          statusText = 'All Paid';
        }

    return { 
      percentage: Math.round(percentage), 
      statusText 
    };
  };

  const { percentage, statusText } = getUsagePercentage();
    
    const dataUsagePercentage = dataUsage?.allowance > 0 ? (dataUsage.used / dataUsage.allowance) * 100 : 0;

    if (!activePlan) {
        return ( <ScrollView style={styles.container} contentContainerStyle={styles.emptyStateContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}> <Ionicons name="alert-circle-outline" size={60} color={theme.textSecondary} /> <Text style={styles.fallbackText}>No active subscription found.</Text> <Text style={styles.fallbackSubText}>Pull down to refresh.</Text> </ScrollView> );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView 
                contentContainerStyle={activePlan ? styles.scrollContent : styles.emptyStateContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
            >
                {activePlan ? (
                    <>
                        <View style={styles.planCard}>
                            <Text style={styles.planCardLabel}>CURRENT PLAN</Text>
                            <Text style={styles.planName}>{activePlan.name}</Text>
                            <Text style={styles.planPrice}>{activePlan.priceLabel}</Text>
                        </View>

                        <View style={styles.usageCard}>
                            <Text style={styles.sectionTitle}>Billing Cycle</Text>
                            <View style={styles.chartContainer}>
                                <AnimatedCircularProgress size={160} width={16} fill={percentage} tintColor={theme.primary} backgroundColor={theme.border} rotation={0} lineCap="round" padding={10}>
                                    {() => ( <View style={styles.chartTextContainer}><Text style={styles.daysLeft}>{statusText}</Text><Text style={styles.daysLeftLabel}>Payment Status</Text></View> )}
                                </AnimatedCircularProgress>
                            </View>
                             <View style={styles.dateInfoContainer}>
                                <View style={styles.dateInfo}><Text style={styles.dateLabel}>Start Date</Text><Text style={styles.dateValue}>{formatDate(startDate)}</Text></View>
                                <View style={styles.dateInfo}><Text style={styles.dateLabel}>Next Renewal</Text><Text style={styles.dateValue}>{formatDate(renewalDate)}</Text></View>
                            </View>
                            
                            {dataUsage && (
                                <View style={styles.dataUsageContainer}>
                                    <View style={styles.dataUsageHeader}><Text style={styles.dataUsageLabel}>Data Usage</Text><Text style={styles.dataUsageValue}>{`${dataUsage.used} / ${dataUsage.allowance} GB`}</Text></View>
                                    <View style={styles.progressBarBackground}><View style={[styles.progressBarFill, { width: `${dataUsagePercentage}%` }]} /></View>
                                </View>
                            )}
                        </View>
                        
                        <View style={styles.featuresCard}>
                            <Text style={styles.sectionTitle}>Plan Inclusions</Text>
                            <View style={styles.featuresList}>
                                {activePlan.features?.map((feature, index) => (
                                   <FeatureItem key={index} text={feature} theme={theme} />
                                ))}
                           </View>
                        </View>

                        <View style={styles.actionsContainer}>
                            <TouchableOpacity style={styles.changePlanButton} onPress={handleChangePlan}>
                               <Text style={styles.changePlanButtonText}>Change Plan</Text>
                            </TouchableOpacity>
                             <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                                <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    // If NO plan exists, THEN we decide whether to show a loader or the "No Plan" message.
                    <>
                        {isLoading || refreshing ? (
                            <ActivityIndicator size="large" color={theme.primary} />
                        ) : (
                            <>
                                <Ionicons name="alert-circle-outline" size={60} color={theme.textSecondary} /> 
                                <Text style={styles.fallbackText}>No active subscription found.</Text> 
                                <Text style={styles.fallbackSubText}>Pull down to refresh or check your connection.</Text>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: theme.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120, 
    },
    fallbackText: {
        marginTop: 15,
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        textAlign: 'center',
    },
    fallbackSubText: {
        marginTop: 8,
        fontSize: 14,
        color: theme.textSecondary,
        textAlign: 'center',
    },
    planCard: { 
        backgroundColor: theme.primary, 
        padding: 25, 
        borderRadius: 20, 
        marginBottom: 20,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    planCardLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
        textTransform: 'uppercase',
    },
    planName: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: theme.textOnPrimary,
        marginTop: 4,
    },
    planPrice: { 
        fontSize: 18, 
        color: 'rgba(255, 255, 255, 0.9)', 
        marginTop: 8,
        fontWeight: '500' 
    },
    usageCard: { 
        backgroundColor: theme.surface, 
        padding: 20, 
        borderRadius: 20, 
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.border,
    },
    featuresCard: {
        backgroundColor: theme.surface, 
        padding: 20, 
        borderRadius: 20, 
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.border,
    },
    sectionTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: theme.text, 
        marginBottom: 20, 
    },
    chartContainer: { 
        alignItems: 'center', 
        marginBottom: 20,
    },
    chartTextContainer: { 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    daysLeft: { 
        fontSize: 24,
        fontWeight: 'bold', 
        color: theme.primary,
        textAlign: 'center',
  },
    daysLeftLabel: { 
        fontSize: 12, 
        color: theme.textSecondary, 
        marginTop: -5 
    },
    dateInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    dateInfo: { 
        alignItems: 'center',
        flex: 1,
    },
    dateLabel: { 
        fontSize: 13, 
        color: theme.textSecondary, 
        marginBottom: 4,
    },
    dateValue: { 
        fontSize: 15, 
        color: theme.text, 
        fontWeight: '600' 
    },
    featuresList: { 
        marginTop: 10,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureIcon: {
        marginRight: 12,
    },
    featureText: { 
        fontSize: 15, 
        color: theme.text, 
        lineHeight: 22,
        flex: 1,
    },
    actionsContainer: {
        marginTop: 10,
    },
    changePlanButton: {
        backgroundColor: theme.primary,
        padding: 16, 
        borderRadius: 14, 
        alignItems: 'center', 
        marginBottom: 15,
    },
    changePlanButtonText: {
        color: theme.textOnPrimary,
        fontSize: 16, 
        fontWeight: 'bold',
    },
    cancelButton: { 
        padding: 16, 
        borderRadius: 14, 
        alignItems: 'center',
        backgroundColor: theme.danger
    },
    cancelButtonText: { 
        color: theme.textOnPrimary, 
        fontSize: 15, 
        fontWeight: '600' 
    },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, backgroundColor: theme.background },
    dataUsageContainer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    dataUsageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 8,
    },
    dataUsageLabel: {
        fontSize: 14,
        color: theme.textSecondary,
    },
    dataUsageValue: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.text,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: theme.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.accent || theme.primary,
        borderRadius: 4,
    },
    
});