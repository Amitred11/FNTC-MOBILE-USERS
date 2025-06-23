// screens/SubscriptionScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Image, Modal, BackHandler, Animated, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription } from '../contexts/SubscriptionContext';
import MySubscriptionScreen from './MySubscriptionScreen';
import { useTheme } from '../contexts/ThemeContext';

// --- Asset Imports ---
const GCASH_LOGO_IMAGE = require('../assets/images/gcash.png');
const GCASH_QR_IMAGE = require('../assets/images/gcashqr.png');
const CARD_CHIP_IMAGE = require('../assets/images/cardchip.png');
const CVV_GUIDE_IMAGE = require('../assets/images/ccv.jpg');

// --- Main Screen Component (The "Router") ---
export default function SubscriptionScreen() {
    const { subscriptionStatus, isLoading } = useSubscription();
    const navigation = useNavigation();
    const { theme } = useTheme();
    const styles = getStyles(theme);

    if (isLoading) {
        return (
             <SafeAreaView style={styles.screen}>
                <View style={styles.phoneMockup}>
                    <View style={styles.header}>
                         <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.headerBackButton}>
                            <Ionicons name="arrow-back" size={24} color={theme.textOnPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>Subscription</Text>
                    </View>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={styles.loadingText}>Loading Subscription...</Text>
                    </View>
                </View>
            </SafeAreaView>
        )
    }

    const hasActiveSubscription = subscriptionStatus !== null;

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.phoneMockup}>
                <View style={styles.header}>
                     <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.headerBackButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.textOnPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Subscription</Text>
                </View>
                {hasActiveSubscription ? (
                    // Remember to refactor MySubscriptionScreen to be theme-aware
                    <MySubscriptionScreen />
                ) : (
                    <PlanSelectionFlow />
                )}
            </View>
        </SafeAreaView>
    );
}

