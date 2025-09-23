// screens/PayBillsScreen.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image,
  BackHandler,
  RefreshControl,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription, useTheme, useAlert, useMessage, useAuth } from '../../contexts';
import { requestMediaLibraryPermissions, requestCameraPermissions } from '../../utils/permissions';
import StatusDisplay from '../../components/StatusDisplay';
import PhotoSourceSheet from '../../components/PhotoSourceSheet';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { EMPTY_STATES_CONFIG } from '../../data/Constants-Data';

const GCASH_QR_IMAGE = require('../../assets/images/payments/gcashqr.png');
const GCASH_LOGO_IMAGE = require('../../assets/images/payments/gcash.png');
const CASH_LOGO_IMAGE = require('../../assets/images/payments/cod.png');

const Header = React.memo(({ onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pay Bill</Text>
            <View style={styles.headerButton} />
        </View>
    );
});

const BillSummaryCard = React.memo(({ bill }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Animatable.View animation="fadeInDown" duration={600}>
            <LinearGradient colors={theme.isDarkMode ? ['#0A84FF', '#0052A3'] : ['#007AFF', '#0052A3']} style={styles.heroCard}>
                <Ionicons name="receipt-outline" size={80} color="rgba(255,255,255,0.1)" style={styles.heroCardBackgroundIcon} />
                <Text style={styles.heroCardLabel}>Amount Due for {bill.planName}</Text>
                <Text style={styles.heroCardAmount}>₱{bill.amount.toFixed(2)}</Text>
                <View style={styles.heroCardDueDateContainer}>
                    <Ionicons name="alarm-outline" size={16} color={theme.textOnPrimary} />
                    <Text style={styles.heroCardDueDateText}>Due on {new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
                </View>
            </LinearGradient>
        </Animatable.View>
    );
});

const PaymentMethodCard = React.memo(({ icon, title, description, isSelected, onSelect }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Animatable.View animation="fadeInUp" duration={600} delay={100}>
            <TouchableOpacity 
                style={[styles.paymentMethodCard, isSelected && styles.paymentMethodCardSelected]} 
                onPress={onSelect}
            >
                <Image source={icon} style={styles.paymentMethodLogo} />
                <View style={styles.paymentMethodTextContainer}>
                    <Text style={styles.paymentMethodTitle}>{title}</Text>
                    <Text style={styles.paymentMethodDescription}>{description}</Text>
                </View>
                <View style={styles.radioCircle}>
                    {isSelected && <View style={styles.radioDot} />}
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );
});


const GcashPaymentSheet = React.memo(({ isVisible, onClose, onSubmit, onImagePick, proofOfPayment, isSubmitting, dueBillAmount }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <Animatable.View animation="slideInUp" duration={400} style={styles.sheetContent}>
                            <View style={styles.gripper} />
                            <Text style={styles.sheetTitle}>Pay with GCash</Text>
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepHeader}>Step 1: Send Payment</Text>
                                    <Text style={styles.stepDescription}>Scan the QR code below or manually send ₱{dueBillAmount} to our official GCash account.</Text>
                                    <View style={styles.gcashInfoBox}>
                                        <Image source={GCASH_QR_IMAGE} style={styles.gCashQrImage} />
                                        <View style={styles.gCashDetails}>
                                            <Text style={styles.gCashLabel}>Name</Text>
                                            <Text style={styles.gCashValue}>Fibear Inc.</Text>
                                            <Text style={styles.gCashLabel}>Number</Text>
                                            <Text style={styles.gCashValue}>0912-345-6789</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.stepContainer}>
                                    <Text style={styles.stepHeader}>Step 2: Upload Proof</Text>
                                    <Text style={styles.stepDescription}>Attach a screenshot of your successful transaction receipt. This is required for verification.</Text>
                                    {proofOfPayment ? (
                                        <View style={styles.proofPreviewContainer}>
                                            <Image source={{ uri: proofOfPayment.uri }} style={styles.proofPreviewImage} />
                                            <TouchableOpacity onPress={onImagePick} style={styles.changeImageButton}>
                                                <Ionicons name="repeat-outline" size={20} color={theme.textOnPrimary} />
                                                <Text style={styles.changeImageButtonText}>Change Screenshot</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity style={styles.uploadButton} onPress={onImagePick}>
                                            <Ionicons name="cloud-upload-outline" size={28} color={theme.primary} />
                                            <Text style={styles.uploadButtonText}>Choose Screenshot</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </ScrollView>
                            <View style={styles.sheetActions}>
                                <TouchableOpacity style={[styles.button, (!proofOfPayment || isSubmitting) && styles.buttonDisabled]} onPress={onSubmit} disabled={!proofOfPayment || isSubmitting}>
                                    {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>Submit for Verification</Text>}
                                </TouchableOpacity>
                            </View>
                        </Animatable.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});


