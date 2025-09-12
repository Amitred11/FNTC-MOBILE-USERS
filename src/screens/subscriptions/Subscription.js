// screens/SubscriptionScreen.js
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
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

import MySubscriptionScreen from './MySubscriptionScreen';
import { useSubscription, useAuth, useTheme, useMessage, useAlert } from '../../contexts';
import { BottomNavBar } from '../../components/BottomNavBar';
import { requestMediaLibraryPermissions, requestCameraPermissions } from '../../utils/permissions';
import PhotoSourceSheet from '../../components/PhotoSourceSheet';

// --- Static Assets ---
const GCASH_LOGO_IMAGE = require('../../assets/images/payments/gcash.png');
const GCASH_QR_IMAGE = require('../../assets/images/payments/gcashqr.png');
const COD_LOGO_IMAGE = require('../../assets/images/payments/cod.png');
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

const PlanInfoCard = memo(({ title, plan, theme }) => {
    const styles = getStyles(theme);
    if (!plan) return null;
    return (
        <View style={styles.planInfoCard}>
            <Text style={styles.planInfoTitle}>{title}</Text>
            <View style={styles.planHeader}>
                <Ionicons name="wifi" size={28} color={theme.primary} />
                <View style={styles.planInfoTextContainer}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>{plan.priceLabel}</Text>
                </View>
            </View>
        </View>
    );
});


// --- Status-Specific Views ---
const PendingChangeView = memo(() => {
    // ... (This component is well-structured and remains unchanged)
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
        <ScrollView contentContainerStyle={styles.statusContainer}>
            <Animatable.Image animation="fadeInUp" duration={600} delay={100} source={ILLUSTRATIONS.VERIFICATION} style={styles.statusIllustration} />
            <Animatable.Text animation="fadeInUp" delay={200} style={styles.statusTitle}>Request Received!</Animatable.Text>
            <Animatable.Text animation="fadeInUp" delay={300} style={styles.statusText}>Your request is being processed. This may take a few hours to reflect on your account.</Animatable.Text>
            <Animatable.View animation="fadeInUp" delay={400} style={styles.infoStack}>
                <PlanInfoCard title="CURRENT PLAN" plan={activePlan} theme={theme} />
                <Ionicons name="arrow-down-circle-outline" size={32} color={theme.textSecondary} style={styles.arrowSeparator} />
                <PlanInfoCard title="REQUESTED PLAN" plan={subscriptionData.pendingPlanId} theme={theme} />
            </Animatable.View>
            <Animatable.View animation="fadeInUp" delay={500} style={styles.statusButtonContainer}>
                <TouchableOpacity style={styles.cancelStatusButton} onPress={handleCancelRequest}><Text style={styles.cancelButtonText}>Cancel This Request</Text></TouchableOpacity>
            </Animatable.View>
        </ScrollView>
    );
});


