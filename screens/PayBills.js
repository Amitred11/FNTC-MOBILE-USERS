import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, 
    Modal, Image, BackHandler, RefreshControl, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription, useTheme, useAlert, useMessage } from '../contexts';
import { requestMediaLibraryPermissions } from '../utils/permissions';

// --- Static Assets ---
const GCASH_QR_IMAGE = require('../assets/images/gcashqr.png');
const GCASH_LOGO_IMAGE = require('../assets/images/gcash.png');
const CASH_LOGO_IMAGE = require('../assets/images/cod.png');

// --- Reusable Payment Option Component ---
const PaymentOption = ({ method, logo, isSelected, onSelect, theme }) => {
    const styles = getStyles(theme);
    return (
        <TouchableOpacity 
            style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]} 
            onPress={onSelect}
        >
            <Image source={logo} style={styles.paymentMethodLogo} />
            <Text style={styles.paymentOptionText}>{method}</Text>
            <Ionicons 
                name={isSelected ? "radio-button-on" : "radio-button-off"} 
                size={24} 
                color={isSelected ? theme.primary : theme.border} 
            />
        </TouchableOpacity>
    );
};

export default function PayBillsScreen() {
    const navigation = useNavigation();
    const { 
        paymentHistory, payBill, subscriptionStatus, subscriptionData,
        refreshSubscription 
    } = useSubscription();
    const { theme } = useTheme(); 
    const styles = getStyles(theme); 
    const { showAlert } = useAlert();
    const { showMessage } = useMessage();

    // --- FIX: Find bills that are 'Due' OR 'Overdue' ---
    const dueBill = paymentHistory.find(item => item.type === 'bill' && (item.status === 'Due' || item.status === 'Overdue'));
    
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isGcashModalVisible, setGcashModalVisible] = useState(false);
    const [proofOfPayment, setProofOfPayment] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshSubscription().finally(() => setRefreshing(false));
    }, [refreshSubscription]);

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            title: 'Pay Bill',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: "lightblue", borderBottomWidth: 1, borderBottomColor: theme.border },
            headerTitleStyle: { color: theme.textBe, fontWeight: '600', left: 110 },

            headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
                    <Ionicons name="arrow-back" size={26} color={theme.textBe} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, theme]);

    useEffect(() => {
        const backAction = () => {
            if (isGcashModalVisible) {
                setGcashModalVisible(false);
                return true;
            }
            navigation.goBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [isGcashModalVisible, navigation]);

    const handleProceed = async () => {
        if (!paymentMethod) return;
        if (paymentMethod === 'GCash') {
            setGcashModalVisible(true);
        } else if (paymentMethod === 'Cash') {
            showAlert(
                "Pay at Office",
                "Please proceed to our nearest office to pay your bill in cash. Present your account details to the cashier.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        }
    };

    const handleGcashPaymentSubmit = async () => {
        if (!dueBill) { showAlert("Error", "No due bill found."); return; }
        if (!proofOfPayment) { showAlert("Proof Required", "Please upload a screenshot of your payment receipt."); return; }

        setIsSubmitting(true);
        try {
            // --- FIX: Calling `payBill` with the correct arguments (billId, proofOfPayment) ---
            await payBill(dueBill._id, proofOfPayment.base64);
            setGcashModalVisible(false);
            setProofOfPayment(null);
            showMessage("Payment Submitted", `Your payment for ₱${dueBill.amount.toFixed(2)} is being processed.`);
            navigation.goBack();
        } catch (error) {
            showAlert("Payment Failed", error.message || "An unexpected error occurred.", [{ text: "Try Again" }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImagePick = async () => {
        const hasPermission = await requestMediaLibraryPermissions();
        if (!hasPermission) {
            showAlert("Permission Required", "Please allow access to your photos to upload proof of payment.");
            return;
        }
        
        const pickerResult = await ImagePicker.launchImageLibraryAsync({ 
            allowsEditing: true, 
            quality: 0.7, 
            base64: true 
        });

        if (!pickerResult.canceled && pickerResult.assets?.length > 0) { 
            const asset = pickerResult.assets[0];
            const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            setProofOfPayment({ uri: asset.uri, base64: base64Data });
        }
    };

    const renderPaymentFlow = () => (
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView 
                contentContainerStyle={styles.scrollContainer} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
            >
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Amount Due for {dueBill.planName}</Text>
                    <Text style={styles.amountDue}>₱{dueBill.amount.toFixed(2)}</Text>
                    
                    {/* --- FIX: Logic to show Due, Grace, or Overdue badge --- */}
                    {(() => {
                        const today = new Date();
                        const dueDate = new Date(dueBill.dueDate);
                        const renewalDate = new Date(subscriptionData.renewalDate);

                        if (dueBill.status === 'Overdue') {
                            return (
                                <View style={styles.statusBadgeOverdue}>
                                    <Text style={styles.statusBadgeTextOverdue}>PAYMENT IS OVERDUE</Text>
                                </View>
                            );
                        } else if (today > dueDate && today <= renewalDate) {
                            return (
                                <View style={styles.statusBadgeGrace}>
                                    <Text style={styles.statusBadgeTextGrace}>GRACE PERIOD</Text>
                                </View>
                            );
                        } else {
                            return (
                                <View style={styles.statusBadgeDue}>
                                    <Text style={styles.statusBadgeTextDue}>Due on: {new Date(dueBill.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
                                </View>
                            );
                        }
                    })()}
                </View>
                
                <View style={styles.paymentSection}>
                    <Text style={styles.sectionHeader}>Choose Payment Method</Text>
                    <PaymentOption method="GCash e-Wallet" logo={GCASH_LOGO_IMAGE} isSelected={paymentMethod === 'GCash'} onSelect={() => setPaymentMethod('GCash')} theme={theme} />
                    <PaymentOption method="Pay at the Office (Cash)" logo={CASH_LOGO_IMAGE} isSelected={paymentMethod === 'Cash'} onSelect={() => setPaymentMethod('Cash')} theme={theme} />
                </View>
            </ScrollView>
            
            <View style={styles.fixedButtonContainer}>
                <TouchableOpacity style={[styles.button, !paymentMethod && styles.buttonDisabled]} onPress={handleProceed} disabled={!paymentMethod} >
                    <Text style={styles.buttonText}>PROCEED</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );

    const renderEmptyState = () => {
        const EMPTY_STATES = {
            pending_installation: { icon: 'build-outline', color: theme.warning, title: 'Awaiting Installation', text: 'Your bills will appear here once your modem installation is complete.' },
            pending_verification: { icon: 'hourglass-outline', color: theme.warning, title: 'Verification in Progress', text: 'Your first bill will appear here once your plan is active. Pull down to refresh.' },
            pending_change: { icon: 'swap-horizontal-outline', color: theme.accent, title: 'Plan Change in Progress', text: 'You cannot pay bills while your plan change is being reviewed. Please check back later.', buttonText: 'View Status', action: () => navigation.navigate('Subscription') },
            declined: { icon: 'close-circle-outline', color: theme.danger, title: 'Submission Declined', text: 'Your subscription payment was not approved. Please check your subscription status.', buttonText: 'View Status & Retry', action: () => navigation.navigate('Subscription') },
            cancelled: { icon: 'document-text-outline', color: theme.disabled, title: 'No Active Plan', text: 'You need an active subscription to pay bills.', buttonText: 'Subscribe Now', action: () => navigation.navigate('Subscription') },
            null: { icon: 'document-text-outline', color: theme.disabled, title: 'No Active Plan', text: 'You need an active subscription to pay bills.', buttonText: 'Subscribe Now', action: () => navigation.navigate('Subscription') },
            suspended: { icon: 'warning-outline', color: theme.danger, title: 'Account Suspended', text: 'Your account is suspended. Paying your overdue bill will reactivate your service.', },
            active: { icon: 'checkmark-done-circle-outline', color: theme.success, title: 'All Paid Up!', text: 'You have no outstanding bills. Great job!' },
        };
        const state = EMPTY_STATES[subscriptionStatus] || EMPTY_STATES.active;
        return (
            <ScrollView contentContainerStyle={styles.fullScreenScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
                <View style={styles.emptyStateContainer}>
                    <Ionicons name={state.icon} size={70} color={state.color} />
                    <Text style={styles.emptyStateTitle}>{state.title}</Text>
                    <Text style={styles.emptyStateText}>{state.text}</Text>
                    {state.buttonText && (
                        <TouchableOpacity style={styles.subscribeButton} onPress={state.action}><Text style={styles.subscribeButtonText}>{state.buttonText}</Text></TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        );
    };
    
    const renderGcashModal = () => (
        <Modal animationType="slide" transparent={true} visible={isGcashModalVisible} onRequestClose={() => setGcashModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Pay with GCash</Text>
                        <TouchableOpacity onPress={() => setGcashModalVisible(false)}><Ionicons name="close" size={28} color={theme.textSecondary} /></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalScrollContent}>
                        <Text style={styles.modalDescription}>1. Scan the QR or send payment to the number below.</Text>
                        <Image source={GCASH_QR_IMAGE} style={styles.paymentModalImage} resizeMode="contain" />
                        <View style={styles.gcashDetailsContainer}>
                            <Text style={styles.gcashDetailLabel}>GCash Name:</Text><Text style={styles.gcashDetailValue}>Fibear Inc.</Text>
                            <Text style={styles.gcashDetailLabel}>GCash Number:</Text><Text style={styles.gcashDetailValue}>0912-345-6789</Text>
                        </View>
                        <Text style={styles.modalDescription}>2. Upload a screenshot of your payment receipt.</Text>
                        <View style={styles.uploadSection}>
                            {proofOfPayment ? (
                                <View style={{alignItems: 'center'}}>
                                    <Image source={{ uri: proofOfPayment.uri }} style={styles.proofPreviewImage} />
                                    <TouchableOpacity style={styles.changeImageButton} onPress={handleImagePick}>
                                        <Text style={styles.changeImageText}>Change Screenshot</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}>
                                    <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
                                    <Text style={styles.uploadButtonText}>Upload Proof of Payment</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                     <View style={styles.fixedModalButtonContainer}>
                        <TouchableOpacity 
                            style={[styles.button, (!proofOfPayment || isSubmitting) && styles.buttonDisabled]} 
                            onPress={handleGcashPaymentSubmit} 
                            disabled={!proofOfPayment || isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>I HAVE PAID ₱{dueBill.amount.toFixed(2)}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    const shouldRenderPaymentFlow = (subscriptionStatus === 'active' || subscriptionStatus === 'suspended') && dueBill;
    
    return (
        <SafeAreaView style={styles.container}>
            {shouldRenderPaymentFlow ? renderPaymentFlow() : renderEmptyState()}
            {shouldRenderPaymentFlow && renderGcashModal()}
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContainer: { padding: 20, flexGrow: 1, paddingBottom: 120 },
    fullScreenScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
    summaryCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: theme.border },
    summaryLabel: { fontSize: 16, color: theme.textSecondary, fontWeight: '500' },
    amountDue: { fontSize: 48, fontWeight: 'bold', color: theme.text, marginVertical: 8 },
    statusBadgeDue: { alignSelf: 'flex-start', backgroundColor: `${theme.danger}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    statusBadgeTextDue: { color: theme.danger, fontWeight: 'bold', fontSize: 13 },
    paymentSection: { marginTop: 30 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
    paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 12, },
    paymentOptionSelected: { borderColor: theme.primary, backgroundColor: `${theme.primary}1A` },
    paymentMethodLogo: { width: 32, height: 32, resizeMode: 'contain', marginRight: 15 },
    paymentOptionText: { fontSize: 17, flex: 1, color: theme.text, fontWeight: '600' },
    fixedButtonContainer: { padding: 20, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 20, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border },
    button: { backgroundColor: theme.primary, padding: 16, borderRadius: 14, alignItems: 'center', height: 54, justifyContent: 'center' },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
    modalContent: { width: '100%', backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '95%', overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    modalScrollContent: { paddingBottom: 120 },
    modalDescription: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginVertical: 20, paddingHorizontal: 10, lineHeight: 22 },
    paymentModalImage: { width: 200, height: 200, borderRadius: 8, alignSelf: 'center' },
    gcashDetailsContainer: { padding: 15, backgroundColor: theme.background, borderRadius: 8, width: '90%', marginTop: 20, alignSelf: 'center' },
    gcashDetailLabel: { fontSize: 13, color: theme.textSecondary },
    gcashDetailValue: { fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 8 },
    uploadSection: { width: '100%', alignItems: 'center', padding: 20 },
    uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}10`, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary },
    uploadButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600', marginLeft: 10 },
    proofPreviewImage: { width: 180, height: 180, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
    changeImageButton: { backgroundColor: theme.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    changeImageText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
    fixedModalButtonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, backgroundColor: theme.surface, borderTopWidth: 1, borderColor: theme.border },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    emptyStateTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginTop: 15, textAlign: 'center' },
    emptyStateText: { fontSize: 16, color: theme.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },
    subscribeButton: { marginTop: 25, backgroundColor: theme.primary, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12 },
    subscribeButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
});