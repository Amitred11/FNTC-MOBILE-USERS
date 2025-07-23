//screens/SubscriptionScreen.js
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'; // Removed unused TextInput
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import MySubscriptionScreen from './MySubscriptionScreen';
import { useSubscription, useAuth, useTheme, useMessage, useAlert } from '../contexts';
import * as Animatable from 'react-native-animatable';
import { BottomNavBar } from '../components/BottomNavBar';
import { requestMediaLibraryPermissions, requestCameraPermissions } from '../utils/permissions';
import PhotoSourceSheet from '../components/PhotoSourceSheet';

// --- Static assets (unchanged) ---
const GCASH_LOGO_IMAGE = require('../assets/images/gcash.png');
const GCASH_QR_IMAGE = require('../assets/images/gcashqr.png');
const COD_LOGO_IMAGE = require('../assets/images/cod.png');
const ILLUSTRATIONS = {
  INSTALLATION: require('../assets/images/technician.png'),
  VERIFICATION: require('../assets/images/completedplan.png'),
  DECLINED: require('../assets/images/declined.png'),
  CANCELLED: require('../assets/images/cancelled.png'),
  SUSPENDED: require('../assets/images/declined.png'),
};

// --- Sub-Components (unchanged and correct) ---

const StatusView = memo(({ illustration, title, text, children, buttonText, onButtonPress, onCancel, theme }) => {
  const styles = getStyles(theme);
  return (
    <ScrollView contentContainerStyle={styles.statusContainer}>
      <Animatable.Image animation="fadeInUp" duration={600} delay={100} source={illustration} style={styles.statusIllustration} />
      <Animatable.Text animation="fadeInUp" delay={200} style={styles.statusTitle}>{title}</Animatable.Text>
      <Animatable.Text animation="fadeInUp" delay={300} style={styles.statusText}>{text}</Animatable.Text>
      {children}
      <View style={styles.statusButtonContainer}>
        {buttonText && onButtonPress && (
          <Animatable.View animation="fadeInUp" delay={400} style={{ width: '100%' }}>
            <TouchableOpacity style={styles.primaryButton} onPress={onButtonPress}>
              <Text style={styles.buttonText}>{buttonText}</Text>
            </TouchableOpacity>
          </Animatable.View>
        )}
        {onCancel && (
          <Animatable.View animation="fadeInUp" delay={buttonText ? 500 : 400} style={{ width: '100%' }}>
            <TouchableOpacity style={styles.cancelStatusButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel Application</Text>
            </TouchableOpacity>
          </Animatable.View>
        )}
      </View>
    </ScrollView>
  );
});

const PlanInfoCard = memo(({ title, plan, theme }) => {
    const styles = getStyles(theme);
    if (!plan) return null;
    return (
      <View style={styles.planInfoCard}>
        <Text style={styles.planInfoTitle}>{title}</Text>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>{plan.priceLabel}</Text>
          </View>
          <View style={styles.planIconContainer}><Ionicons name="wifi" size={24} color={theme.primary} /></View>
        </View>
      </View>
    );
});

const PendingChangeView = memo(() => {
    const { theme } = useTheme();
    const { subscriptionData, cancelPlanChange, activePlan, isLoading } = useSubscription();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const { showMessage } = useMessage();

    const handleCancelRequest = useCallback(() => {
        showAlert('Cancel Request', 'Are you sure you want to cancel your plan change request?', [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
              try {
                await cancelPlanChange();
                showMessage('Request Cancelled', 'Your plan change request has been withdrawn.');
              } catch (error) {
                showAlert('Error', 'Could not cancel the request. Please try again.');
              }
            },
          },
        ]);
    }, [showAlert, showMessage, cancelPlanChange]);

    if (isLoading || !activePlan || !subscriptionData?.pendingPlanId) {
        return <View style={styles.statusContainer}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    return (
        <ScrollView contentContainerStyle={[styles.statusContainer, { paddingBottom: 120 }]}>
            <Animatable.Image animation="fadeInUp" duration={600} delay={100} source={ILLUSTRATIONS.VERIFICATION} style={styles.statusIllustration} />
            <Animatable.Text animation="fadeInUp" delay={200} style={styles.statusTitle}>Request Received!</Animatable.Text>
            <Animatable.Text animation="fadeInUp" delay={300} style={styles.statusText}>Your request to change plans is being processed. This may take a few hours to reflect on your account.</Animatable.Text>
            <Animatable.View animation="fadeInUp" delay={400} style={{ width: '100%', marginTop: 20 }}>
                <PlanInfoCard title="CURRENT PLAN" plan={activePlan} theme={theme} />
                <Ionicons name="arrow-down-circle-outline" size={32} color={theme.textSecondary} style={styles.arrowSeparator} />
                <PlanInfoCard title="REQUESTED PLAN" plan={subscriptionData.pendingPlanId} theme={theme} />
            </Animatable.View>
            <Animatable.View animation="fadeInUp" delay={500} style={styles.statusButtonContainer}>
                <TouchableOpacity style={styles.cancelChangeButton} onPress={handleCancelRequest}><Text style={styles.cancelChangeButtonText}>Cancel This Request</Text></TouchableOpacity>
            </Animatable.View>
        </ScrollView>
    );
});