// --- Core Subscription Flow Components ---
const GcashSheet = memo(({ isVisible, onClose, onSubmit, onImagePick, proofOfPayment, isSubmitting, plan }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={styles.sheetOverlay}
            >
                {/* The overlay now handles the dismissal */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.sheetDismissArea} />
                </TouchableWithoutFeedback>
                
                {/* The content itself is wrapped in an Animatable View and prevents dismissal */}
                <Animatable.View animation="slideInUp" duration={400} style={styles.sheetContent}>
                    <TouchableWithoutFeedback>
                        <>
                            <View style={styles.sheetHeader}>
                                <View style={styles.gripper} />
                                <Text style={styles.sheetTitle}>Pay with GCash</Text>
                            </View>
                            
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.sheetInnerContent}>
                                    {/* STEP 1 */}
                                    <View style={styles.stepContainer}>
                                        <Text style={styles.stepHeader}>Step 1: Send Payment</Text>
                                        <Text style={styles.stepDescription}>Scan the QR code below or manually send ₱{plan?.price.toFixed(2)} to our official GCash account.</Text>
                                        <View style={styles.gcashInfoBox}>
                                            <Image source={GCASH_QR_IMAGE} style={styles.gCashQrImage} />
                                            <View style={styles.gCashDetails}>
                                                <Text style={styles.gCashLabel}>Name</Text><Text style={styles.gCashValue}>Fibear Inc.</Text>
                                                <Text style={styles.gCashLabel}>Number</Text><Text style={styles.gCashValue}>0912-345-6789</Text>
                                            </View>
                                        </View>
                                    </View>
                                    {/* STEP 2 */}
                                    <View style={styles.stepContainer}>
                                        <Text style={styles.stepHeader}>Step 2: Upload Proof</Text>
                                        <Text style={styles.stepDescription}>Attach a screenshot of your successful transaction receipt. This is required for verification.</Text>
                                        {proofOfPayment ? (
                                            <View style={styles.proofPreviewContainer}>
                                                <Image source={{ uri: proofOfPayment }} style={styles.proofPreviewImage} />
                                                <TouchableOpacity onPress={onImagePick} style={styles.changeImageButton}><Ionicons name="repeat-outline" size={20} color={theme.textOnPrimary} /><Text style={styles.changeImageButtonText}>Change Screenshot</Text></TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity style={styles.uploadButton} onPress={onImagePick}><Ionicons name="cloud-upload-outline" size={28} color={theme.primary} /><Text style={styles.uploadButtonText}>Choose Screenshot</Text></TouchableOpacity>
                                        )}
                                    </View>
                                    
                                    {/* ACTION BUTTON - MOVED INSIDE SCROLLVIEW */}
                                    <View style={styles.sheetActions}>
                                        <TouchableOpacity style={[styles.primaryButton, (!proofOfPayment || isSubmitting) && styles.buttonDisabled]} onPress={onSubmit} disabled={!proofOfPayment || isSubmitting}>
                                            {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>Submit for Verification</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        </>
                    </TouchableWithoutFeedback>
                </Animatable.View>
            </KeyboardAvoidingView>
        </Modal>
    );
});

