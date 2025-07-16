import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, 
    Image, Modal, ActivityIndicator, KeyboardAvoidingView,
    Platform, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import MySubscriptionScreen from './MySubscriptionScreen';
import { useSubscription, useAuth, useTheme, useMessage, useAlert } from '../contexts';
import * as Animatable from 'react-native-animatable';
import { BottomNavBar } from '../components/BottomNavBar';
import { requestMediaLibraryPermissions, requestCameraPermissions } from '../utils/permissions'; 
import PhotoSourceSheet from '../components/PhotoSourceSheet'; 

// --- Static Assets & Data ---
const GCASH_LOGO_IMAGE = require('../assets/images/gcash.png');
const GCASH_QR_IMAGE = require('../assets/images/gcashqr.png');
const ILLUSTRATIONS = {
    INSTALLATION: require('../assets/images/technician.png'),
    VERIFICATION: require('../assets/images/completedplan.png'),
    DECLINED: require('../assets/images/declined.png'),
    CANCELLED: require('../assets/images/cancelled.png'),
};

// --- Reusable "Status" Component ---
const StatusView = ({ illustration, title, text, children, buttonText, onButtonPress, onCancel, theme }) => {
    const styles = getStyles(theme);
    return (
        <ScrollView contentContainerStyle={styles.statusContainer}>
            <Animatable.Image animation="fadeInUp" duration={600} delay={100} source={illustration} style={styles.statusIllustration} />
            <Animatable.Text animation="fadeInUp" delay={200} style={styles.statusTitle}>{title}</Animatable.Text>
            <Animatable.Text animation="fadeInUp" delay={300} style={styles.statusText}>{text}</Animatable.Text>
            {children}
            <View style={styles.statusButtonContainer}>
                {buttonText && onButtonPress && (<Animatable.View animation="fadeInUp" delay={400} style={{width: '100%'}}><TouchableOpacity style={styles.primaryButton} onPress={onButtonPress}><Text style={styles.buttonText}>{buttonText}</Text></TouchableOpacity></Animatable.View>)}
                {onCancel && (<Animatable.View animation="fadeInUp" delay={buttonText ? 500 : 400} style={{width: '100%'}}><TouchableOpacity style={styles.cancelStatusButton} onPress={onCancel}><Text style={styles.cancelButtonText}>Cancel Application</Text></TouchableOpacity></Animatable.View>)}
            </View>
        </ScrollView>
    );
};

// --- Reusable Plan Info Card Component ---
const PlanInfoCard = ({ title, plan, theme }) => {
    const styles = getStyles(theme);
    if (!plan) return null;
    return (
        <View style={styles.planInfoCard}>
            <Text style={styles.planInfoTitle}>{title}</Text>
            <View style={styles.planHeader}><View><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planPrice}>{plan.priceLabel}</Text></View><View style={styles.planIconContainer}><Ionicons name="wifi" size={24} color={theme.primary} /></View></View>
        </View>
    );
};

