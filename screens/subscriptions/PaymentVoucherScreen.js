// screens/PaymentVoucherScreen.js (Refactored Design)

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme, useAlert } from '../../contexts';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Animatable from 'react-native-animatable';

// --- Sub-Components (Refactored for New Design) ---

const Header = React.memo(({ onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment Voucher</Text>
            <View style={{ width: 40 }} />
        </View>
    );
});

const ActionButton = React.memo(({ icon, text, onPress, isLoading, disabled, type = 'primary' }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const isPrimary = type === 'primary';
    const buttonStyle = isPrimary ? styles.primaryButton : styles.secondaryButton;
    const textStyle = isPrimary ? styles.primaryButtonText : styles.secondaryButtonText;

    return (
        <TouchableOpacity 
            style={[styles.actionButton, buttonStyle, (isLoading || disabled) && styles.disabledButton]} 
            onPress={onPress}
            disabled={isLoading || disabled}
        >
            {isLoading ? (
                <ActivityIndicator color={isPrimary ? theme.textOnPrimary : theme.primary} />
            ) : (
                <>
                    <Ionicons name={icon} size={22} color={textStyle.color} />
                    <Text style={textStyle}>{text}</Text>
                </>
            )}
        </TouchableOpacity>
    );
});

const Voucher = React.memo(({ bill, user }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
      <Animatable.View animation="fadeInUp" duration={600} style={styles.voucher}>
        {/* Top half of the voucher */}
        <View style={styles.voucherTop}>
            <View style={styles.voucherHeader}>
              <Ionicons name="receipt" size={32} color={theme.primary} />
              <Text style={styles.voucherTitle}>Fibear Internet</Text>
            </View>
            <Text style={styles.instructionText}>Present this QR code to any authorized payment center.</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Name</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{user.displayName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account No.</Text>
              <Text style={styles.detailValue}>{user._id.toString().slice(-8).toUpperCase()}</Text>
            </View>
        </View>

        {/* Dashed Separator */}
        <View style={styles.separatorContainer}>
            <View style={[styles.cutout, { left: -15 }]} />
            <View style={styles.dashedLine} />
            <View style={[styles.cutout, { right: -15 }]} />
        </View>

        {/* Bottom half of the voucher */}
        <View style={styles.voucherBottom}>
            <View style={styles.amountContainer}>
              <View>
                <Text style={styles.amountLabel}>AMOUNT DUE</Text>
                <Text style={styles.amountValue}>₱{bill.amount.toFixed(2)}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{new Date(bill.dueDate).toLocaleDateString()}</Text>
              </View>
            </View>

            <View style={styles.qrCodeSection}>
                <View style={styles.qrCodeBackground}>
                    <QRCode
                        value={JSON.stringify({type: 'bill',id: bill.id.toString()})}
                        size={160}
                        backgroundColor={theme.background}
                        color={theme.text}
                        logo={require('../../assets/logo.jpg')}
                        logoSize={30}
                        logoBackgroundColor='white'
                        logoMargin={4}
                        logoBorderRadius={8}
                    />
                </View>
                <Text style={styles.statementId}>Statement ID: {bill.id.toString().slice(-12).toUpperCase()}</Text>
            </View>
        </View>
      </Animatable.View>
    );
});

// --- Main Screen Component ---
export default function PaymentVoucherScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);
  const viewShotRef = useRef(null);

  const [isLoading, setIsLoading] = useState({ save: false, share: false });
  const { bill, user } = route.params;

  const handleCapture = useCallback(async (action) => {
    const actionKey = action === 'save' ? 'save' : 'share';
    setIsLoading(prev => ({ ...prev, [actionKey]: true }));
    
    try {
        const uri = await viewShotRef.current.capture();
        if (action === 'save') {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Required', 'Please enable photo library access to save the voucher.');
                return;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            showAlert('Success!', 'Voucher has been saved to your photo gallery.');
        } else if (action === 'share') {
            if (!(await Sharing.isAvailableAsync())) {
                showAlert('Not Available', "Sharing isn't available on this device.");
                return;
            }
            await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share your payment voucher' });
        }
    } catch (error) {
        console.error(`Error during voucher ${action}:`, error);
        showAlert('Error', `Oops, something went wrong while trying to ${action} the voucher.`);
    } finally {
        setIsLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  }, [showAlert]);

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
          <View style={styles.voucherWrapper}>
            <Voucher bill={bill} user={user} />
          </View>
        </ViewShot>

        <View style={styles.actionsContainer}>
          <ActionButton 
            type="primary"
            icon="download-outline"
            text="Save as Image"
            onPress={() => handleCapture('save')}
            isLoading={isLoading.save}
            disabled={isLoading.share}
          />
          <ActionButton 
            type="secondary"
            icon="share-social-outline"
            text="Share"
            onPress={() => handleCapture('share')}
            isLoading={isLoading.share}
            disabled={isLoading.save}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


// --- Stylesheet (Refactored) ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    scrollContent: { paddingBottom: 40 },
    
    // --- Header ---
    header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, height: 60 },
    headerButton: { padding: 5 },
    headerTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },

    // --- Voucher ---
    voucherWrapper: { padding: 20, backgroundColor: theme.background },
    voucher: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 10,
    },
    voucherTop: { padding: 25 },
    voucherBottom: { padding: 25 },
    voucherHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
    voucherTitle: { color: theme.text, fontSize: 22, fontWeight: 'bold', marginLeft: 12 },
    instructionText: { color: theme.textSecondary, fontSize: 15, marginTop: 4, marginBottom: 24, lineHeight: 22 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    detailLabel: { color: theme.textSecondary, fontSize: 15 },
    detailValue: { color: theme.text, fontSize: 16, fontWeight: '600', maxWidth: '60%' },
    
    // --- Amount ---
    amountContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20},
    amountLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase' },
    amountValue: { color: theme.primary, fontSize: 36, fontWeight: 'bold' },
    
    // --- Separator with Cutouts ---
    separatorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, height: 20 },
    cutout: { backgroundColor: theme.background, width: 30, height: 30, borderRadius: 15, position: 'absolute' },
    dashedLine: {
      borderBottomWidth: 2,
      borderColor: theme.border,
      borderStyle: 'dashed',
      flex: 1,
      marginHorizontal: 20,
    },

    // --- QR Code ---
    qrCodeSection: { alignItems: 'center', marginTop: 10 },
    qrCodeBackground: {
      backgroundColor: theme.background,
      borderRadius: 20,
      padding: 16,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    statementId: { color: theme.textSecondary, fontSize: 13, marginTop: 16 },

    // --- Action Buttons ---
    actionsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, paddingHorizontal: 20, gap: 15 },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: theme.border,
    },
    disabledButton: { opacity: 0.5 },
    primaryButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  });