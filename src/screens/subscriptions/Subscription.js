// screens/SubscriptionScreen.js
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { SvgXml } from 'react-native-svg';

import MySubscriptionScreen from './MySubscriptionScreen';
import { useSubscription, useAuth, useTheme, useMessage, useAlert } from '../../contexts';
import { BottomNavBar } from '../../components/BottomNavBar';

// --- Static Assets ---
const ILLUSTRATIONS = {
    INSTALLATION: require('../../assets/images/icons/technician.png'),
    VERIFICATION: require('../../assets/images/status/completedplan.png'),
    DECLINED: require('../../assets/images/status/declined.png'),
    SUSPENDED: require('../../assets/images/status/declined.png'),
};

// --- Generic UI Components ---
const StatusDisplay = memo(({ theme, illustration, title, text, children, buttonText, onButtonPress, onCancel }) => {
    const styles = getStyles(theme);
    return (
        <ScrollView contentContainerStyle={styles.statusContainer}>
            <Animatable.Image animation="fadeInUp" duration={600} delay={100} source={illustration} style={styles.statusIllustration} />
            <Animatable.Text animation="fadeInUp" delay={200} style={styles.statusTitle}>{title}</Animatable.Text>
            <Animatable.Text animation="fadeInUp" delay={300} style={styles.statusText}>{text}</Animatable.Text>
            {children}
            <View style={styles.statusButtonContainer}>
                {buttonText && onButtonPress && (
                    <TouchableOpacity style={styles.primaryButton} onPress={onButtonPress}>
                        <Text style={styles.buttonText}>{buttonText}</Text>
                    </TouchableOpacity>
                )}
                {onCancel && (
                    <TouchableOpacity style={styles.cancelStatusButton} onPress={onCancel}>
                        <Text style={styles.cancelButtonText}>Cancel Application</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
});

const PlanInfoCard = memo(({ title, plan, theme, isSelected}) => {
    const styles = getStyles(theme);
    if (!plan) return null;

    const renderIcon = () => {
       const iconColor = isSelected ? theme.textOnPrimary : theme.primary;

       if (plan.iconSvg) {
           return <SvgXml xml={plan.iconSvg} width={28} height={28} color={iconColor} />;
       }
        const iconName = plan.icon || "wifi";
        return <Ionicons name={iconName} size={28} color={iconColor} />;
    };

    return (
        <View style={styles.planInfoCard}>
            <Text style={styles.planInfoTitle}>{title}</Text>
            <View style={styles.planHeader}>
                {renderIcon()}
                <View style={styles.planInfoTextContainer}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>{plan.priceLabel}</Text>
                    {plan.note && <Text style={styles.note}>{plan.note}</Text>}
                </View>
            </View>
        </View>
    );
});

const Step1_PlanSelection = memo(({ theme, plans, isLoading, selectedPlan, onSelectPlan, onProceed, isChangingPlan }) => {
    const styles = getStyles(theme);
     const PlanIcon = memo(({ plan, isSelected }) => {
        const unselectedColor = theme.isDarkMode ? theme.textSecondary : theme.primary;
        const iconColor = isSelected ? theme.textOnPrimary : unselectedColor;
        const iconSize = 32;
        if (plan.iconSvg) {
            return (
                <View style={{ marginRight: 15, width: iconSize, height: iconSize }}>
                    <SvgXml xml={plan.iconSvg} width="100%" height="100%" color={iconColor} />
                </View>
            );
        }
        const iconName = plan.icon || 'wifi';
        return <Ionicons name={iconName} size={iconSize} color={iconColor} style={{ marginRight: 15 }} />;
    });
    const PlanCard = memo(({ plan, isSelected, onSelect }) => (
        <TouchableOpacity onPress={onSelect} activeOpacity={0.9} style={[styles.planCard, isSelected && styles.planCardSelected]}>
            {isSelected && <LinearGradient colors={theme.isDarkMode ? ['#0A84FF', '#0052A3'] : ['#007AFF', '#0052A3']} style={StyleSheet.absoluteFill} />}
            {isSelected && <Ionicons name="sparkles" size={60} color="rgba(255,255,255,0.1)" style={styles.planCardBgIcon} />}
            <View style={styles.planHeader}>
                    <PlanIcon plan={plan} isSelected={isSelected} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.planName, isSelected && styles.planTextSelected]}>{plan.name}</Text>
                        <Text style={[styles.planPrice, isSelected && styles.planTextSelected]}>{plan.priceLabel}</Text>
                        {plan.note && (
                            <Text style={[styles.planNote, isSelected && styles.planTextSelected, { opacity: isSelected ? 0.9 : 1 }]}>{plan.note}</Text>
                        )}
                    </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>{isSelected && <View style={styles.radioDot} />}</View>
            </View>
            <View style={styles.planFeatures}>
                {plan.features.map((feature, i) => (
                    <View key={i} style={styles.featureItem}><Ionicons name="checkmark-sharp" size={16} color={isSelected ? 'rgba(255,255,255,0.8)' : theme.success} style={{ marginRight: 8 }} /><Text style={[styles.planFeatureText, isSelected && styles.planTextSelected]}>{feature}</Text></View>
                ))}
            </View>
        </TouchableOpacity>
    ));
    return (
        <View style={styles.flowContainer}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <Text style={styles.screenTitle}>{isChangingPlan ? 'Change Your Plan' : 'Choose Your Plan'}</Text>
                <Text style={styles.screenSubtitle}>Find the perfect speed for your home.</Text>
                {isLoading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> :
                    plans.map((plan) => <PlanCard key={plan._id} plan={plan} isSelected={selectedPlan?._id === plan._id} onSelect={() => onSelectPlan(plan)} />)
                }
            </ScrollView>
            <View style={styles.fixedButtonContainer}>
                <TouchableOpacity style={[styles.primaryButton, !selectedPlan && styles.buttonDisabled]} onPress={onProceed} disabled={!selectedPlan}>
                    <Text style={styles.buttonText}>{isChangingPlan ? 'Proceed to Confirmation' : 'Proceed'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const Step2_Confirmation = memo(({ theme, selectedPlan, address, onSubmit, onBack, isSubmitting, isReconnecting }) => {
    const styles = getStyles(theme);
    const navigation = useNavigation();
    const formattedAddress = [address.address, address.phase, address.city, address.province, address.zipCode].filter(Boolean).join(', ');

    const INSTALLATION_FEE = 1000;
    const RECONNECTION_FEE = 500; 

    return (
        <KeyboardAvoidingView style={styles.flowContainer} behavior="height">
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <Text style={styles.screenTitle}>{isReconnecting ? 'Confirm Reconnection' : 'Confirm Application'}</Text>
                <Text style={styles.screenSubtitle}>Please review your plan and address before submitting.</Text>
                <View style={styles.stepIndicatorContainer}>
                    <TouchableOpacity onPress={onBack} style={styles.stepIndicatorActive}><Ionicons name="checkmark-sharp" color={theme.textOnPrimary} size={16} /></TouchableOpacity>
                    <View style={styles.stepConnector} />
                    <View style={[styles.stepIndicator, styles.stepIndicatorActive]}><Text style={styles.stepText}>2</Text></View>
                </View>

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Selected Plan</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{selectedPlan?.name}</Text>
                        <Text style={styles.summaryValue}>₱{selectedPlan?.price.toFixed(2)} / month</Text>
                    </View>
                    
                    {isReconnecting ? (
                        <>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>One-time Reconnection Fee</Text>
                                <Text style={styles.summaryValue}>₱{RECONNECTION_FEE.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryTotal}>
                                <Text style={styles.summaryTotalLabel}>Total for Reconnection</Text>
                                <Text style={styles.summaryTotalValue}>₱{(selectedPlan?.price + RECONNECTION_FEE).toFixed(2)}</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>One-time Installation Fee</Text>
                                <Text style={styles.summaryValue}>₱{INSTALLATION_FEE.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryTotal}>
                                <Text style={styles.summaryTotalLabel}>Estimated First Bill Total</Text>
                                <Text style={styles.summaryTotalValue}>₱{(selectedPlan?.price + INSTALLATION_FEE).toFixed(2)}</Text>
                            </View>
                        </>
                    )}
                    
                    <View style={styles.noticeBox}>
                        <Ionicons name="information-circle-outline" size={22} color={theme.accent} />
                        <Text style={styles.noticeText}>
                            {isReconnecting
                                ? "Your first bill, including the one-time installation fee, will be due 7 days before your service renewal."
                                : "Your first bill, including the one-time installation fee, will be due 7 days before your service renewal."
                            }
                        </Text>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <View style={styles.addressHeader}>
                        <Text style={styles.inputLabel}>Installation Address</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('EditProfileScreen')}><Text style={styles.changeAddressText}>Change</Text></TouchableOpacity>
                    </View>
                    <View style={styles.addressDisplayBox}>
                        <Ionicons name="location-outline" size={24} color={theme.textSecondary} style={styles.addressIcon} />
                        <Text style={styles.addressDisplayText}>{formattedAddress || "No address set in profile."}</Text>
                    </View>
                </View>
            </ScrollView>
            <View style={[styles.fixedButtonContainer, { gap: 10 }]}>
                <TouchableOpacity style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]} onPress={onBack} disabled={isSubmitting}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, (!formattedAddress || isSubmitting) && styles.buttonDisabled]} onPress={onSubmit} disabled={!formattedAddress || isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>{isReconnecting ? 'Submit Reconnection' : 'Proceed'}</Text>}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
});



const ChangePlanConfirmation = memo(({ newPlan, onConfirm, onCancel, isSubmitting, theme }) => {
    const styles = getStyles(theme);
    const { activePlan, isLoading } = useSubscription();
    if (isLoading || !activePlan) {
        return <View style={styles.flowContainer}><ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} /></View>;
    }
    return (
        <View style={styles.flowContainer}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <Text style={styles.screenTitle}>Confirm Your Change</Text>
                <Text style={styles.screenSubtitle}>Please review your plan change before submitting.</Text>
                <View style={styles.infoStack}>
                    <PlanInfoCard title="FROM (CURRENT PLAN)" plan={activePlan} theme={theme} />
                    <Ionicons name="arrow-down-circle-outline" size={32} color={theme.textSecondary} style={styles.arrowSeparator} />
                    <PlanInfoCard title="TO (NEW PLAN)" plan={newPlan} theme={theme} />
                </View>
                <View style={styles.noticeBox}>
                    <Ionicons name="information-circle-outline" size={22} color={theme.accent} />
                    <Text style={styles.noticeText}>The plan change will take effect on your next billing cycle. Your current plan remains active until then.</Text>
                </View>
            </ScrollView>
            <View style={[styles.fixedButtonContainer, { gap: 10 }]}>
                <TouchableOpacity style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]} onPress={onCancel} disabled={isSubmitting}><Text style={styles.secondaryButtonText}>Go Back</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]} onPress={onConfirm} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>Submit Request</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
});