// --- Pending Plan Change Confirmation View ---
const PendingChangeView = () => {
    const { theme } = useTheme();
    const { subscriptionData, cancelPlanChange, activePlan, isLoading } = useSubscription();
    const styles = getStyles(theme);
    const { showAlert } = useAlert(); 
    const { showMessage } = useMessage();
     const currentPlan = activePlan; 
    const requestedPlan = subscriptionData?.pendingPlanId;

    const handleCancelRequest = () => {
        showAlert("Cancel Request", "Are you sure you want to cancel your plan change request?", [
            { text: "No", style: "cancel" },
            { text: "Yes, Cancel", style: "destructive", onPress: async () => { try { await cancelPlanChange(); showMessage("Request Cancelled", "Your plan change request has been withdrawn."); } catch (error) { showAlert("Error", "Could not cancel the request. Please try again."); } } }
        ]);
    };

    if (isLoading || !currentPlan || !requestedPlan) {
        return (
            <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
         <ScrollView contentContainerStyle={[styles.statusContainer, { paddingBottom: 120 }]}>
            <Animatable.Image animation="fadeInUp" duration={600} delay={100} source={ILLUSTRATIONS.VERIFICATION} style={styles.statusIllustration} />
            <Animatable.Text animation="fadeInUp" delay={200} style={styles.statusTitle}>Request Received!</Animatable.Text>
            <Animatable.Text animation="fadeInUp" delay={300} style={styles.statusText}>Your request to change plans is being processed. This may take a few hours to reflect on your account.</Animatable.Text>
            <Animatable.View animation="fadeInUp" delay={400} style={{width: '100%', marginTop: 20}}>
                <PlanInfoCard title="CURRENT PLAN" plan={currentPlan} theme={theme} />
                <Ionicons name="arrow-down-circle-outline" size={32} color={theme.textSecondary} style={styles.arrowSeparator} />
                <PlanInfoCard title="REQUESTED PLAN" plan={requestedPlan} theme={theme} />
            </Animatable.View>
            <Animatable.View animation="fadeInUp" delay={500} style={styles.statusButtonContainer}>
                <TouchableOpacity style={styles.cancelChangeButton} onPress={handleCancelRequest}><Text style={styles.cancelChangeButtonText}>Cancel This Request</Text></TouchableOpacity>
            </Animatable.View>
        </ScrollView>
    );
};

// --- Change Plan Confirmation Component ---
const ChangePlanConfirmation = ({ newPlan, onConfirm, onCancel, isSubmitting }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { activePlan, isLoading } = useSubscription();  
    const currentPlan = activePlan;

    if (isLoading || !currentPlan) {
        return (
            <View style={styles.flowContainer}>
                <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={styles.flowContainer}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.titleCard}><Text style={styles.screenTitle}>Confirm Your Change</Text><Text style={styles.screenSubtitle}>Please review your plan change before submitting.</Text></View>
                <View style={{width: '100%'}}><PlanInfoCard title="FROM (CURRENT PLAN)" plan={currentPlan} theme={theme} /><Ionicons name="arrow-down-circle-outline" size={32} color={theme.textSecondary} style={styles.arrowSeparator} /><PlanInfoCard title="TO (NEW PLAN)" plan={newPlan} theme={theme} /></View>
                <Text style={styles.noticeText}>Note: The plan change will take effect on your next billing cycle. Your current plan remains active until then.</Text>
            </ScrollView>
            <View style={[styles.fixedButtonContainer, {flexDirection: 'row', gap: 10}]}>
                <TouchableOpacity style={[styles.secondaryButton]} onPress={onCancel} disabled={isSubmitting}><Text style={styles.secondaryButtonText}>GO BACK</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]} onPress={onConfirm} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>SUBMIT REQUEST</Text>}</TouchableOpacity>
            </View>
        </View>
    );
};