// --- Main Screen Component (No changes needed here) ---
export default function PayBillsScreen() {
  const navigation = useNavigation();
  const { paymentHistory, submitProof, subscriptionStatus, refreshSubscription, isLoading } = useSubscription();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { showAlert, showMessage } = useAlert();
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isGcashSheetVisible, setGcashSheetVisible] = useState(false);
  const [proofOfPayment, setProofOfPayment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPhotoSheetVisible, setPhotoSheetVisible] = useState(false);

  const { pendingBill, dueBill } = useMemo(() => ({
    pendingBill: paymentHistory.find(item => item.type === 'bill' && item.status === 'Pending Verification'),
    dueBill: paymentHistory.find(item => item.type === 'bill' && (item.status === 'Due' || item.status === 'Overdue')),
  }), [paymentHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  }, [refreshSubscription]);
  
  useFocusEffect(useCallback(() => { onRefresh(); }, []));

  useEffect(() => {
    const backAction = () => {
      if (isGcashSheetVisible) { setGcashSheetVisible(false); return true; }
      if (isPhotoSheetVisible) { setPhotoSheetVisible(false); return true; }
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isGcashSheetVisible, isPhotoSheetVisible, navigation]);

  const handleProceed = useCallback(() => {
    if (paymentMethod === 'GCash') setGcashSheetVisible(true);
    else if (paymentMethod === 'Cash' && dueBill) navigation.navigate('PaymentVoucherScreen', { bill: dueBill, user });
  }, [paymentMethod, dueBill, user, navigation]);

  const handleGcashPaymentSubmit = useCallback(async () => {
    if (!dueBill || !proofOfPayment) return;
    setIsSubmitting(true);
    try {
      await submitProof(dueBill.id, proofOfPayment.base64);
      setGcashSheetVisible(false);
      setProofOfPayment(null);
      showMessage('Submitted for Verification', 'Your payment is now being reviewed by our team.');
    } catch (error) {
      showAlert('Submission Failed', error.response?.data?.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }, [dueBill, proofOfPayment, submitProof, showMessage, showAlert]);

  const pickImage = useCallback(async (pickerFunction) => {
    setPhotoSheetVisible(false);
    try {
      const pickerResult = await pickerFunction({ allowsEditing: true, quality: 0.7, base64: true });
      if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
        const asset = pickerResult.assets[0];
        const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        setProofOfPayment({ uri: asset.uri, base64: base64Data });
      }
    } catch (e) {
      showAlert('Error', 'Could not access photos. Please check permissions in your device settings.');
    }
  }, [showAlert]);

  const pickImageFromCamera = useCallback(async (options) => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) throw new Error("Permission denied");
    return await ImagePicker.launchCameraAsync(options);
  }, []);

  const pickImageFromGallery = useCallback(async (options) => {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) throw new Error("Permission denied");
    return await ImagePicker.launchImageLibraryAsync(options);
  }, []);

  const renderPaymentFlow = () => (
    <>
      <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
        <BillSummaryCard bill={dueBill} />
        <View style={styles.paymentSection}>
          <Text style={styles.sectionHeader}>Choose Payment Method</Text>
          <PaymentMethodCard icon={GCASH_LOGO_IMAGE} title="GCash e-Wallet" description="Pay online and upload proof" isSelected={paymentMethod === 'GCash'} onSelect={() => setPaymentMethod('GCash')} />
          <PaymentMethodCard icon={CASH_LOGO_IMAGE} title="Cash Payment" description="Generate voucher for office payment" isSelected={paymentMethod === 'Cash'} onSelect={() => setPaymentMethod('Cash')} />
        </View>
      </ScrollView>
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={[styles.button, !paymentMethod && styles.buttonDisabled]} onPress={handleProceed} disabled={!paymentMethod}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEmptyState = () => {
    if (pendingBill) {
      return <ScrollView contentContainerStyle={styles.fullScreenScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}><StatusDisplay illustration={require('../../assets/images/status/completedplan.png')} title="Payment Under Review" text={`We are verifying your payment of ₱${pendingBill.amount.toFixed(2)}. This may take up to 24 hours.`} /></ScrollView>;
    }
    const stateConfig = EMPTY_STATES_CONFIG(theme, navigation);
    const state = stateConfig[subscriptionStatus] || stateConfig.active;
    return <ScrollView contentContainerStyle={styles.fullScreenScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}><StatusDisplay icon={state.icon} color={state.color} title={state.title} text={state.text} buttonText={state.buttonText} action={state.action} /></ScrollView>;
  };
  
  if (isLoading && !refreshing) {
    return <SafeAreaView style={styles.container}><Header onBackPress={() => navigation.goBack()} /><View style={styles.fullScreenScroll}><ActivityIndicator size="large" color={theme.primary} /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={() => navigation.goBack()} />
      {dueBill && !pendingBill ? renderPaymentFlow() : renderEmptyState()}
      {dueBill && 
        <GcashPaymentSheet
          isVisible={isGcashSheetVisible}
          onClose={() => setGcashSheetVisible(false)}
          onSubmit={handleGcashPaymentSubmit}
          onImagePick={() => setPhotoSheetVisible(true)}
          proofOfPayment={proofOfPayment}
          isSubmitting={isSubmitting}
          dueBillAmount={dueBill.amount.toFixed(2)}
        />
      }
      <PhotoSourceSheet
        isVisible={isPhotoSheetVisible}
        onChooseCamera={() => pickImage(pickImageFromCamera)}
        onChooseGallery={() => pickImage(pickImageFromGallery)}
        onClose={() => setPhotoSheetVisible(false)}
        title="Upload Proof of Payment"
      />
    </SafeAreaView>
  );
}