// --- The Multi-Step Flow for Subscribing or Changing a Plan ---
const PlanSelectionFlow = () => {
    const { subscribeToPlan, changePlan, activePlan } = useSubscription();
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const [step, setStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isBackModalVisible, setBackModalVisible] = useState(false);
    const [isGcashModalVisible, setGcashModalVisible] = useState(false);
    const [isCardModalVisible, setCardModalVisible] = useState(false);
    const [cardInfo, setCardInfo] = useState({ number: '', name: '', expiry: '', cvv: '' });
    const [proofOfPayment, setProofOfPayment] = useState(null);
    const navigation = useNavigation();

    const handleProcessPayment = () => {
        setCardModalVisible(false);
        setGcashModalVisible(false);
        resetPaymentState();
        setStep(3);
    };
    
    const handleCompleteFlow = () => {
        if (!selectedPlan) return;
        if (activePlan) {
            changePlan(selectedPlan);
        } else {
            subscribeToPlan(selectedPlan);
        }
    };

    const handleImagePick = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "You need to allow access to your photos to upload proof of payment.");
            return;
        }
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 4], quality: 1,
        });
        if (!pickerResult.canceled && pickerResult.assets) {
            setProofOfPayment(pickerResult.assets[0].uri);
        }
    };

    const resetPaymentState = () => {
        setProofOfPayment(null);
        setCardInfo({ number: '', name: '', expiry: '', cvv: '' });
    };

    const handleNextStep = () => {
        if (step === 1 && selectedPlan) setStep(2);
        else if (step === 2 && paymentMethod) {
            if (paymentMethod === 'Card') setCardModalVisible(true);
            else if (paymentMethod === 'GCash') setGcashModalVisible(true);
        }
    };

    const handleCardInputChange = (field, value) => {
        let formattedValue = value;
        if (field === 'number') formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
        else if (field === 'expiry') formattedValue = value.replace(/\//g, '').replace(/(\d{2})/, '$1/').trim();
        setCardInfo({ ...cardInfo, [field]: formattedValue.slice(0, field === 'expiry' ? 5 : 19) });
    };

    const isCardFormValid = cardInfo.number.length === 19 && cardInfo.name && cardInfo.expiry.length === 5 && cardInfo.cvv.length >= 3;

    const handleBackButtonPress = () => {
        if (activePlan) {
            navigation.goBack(); return true;
        }
        if (step > 1) { setStep(step - 1); } 
        else { setBackModalVisible(true); }
        return true; 
    };

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackButtonPress);
        return () => backHandler.remove();
    }, [step, activePlan]); 

    const handleConfirmExit = () => {
        setBackModalVisible(false);
        navigation.navigate('Home'); 
    };

    const handleCloseModal = (modalSetter) => {
        modalSetter(false);
        resetPaymentState();
    };
    
    const isChangingPlan = !!activePlan;

    const renderSelectPlan = () => (
        <>
            <Text style={styles.stepTitle}>1. Select Plan</Text>
            <View style={styles.illustrationPlaceholder}><Image source={require('../assets/images/selectplan.png')} style={styles.illustrationImage} resizeMode="contain" /></View>
            {PLANS.map((plan) => {
                if (isChangingPlan && activePlan.name === plan.name) return null;
                return (
                    <TouchableOpacity key={plan.name} style={[styles.planCard, selectedPlan?.name === plan.name && styles.planCardSelected]} onPress={() => setSelectedPlan(plan)}>
                        <View style={styles.planHeader}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planPrice}>{plan.priceLabel}</Text></View>
                        <View style={styles.planFeatures}>{plan.features.map((feature, i) => (<Text key={i} style={styles.planFeatureText}>• {feature}</Text>))}</View>
                    </TouchableOpacity>
                )
            })}
        </>
    );

    const renderPayment = () => (
        <>
            <Text style={styles.stepTitle}>2. Payment</Text>
            <View style={styles.illustrationPlaceholder}><Image source={require('../assets/images/payplan.png')} style={styles.illustrationImage} resizeMode="contain" /></View>
            <Text style={styles.paymentSubtitle}>Choose a payment method</Text>
            <Text style={styles.paymentDescription}>Select your choice of payment method to proceed.</Text>
            <View style={styles.amountBox}><Text style={styles.amountLabel}>Amount to pay:</Text><Text style={styles.amountPlan}>{selectedPlan?.name}</Text><Text style={styles.amountValue}>₱{selectedPlan?.price.toFixed(2)}</Text></View>
            <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'Card' && styles.paymentOptionSelected]} onPress={() => setPaymentMethod('Card')}>
                <Ionicons name="card-outline" size={24} color={theme.text} style={styles.paymentMethodLogo} />
                <Text style={styles.paymentOptionText}>Credit/Debit Card</Text>
                <View style={[styles.radioCircle, paymentMethod === 'Card' && styles.radioCircleSelected]}/>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'GCash' && styles.paymentOptionSelected]} onPress={() => setPaymentMethod('GCash')}>
                <Image source={GCASH_LOGO_IMAGE} style={styles.paymentMethodLogo} />
                <Text style={styles.paymentOptionText}>GCash</Text>
                <View style={[styles.radioCircle, paymentMethod === 'GCash' && styles.radioCircleSelected]}/>
            </TouchableOpacity>
        </>
    );

    const renderCompleted = () => (
        <View style={styles.completedContainer}>
            <Text style={styles.stepTitle}>3. Completed</Text>
            <View style={[styles.illustrationPlaceholder, {height: 230}]}><Image source={require('../assets/images/completedplan.png')} style={styles.illustrationImage} resizeMode="contain" /></View>
            <Text style={styles.completedTitle}>{isChangingPlan ? 'Plan Changed Successfully!' : 'Payment Completed!'}</Text>
            <Text style={styles.completedDescription}>Your subscription is updated! You can view your new plan details in the 'My Subscription' section.</Text>
        </View>
    );
    
    const buttonConfig = {
        1: { text: 'SELECT THIS PLAN', action: handleNextStep, disabled: !selectedPlan },
        2: { text: 'PROCESS PAYMENT', action: handleNextStep, disabled: !paymentMethod },
        3: { text: isChangingPlan ? 'CONFIRM PLAN CHANGE' : 'VIEW MY SUBSCRIPTION', action: handleCompleteFlow, disabled: false },
    };
    const { text: buttonText, action: onButtonPress, disabled: isButtonDisabled } = buttonConfig[step];

    return (
        <>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <ProgressIndicator step={step} theme={theme} />
                {step === 1 && renderSelectPlan()}
                {step === 2 && renderPayment()}
                {step === 3 && renderCompleted()}
            </ScrollView>

            {/* --- MODALS --- */}
            <Modal animationType="fade" transparent={true} visible={isBackModalVisible} onRequestClose={() => setBackModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Exit Subscription?</Text>
                        <Text style={styles.modalDescription}>Your progress will be lost. Are you sure?</Text>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setBackModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.danger}]} onPress={handleConfirmExit}><Text style={[styles.modalButtonText, {color: theme.textOnPrimary}]}>Yes, Exit</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            <Modal animationType="fade" transparent={true} visible={isGcashModalVisible} onRequestClose={() => handleCloseModal(setGcashModalVisible)}>
                <ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Pay with GCash</Text>
                            <Text style={styles.modalDescription}>Scan the QR code or send to the number below.</Text>
                            <Image source={GCASH_QR_IMAGE} style={styles.paymentModalImage} resizeMode="contain" />
                            <View style={styles.gcashDetailsContainer}>
                                <Text style={styles.gcashDetailLabel}>GCash Name:</Text><Text style={styles.gcashDetailValue}>Fibear Inc.</Text>
                                <Text style={styles.gcashDetailLabel}>GCash Number:</Text><Text style={styles.gcashDetailValue}>0912-345-6789</Text>
                            </View>
                            <Text style={styles.paymentModalAmount}>Amount: <Text style={{fontWeight: 'bold'}}>₱{selectedPlan?.price.toFixed(2)}</Text></Text>
                            <View style={styles.uploadSection}>
                                {proofOfPayment ? (
                                    <View style={{alignItems: 'center'}}><Image source={{ uri: proofOfPayment }} style={styles.proofPreviewImage} /><TouchableOpacity onPress={handleImagePick}><Text style={styles.changeImageText}>Change Screenshot</Text></TouchableOpacity></View>
                                ) : (
                                    <TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}><Ionicons name="cloud-upload-outline" size={22} color={theme.primary} /><Text style={styles.uploadButtonText}>Upload Proof of Payment</Text></TouchableOpacity>
                                )}
                            </View>
                            <View style={styles.modalButtonContainer}>
                                <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => handleCloseModal(setGcashModalVisible)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.primary}, !proofOfPayment && styles.buttonDisabled]} onPress={handleProcessPayment} disabled={!proofOfPayment}><Text style={[styles.modalButtonText, {color: theme.textOnPrimary}]}>I Have Paid</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </Modal>

            <Modal animationType="fade" transparent={true} visible={isCardModalVisible} onRequestClose={() => handleCloseModal(setCardModalVisible)}>
                <ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <CreditCardDisplay cardInfo={cardInfo} theme={theme} />
                            <Text style={styles.modalTitle}>Enter Card Details</Text>
                            <TextInput style={styles.paymentModalInput} placeholder="Card Number" placeholderTextColor={theme.textSecondary} value={cardInfo.number} onChangeText={(text) => handleCardInputChange('number', text)} keyboardType="numeric" maxLength={19} />
                            <TextInput style={styles.paymentModalInput} placeholder="Cardholder Name" placeholderTextColor={theme.textSecondary} value={cardInfo.name} onChangeText={(text) => handleCardInputChange('name', text)} />
                            <View style={{flexDirection: 'row', width: '100%'}}>
                                <TextInput style={[styles.paymentModalInput, {flex: 1, marginRight: 10}]} placeholder="Expiry (MM/YY)" placeholderTextColor={theme.textSecondary} value={cardInfo.expiry} onChangeText={(text) => handleCardInputChange('expiry', text)} keyboardType="numeric" maxLength={5} />
                                <View style={styles.cvvContainer}>
                                    <TextInput style={[styles.paymentModalInput, {flex: 1, marginBottom: 0}]} placeholder="CVV" placeholderTextColor={theme.textSecondary} value={cardInfo.cvv} onChangeText={(text) => setCardInfo({...cardInfo, cvv: text})} keyboardType="numeric" secureTextEntry maxLength={4} />
                                    <Image source={CVV_GUIDE_IMAGE} style={styles.cvvImage} />
                                </View>
                            </View>
                            <View style={styles.modalButtonContainer}>
                                <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => handleCloseModal(setCardModalVisible)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
                                <TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.primary}, !isCardFormValid && styles.buttonDisabled]} onPress={handleProcessPayment} disabled={!isCardFormValid}><Text style={[styles.buttonText, {color: theme.textOnPrimary}]}>Pay ₱{selectedPlan?.price.toFixed(2)}</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </Modal>

            <View style={styles.fixedButtonContainer}>
                <TouchableOpacity style={[styles.button, isButtonDisabled && styles.buttonDisabled]} onPress={onButtonPress} disabled={isButtonDisabled}>
                    <Text style={styles.buttonText}>{buttonText}</Text>
                </TouchableOpacity>
            </View>
        </>
    );
}