// --- MAIN SCREEN ROUTER ---
export default function SubscriptionScreen({ route }) {
    const isChangingPlan = route.params?.isChangingPlan || false;
    const { 
        subscriptionStatus, 
        subscriptionData, 
        isLoading, 
        refreshSubscription, 
        clearSubscription, 
        cancelSubscription,
        activePlan 
    } = useSubscription();
    const { theme } = useTheme();
    const { showAlert } = useAlert();
    const [refreshing, setRefreshing] = useState(false);

    const navigation = useNavigation(); // Get navigation from hook

    const handleClearAndResubscribe = async () => { await clearSubscription(); };
    const onRefresh = useCallback(async () => { setRefreshing(true); await refreshSubscription(); setRefreshing(false); }, [refreshSubscription]);
    const handleCancel = (type) => { const title = type === 'installation' ? "Cancel Application" : "Cancel Submission"; const message = type === 'installation' ? "Are you sure you want to cancel your subscription application?" : "Are you sure? To request a refund, please contact support."; showAlert(title, message, [{ text: "No", style: "cancel" }, { text: "Yes, Cancel", style: "destructive", onPress: async () => { try { await cancelSubscription(); } catch (error) { showAlert("Error", "Could not cancel subscription."); } } }]); };

    const renderContent = () => {
        if (isLoading && !refreshing) {
            return <ActivityIndicator style={{flex: 1}} size="large" color={theme.primary} />;
        }

        if (isChangingPlan && !activePlan) {
            return <ActivityIndicator style={{flex: 1}} size="large" color={theme.primary} />;
        }

        switch (subscriptionStatus) {
            case 'active': return isChangingPlan ? <PlanSelectionFlow isChangingPlan={true} navigation={navigation} /> : <MySubscriptionScreen />;
            case 'pending_change': return <PendingChangeView />;
            case 'pending_installation': return <StatusView theme={theme} illustration={ILLUSTRATIONS.INSTALLATION} title="Awaiting Installation" text="Our field agent will contact you within 1-2 business days." onCancel={() => handleCancel('installation')} />;
            case 'pending_verification': return <StatusView theme={theme} illustration={ILLUSTRATIONS.VERIFICATION} title="Verification in Progress" text="Our team is verifying your payment. This usually takes a few hours." onCancel={() => handleCancel('verification')} />;
            case 'declined': return <StatusView theme={theme} illustration={ILLUSTRATIONS.DECLINED} title="Submission Declined" text="Your recent payment was not approved." buttonText="Try Again" onButtonPress={handleClearAndResubscribe}>{subscriptionData?.declineReason && (<View style={getStyles(theme).reasonBox}><Text style={getStyles(theme).reasonTitle}>Reason:</Text><Text style={getStyles(theme).reasonText}>{subscriptionData.declineReason}</Text></View>)}</StatusView>;
            case 'cancelled': return <StatusView theme={theme} illustration={ILLUSTRATIONS.CANCELLED} title="No Active Subscription" text="Ready to get back online? Explore our plans." buttonText="SUBSCRIBE NOW" onButtonPress={handleClearAndResubscribe} />;
            case 'suspended': return (<StatusView theme={theme} illustration={require('../assets/images/declined.png')} title="Subscription Suspended" text="Your plan is suspended due to non-payment. Please pay your outstanding bill to reactivate your service." buttonText="PAY MY BILL" onButtonPress={() => navigation.navigate('PayBills')} />);
            default: return <PlanSelectionFlow navigation={navigation} />; // Pass navigation here too
        }
    };
    
    return (<SafeAreaView style={getStyles(theme).container}><View style={{ flex: 1 }}>{renderContent()}</View><BottomNavBar activeScreen="Plan" /></SafeAreaView>);
}