const ChangePlanConfirmation = memo(({ newPlan, onConfirm, onCancel, isSubmitting }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { activePlan, isLoading } = useSubscription();

    if (isLoading || !activePlan) {
        return <View style={styles.flowContainer}><ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} /></View>;
    }

    return (
        <View style={styles.flowContainer}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.titleCard}><Text style={styles.screenTitle}>Confirm Your Change</Text><Text style={styles.screenSubtitle}>Please review your plan change before submitting.</Text></View>
                <View style={{ width: '100%' }}>
                    <PlanInfoCard title="FROM (CURRENT PLAN)" plan={activePlan} theme={theme} />
                    <Ionicons name="arrow-down-circle-outline" size={32} color={theme.textSecondary} style={styles.arrowSeparator}/>
                    <PlanInfoCard title="TO (NEW PLAN)" plan={newPlan} theme={theme} />
                </View>
                <Text style={styles.noticeText}>Note: The plan change will take effect on your next billing cycle. Your current plan remains active until then.</Text>
            </ScrollView>
            <View style={[styles.fixedButtonContainer, { flexDirection: 'row', gap: 10 }]}>
                <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} disabled={isSubmitting}><Text style={styles.secondaryButtonText}>GO BACK</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]} onPress={onConfirm} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>SUBMIT REQUEST</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
});