// --- Stylesheet (Refactored) ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
    headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    scrollContainer: { paddingHorizontal: 20, paddingBottom: 120 },
    fullScreenScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

    // --- Hero Card ---
    heroCard: { borderRadius: 24, padding: 25, overflow: 'hidden' },
    heroCardBackgroundIcon: { position: 'absolute', right: -10, top: 10, opacity: 0.1 },
    heroCardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
    heroCardAmount: { color: theme.textOnPrimary, fontSize: 48, fontWeight: 'bold', marginVertical: 8 },
    heroCardDueDateContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
    heroCardDueDateText: { color: theme.textOnPrimary, fontSize: 14, fontWeight: '600', marginLeft: 6 },
    
    // --- Payment Section ---
    paymentSection: { marginTop: 30 },
    sectionHeader: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    paymentMethodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 3,
      transition: 'all 0.3s ease',
    },
    paymentMethodCardSelected: {
      borderColor: theme.primary,
      transform: [{ scale: 1.03 }],
      shadowColor: theme.primary,
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
    paymentMethodLogo: { width: 40, height: 40, resizeMode: 'contain', marginRight: 15 },
    paymentMethodTextContainer: { flex: 1 },
    paymentMethodTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text },
    paymentMethodDescription: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.primary },

    // --- Fixed Bottom Button ---
    fixedButtonContainer: {
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      padding: 20,
      paddingBottom: 20,
    },
    button: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 14, height: 54, justifyContent: 'center' },
    buttonDisabled: { backgroundColor: theme.disabled, opacity: 0.7 },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },

    // --- GCash Bottom Sheet ---
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheetContent: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '90%' },
    gripper: { width: 40, height: 5, backgroundColor: theme.border, borderRadius: 2.5, alignSelf: 'center', marginBottom: 12 },
    sheetTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 16 },
    stepContainer: { marginBottom: 24 },
    stepHeader: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
    stepDescription: { fontSize: 14, color: theme.textSecondary, lineHeight: 20, marginBottom: 16 },
    gcashInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, padding: 16, borderRadius: 12 },
    gCashQrImage: { width: 100, height: 100, borderRadius: 8 },
    gCashDetails: { marginLeft: 16 },
    gCashLabel: { fontSize: 13, color: theme.textSecondary },
    gCashValue: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 },
    uploadButton: { alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: theme.background, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border },
    uploadButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600', marginTop: 8 },
    proofPreviewContainer: { alignItems: 'center' },
    proofPreviewImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain', marginBottom: 12 },
    changeImageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, position: 'absolute', bottom: 20 },
    changeImageButtonText: { color: theme.textOnPrimary, fontWeight: 'bold', marginLeft: 8 },
    sheetActions: { paddingTop: 10, borderTopColor: theme.border, borderTopWidth: 1, marginTop: 10 },
  });