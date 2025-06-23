import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput, Image, Alert, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext'; // <-- Import the useTheme hook

// --- Asset Imports ---
const GCASH_QR_IMAGE = require('../assets/images/gcashqr.png');
const GCASH_LOGO_IMAGE = require('../assets/images/gcash.png');
const CARD_CHIP_IMAGE = require('../assets/images/cardchip.png');
const CVV_GUIDE_IMAGE = require('../assets/images/ccv.jpg');

// --- Reusable Components (Now Theme-Aware) ---
const CreditCardDisplay = ({ cardInfo, theme }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.cardDisplay}>
            <View style={styles.cardTopRow}><Image source={CARD_CHIP_IMAGE} style={styles.cardChip} /><Ionicons name="wifi" size={24} color="white" style={{ transform: [{ rotate: '90deg' }] }} /></View>
            <Text style={styles.cardNumber}>{cardInfo.number || '#### #### #### ####'}</Text>
            <View style={styles.cardBottomRow}><View><Text style={styles.cardLabel}>Cardholder</Text><Text style={styles.cardValue}>{cardInfo.name || 'FULL NAME'}</Text></View><View><Text style={styles.cardLabel}>Expires</Text><Text style={styles.cardValue}>{cardInfo.expiry || 'MM/YY'}</Text></View></View>
        </View>
    );
};