const Step1_PlanSelection = memo(({ theme, plans, isLoading, selectedPlan, onSelectPlan, onProceed, isChangingPlan }) => {
    const styles = getStyles(theme);
    const PlanCard = memo(({ plan, isSelected, onSelect }) => (
        <TouchableOpacity onPress={onSelect} activeOpacity={0.9} style={styles.planCard}>
            <LinearGradient colors={isSelected ? (theme.isDarkMode ? ['#0A84FF', '#0052A3'] : ['#007AFF', '#0052A3']) : [theme.surface, theme.surface]} style={StyleSheet.absoluteFill}/>
            {isSelected && <Ionicons name="sparkles" size={60} color="rgba(255,255,255,0.1)" style={styles.planCardBgIcon} />}
            <View style={styles.planHeader}>
                <View><Text style={[styles.planName, isSelected && styles.planTextSelected]}>{plan.name}</Text><Text style={[styles.planPrice, isSelected && styles.planTextSelected]}>{plan.priceLabel}</Text></View>
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

const Step2_PaymentAndLocation = memo(({ theme, selectedPlan, address, selectedPaymentMethod, onSelectPaymentMethod, onSubmit, onBack }) => {
    const styles = getStyles(theme);
    const navigation = useNavigation();
    const formattedAddress = [address.address, address.phase, address.city, address.province, address.zipCode].filter(Boolean).join(', ');

    const PaymentMethodCard = memo(({ method, logo, isSelected, onSelect }) => (
        <TouchableOpacity style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]} onPress={onSelect}>
            <Image source={logo} style={styles.paymentMethodLogo} />
            <View style={{flex: 1}}>
                <Text style={styles.paymentOptionTitle}>{method}</Text>
                <Text style={styles.paymentOptionDesc}>
                    {method === 'GCash' ? 'Pay online & upload proof' : 'Submit for approval, pay on first bill'}
                </Text>
            </View>
            <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>{isSelected && <View style={styles.radioDot} />}</View>
        </TouchableOpacity>
    ));

    return (
        <KeyboardAvoidingView style={styles.flowContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <Text style={styles.screenTitle}>Final Step</Text>
                <Text style={styles.screenSubtitle}>Confirm your details to get connected.</Text>
                <View style={styles.stepIndicatorContainer}>
                  <TouchableOpacity onPress={onBack} style={styles.stepIndicatorActive}><Ionicons name="checkmark-sharp" color={theme.textOnPrimary} size={16}/></TouchableOpacity>
                  <View style={styles.stepConnector}/>
                  <View style={[styles.stepIndicator, styles.stepIndicatorActive]}><Text style={styles.stepText}>2</Text></View>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Plan Summary</Text>
                    <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{selectedPlan?.name}</Text><Text style={styles.summaryValue}>₱{selectedPlan?.price.toFixed(2)}</Text></View>
                     <View style={styles.summaryRow}><Text style={styles.summaryLabel}>One-time Fee</Text><Text style={styles.summaryValue}>FREE</Text></View>
                    <View style={styles.summaryTotal}><Text style={styles.summaryTotalLabel}>Total Due Today</Text><Text style={styles.summaryTotalValue}>₱{selectedPlan?.price.toFixed(2)}</Text></View>
                </View>
                <View style={styles.inputGroup}>
                    <View style={styles.addressHeader}><Text style={styles.inputLabel}>Installation Address</Text><TouchableOpacity onPress={() => navigation.navigate('EditProfileScreen')}><Text style={styles.changeAddressText}>Change</Text></TouchableOpacity></View>
                    <View style={styles.addressDisplayBox}><Ionicons name="location-outline" size={24} color={theme.textSecondary} style={styles.addressIcon} /><Text style={styles.addressDisplayText}>{formattedAddress || "No address set in profile."}</Text></View>
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Payment Method</Text>
                    <PaymentMethodCard method="GCash" logo={GCASH_LOGO_IMAGE} isSelected={selectedPaymentMethod === 'GCash'} onSelect={() => onSelectPaymentMethod('GCash')} />
                    <PaymentMethodCard method="Cash on Delivery" logo={COD_LOGO_IMAGE} isSelected={selectedPaymentMethod === 'Cash on Delivery'} onSelect={() => onSelectPaymentMethod('Cash on Delivery')} />
                </View>
            </ScrollView>
            <View style={styles.fixedButtonContainer}>
                <TouchableOpacity style={[styles.primaryButton, (!selectedPaymentMethod || !formattedAddress) && styles.buttonDisabled]} onPress={onSubmit} disabled={!selectedPaymentMethod || !formattedAddress}>
                    <Text style={styles.buttonText}>Submit Application</Text>
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
                    <Ionicons name="arrow-down-circle-outline" size={32} color={theme.textSecondary} style={styles.arrowSeparator}/>
                    <PlanInfoCard title="TO (NEW PLAN)" plan={newPlan} theme={theme} />
                </View>
                <View style={styles.noticeBox}>
                    <Ionicons name="information-circle-outline" size={22} color={theme.accent} />
                    <Text style={styles.noticeText}>The plan change will take effect on your next billing cycle. Your current plan remains active until then.</Text>
                </View>
            </ScrollView>
            <View style={[styles.fixedButtonContainer, {gap: 10}]}>
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
    const { subscribeToPlan, changePlan } = useSubscription();
    const { user: profile, api } = useAuth();
    const { showMessage } = useMessage();
    const { theme } = useTheme();
    const { showAlert } = useAlert();

    // State
    const [flowStep, setFlowStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [plans, setPlans] = useState([]);
    const [isLoadingPlans, setIsLoadingPlans] = useState(true);
    const [isGcashSheetVisible, setGcashSheetVisible] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [proofOfPayment, setProofOfPayment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPhotoSheetVisible, setPhotoSheetVisible] = useState(false);
    const [installationAddress, setInstallationAddress] = useState({ address: '', phase: '', city: '', province: '', zipCode: '' });

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
        if (!selectedPlan) { showAlert('Select a Plan', 'Please choose a subscription plan to continue.'); return; }
        if (isChangingPlan) { setFlowStep(2); return; }
        if (!profile?.profile?.mobileNumber || !profile?.profile?.address) {
            showAlert('Profile Incomplete', 'Please complete your address and mobile number in your profile.',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Go to Profile', onPress: () => navigation.navigate('EditProfileScreen') }]
            );
            return;
        }
        setFlowStep(2);
    }, [selectedPlan, profile, showAlert, navigation, isChangingPlan]);

    const handleFinalSubmit = useCallback(async () => {
        if (!selectedPaymentMethod) { showAlert('Select Payment', 'Please choose a payment method.'); return; }
        if (!installationAddress.address) {
          showAlert("Address Required", "Please add an address to your profile before subscribing.", [{ text: "Go to Profile", onPress: () => navigation.navigate('EditProfileScreen') }]);
          return;
        }
        if (selectedPaymentMethod === 'GCash') setGcashSheetVisible(true);
        else if (selectedPaymentMethod === 'Cash on Delivery') handleNewSubscriptionSubmit('Cash on Delivery', null);
    }, [selectedPaymentMethod, installationAddress, showAlert, navigation]);

    const handleNewSubscriptionSubmit = useCallback(async (method, proofBase64) => {
        setIsSubmitting(true);
        try {
            await subscribeToPlan(selectedPlan, method, proofBase64, installationAddress);
            showMessage('Submission Received!', 'Your application is now pending.');
            if (isGcashSheetVisible) setGcashSheetVisible(false);
            if (onFlowFinish) onFlowFinish();
        } catch (error) {
            showAlert('Submission Failed', error.response?.data?.message || 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    }, [subscribeToPlan, selectedPlan, installationAddress, isGcashSheetVisible, showMessage, showAlert, onFlowFinish]);

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

    const pickImage = useCallback(async (picker) => {
        setPhotoSheetVisible(false);
        const result = await picker({ allowsEditing: true, quality: 0.5, base64: true });
        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setProofOfPayment(`data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`);
        }
    }, []);

    const pickImageFromCamera = useCallback(async () => {
        const hasPermission = await requestCameraPermissions();
        if (hasPermission) pickImage(ImagePicker.launchCameraAsync);
    }, [pickImage]);

    const pickImageFromGallery = useCallback(async () => {
        const hasPermission = await requestMediaLibraryPermissions();
        if (hasPermission) pickImage(ImagePicker.launchImageLibraryAsync);
    }, [pickImage]);

    // Render Logic
    const renderContent = () => {
        if (isChangingPlan) {
            return flowStep === 1 ? (
                <Step1_PlanSelection theme={theme} plans={plans} isLoading={isLoadingPlans} selectedPlan={selectedPlan} onSelectPlan={setSelectedPlan} onProceed={handleProceed} isChangingPlan={true}/>
            ) : (
                <ChangePlanConfirmation theme={theme} newPlan={selectedPlan} onConfirm={handleChangePlanSubmit} onCancel={() => setFlowStep(1)} isSubmitting={isSubmitting}/>
            );
        }
        return flowStep === 1 ? (
            <Step1_PlanSelection theme={theme} plans={plans} isLoading={isLoadingPlans} selectedPlan={selectedPlan} onSelectPlan={setSelectedPlan} onProceed={handleProceed} isChangingPlan={false}/>
        ) : (
            <Step2_PaymentAndLocation theme={theme} selectedPlan={selectedPlan} address={installationAddress} selectedPaymentMethod={selectedPaymentMethod} onSelectPaymentMethod={setSelectedPaymentMethod} onSubmit={handleFinalSubmit} onBack={() => setFlowStep(1)}/>
        );
    };

    return (
        <>
            {renderContent()}
            <GcashSheet isVisible={isGcashSheetVisible} onClose={() => setGcashSheetVisible(false)} onSubmit={() => handleNewSubscriptionSubmit('GCash', proofOfPayment)} onImagePick={() => setPhotoSheetVisible(true)} proofOfPayment={proofOfPayment} isSubmitting={isSubmitting} plan={selectedPlan}/>
            <PhotoSourceSheet isVisible={isPhotoSheetVisible} onChooseCamera={pickImageFromCamera} onChooseGallery={pickImageFromGallery} onClose={() => setPhotoSheetVisible(false)} />
        </>
    );
});


// --- Main Screen Router ---
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
          { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
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
                return <PendingChangeView />;

            case 'pending_installation':
                return <StatusDisplay 
                    theme={theme} 
                    illustration={ILLUSTRATIONS.INSTALLATION} 
                    title="Awaiting Installation" 
                    text="Your application is approved! Our field agent will contact you within 1-2 business days to schedule your installation and collect payment." 
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
    screenTitle: { color: theme.text, fontSize: 28, fontWeight: 'bold', marginTop: 20, paddingHorizontal: 10 },
    screenSubtitle: { color: theme.textSecondary, fontSize: 16, marginTop: 8, marginBottom: 30, paddingHorizontal: 10, lineHeight: 22 },

    // --- Plan Cards ---
    planCard: { borderRadius: 24, marginBottom: 16, padding: 20, overflow: 'hidden' },
    planCardBgIcon: { position: 'absolute', right: -5, top: '50%', transform: [{ translateY: -30 }] },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    planName: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    planPrice: { color: theme.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 4 },
    planTextSelected: { color: theme.textOnPrimary, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 },
    planFeatures: { borderTopColor: 'rgba(255,255,255,0.2)', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 20, paddingTop: 20 },
    featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    planFeatureText: { color: theme.text, fontSize: 15, lineHeight: 22 },

    // --- Radio Buttons ---
    radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    radioCircleSelected: { borderColor: theme.textOnPrimary },
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

    // --- Payment Method Cards ---
    paymentOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
    paymentOptionSelected: { borderColor: theme.primary },
    paymentMethodLogo: { width: 40, height: 40, resizeMode: 'contain', marginRight: 15 },
    paymentOptionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    paymentOptionDesc: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },

    // --- Status Screens ---
    statusContainer: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', paddingBottom: 170, padding: 30 },
    statusIllustration: { height: 220, width: '100%', resizeMode: 'contain', marginBottom: 30 },
    statusTitle: { color: theme.text, fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    statusText: { color: theme.textSecondary, fontSize: 16, lineHeight: 24, textAlign: 'center' },
    statusButtonContainer: { alignItems: 'center', marginTop: 30, width: '100%', paddingHorizontal: 20, gap: 10 },
    cancelButtonText: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },

    // --- Generic Info Displays ---
    infoStack: { width: '100%', marginVertical: 20, gap: 10 },
    planInfoCard: { backgroundColor: theme.surface, borderRadius: 16, padding: 20, width: '100%' },
    planInfoTitle: { color: theme.textSecondary, fontSize: 13, fontWeight: 'bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    planInfoTextContainer: { marginLeft: 15 },
    arrowSeparator: { alignSelf: 'center', marginVertical: 10 },
    noticeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.accent}1A`, padding: 15, borderRadius: 12, marginTop: 20 },
    noticeText: { flex: 1, marginLeft: 10, color: theme.textSecondary, fontSize: 14, lineHeight: 20 },

    // --- Buttons ---
    fixedButtonContainer: { position: 'absolute', bottom: 105, left: 20, right: 20, flexDirection: 'row' },
    primaryButton: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 16, flex: 1, height: 56, justifyContent: 'center' },
    secondaryButton: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 16, borderWidth: 1, flex: 1, height: 56, justifyContent: 'center' },
    buttonDisabled: { backgroundColor: theme.disabled, opacity: 0.7 },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },

    // --- Bottom Sheet (GCash) ---
    sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    // The overlay itself pushes content to the bottom
    justifyContent: 'flex-end',
},
sheetDismissArea: { // An invisible area that fills the top part of the screen
    ...StyleSheet.absoluteFillObject,
},
sheetContent: { 
    backgroundColor: theme.surface, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '90%', // Limit the sheet's height on the screen
},
sheetHeader: { 
    borderBottomWidth: 1, 
    borderBottomColor: theme.border 
},
gripper: { width: 40, height: 5, backgroundColor: theme.border, borderRadius: 2.5, alignSelf: 'center', marginVertical: 12 },
sheetTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', paddingBottom: 16 },

sheetInnerContent: { 
    padding: 20 
},
stepContainer: { marginBottom: 24 },
stepHeader: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
stepDescription: { fontSize: 14, color: theme.textSecondary, lineHeight: 20, marginBottom: 16 },
gcashInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, padding: 16, borderRadius: 12 },
gCashQrImage: { width: 100, height: 100, borderRadius: 8 },
gCashDetails: { marginLeft: 16, flex: 1 },
gCashLabel: { fontSize: 13, color: theme.textSecondary },
gCashValue: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 },
uploadButton: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: theme.background, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border },
uploadButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600', marginTop: 8 },
proofPreviewContainer: { alignItems: 'center' },
proofPreviewImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain', marginBottom: 12, backgroundColor: theme.background },
changeImageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, position: 'absolute', bottom: 20 },
changeImageButtonText: { color: theme.textOnPrimary, fontWeight: 'bold', marginLeft: 8 },
sheetActions: { 
    marginTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 10 : 0,
},
});