// --- Constants & Reusable Components ---
const PLANS = [
  { name: 'PLAN BRONZE', price: 700.00, priceLabel: '₱700.00/mo', features: ['Up to 30 mbps', 'No Data Capping', 'Unlimited Internet'] },
  { name: 'PLAN SILVER', price: 800.00, priceLabel: '₱800.00/mo', features: ['Up to 50 mbps', 'No Data Capping', 'Unlimited Internet'] },
  { name: 'PLAN GOLD', price: 1000.00, priceLabel: '₱1,000.00/mo', features: ['Up to 80 mbps', 'No Data Capping', 'Unlimited Internet'] },
  { name: 'PLAN PLATINUM', price: 1300.00, priceLabel: '₱1,300.00/mo', features: ['Up to 100 mbps', 'No Data Capping', 'Unlimited Internet'] },
  { name: 'PLAN DIAMOND', price: 1500.00, priceLabel: '₱1,500.00/mo', features: ['Up to 120 mbps', 'No Data Capping', 'Unlimited Internet'] },
];

const ProgressStep = ({ label, isActive, theme }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.progressStepContainer}>
            <View style={[styles.progressCircle, isActive && styles.progressCircleActive]} />
            <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]}>{label}</Text>
        </View>
    );
};

const ProgressIndicator = ({ step, theme }) => {
    const styles = getStyles(theme);
    const progressLine1Anim = useRef(new Animated.Value(0)).current;
    const progressLine2Anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(progressLine1Anim, { toValue: step > 1 ? 1 : 0, duration: 300, useNativeDriver: false }).start();
        Animated.timing(progressLine2Anim, { toValue: step > 2 ? 1 : 0, duration: 300, useNativeDriver: false }).start();
    }, [step]);
    const line1Width = progressLine1Anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    const line2Width = progressLine2Anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <View style={styles.progressIndicator}>
            <ProgressStep label="Plan" isActive={step >= 1} theme={theme} />
            <View style={styles.progressLineContainer}><Animated.View style={[styles.progressLineFill, { width: line1Width }]} /></View>
            <ProgressStep label="Payment" isActive={step >= 2} theme={theme} />
            <View style={styles.progressLineContainer}><Animated.View style={[styles.progressLineFill, { width: line2Width }]} /></View>
            <ProgressStep label="Completed" isActive={step >= 3} theme={theme} />
        </View>
    );
};