// --- Main Pay Bills Screen Component ---
export default function PayBillsScreen() {
    const navigation = useNavigation();
    const { paymentHistory, payBill } = useSubscription();
    const { theme } = useTheme(); // Get theme from context
    const styles = getStyles(theme); // Get theme-specific styles

    const dueBill = paymentHistory.find(item => item.status === 'Due');
    const accountNumber = "100-234-5678";

    // --- Local State and Handlers (Logic is unchanged) ---
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [isGcashModalVisible, setGcashModalVisible] = useState(false);
    const [isCardModalVisible, setCardModalVisible] = useState(false);
    const [cardInfo, setCardInfo] = useState({ number: '', name: '', expiry: '', cvv: '' });
    const [proofOfPayment, setProofOfPayment] = useState(null);

    const handleProceedToPay = () => {
        if (paymentMethod === 'Card') {
            setCardModalVisible(true);
        } else if (paymentMethod === 'GCash') {
            setGcashModalVisible(true);
        }
    };

    const handleProcessPayment = async () => {
        if (!dueBill) {
            Alert.alert("Error", "No due bill found to pay.");
            return;
        }
        const paidAmount = dueBill.amount;
        try {
            await payBill(dueBill.id, dueBill.amount, dueBill.planName);
            setCardModalVisible(false);
            setGcashModalVisible(false);
            resetPaymentState();
            Alert.alert(
                "Payment Successful",
                `Your payment for ₱${paidAmount.toFixed(2)} has been processed.`,
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            console.error("Payment failed:", error);
            Alert.alert("Payment Failed", error.message || "An unexpected error occurred. Please try again.");
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

    const handleCardInputChange = (field, value) => {
        let formattedValue = value;
        if (field === 'number') formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
        else if (field === 'expiry') formattedValue = value.replace(/\//g, '').replace(/(\d{2})/, '$1/').trim();
        setCardInfo({ ...cardInfo, [field]: formattedValue.slice(0, field === 'expiry' ? 5 : 19) });
    };

    const handleCloseModal = (modalSetter) => {
        modalSetter(false);
        resetPaymentState();
    };

    const isCardFormValid = cardInfo.number.length === 19 && cardInfo.name && cardInfo.expiry.length === 5 && cardInfo.cvv.length >= 3;

    useEffect(() => {
        const backAction = () => {
            if (isGcashModalVisible || isCardModalVisible) {
                setGcashModalVisible(false);
                setCardModalVisible(false);
                return true;
            }
            navigation.goBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [isGcashModalVisible, isCardModalVisible, navigation]);

    if (!dueBill) {
        return (
             <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} /></TouchableOpacity>
                    <Text style={styles.headerTitle}>Pay Bills</Text>
                </View>
                <View style={styles.emptyStateContainer}>
                    <Ionicons name="checkmark-done-circle-outline" size={80} color={theme.success} />
                    <Text style={styles.emptyStateTitle}>All Paid Up!</Text>
                    <Text style={styles.emptyStateText}>You have no outstanding bills. Great job!</Text>
                </View>
            </SafeAreaView>
        );
    }
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} /></TouchableOpacity>
                <Text style={styles.headerTitle}>Pay Bills</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Amount Due for {dueBill.planName}</Text>
                    <Text style={styles.amountDue}>₱{dueBill.amount.toFixed(2)}</Text>
                    <Text style={styles.dueDate}>Due on: {new Date(dueBill.statementDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                    <View style={styles.separator} />
                    <Text style={styles.accountInfo}>Account No: {accountNumber}</Text>
                </View>
                <View style={styles.paymentSection}>
                    <Text style={styles.sectionHeader}>Choose Payment Method</Text>
                    <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'Card' && styles.paymentOptionSelected]} onPress={() => setPaymentMethod('Card')}><Ionicons name="card-outline" size={24} color={theme.text} style={styles.paymentMethodLogo} /><Text style={styles.paymentOptionText}>Credit/Debit Card</Text><View style={[styles.radioCircle, paymentMethod === 'Card' && styles.radioCircleSelected]}/></TouchableOpacity>
                    <TouchableOpacity style={[styles.paymentOption, paymentMethod === 'GCash' && styles.paymentOptionSelected]} onPress={() => setPaymentMethod('GCash')}><Image source={GCASH_LOGO_IMAGE} style={styles.paymentMethodLogo} /><Text style={styles.paymentOptionText}>GCash</Text><View style={[styles.radioCircle, paymentMethod === 'GCash' && styles.radioCircleSelected]}/></TouchableOpacity>
                </View>
            </ScrollView>
            <View style={styles.fixedButtonContainer}>
                <TouchableOpacity style={[styles.button, !paymentMethod && styles.buttonDisabled]} onPress={handleProceedToPay} disabled={!paymentMethod}><Text style={styles.buttonText}>Proceed to Pay</Text></TouchableOpacity>
            </View>

            {/* --- Modals --- */}
            <Modal animationType="fade" transparent={true} visible={isGcashModalVisible} onRequestClose={() => handleCloseModal(setGcashModalVisible)}><ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Pay with GCash</Text><Text style={styles.modalDescription}>Scan the QR code or send to the number below.</Text><Image source={GCASH_QR_IMAGE} style={styles.paymentModalImage} resizeMode="contain" /><View style={styles.gcashDetailsContainer}><Text style={styles.gcashDetailLabel}>GCash Name:</Text><Text style={styles.gcashDetailValue}>Fibear Inc.</Text><Text style={styles.gcashDetailLabel}>GCash Number:</Text><Text style={styles.gcashDetailValue}>0912-345-6789</Text></View><Text style={styles.paymentModalAmount}>Amount: <Text style={{fontWeight: 'bold'}}>₱{dueBill.amount.toFixed(2)}</Text></Text><View style={styles.uploadSection}>{proofOfPayment ? (<View style={{alignItems: 'center'}}><Image source={{ uri: proofOfPayment }} style={styles.proofPreviewImage} /><TouchableOpacity onPress={handleImagePick}><Text style={styles.changeImageText}>Change Screenshot</Text></TouchableOpacity></View>) : (<TouchableOpacity style={styles.uploadButton} onPress={handleImagePick}><Ionicons name="cloud-upload-outline" size={22} color={theme.primary} /><Text style={styles.uploadButtonText}>Upload Proof of Payment</Text></TouchableOpacity>)}</View><View style={styles.modalButtonContainer}><TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => handleCloseModal(setGcashModalVisible)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.primary}, !proofOfPayment && styles.buttonDisabled]} onPress={handleProcessPayment} disabled={!proofOfPayment}><Text style={[styles.modalButtonText, {color: theme.textOnPrimary}]}>I Have Paid</Text></TouchableOpacity></View></View></View></ScrollView></Modal>
            <Modal animationType="fade" transparent={true} visible={isCardModalVisible} onRequestClose={() => handleCloseModal(setCardModalVisible)}><ScrollView contentContainerStyle={{ justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><View style={styles.modalOverlay}><View style={styles.modalContent}><CreditCardDisplay cardInfo={cardInfo} theme={theme} /><Text style={styles.modalTitle}>Enter Card Details</Text><TextInput style={styles.paymentModalInput} placeholder="Card Number" placeholderTextColor={theme.textSecondary} value={cardInfo.number} onChangeText={(text) => handleCardInputChange('number', text)} keyboardType="numeric" maxLength={19} /><TextInput style={styles.paymentModalInput} placeholder="Cardholder Name" placeholderTextColor={theme.textSecondary} value={cardInfo.name} onChangeText={(text) => handleCardInputChange('name', text)} /><View style={{flexDirection: 'row', width: '100%'}}><TextInput style={[styles.paymentModalInput, {flex: 1, marginRight: 10}]} placeholder="Expiry (MM/YY)" placeholderTextColor={theme.textSecondary} value={cardInfo.expiry} onChangeText={(text) => handleCardInputChange('expiry', text)} keyboardType="numeric" maxLength={5} /><View style={styles.cvvContainer}><TextInput style={[styles.paymentModalInput, {flex: 1, marginBottom: 0}]} placeholder="CVV" placeholderTextColor={theme.textSecondary} value={cardInfo.cvv} onChangeText={(text) => setCardInfo({...cardInfo, cvv: text})} keyboardType="numeric" secureTextEntry maxLength={4} /><Image source={CVV_GUIDE_IMAGE} style={styles.cvvImage} /></View></View><View style={styles.modalButtonContainer}><TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => handleCloseModal(setCardModalVisible)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, {backgroundColor: theme.primary}, !isCardFormValid && styles.buttonDisabled]} onPress={handleProcessPayment} disabled={!isCardFormValid}><Text style={[styles.buttonText, {color: theme.textOnPrimary}]}>Pay ₱{dueBill.amount.toFixed(2)}</Text></TouchableOpacity></View></View></View></ScrollView></Modal>
        </SafeAreaView>
    );
}