const PlanSelectionFlow = memo(({ isChangingPlan = false, onFlowFinish }) => {
    const navigation = useNavigation();
    const { subscribeToPlan, changePlan } = useSubscription();
    const { user: profile, api } = useAuth();
    const { showMessage } = useMessage();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [flowStep, setFlowStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [plans, setPlans] = useState([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [isGcashModalVisible, setGcashModalVisible] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    // --- FIX #1: The state should only store the base64 data URI string, or null. ---
    const [proofOfPayment, setProofOfPayment] = useState(null); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPhotoSourceSheetVisible, setPhotoSourceSheetVisible] = useState(false);
    const [installationAddress, setInstallationAddress] = useState({ address: '', phase: '', city: '', province: '', zipCode: '' });

    useEffect(() => {
      if (profile?.profile) {
        setInstallationAddress({
          address: profile.profile.address || '',
          phase: profile.profile.phase || '',
          city: profile.profile.city || '',
          province: profile.profile.province || '',
          zipCode: profile.profile.zipCode || '',
        });
      }
    }, [profile]);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                setIsLoadingPlans(true);
                const { data } = await api.get('/plans');
                setPlans(data || []);
                if (data && data.length > 0) setSelectedPlan(data[0]);
            } catch (error) {
                showAlert('Error', 'Could not load subscription plans.');
            } finally {
                setIsLoadingPlans(false);
            }
        };
        fetchPlans();
    }, [api, showAlert]);

    const handleProceedToPaymentMethod = useCallback(() => {
        if (!selectedPlan) return;
        if (!profile?.profile?.mobileNumber || !profile?.profile?.address) {
            showAlert('Profile Incomplete', 'Please complete your address and mobile number in your profile.',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Go to Profile', onPress: () => navigation.navigate('EditProfileScreen') }]
            );
            return;
        }
        setFlowStep(2);
    }, [selectedPlan, profile, showAlert, navigation]);

    // --- FIX #2: The 'proof' parameter is now the base64 string directly ---
    const handleNewSubscriptionSubmit = useCallback(async (method, proofBase64) => {
        setIsSubmitting(true);
        try {
            await subscribeToPlan(selectedPlan, method, proofBase64, installationAddress);
            showMessage('Submission Received!', 'Your application is now pending.');
            if (isGcashModalVisible) setGcashModalVisible(false);
        } catch (error) {
            showAlert('Submission Failed', error.response?.data?.message || 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    }, [subscribeToPlan, selectedPlan, installationAddress, isGcashModalVisible, showMessage, showAlert]);

    const handleFinalSubmission = useCallback(async () => {
        if (!selectedPaymentMethod || !installationAddress.address) {
          showAlert(
            "Address Required", 
            "Please add an address to your profile before subscribing.",
            [{ text: "Go to Profile", onPress: () => navigation.navigate('EditProfileScreen') }]
          );
        return;
        }
        if (selectedPaymentMethod === 'GCash') {
            setGcashModalVisible(true);
        } else if (selectedPaymentMethod === 'Cash on Delivery') {
            await handleNewSubscriptionSubmit('Cash on Delivery', null);
        }
    }, [selectedPaymentMethod, installationAddress, handleNewSubscriptionSubmit, showAlert, navigation]);

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

    // --- FIX #3: Image pickers now set only the base64 data URI string to state ---
     const pickImageFromCamera = useCallback(async () => {
        setPhotoSourceSheetVisible(false);
        const hasPermission = await requestCameraPermissions();
        if (!hasPermission) return;
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5, base64: true });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            setProofOfPayment(base64Data);
        }
    }, []);

    const pickImageFromGallery = useCallback(async () => {
        setPhotoSourceSheetVisible(false);
        const hasPermission = await requestMediaLibraryPermissions();
        if (!hasPermission) return;
        const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.5, base64: true });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            setProofOfPayment(base64Data);
        }
    }, []);

    const PlanCard = memo(({ plan, isSelected, onSelect }) => (
        <TouchableOpacity onPress={onSelect} activeOpacity={0.8} style={[styles.planCard, isSelected && styles.planCardSelected]}>
            <View>
                {isSelected && (<View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>SELECTED</Text></View>)}
                <View style={styles.planHeader}><View><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planPrice}>{plan.priceLabel}</Text></View><View style={styles.planIconContainer}><Ionicons name="wifi" size={24} color={theme.primary} /></View></View>
                <View style={styles.planFeatures}>{plan.features.map((feature, i) => (
                    <View key={i} style={styles.featureItem}><Ionicons name="checkmark-sharp" size={16} color={theme.success} style={{ marginRight: 8 }} /><Text style={styles.planFeatureText}>{feature}</Text></View>
                ))}</View>
            </View>
        </TouchableOpacity>
    ));

    const PaymentMethodCard = memo(({ method, logo, isSelected, onSelect }) => (
        <TouchableOpacity style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]} onPress={onSelect}>
            <Image source={logo} style={styles.paymentMethodLogo} />
            <Text style={styles.paymentOptionText}>{method}</Text>
            <Ionicons name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={26} color={isSelected ? theme.primary : theme.border} />
        </TouchableOpacity>
    ));

    const renderPlanSelection = () => (
        <View style={styles.flowContainer}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.titleCard}><Text style={styles.screenTitle}>{isChangingPlan ? 'Change Your Plan' : 'Choose Your Plan'}</Text><Text style={styles.screenSubtitle}>Find the perfect speed for your home.</Text></View>
                {isLoadingPlans ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> :
                    plans.map((plan) => <PlanCard key={plan._id} plan={plan} isSelected={selectedPlan?._id === plan._id} onSelect={() => setSelectedPlan(plan)} />)
                }
            </ScrollView>
            <View style={styles.fixedButtonContainer}>
                {isChangingPlan ? (
                    <TouchableOpacity style={[styles.primaryButton, !selectedPlan && styles.buttonDisabled]} onPress={() => setFlowStep(2)} disabled={!selectedPlan}><Text style={styles.buttonText}>PROCEED TO CONFIRMATION</Text></TouchableOpacity>
                ) : (
                    <TouchableOpacity style={[styles.primaryButton, !selectedPlan && styles.buttonDisabled]} onPress={handleProceedToPaymentMethod} disabled={!selectedPlan}><Text style={styles.buttonText}>PROCEED TO PAYMENT</Text></TouchableOpacity>
                )}
            </View>
        </View>
    );
   const formattedAddress = React.useMemo(() => [installationAddress.address, installationAddress.phase, installationAddress.city, installationAddress.province, installationAddress.zipCode].filter(Boolean).join(', '), [installationAddress]);
    const renderPaymentAndLocationSelection = () => {
        
        return (
            <KeyboardAvoidingView style={styles.flowContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.contentContainer}>
                    <View style={styles.titleCard}><Text style={styles.screenTitle}>Final Step</Text><Text style={styles.screenSubtitle}>Confirm your details to get connected.</Text></View>
                    <View style={styles.stepIndicatorContainer}><TouchableOpacity onPress={() => setFlowStep(1)} style={{ padding: 5, marginRight: 10 }}><Ionicons name="arrow-back-circle" size={24} color={theme.primary} /></TouchableOpacity><View style={styles.stepIndicator} /><View style={[styles.stepIndicator, styles.stepIndicatorActive]} /></View>
                    <View style={styles.amountBox}><Text style={styles.amountLabel}>Total for {selectedPlan?.name}:</Text><Text style={styles.amountValue}>₱{selectedPlan?.price.toFixed(2)}</Text></View>
                    
                    <View style={styles.inputGroup}>
                        <View style={styles.addressHeader}><Text style={styles.inputLabel}>Installation Address</Text><TouchableOpacity onPress={() => navigation.navigate('EditProfileScreen')}><Text style={styles.changeAddressText}>Change</Text></TouchableOpacity></View>
                        <View style={styles.addressDisplayBox}><Ionicons name="location-outline" size={24} color={theme.textSecondary} style={styles.addressIcon} /><Text style={styles.addressDisplayText}>{formattedAddress || "No address set in profile."}</Text></View>
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Payment Method</Text>
                        <PaymentMethodCard method="GCash" logo={GCASH_LOGO_IMAGE} isSelected={selectedPaymentMethod === 'GCash'} onSelect={() => setSelectedPaymentMethod('GCash')} />
                        <PaymentMethodCard method="Cash on Delivery / Installation" logo={COD_LOGO_IMAGE} isSelected={selectedPaymentMethod === 'Cash on Delivery'} onSelect={() => setSelectedPaymentMethod('Cash on Delivery')} />
                    </View>
                </ScrollView>
                <View style={styles.fixedButtonContainer}>
                    <TouchableOpacity style={[styles.primaryButton, (!selectedPaymentMethod || !formattedAddress) && styles.buttonDisabled]} onPress={handleFinalSubmission} disabled={!selectedPaymentMethod || !formattedAddress}><Text style={styles.buttonText}>SUBMIT APPLICATION</Text></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        );
    };

    
    const renderGcashModal = () => (
        <Modal animationType="slide" transparent={true} visible={isGcashModalVisible} onRequestClose={() => setGcashModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}><Text style={styles.modalTitle}>Pay with GCash</Text><TouchableOpacity onPress={() => setGcashModalVisible(false)}><Ionicons name="close" size={28} color={theme.textSecondary} /></TouchableOpacity></View>
                    <ScrollView contentContainerStyle={{alignItems: 'center', paddingBottom: 100}}>
                        <Text style={styles.modalDescription}>1. Scan the QR or send payment to the number below.</Text>
                        <Image source={GCASH_QR_IMAGE} style={styles.paymentModalImage} resizeMode="contain" />
                        <View style={styles.gcashDetailsContainer}>
                            <Text style={styles.gcashDetailLabel}>GCash Name:</Text><Text style={styles.gcashDetailValue}>Fibear Inc.</Text>
                            <Text style={styles.gcashDetailLabel}>GCash Number:</Text><Text style={styles.gcashDetailValue}>0912-345-6789</Text>
                        </View>
                        <Text style={styles.modalDescription}>2. Upload a screenshot of your receipt.</Text>
                        <View style={styles.uploadSection}>
                            {proofOfPayment ? (
                                <View style={{alignItems: 'center'}}>
                                    {/* --- FIX #4: The Image source URI is now the base64 string itself --- */}
                                    <Image source={{ uri: proofOfPayment }} style={styles.proofPreviewImage} />
                                    <TouchableOpacity style={styles.changeImageButton} onPress={() => setPhotoSourceSheetVisible(true)}>
                                        <Text style={styles.changeImageText}>Change Screenshot</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.uploadButton} onPress={() => setPhotoSourceSheetVisible(true)}>
                                    <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
                                    <Text style={styles.uploadButtonText}>Upload Proof</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                    <View style={styles.fixedModalButtonContainer}>
                        {/* --- FIX #5: Pass the proofOfPayment base64 string directly --- */}
                        <TouchableOpacity style={[styles.primaryButton, (!proofOfPayment || isSubmitting) && styles.buttonDisabled]} onPress={() => handleNewSubscriptionSubmit('GCash', proofOfPayment)} disabled={!proofOfPayment || isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>CONFIRM PAYMENT</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
    
    const renderMainFlowContent = () => {
        if (isChangingPlan) {
            if (flowStep === 2) return <ChangePlanConfirmation newPlan={selectedPlan} onConfirm={handleChangePlanSubmit} onCancel={() => setFlowStep(1)} isSubmitting={isSubmitting} />;
            return renderPlanSelection();
        } else { 
            if (flowStep === 2) return renderPaymentAndLocationSelection();
            return renderPlanSelection();
        }
    };

    return (
        <>
            {renderMainFlowContent()} 
            {isGcashModalVisible && renderGcashModal()} 
            {isPhotoSourceSheetVisible && (
                <PhotoSourceSheet isVisible={isPhotoSourceSheetVisible} onChooseCamera={pickImageFromCamera} onChooseGallery={pickImageFromGallery} onClose={() => setPhotoSourceSheetVisible(false)} />
            )}
        </>
    );
});

// --- MAIN SCREEN ROUTER ---
function SubscriptionScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { subscriptionStatus, subscriptionData, isLoading, clearSubscription, cancelSubscription, activePlan } = useSubscription();
    const { theme } = useTheme();
    const { showAlert } = useAlert();
    const [isPlanChangeFlowActive, setPlanChangeFlowActive] = useState(route.params?.isChangingPlan || false);
  
    useFocusEffect(
        useCallback(() => {
            if (route.params?.isChangingPlan) {
                setPlanChangeFlowActive(true);
                navigation.setParams({ isChangingPlan: undefined });
            }
        }, [route.params?.isChangingPlan, navigation])
    );

    useEffect(() => {
        if (subscriptionStatus !== 'active') {
            setPlanChangeFlowActive(false);
        }
    }, [subscriptionStatus]);
  
    const handleClearAndResubscribe = useCallback(async () => { await clearSubscription(); }, [clearSubscription]);
    const handleCancel = useCallback((type) => {
        const title = type === 'installation' ? 'Cancel Application' : 'Cancel Submission';
        const message = type === 'installation' ? 'Are you sure you want to cancel your subscription application?' : 'Are you sure? To request a refund, please contact support.';
        showAlert(title, message, [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
              try { await cancelSubscription(); } catch (error) { showAlert('Error', 'Could not cancel subscription.'); }
            },
          },
        ]);
    }, [showAlert, cancelSubscription]);
    const handleFlowFinish = useCallback(() => { setPlanChangeFlowActive(false); }, []);
  
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
        {(() => {
            switch (subscriptionStatus) {
                case 'active':
                    return isPlanChangeFlowActive 
                        ? <PlanSelectionFlow isChangingPlan={true} onFlowFinish={handleFlowFinish} /> 
                        : <MySubscriptionScreen />;
                case 'pending_change':
                    return <PendingChangeView />;
                case 'pending_installation':
                    return <StatusView theme={theme} illustration={ILLUSTRATIONS.INSTALLATION} title="Awaiting Installation" text="Our field agent will contact you within 1-2 business days." onCancel={() => handleCancel('installation')} />;
                case 'pending_verification':
                    return <StatusView theme={theme} illustration={ILLUSTRATIONS.VERIFICATION} title="Verification in Progress" text="Our team is verifying your payment. This usually takes a few hours." onCancel={() => handleCancel('verification')} />;
                case 'declined':
                    return <StatusView theme={theme} illustration={ILLUSTRATIONS.DECLINED} title="Submission Declined" text="Your recent payment was not approved." buttonText="Try Again" onButtonPress={handleClearAndResubscribe}>{subscriptionData?.declineReason && (<View style={getStyles(theme).reasonBox}><Text style={getStyles(theme).reasonTitle}>Reason:</Text><Text style={getStyles(theme).reasonText}>{subscriptionData.declineReason}</Text></View>)}</StatusView>;
                case 'suspended':
                    return <StatusView theme={theme} illustration={ILLUSTRATIONS.SUSPENDED} title="Subscription Suspended" text="Your plan is suspended due to non-payment. Please pay your outstanding bill to reactivate your service." buttonText="PAY MY BILL" onButtonPress={() => navigation.navigate('PayBills')} />;
                case 'cancelled':
                default:
                    return <PlanSelectionFlow onFlowFinish={handleFlowFinish} />;
            }
        })()}
        <BottomNavBar activeScreen="Plan" />
      </SafeAreaView>
    );
}