// --- SUBSCRIPTION FLOW COMPONENT ---
const PlanSelectionFlow = ({ isChangingPlan = false, navigation }) => { // Accept navigation prop
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
    const [location, setLocation] = useState('');
    const [proofOfPayment, setProofOfPayment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPhotoSourceSheetVisible, setPhotoSourceSheetVisible] = useState(false);

    useEffect(() => { 
        if (profile?.profile) { 
            const fullAddress = [
                profile.profile.address, 
                profile.profile.phase, 
                profile.profile.city, 
                profile.profile.province, 
                profile.profile.zipCode
            ].filter(Boolean).join(', '); 
            if (fullAddress) setLocation(fullAddress); 
        } 
    }, [profile]);

    useEffect(() => { 
        const fetchPlans = async () => {
            try {
                setIsLoadingPlans(true);
                const { data } = await api.get('/plans');
                setPlans(data || []);
                if (data && data.length > 0) {
                    setSelectedPlan(data[0]);
                }
            } catch (error) {
                showAlert("Error", "Could not load subscription plans.");
            } finally {
                setIsLoadingPlans(false);
            }
        };
        fetchPlans();
    }, [api, showAlert]);
    
    const handleProceedToPaymentMethod = () => {
        if (!selectedPlan) return; 
        if (!profile?.profile?.mobileNumber || !profile?.profile?.address) {
            showAlert("Profile Incomplete", "Please complete your address and mobile number in your profile.", [
                { text: "Cancel", style: "cancel" },
                { text: "Go to Profile", onPress: () => navigation.navigate('EditProfileScreen') }
            ]); 
            return; 
        } 
        setFlowStep(2); 
    };
    const handleFinalSubmission = async () => { 
        if (!selectedPaymentMethod || !location.trim()) { 
            showAlert({ title: "Info Required", message: "Please select a payment method and enter an installation address." }); 
            return; 
        } 
        switch (selectedPaymentMethod) {
            case 'GCash':
                setGcashModalVisible(true);
                break; 
            
            case 'Cash on Delivery':
                await handleNewSubscriptionSubmit('Cash on Delivery', null);
                break; 
            
            default:
                showAlert({ title: "Error", message: "Invalid payment method selected." });
                break;
        }
    };
    const handleNewSubscriptionSubmit = async (method, proof) => { setIsSubmitting(true); try { await subscribeToPlan(selectedPlan, method, proof?.base64, location); showMessage("Submission Received!", "Your subscription is now pending verification."); if (isGcashModalVisible) setGcashModalVisible(false); } catch (error) { showAlert("Submission Failed", error.response?.data?.message || 'An error occurred.'); } finally { setIsSubmitting(false); } };
    const handleChangePlanSubmit = async () => { if (!selectedPlan) return; setIsSubmitting(true); try { await changePlan(selectedPlan); showMessage("Request Received!", "Your plan change is now pending approval."); navigation.setParams({ isChangingPlan: false }); setFlowStep(1); } catch (error) { showAlert("Change Failed", error.response?.data?.message || 'An error occurred.'); } finally { setIsSubmitting(false); } };
    const handleImagePick = async () => {
        setPhotoSourceSheetVisible(true); 
    };

    const pickImageFromCamera = async () => {
        setPhotoSourceSheetVisible(false); 
        const hasCameraPermission = await requestCameraPermissions();
        if (!hasCameraPermission) {
            showAlert("Permission Denied","Camera access is required to take a photo. Please enable it in device settings." );
            return;
        }
        const pickerResult = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5, base64: true });
        if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
            const asset = pickerResult.assets[0];
            const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            setProofOfPayment({ uri: asset.uri, base64: base64Data });
        }
    };

    const pickImageFromGallery = async () => {
        setPhotoSourceSheetVisible(false); 
        const hasLibraryPermission = await requestMediaLibraryPermissions();
        if (!hasLibraryPermission) {
            showAlert(  "Permission Denied", "Media library access is required to choose from gallery. Please enable it in device settings." );
            return;
        }
        const pickerResult = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.5, base64: true });
        if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
            const asset = pickerResult.assets[0];
            const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            setProofOfPayment({ uri: asset.uri, base64: base64Data });
        }
    };

    const PlanCard = ({ plan, isSelected, onSelect }) => ( <TouchableOpacity onPress={onSelect} activeOpacity={0.8} style={[styles.planCard, isSelected && styles.planCardSelected]}><View>{isSelected && (<View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>SELECTED</Text></View>)}<View style={styles.planHeader}><View><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planPrice}>{plan.priceLabel}</Text></View><View style={styles.planIconContainer}><Ionicons name="wifi" size={24} color={theme.primary} /></View></View><View style={styles.planFeatures}>{plan.features.map((feature, i) => (<View key={i} style={styles.featureItem}><Ionicons name="checkmark-sharp" size={16} color={theme.success} style={{marginRight: 8}}/><Text style={styles.planFeatureText}>{feature}</Text></View>))}</View></View></TouchableOpacity> );
    const PaymentMethodCard = ({ method, logo, isSelected, onSelect }) => ( 
        <TouchableOpacity 
            style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]} 
            onPress={onSelect}
        >
            <Image source={logo} style={styles.paymentMethodLogo} />
            <Text style={styles.paymentOptionText}>{method}</Text>
            <Ionicons 
                name={isSelected ? "radio-button-on" : "radio-button-off"} 
                size={26} 
                color={isSelected ? theme.primary : theme.border} 
            />
        </TouchableOpacity> 
    );

    const renderPlanSelection = () => (
        <View style={styles.flowContainer}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.titleCard}><Text style={styles.screenTitle}>{isChangingPlan ? 'Change Your Plan' : 'Choose Your Plan'}</Text><Text style={styles.screenSubtitle}>Find the perfect speed for your home.</Text></View>
                {isLoadingPlans ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
                ) : (
                    plans.map((plan) => (
                        <PlanCard 
                            key={plan._id}
                            plan={plan} 
                            isSelected={selectedPlan?._id === plan._id}
                            onSelect={() => setSelectedPlan(plan)} 
                        />
                    ))
                )}
            </ScrollView>
            <View style={styles.fixedButtonContainer}>
                {isChangingPlan ? ( <TouchableOpacity style={[styles.primaryButton, !selectedPlan && styles.buttonDisabled]} onPress={() => setFlowStep(2)} disabled={!selectedPlan}><Text style={styles.buttonText}>PROCEED TO CONFIRMATION</Text></TouchableOpacity> ) : ( <TouchableOpacity style={[styles.primaryButton, !selectedPlan && styles.buttonDisabled]} onPress={handleProceedToPaymentMethod} disabled={!selectedPlan}><Text style={styles.buttonText}>PROCEED TO PAYMENT</Text></TouchableOpacity> )}
            </View>
        </View>
    );     
    
    const renderPaymentAndLocationSelection = () => (
        <KeyboardAvoidingView style={styles.flowContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.titleCard}><Text style={styles.screenTitle}>Final Step</Text><Text style={styles.screenSubtitle}>Confirm your details to get connected.</Text></View>
                 <View style={styles.stepIndicatorContainer}>
                    <TouchableOpacity onPress={() => setFlowStep(1)} style={{padding: 5, marginRight: 10}}>
                        <Ionicons name="arrow-back-circle" size={24} color={theme.primary} />
                    </TouchableOpacity>
                    <View style={styles.stepIndicator} />
                    <View style={[styles.stepIndicator, styles.stepIndicatorActive]} />
                </View>
                <View style={styles.amountBox}><Text style={styles.amountLabel}>Total for {selectedPlan?.name}:</Text><Text style={styles.amountValue}>₱{selectedPlan?.price.toFixed(2)}</Text></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Installation Address</Text><TextInput style={styles.locationInput} placeholder="Enter full address..." value={location} onChangeText={setLocation} multiline /></View>
                <View style={styles.inputGroup}><Text style={styles.inputLabel}>Payment Method</Text><PaymentMethodCard method="GCash" logo={GCASH_LOGO_IMAGE} isSelected={selectedPaymentMethod === 'GCash'} onSelect={() => setSelectedPaymentMethod('GCash')} /><PaymentMethodCard method="Cash on Delivery" logo={require('../assets/images/cod.png')} isSelected={selectedPaymentMethod === 'Cash on Delivery'} onSelect={() => setSelectedPaymentMethod('Cash on Delivery')} /></View>
            </ScrollView>
            <View style={styles.fixedButtonContainer}>
                <TouchableOpacity style={[styles.primaryButton, (!selectedPaymentMethod || !location.trim()) && styles.buttonDisabled]} onPress={handleFinalSubmission} disabled={!selectedPaymentMethod || !location.trim()}><Text style={styles.buttonText}>SUBMIT APPLICATION</Text></TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );

    const renderGcashModal = () => (
        <Modal animationType="slide" transparent={true} visible={isGcashModalVisible} onRequestClose={() => setGcashModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}><Text style={styles.modalTitle}>Pay with GCash</Text><TouchableOpacity onPress={() => setGcashModalVisible(false)}><Ionicons name="close" size={28} color={theme.textSecondary} /></TouchableOpacity></View>
                    <ScrollView contentContainerStyle={{alignItems: 'center', paddingBottom: 100}}><Text style={styles.modalDescription}>1. Scan the QR or send payment to the number below.</Text><Image source={GCASH_QR_IMAGE} style={styles.paymentModalImage} resizeMode="contain" /><View style={styles.gcashDetailsContainer}><Text style={styles.gcashDetailLabel}>GCash Name:</Text><Text style={styles.gcashDetailValue}>Fibear Inc.</Text><Text style={styles.gcashDetailLabel}>GCash Number:</Text><Text style={styles.gcashDetailValue}>0912-345-6789</Text></View><Text style={styles.modalDescription}>2. Upload a screenshot of your receipt.</Text><View style={styles.uploadSection}>{proofOfPayment ? (<View style={{alignItems: 'center'}}><Image source={{ uri: proofOfPayment.uri }} style={styles.proofPreviewImage} /><TouchableOpacity style={styles.changeImageButton} onPress={handleImagePick}><Text style={styles.changeImageText}>Change Screenshot</Text></TouchableOpacity></View>) : (<TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}><Ionicons name="cloud-upload-outline" size={24} color={theme.primary} /><Text style={styles.uploadButtonText}>Upload Proof</Text></TouchableOpacity>)}</View></ScrollView>
                    <View style={styles.fixedModalButtonContainer}>
                        <TouchableOpacity 
                            style={[styles.primaryButton, (!proofOfPayment || isSubmitting) && styles.buttonDisabled]} 
                            onPress={() => handleNewSubscriptionSubmit('GCash', proofOfPayment)} 
                            disabled={!proofOfPayment || isSubmitting}
                        >
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
                <PhotoSourceSheet 
                    isVisible={isPhotoSourceSheetVisible} 
                    onChooseCamera={pickImageFromCamera}
                    onChooseGallery={pickImageFromGallery}
                    onClose={() => setPhotoSourceSheetVisible(false)} 
                />
            )}
        </>
    );
};