// --- Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
        backgroundColor: theme.primary,
        paddingTop: 55, paddingBottom: 20, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    backButton: { position: 'absolute', left: 16, bottom: 20 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: theme.textOnPrimary },
    scrollContainer: { padding: 20, paddingBottom: 100 },
    summaryCard: {
        backgroundColor: theme.surface,
        borderRadius: 12, padding: 20, marginBottom: 30,
        elevation: theme.isDarkMode ? 1 : 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.isDarkMode ? 0 : 0.1, shadowRadius: 2,
    },
    summaryLabel: { fontSize: 16, color: theme.textSecondary },
    amountDue: { fontSize: 42, fontWeight: 'bold', color: theme.text, marginVertical: 8 },
    dueDate: { fontSize: 14, color: theme.danger, fontWeight: '500' },
    separator: { height: 1, backgroundColor: theme.border, marginVertical: 15 },
    accountInfo: { fontSize: 14, color: theme.textSecondary },
    paymentSection: { backgroundColor: theme.surface, borderRadius: 12, overflow: 'hidden' },
    sectionHeader: { fontSize: 16, fontWeight: '600', color: theme.text, padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: theme.background },
    paymentOptionSelected: { backgroundColor: theme.isDarkMode ? '#3c236e' : '#F3E8FF', borderColor: theme.accent, borderLeftWidth: 4, paddingLeft: 12 },
    paymentMethodLogo: { width: 28, height: 28, resizeMode: 'contain', marginRight: 15 },
    paymentOptionText: { fontSize: 16, flex: 1, color: theme.text },
    radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.disabled, justifyContent: 'center', alignItems: 'center' },
    radioCircleSelected: { borderColor: theme.accent, backgroundColor: theme.accent },
    fixedButtonContainer: {
        padding: 20, backgroundColor: theme.surface,
        borderTopWidth: 1, borderTopColor: theme.border
    },
    button: { backgroundColor: theme.primary, padding: 16, borderRadius: 10, alignItems: 'center' },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: {
        width: '100%', backgroundColor: theme.surface, borderRadius: 10,
        padding: 20, alignItems: 'center', elevation: 5
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 15, marginTop: 10 },
    modalDescription: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
    modalButton: { paddingVertical: 12, borderRadius: 8, flex: 1, alignItems: 'center', marginHorizontal: 5 },
    modalCancelButton: { backgroundColor: theme.disabled },
    modalButtonText: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    paymentModalInput: {
        width: '100%', borderWidth: 1, borderColor: theme.border, padding: 12,
        borderRadius: 8, marginBottom: 15, fontSize: 16,
        backgroundColor: theme.background, color: theme.text
    },
    paymentModalImage: { width: 180, height: 180, borderRadius: 8 },
    paymentModalAmount: { fontSize: 16, color: theme.textSecondary, marginTop: 15 },
    gcashDetailsContainer: {
        padding: 15, backgroundColor: theme.background,
        borderRadius: 8, width: '100%', marginTop: 15
    },
    gcashDetailLabel: { fontSize: 12, color: theme.textSecondary },
    gcashDetailValue: { fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 8 },
    uploadSection: { width: '100%', marginTop: 20, alignItems: 'center' },
    uploadButton: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.isDarkMode ? theme.surface : '#E0F7FA',
        paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8,
        borderWidth: 1, borderColor: theme.primary
    },
    uploadButtonText: { color: theme.primary, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    proofPreviewImage: { width: 100, height: 100, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    changeImageText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
    cardDisplay: { width: 280, height: 170, backgroundColor: '#444', borderRadius: 15, marginBottom: 20, padding: 20, justifyContent: 'space-between', elevation: 10 },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardChip: { width: 40, height: 30 },
    cardNumber: { color: 'white', fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' },
    cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
    cardLabel: { color: '#BDBDBD', fontSize: 10, textTransform: 'uppercase' },
    cardValue: { color: 'white', fontSize: 14, fontWeight: '600' },
    cvvContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    cvvImage: { width: 30, height: 20, marginLeft: 8, resizeMode: 'contain' },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: theme.background },
    emptyStateTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginTop: 15 },
    emptyStateText: { fontSize: 16, color: theme.textSecondary, marginTop: 8, textAlign: 'center' },
});