const PlanSelectionFlow = memo(({ isChangingPlan = false, onFlowFinish }) => {
    // Hooks
    const navigation = useNavigation();
    const { subscribeToPlan, changePlan, subscriptionStatus } = useSubscription(); 
    const { user: profile, api } = useAuth();
    const { showMessage } = useMessage();
    const { theme } = useTheme();
    const { showAlert } = useAlert();

    // State
    const [flowStep, setFlowStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [plans, setPlans] = useState([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [installationAddress, setInstallationAddress] = useState({ address: '', phase: '', city: '', province: '', zipCode: '' });
    const isReconnecting = ['cancelled', 'suspended'].includes(subscriptionStatus);
    const selectedPlanRef = useRef(selectedPlan);

    useEffect(() => {
        selectedPlanRef.current = selectedPlan;
    }, [selectedPlan]);

    // Effects
    useEffect(() => {
        if (profile?.profile) setInstallationAddress({ address: profile.profile.address || '', phase: profile.profile.phase || '', city: profile.profile.city || '', province: profile.profile.province || '', zipCode: profile.profile.zipCode || '' });
    }, [profile]);

    useEffect(() => {
        const fetchPlans = async () => {
            try { setIsLoadingPlans(true); const { data } = await api.get('/plans'); setPlans(data || []); }
            catch (error) { showAlert('Error', 'Could not load subscription plans.'); }
            finally { setIsLoadingPlans(false); }
        };
        fetchPlans();
    }, [api, showAlert]);

    // Callbacks
    const handleProceed = useCallback(() => {
        if (!selectedPlan) {
            showAlert('Select a Plan', 'Please choose a subscription plan to continue.');
            return;
        }
        if (!profile?.profile?.mobileNumber || !profile?.profile?.address) {
            showAlert('Profile Incomplete', 'Please complete your address and mobile number in your profile.',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Go to Profile', onPress: () => navigation.navigate('EditProfileScreen') }]
            );
            return;
        }
        setFlowStep(2);
    }, [selectedPlan, profile, showAlert, navigation]);


    const handleFinalSubmit = useCallback(async () => {
        if (!installationAddress.address) {
            showAlert("Address Required", "Please add an address to your profile before subscribing.", [{ text: "Go to Profile", onPress: () => navigation.navigate('EditProfileScreen') }]);
            return;
        }
        handleNewSubscriptionSubmit();
    }, [installationAddress, showAlert, navigation, handleNewSubscriptionSubmit]);

    const handleNewSubscriptionSubmit = useCallback(async () => {
        setIsSubmitting(true);
        try {
            const planToSubmit = selectedPlanRef.current;
            await subscribeToPlan(planToSubmit, installationAddress);
            showMessage('Submission Received!', 'Your application is now pending installation.');
            if (onFlowFinish) onFlowFinish();
        } catch (error) {
            showAlert('Submission Failed', error.response?.data?.message || 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    }, [subscribeToPlan, installationAddress, showMessage, showAlert, onFlowFinish]);


    const handleChangePlanSubmit = useCallback(async () => {
        if (!selectedPlan) return;
        setIsSubmitting(true);
        try {
            await changePlan(selectedPlan);
            showMessage('Request Received!', 'Your plan change is now pending approval.');
            if (onFlowFinish) onFlowFinish();
        } catch (error) {
            showAlert('Change Failed', error.response?.data?.message || 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedPlan, changePlan, showMessage, showAlert, onFlowFinish]);

    const renderContent = () => {
        if (isChangingPlan) {
            return flowStep === 1 ? (
                <Step1_PlanSelection
                    theme={theme}
                    plans={plans}
                    isLoading={isLoadingPlans}
                    selectedPlan={selectedPlan}
                    onSelectPlan={setSelectedPlan}
                    onProceed={handleProceed}
                    isChangingPlan={true}
                />
            ) : (
                <ChangePlanConfirmation
                    theme={theme}
                    newPlan={selectedPlan}
                    onConfirm={handleChangePlanSubmit}
                    onCancel={() => setFlowStep(1)}
                    isSubmitting={isSubmitting}
                />
            );
        }
        switch (flowStep) {
            case 1:
                return (
                    <Step1_PlanSelection
                        theme={theme}
                        plans={plans}
                        isLoading={isLoadingPlans}
                        selectedPlan={selectedPlan}
                        onSelectPlan={setSelectedPlan}
                        onProceed={handleProceed}
                        isChangingPlan={false}
                    />
                );
            case 2:
                return (
                    <Step2_Confirmation
                        theme={theme}
                        selectedPlan={selectedPlan}
                        address={installationAddress}
                        onSubmit={handleFinalSubmit}
                        onBack={() => setFlowStep(1)}
                        isSubmitting={isSubmitting}
                        isReconnecting={isReconnecting}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <>
            {renderContent()}
        </>
    );
});


function SubscriptionScreen() {
    // Hooks
    const route = useRoute();
    const navigation = useNavigation();
    const { subscriptionStatus, subscriptionData, isLoading, clearSubscription, cancelSubscription } = useSubscription();
    const { theme } = useTheme();
    const { showAlert } = useAlert();

    // State
    const [isPlanChangeFlowActive, setPlanChangeFlowActive] = useState(route.params?.isChangingPlan || false);

    // Effects
    useFocusEffect(
        useCallback(() => {
            if (route.params?.isChangingPlan) {
                setPlanChangeFlowActive(true);
                navigation.setParams({ isChangingPlan: undefined });
            }
        }, [route.params?.isChangingPlan, navigation])
    );
    useEffect(() => {
        if (subscriptionStatus !== 'active') setPlanChangeFlowActive(false);
    }, [subscriptionStatus]);

    // Callbacks
    const handleClearAndResubscribe = useCallback(async () => { await clearSubscription(); }, [clearSubscription]);
    const handleCancel = useCallback((type) => {
        const title = type === 'installation' ? 'Cancel Application' : 'Cancel Submission';
        const message = type === 'installation' ? 'Are you sure you want to cancel your subscription application?' : 'Are you sure? To request a refund, please contact support.';
        showAlert(title, message, [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
                    try { await cancelSubscription(); } catch (error) { showAlert('Error', 'Could not cancel subscription.'); }
                },
            },
        ]);
    }, [showAlert, cancelSubscription]);
    const handleFlowFinish = useCallback(() => { setPlanChangeFlowActive(false); }, []);

    const renderContent = () => {
        switch (subscriptionStatus) {
            case 'active':
                return isPlanChangeFlowActive ? <PlanSelectionFlow isChangingPlan={true} onFlowFinish={handleFlowFinish} /> : <MySubscriptionScreen />;

            case 'pending_change':
                return <MySubscriptionScreen />;

            case 'pending_installation':
                return <StatusDisplay
                    theme={theme}
                    illustration={ILLUSTRATIONS.INSTALLATION}
                    title="Awaiting Installation"
                    text="Your application is approved! Our field agent will contact you within 1-2 business days to schedule your installation."
                    onCancel={() => handleCancel('installation')}
                />;

            case 'pending_verification':
                const isGcashPayment = subscriptionData?.paymentMethod === 'GCash';
                const verificationTitle = isGcashPayment ? "Verifying Your Payment" : "Request in Review";
                const verificationText = isGcashPayment
                    ? "Our team is verifying your GCash payment. Once approved, we'll schedule your installation. This usually takes a few hours."
                    : "Your re-activation request is being reviewed by our team. This usually takes a few hours.";

                return <StatusDisplay
                    theme={theme}
                    illustration={ILLUSTRATIONS.VERIFICATION}
                    title={verificationTitle}
                    text={verificationText}
                    onCancel={() => handleCancel('verification')}
                />;

            case 'declined':
                return <StatusDisplay
                    theme={theme}
                    illustration={ILLUSTRATIONS.DECLINED}
                    title="Application Declined"
                    text="Your application could not be approved at this time. Please see the reason below and try again."
                    buttonText="Submit New Application"
                    onButtonPress={handleClearAndResubscribe}
                >
                    <View style={getStyles(theme).noticeBox}>
                        <Ionicons name="information-circle-outline" size={22} color={theme.danger} />
                        <Text style={getStyles(theme).noticeText}>
                            {subscriptionData?.declineReason || "No specific reason provided."}
                        </Text>
                    </View>
                </StatusDisplay>;

            case 'suspended':
                return <StatusDisplay
                    theme={theme}
                    illustration={ILLUSTRATIONS.SUSPENDED}
                    title="Subscription Suspended"
                    text="Your plan is suspended due to non-payment. Please pay your outstanding bill to reactivate your service."
                    buttonText="PAY MY BILL"
                    onButtonPress={() => navigation.navigate('PayBills')}
                />;

            case 'cancelled':
            default:
                return <PlanSelectionFlow onFlowFinish={handleFlowFinish} />;
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={getStyles(theme).container}>
                <View style={getStyles(theme).statusContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
                <BottomNavBar activeScreen="Plan" />
            </SafeAreaView>
        );
    }
    return (
        <SafeAreaView style={getStyles(theme).container}>
            {renderContent()}
            <BottomNavBar activeScreen="Plan" />
        </SafeAreaView>
    );
}

export default memo(SubscriptionScreen);

// --- Stylesheet ---
const getStyles = (theme) => StyleSheet.create({
    // --- Containers & Layout ---
    container: { backgroundColor: theme.background, flex: 1 },
    flowContainer: { backgroundColor: theme.background, flex: 1 },
    contentContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 170 },
    screenTitle: { color: theme.text, fontSize: 30, fontWeight: 'bold', marginTop: 20, paddingHorizontal: 10, marginBottom: 8 },
    screenSubtitle: { color: theme.textSecondary, fontSize: 16, marginTop: 0, marginBottom: 30, paddingHorizontal: 10, lineHeight: 24 },

    // --- Plan Cards (NEW DESIGN) ---
    planCard: {
        backgroundColor: theme.surface,
        borderRadius: 20,
        marginBottom: 18,
        padding: 22,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.isDarkMode ? 0.2 : 0.05,
        shadowRadius: 10,
        elevation: 5,
    },
    planCardSelected: {
        borderColor: theme.primary, 
    },
    planCardBgIcon: {
        position: 'absolute',
        right: -10,
        top: '50%',
        transform: [{ translateY: -35 }],
        opacity: 0.8,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0, 
    },
    planName: {
        color: theme.text,
        fontSize: 22,
        fontWeight: '700', 
    },
    planPrice: {
        color: theme.textSecondary,
        fontSize: 16,
        fontWeight: '500',
        marginTop: 6,
    },
    planNote: {
        color: theme.textSecondary,
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 8,
    },
    planTextSelected: {
        color: theme.textOnPrimary,
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    planFeatures: {
        borderTopColor: theme.isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        borderTopWidth: 1,
        marginTop: 20,
        paddingTop: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    planFeatureText: {
        color: theme.text,
        fontSize: 15,
        lineHeight: 22,
        flex: 1,
    },

    // --- Radio Buttons ---
    radioCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    radioCircleSelected: { borderColor: theme.textOnPrimary, backgroundColor: 'rgba(255,255,255,0.2)' },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.textOnPrimary },

    // --- Step Indicators ---
    stepIndicatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30, paddingHorizontal: 20 },
    stepIndicator: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    stepIndicatorActive: { backgroundColor: theme.primary },
    stepText: { color: theme.textOnPrimary, fontWeight: 'bold' },
    stepConnector: { flex: 1, height: 2, backgroundColor: theme.border, marginHorizontal: -2 },

    // --- Summary & Info Cards ---
    summaryCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, marginVertical: 20 },
    summaryTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    summaryLabel: { fontSize: 15, color: theme.textSecondary },
    summaryValue: { fontSize: 15, color: theme.text, fontWeight: '500' },
    summaryTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: theme.border, paddingTop: 12, marginTop: 8 },
    summaryTotalLabel: { fontSize: 16, color: theme.text, fontWeight: 'bold' },
    summaryTotalValue: { fontSize: 18, color: theme.primary, fontWeight: 'bold' },

    // --- Form Inputs & Display ---
    inputGroup: { marginBottom: 24 },
    inputLabel: { color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 10 },
    addressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    changeAddressText: { color: theme.primary, fontSize: 15, fontWeight: '600' },
    addressDisplayBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 15, minHeight: 54 },
    addressIcon: { marginRight: 10 },
    addressDisplayText: { flex: 1, fontSize: 16, color: theme.text, lineHeight: 22 },

    // --- Status Screens ---
    statusContainer: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', paddingBottom: 170, padding: 30 },
    statusIllustration: { height: 220, width: '100%', resizeMode: 'contain', marginBottom: 30 },
    statusTitle: { color: theme.text, fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    statusText: { color: theme.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center' },
    statusButtonContainer: { alignItems: 'center', marginTop: 30, width: '100%', paddingHorizontal: 20, gap: 10 },
    cancelButtonText: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
    cancelStatusButton: {backgroundColor: theme.surface, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1, borderColor: theme.border, width: '100%', alignItems: 'center'},
    
    // --- Generic Info Displays ---
    infoStack: { width: '100%', marginVertical: 20, gap: 10 },
    planInfoCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 20, width: '100%' },
    planInfoTitle: { color: theme.textSecondary, fontSize: 13, fontWeight: 'bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    planInfoTextContainer: { marginLeft: 15, flex: 1 },
    arrowSeparator: { alignSelf: 'center', marginVertical: 10 },
    noticeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.accent}1A`, padding: 15, borderRadius: 12, marginTop: 20 },
    noticeText: { flex: 1, marginLeft: 10, color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
    note: { color: theme.textSecondary, fontSize: 14, marginTop: 2 },

    // --- Buttons ---
    fixedButtonContainer: { position: 'absolute', bottom: 105, left: 20, right: 20, flexDirection: 'row' },
    primaryButton: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 16, flex: 1, height: 56, justifyContent: 'center', padding: 15},
    secondaryButton: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 16, borderWidth: 1, flex: 1, height: 56, justifyContent: 'center' },
    buttonDisabled: { backgroundColor: theme.disabled, opacity: 0.7 },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
});