// --- STYLESHEET (Unchanged) ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    flowContainer: { flex: 1, backgroundColor: theme.background },
    contentContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 220 },
    titleCard: { backgroundColor: theme.surface, padding: 25, marginBottom: 20, borderRadius: 20, borderWidth: 1, borderColor: theme.border, alignItems: 'center', },
    screenTitle: { fontSize: 26, fontWeight: 'bold', color: theme.text, },
    screenSubtitle: { fontSize: 16, color: theme.textSecondary, marginTop: 8, textAlign: 'center' },
    stepIndicatorContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20, alignItems: 'center', },
    stepIndicator: { height: 8, flex: 1, backgroundColor: theme.border, borderRadius: 4, },
    stepIndicatorActive: { backgroundColor: theme.primary },
    planCard: { backgroundColor: theme.surface, padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 2, borderColor: theme.border, position: 'relative', },
    planCardSelected: { borderColor: theme.primary, backgroundColor: `${theme.primary}1A`, },
    selectedBadge: { position: 'absolute', bottom: 1, right: 1, backgroundColor: theme.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, },
    selectedBadgeText: { color: theme.textOnPrimary, fontSize: 10, fontWeight: 'bold', },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    planName: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    planPrice: { fontSize: 16, fontWeight: '600', color: theme.textSecondary },
    planIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: `${theme.primary}20`, justifyContent: 'center', alignItems: 'center', },
    planFeatures: { marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15 },
    featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, },
    planFeatureText: { fontSize: 15, color: theme.text, lineHeight: 22 },
    fixedButtonContainer: { position: 'absolute', bottom: 115, left: 20, right: 20, backgroundColor: 'transparent' },
    primaryButton: { backgroundColor: theme.primary, padding: 16, borderRadius: 14, alignItems: 'center', height: 54, justifyContent: 'center', flexDirection: 'row', flex: 2},
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    amountBox: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 20, marginVertical: 20, alignItems: 'center', backgroundColor: theme.surface },
    amountLabel: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
    amountValue: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginTop: 4 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 10 },
    locationInput: { minHeight: 100, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 15, backgroundColor: theme.surface, color: theme.text, fontSize: 16, textAlignVertical: 'top' },
    paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 2, borderColor: theme.border, borderRadius: 14, marginBottom: 10, backgroundColor: theme.surface, },
    paymentOptionSelected: { borderColor: theme.primary, backgroundColor: `${theme.primary}1A`, },
    paymentMethodLogo: { width: 32, height: 32, resizeMode: 'contain', marginRight: 15 },
    paymentOptionText: { fontSize: 17, flex: 1, color: theme.text, fontWeight: '600' },
    statusContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30, },
    statusIllustration: { width: 220, height: 220, resizeMode: 'contain', marginBottom: 20 },
    statusTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 12, },
    statusText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24, },
    noticeText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 20, padding: 20, backgroundColor: theme.background, borderRadius: 10, marginTop: 20, fontStyle: 'italic' },
    statusButtonContainer: { marginTop: 30, width: '100%', maxWidth: 320, alignItems: 'center', },
    planInfoCard: { width: '100%', backgroundColor: theme.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border, },
    planInfoTitle: { fontSize: 14, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 15, letterSpacing: 0.5, },
    arrowSeparator: { alignSelf: 'center', marginVertical: 15, },
    cancelStatusButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, backgroundColor: 'transparent' },
    cancelButtonText: { color: theme.textSecondary, fontSize: 15, fontWeight: '600' },
    reasonBox: { width: '100%', maxWidth: 320, backgroundColor: `${theme.danger}1A`, borderRadius: 12, padding: 15, borderLeftWidth: 4, borderLeftColor: theme.danger, marginVertical: 25, },
    reasonTitle: { fontSize: 14, fontWeight: 'bold', color: theme.danger, marginBottom: 5, },
    reasonText: { fontSize: 15, color: theme.text, lineHeight: 22, },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
    modalContent: { width: '100%', backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '95%', overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    modalDescription: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginVertical: 20, paddingHorizontal: 10, lineHeight: 22 },
    paymentModalImage: { width: 200, height: 200, borderRadius: 8, alignSelf: 'center' },
    gcashDetailsContainer: { padding: 15, backgroundColor: theme.background, borderRadius: 8, width: '90%', marginTop: 20, alignSelf: 'center' },
    gcashDetailLabel: { fontSize: 13, color: theme.textSecondary },
    gcashDetailValue: { fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 8 },
    uploadSection: { width: '100%', marginTop: 20, alignItems: 'center', padding: 20 },
    uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, padding: 15, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary },
    uploadButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600', marginLeft: 10 },
    proofPreviewImage: { width: 150, height: 150, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    changeImageButton: { backgroundColor: theme.surface, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    changeImageText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
    fixedModalButtonContainer: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, backgroundColor: theme.surface, borderTopWidth: 1, borderColor: theme.border, position: 'absolute', bottom: 0, left: 0, right: 0 },
    secondaryButton: { borderWidth: 2, borderColor: theme.border, backgroundColor: theme.surface, padding: 16, borderRadius: 14, alignItems: 'center', height: 54, justifyContent: 'center', flex: 1, },
    secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold', },
    cancelChangeButton: { backgroundColor: theme.danger, padding: 16, borderRadius: 14, alignItems: 'center', height: 54, justifyContent: 'center', flexDirection: 'row', width: '100%' },
    cancelChangeButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold', },
});