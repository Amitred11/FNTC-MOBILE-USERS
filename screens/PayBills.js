// screens/PayBillsScreen.js (Cleaned)

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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription, useTheme, useAlert, useMessage, useAuth } from '../contexts';
import { requestMediaLibraryPermissions, requestCameraPermissions } from '../utils/permissions';
import StatusDisplay from '../components/StatusDisplay';
import PhotoSourceSheet from '../components/PhotoSourceSheet';

// --- Constants & Static Assets ---
const GCASH_QR_IMAGE = require('../assets/images/gcashqr.png');
const GCASH_LOGO_IMAGE = require('../assets/images/gcash.png');
const CASH_LOGO_IMAGE = require('../assets/images/cod.png');

const EMPTY_STATES_CONFIG = (theme, navigation) => ({
  pending_installation: { icon: 'build-outline', color: theme.warning, title: 'Awaiting Installation', text: 'Your bills will appear here once your modem installation is complete.' },
  pending_verification: { icon: 'hourglass-outline', color: theme.warning, title: 'Verification in Progress', text: 'Your first bill will appear here once your plan is active. Pull down to refresh.' },
  pending_change: { icon: 'swap-horizontal-outline', color: theme.accent, title: 'Plan Change in Progress', text: 'You cannot pay bills while your plan change is being reviewed.', buttonText: 'View Status', action: () => navigation.navigate('Subscription') },
  declined: { icon: 'close-circle-outline', color: theme.danger, title: 'Submission Declined', text: 'Your subscription payment was not approved. Please check your subscription details.', buttonText: 'View Status & Retry', action: () => navigation.navigate('Subscription') },
  cancelled: { icon: 'close-circle-outline', color: theme.disabled, title: 'Subscription Cancelled', text: 'There are no outstanding bills to be paid.', buttonText: 'View Account Status', action: () => navigation.navigate('Subscription') },
  null: { icon: 'document-text-outline', color: theme.disabled, title: 'No Active Plan', text: 'You need an active subscription to pay bills.', buttonText: 'Subscribe Now', action: () => navigation.navigate('Subscription') },
  suspended: { icon: 'warning-outline', color: theme.danger, title: 'Account Suspended', text: 'Your account is suspended. Paying your overdue bill will reactivate your service.', buttonText: 'VIEW MY BILLS', action: () => navigation.navigate('MyBills') },
  active: { icon: 'checkmark-done-circle-outline', color: theme.success, title: 'All Paid Up!', text: 'You have no outstanding bills. Great job!' },
});

// --- Sub-Components (Memoized for Performance) ---

const Header = React.memo(({ onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.headerIcon}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pay Bill</Text>
            <View style={styles.headerIcon} />
        </View>
    );
});

const PaymentOption = React.memo(({ method, logo, isSelected, onSelect }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <TouchableOpacity style={[styles.paymentOption, isSelected && styles.paymentOptionSelected]} onPress={onSelect} disabled={isSelected}>
      <Image source={logo} style={styles.paymentMethodLogo} />
      <Text style={styles.paymentOptionText}>{method}</Text>
      <Ionicons name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={24} color={isSelected ? theme.primary : theme.border} />
    </TouchableOpacity>
  );
});

const GcashModal = React.memo(({ isVisible, onClose, onSubmit, onImagePick, proofOfPayment, isSubmitting, dueBillAmount }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Pay with GCash</Text>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={theme.textSecondary} /></TouchableOpacity>
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
                                <View style={{ alignItems: 'center' }}>
                                <Image source={{ uri: proofOfPayment.uri }} style={styles.proofPreviewImage} />
                                <TouchableOpacity style={styles.changeImageButton} onPress={onImagePick}><Text style={styles.changeImageText}>Change Screenshot</Text></TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.uploadButton} onPress={onImagePick}>
                                <Ionicons name="cloud-upload-outline" size={24} color={theme.primary} />
                                <Text style={styles.uploadButtonText}>Upload Proof of Payment</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                    <View style={styles.fixedModalButtonContainer}>
                        <TouchableOpacity style={[styles.button, (!proofOfPayment || isSubmitting) && styles.buttonDisabled]} onPress={onSubmit} disabled={!proofOfPayment || isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>I HAVE PAID ₱{dueBillAmount}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
});