export default memo(SubscriptionScreen);

// --- STYLESHEET ---
const getStyles = (theme) =>
  StyleSheet.create({
    amountBox: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 16, borderWidth: 1, marginVertical: 20, padding: 20 },
    amountLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '500' },
    amountValue: { color: theme.text, fontSize: 28, fontWeight: 'bold', marginTop: 4 },
    arrowSeparator: { alignSelf: 'center', marginVertical: 15 },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    cancelButtonText: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
    cancelChangeButton: { alignItems: 'center', backgroundColor: theme.danger, borderRadius: 14, flexDirection: 'row', height: 54, justifyContent: 'center', padding: 16, width: '100%' },
    cancelChangeButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    cancelStatusButton: { alignItems: 'center', backgroundColor: 'transparent', borderRadius: 14, marginTop: 10, padding: 16 },
    changeImageButton: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 8, borderWidth: 1, padding: 10 },
    changeImageText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
    container: { backgroundColor: theme.background, flex: 1 },
    contentContainer: { paddingBottom: 200, paddingHorizontal: 20, paddingTop: 20 },
    featureItem: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
    fixedButtonContainer: { backgroundColor: 'transparent', bottom: 115, left: 20, position: 'absolute', right: 20 },
    fixedModalButtonContainer: { backgroundColor: theme.surface, borderColor: theme.border, borderTopWidth: 1, bottom: 0, left: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, position: 'absolute', right: 0 },
    flowContainer: { backgroundColor: theme.background, flex: 1 },
    gcashDetailLabel: { color: theme.textSecondary, fontSize: 13 },
    gcashDetailValue: { color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 8 },
    gcashDetailsContainer: { alignSelf: 'center', backgroundColor: theme.background, borderRadius: 8, marginTop: 20, padding: 15, width: '90%' },
    inputGroup: { marginBottom: 20 },
    inputLabel: { color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 10 },
    addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
},
changeAddressText: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: '600',
},
addressDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    minHeight: 54,
},
addressIcon: {
    marginRight: 10,
},
addressDisplayText: {
    flex: 1, // Allows text to wrap
    fontSize: 16,
    color: theme.text,
    lineHeight: 22,
},
    modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '95%', overflow: 'hidden', width: '100%' },
    modalDescription: { color: theme.textSecondary, fontSize: 15, lineHeight: 22, marginVertical: 20, paddingHorizontal: 10, textAlign: 'center' },
    modalHeader: { alignItems: 'center', borderBottomColor: theme.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
    modalOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.7)', flex: 1, justifyContent: 'flex-end' },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    noticeText: { backgroundColor: theme.background, borderRadius: 10, color: theme.textSecondary, fontSize: 14, fontStyle: 'italic', lineHeight: 20, marginTop: 20, padding: 20, textAlign: 'center' },
    paymentMethodLogo: { height: 32, marginRight: 15, resizeMode: 'contain', width: 32 },
    paymentModalImage: { alignSelf: 'center', borderRadius: 8, height: 200, width: 200 },
    paymentOption: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 14, borderWidth: 2, flexDirection: 'row', marginBottom: 10, padding: 16 },
    paymentOptionSelected: { backgroundColor: `${theme.primary}1A`, borderColor: theme.primary },
    paymentOptionText: { color: theme.text, flex: 1, fontSize: 17, fontWeight: '600' },
    planCard: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 16, borderWidth: 2, marginBottom: 15, padding: 20, position: 'relative' },
    planCardSelected: { backgroundColor: `${theme.primary}1A`, borderColor: theme.primary },
    planFeatureText: { color: theme.text, fontSize: 15, lineHeight: 22 },
    planFeatures: { borderTopColor: theme.border, borderTopWidth: 1, marginTop: 10, paddingTop: 15 },
    planHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    planIconContainer: { alignItems: 'center', backgroundColor: `${theme.primary}20`, borderRadius: 25, height: 50, justifyContent: 'center', width: 50 },
    planInfoCard: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 16, borderWidth: 1, padding: 20, width: '100%' },
    planInfoTitle: { color: theme.textSecondary, fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 15 },
    planName: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    planPrice: { color: theme.textSecondary, fontSize: 16, fontWeight: '600' },
    primaryButton: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 14, flexDirection: 'row', flex: 2, height: 54, justifyContent: 'center', padding: 16 },
    proofPreviewImage: { borderColor: theme.border, borderRadius: 12, borderWidth: 1, height: 150, marginBottom: 10, width: 150 },
    reasonBox: { backgroundColor: `${theme.danger}1A`, borderLeftColor: theme.danger, borderLeftWidth: 4, borderRadius: 12, marginVertical: 25, maxWidth: 320, padding: 15, width: '100%' },
    reasonText: { color: theme.text, fontSize: 15, lineHeight: 22 },
    reasonTitle: { color: theme.danger, fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
    screenSubtitle: { color: theme.textSecondary, fontSize: 16, marginTop: 8, textAlign: 'center' },
    screenTitle: { color: theme.text, fontSize: 26, fontWeight: 'bold' },
    secondaryButton: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 14, borderWidth: 2, flex: 1, height: 54, justifyContent: 'center', padding: 16 },
    secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
    selectedBadge: { backgroundColor: theme.primary, borderRadius: 6, bottom: 1, paddingHorizontal: 10, paddingVertical: 5, position: 'absolute', right: 1 },
    selectedBadgeText: { color: theme.textOnPrimary, fontSize: 10, fontWeight: 'bold' },
    statusButtonContainer: { alignItems: 'center', marginTop: 30, maxWidth: 320, width: '100%' },
    statusContainer: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: 30 },
    statusIllustration: { height: 220, marginBottom: 20, resizeMode: 'contain', width: 220 },
    statusText: { color: theme.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center' },
    statusTitle: { color: theme.text, fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    stepIndicator: { backgroundColor: theme.border, borderRadius: 4, flex: 1, height: 8 },
    stepIndicatorActive: { backgroundColor: theme.primary },
    stepIndicatorContainer: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 20 },
    titleCard: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 20, borderWidth: 1, marginBottom: 20, padding: 25 },
    uploadButton: { alignItems: 'center', backgroundColor: theme.background, borderColor: theme.primary, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', padding: 15 },
    uploadButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600', marginLeft: 10 },
    uploadSection: { alignItems: 'center', marginTop: 20, padding: 20, width: '100%' },
  });