const CreditCardDisplay = ({ cardInfo, theme }) => {
    const styles = getStyles(theme);
    return (
      <View style={styles.cardDisplay}>
        <View style={styles.cardTopRow}><Image source={CARD_CHIP_IMAGE} style={styles.cardChip} /><Ionicons name="wifi" size={24} color="white" style={{transform: [{ rotate: '90deg' }]}} /></View>
        <Text style={styles.cardNumber}>{cardInfo.number || '#### #### #### ####'}</Text>
        <View style={styles.cardBottomRow}><View><Text style={styles.cardLabel}>Cardholder</Text><Text style={styles.cardValue}>{cardInfo.name || 'FULL NAME'}</Text></View><View><Text style={styles.cardLabel}>Expires</Text><Text style={styles.cardValue}>{cardInfo.expiry || 'MM/YY'}</Text></View></View>
      </View>
    );
};

// --- Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.primary },
    phoneMockup: { width: '100%', height: '100%', backgroundColor: theme.surface, borderRadius: 20, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, paddingHorizontal: 16, paddingBottom: 15, paddingTop: 50, justifyContent: 'center' },
    headerBackButton: { position: 'absolute', left: 16, top: 55, zIndex: 1 },
    headerText: { color: theme.textOnPrimary, fontSize: 18, fontWeight: '600' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface },
    loadingText: { marginTop: 10, fontSize: 16, color: theme.textSecondary },
    contentContainer: { padding: 20, paddingBottom: 100 },
    progressIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
    progressStepContainer: { alignItems: 'center', width: 80 },
    progressCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.disabled, marginBottom: 8, zIndex: 2 },
    progressCircleActive: { backgroundColor: theme.accent },
    progressLabel: { fontSize: 12, color: theme.textSecondary },
    progressLabelActive: { color: theme.accent, fontWeight: 'bold' },
    progressLineContainer: { flex: 1, height: 2, backgroundColor: theme.border, marginHorizontal: -50, bottom: 12 },
    progressLineFill: { height: '100%', backgroundColor: theme.accent },
    stepTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 10 },
    illustrationPlaceholder: { height: 150, width: '100%', alignItems: 'center', justifyContent: 'center', },
    illustrationImage: { width: '100%', height: '100%' },
    planCard: { backgroundColor: theme.surface, padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 2, borderColor: 'transparent' },
    planCardSelected: { borderColor: theme.primary, backgroundColor: theme.isDarkMode ? '#003e39' : '#003e39' },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    planName: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    planPrice: { fontSize: 14, fontWeight: '600', color: theme.text },
    planFeatures: { marginTop: 5 },
    planFeatureText: { fontSize: 12, color: theme.textSecondary, lineHeight: 18 },
    fixedButtonContainer: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: 'transparent' },
    button: { backgroundColor: theme.primary, padding: 16, borderRadius: 10, alignItems: 'center' },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    paymentSubtitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginTop: 15, textAlign: 'center' },
    paymentDescription: { fontSize: 14, color: theme.textSecondary, marginBottom: 20, textAlign: 'center' },
    amountBox: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 15, marginBottom: 20 },
    amountLabel: { fontSize: 14, color: theme.textSecondary },
    amountPlan: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginTop: 4 },
    amountValue: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginTop: 4 },
    paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: theme.border, borderRadius: 10, marginBottom: 10 },
    paymentOptionSelected: { borderColor: theme.accent, backgroundColor: theme.isDarkMode ? '#003e39' : '#003e39' },
    paymentMethodLogo: { width: 24, height: 24, resizeMode: 'contain' },
    paymentOptionText: { fontSize: 16, marginLeft: 15, flex: 1, color: theme.text },
    radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.disabled },
    radioCircleSelected: { borderColor: theme.accent, backgroundColor: theme.accent },
    completedContainer: { alignItems: 'center' },
    completedTitle: { fontSize: 24, fontWeight: 'bold', color: theme.accent, marginBottom: 10, marginTop: 10 },
    completedDescription: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', backgroundColor: theme.surface, borderRadius: 10, padding: 20, alignItems: 'center', elevation: 5 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 15, marginTop: 10 },
    modalDescription: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    modalButton: { paddingVertical: 12, borderRadius: 8, flex: 1, alignItems: 'center', marginHorizontal: 5 },
    modalCancelButton: { backgroundColor: theme.disabled },
    modalButtonText: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    paymentModalImage: { width: 180, height: 180, borderRadius: 8 },
    paymentModalAmount: { fontSize: 16, color: theme.textSecondary, marginTop: 15 },
    paymentModalInput: { width: '100%', borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16, backgroundColor: theme.isDarkMode ? theme.background : '#FAFAFA', color: theme.text },
    gcashDetailsContainer: { padding: 15, backgroundColor: theme.background, borderRadius: 8, width: '100%', marginTop: 15 },
    gcashDetailLabel: { fontSize: 12, color: theme.textSecondary },
    gcashDetailValue: { fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 8 },
    cardDisplay: { width: 280, height: 170, backgroundColor: '#444', borderRadius: 15, marginBottom: 20, padding: 20, justifyContent: 'space-between', elevation: 10 },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardChip: { width: 40, height: 30 },
    cardNumber: { color: '#FFF', fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' },
    cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
    cardLabel: { color: '#BDBDBD', fontSize: 10, textTransform: 'uppercase' },
    cardValue: { color: '#FFF', fontSize: 14, fontWeight: '600' },
    cvvContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    cvvImage: { width: 30, height: 20, marginLeft: 8, resizeMode: 'contain' },
    uploadSection: { width: '100%', marginTop: 20, alignItems: 'center' },
    uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.isDarkMode ? theme.surface : '#E0F7FA', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: theme.primary },
    uploadButtonText: { color: theme.primary, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    proofPreviewImage: { width: 100, height: 100, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    changeImageText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
});