// --- Main Screen Component ---
export default function PayBillsScreen() {
  const navigation = useNavigation();
  const { paymentHistory, submitProof, subscriptionStatus, subscriptionData, refreshSubscription, isLoading } = useSubscription();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { showAlert, showMessage } = useAlert();
  const { user } = useAuth();

  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isGcashModalVisible, setGcashModalVisible] = useState(false);
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
  
  useFocusEffect(
      useCallback(() => {
          onRefresh();
      }, [onRefresh])
    );

  useEffect(() => {
    const backAction = () => {
      if (isGcashModalVisible) { setGcashModalVisible(false); return true; }
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isGcashModalVisible, navigation]);

  const handleProceed = useCallback(() => {
    if (paymentMethod === 'GCash') setGcashModalVisible(true);
    else if (paymentMethod === 'Cash' && dueBill) navigation.navigate('PaymentVoucherScreen', { bill: dueBill, user });
  }, [paymentMethod, dueBill, user, navigation]);

  const handleGcashPaymentSubmit = useCallback(async () => {
    if (!dueBill || !proofOfPayment) return;
    setIsSubmitting(true);
    try {
      await submitProof(dueBill.id, proofOfPayment.base64);
      setGcashModalVisible(false);
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Amount Due for {dueBill.planName}</Text>
          <Text style={styles.amountDue}>₱{dueBill.amount.toFixed(2)}</Text>
          <View style={styles.statusBadgeDue}><Text style={styles.statusBadgeTextDue}>Due on: {new Date(dueBill.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text></View>
        </View>
        <View style={styles.paymentSection}>
          <Text style={styles.sectionHeader}>Choose Payment Method</Text>
          <PaymentOption method="GCash e-Wallet" logo={GCASH_LOGO_IMAGE} isSelected={paymentMethod === 'GCash'} onSelect={() => setPaymentMethod('GCash')} />
          <PaymentOption method="Pay at the Office (Cash)" logo={CASH_LOGO_IMAGE} isSelected={paymentMethod === 'Cash'} onSelect={() => setPaymentMethod('Cash')} />
        </View>
      </ScrollView>
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={[styles.button, !paymentMethod && styles.buttonDisabled]} onPress={handleProceed} disabled={!paymentMethod}>
          <Text style={styles.buttonText}>PROCEED</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderEmptyState = () => {
    if (pendingBill) {
      return <ScrollView contentContainerStyle={styles.fullScreenScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}><StatusDisplay illustration={ILLUSTRATIONS.VERIFICATION} title="Payment Under Review" text={`We have received your payment proof for ₱${pendingBill.amount.toFixed(2)} and are currently verifying it. This may take up to 24 hours.`} /></ScrollView>;
    }
    const stateConfig = EMPTY_STATES_CONFIG(theme, navigation);
    const state = stateConfig[subscriptionStatus] || stateConfig.active;
    return <ScrollView contentContainerStyle={styles.fullScreenScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}><StatusDisplay icon={state.icon} color={state.color} title={state.title} text={state.text} buttonText={state.buttonText} action={state.action} /></ScrollView>;
  };
  
  if (isLoading && !refreshing) {
    return <SafeAreaView style={styles.container}><Header onBackPress={() => navigation.goBack()} title="Pay Bill" /><ActivityIndicator size="large" color={theme.primary} style={{flex: 1}} /></SafeAreaView>
  }

  const shouldRenderPaymentFlow = dueBill && !pendingBill;

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={() => navigation.goBack()} title="Pay Bill" />
      {shouldRenderPaymentFlow ? renderPaymentFlow() : renderEmptyState()}
      {dueBill && 
        <GcashModal
          isVisible={isGcashModalVisible}
          onClose={() => setGcashModalVisible(false)}
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

const getStyles = (theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 20,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    headerIcon: {
      width: 40, // For spacing
      alignItems: 'flex-start',
    },
    amountDue: { color: theme.text, fontSize: 48, fontWeight: 'bold', marginVertical: 8 },
    button: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 14,
      height: 54,
      justifyContent: 'center',
      padding: 16,
    },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    changeImageButton: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 12,
    },
    changeImageText: { color: theme.accent, fontSize: 14, fontWeight: '600' },
    container: { backgroundColor: theme.background, flex: 1 },
    emptyStateContainer: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 30 },
    emptyStateText: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      marginTop: 8,
      paddingHorizontal: 10,
      textAlign: 'center',
    },
    emptyStateTitle: {
      color: theme.text,
      fontSize: 22,
      fontWeight: 'bold',
      marginTop: 15,
      textAlign: 'center',
    },
    fixedButtonContainer: {
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      paddingTop: 10,
    },
    fixedModalButtonContainer: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderTopWidth: 1,
      bottom: 0,
      left: 0,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      position: 'absolute',
      right: 0,
    },
    fullScreenScroll: { alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
    gcashDetailLabel: { color: theme.textSecondary, fontSize: 13 },
    gcashDetailValue: { color: theme.text, fontSize: 16, fontWeight: '600', marginBottom: 8 },
    gcashDetailsContainer: {
      alignSelf: 'center',
      backgroundColor: theme.background,
      borderRadius: 8,
      marginTop: 20,
      padding: 15,
      width: '90%',
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '95%',
      overflow: 'hidden',
      width: '100%',
    },
    modalDescription: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginVertical: 20,
      paddingHorizontal: 10,
      textAlign: 'center',
    },
    modalHeader: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 20,
    },
    modalOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.7)', flex: 1, justifyContent: 'flex-end' },
    modalScrollContent: { paddingBottom: 120 },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    paymentMethodLogo: { height: 32, marginRight: 15, resizeMode: 'contain', width: 32 },
    paymentModalImage: { alignSelf: 'center', borderRadius: 8, height: 200, width: 200 },
    paymentOption: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 14,
      borderWidth: 2,
      flexDirection: 'row',
      marginBottom: 12,
      padding: 16,
    },
    paymentOptionSelected: { backgroundColor: `${theme.primary}1A`, borderColor: theme.primary },
    paymentOptionText: { color: theme.text, flex: 1, fontSize: 17, fontWeight: '600' },
    paymentSection: { marginTop: 30 },
    proofPreviewImage: {
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      height: 180,
      marginBottom: 15,
      width: 180,
    },
    scrollContainer: { flexGrow: 1, padding: 20, paddingBottom: 120 },
    sectionHeader: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    statusBadgeDue: {
      alignSelf: 'flex-start',
      backgroundColor: `${theme.danger}20`,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statusBadgeTextDue: { color: theme.danger, fontSize: 13, fontWeight: 'bold' },
    subscribeButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      marginTop: 25,
      paddingHorizontal: 30,
      paddingVertical: 14,
    },
    subscribeButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    summaryCard: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 30,
      padding: 20,
    },
    summaryLabel: { color: theme.textSecondary, fontSize: 16, fontWeight: '500' },
    uploadButton: {
      alignItems: 'center',
      backgroundColor: `${theme.primary}10`,
      borderColor: theme.primary,
      borderRadius: 12,
      borderStyle: 'dashed',
      borderWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    uploadButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600', marginLeft: 10 },
    uploadSection: { alignItems: 'center', padding: 20, width: '100%' },
  });
