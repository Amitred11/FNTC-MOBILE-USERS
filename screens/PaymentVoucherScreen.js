// screens/PaymentVoucherScreen.js (Cleaned and Corrected)

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
import { useTheme, useAlert } from '../contexts';
import Ionicons from '@expo/vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// --- Sub-Components (Memoized for Performance) ---

const Header = React.memo(({ onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment Voucher</Text>
            <View style={{ width: 40 }} />
        </View>
    );
});

const ActionButton = React.memo(({ icon, text, onPress, isLoading, disabled }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity 
            style={[styles.actionButton, (isLoading || disabled) && styles.disabledButton]} 
            onPress={onPress}
            disabled={isLoading || disabled}
        >
            {isLoading ? (
                <ActivityIndicator color={theme.textOnPrimary} />
            ) : (
                <>
                    <Ionicons name={icon} size={22} color={theme.textOnPrimary} />
                    <Text style={styles.actionButtonText}>{text}</Text>
                </>
            )}
        </TouchableOpacity>
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
                showAlert('Permission Required', 'Please enable photo library access to save the voucher.', [{ text: 'OK' }]);
                return;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            showAlert('Success!', 'Voucher has been saved to your photo gallery.', [{ text: 'OK' }]);
        } else if (action === 'share') {
            if (!(await Sharing.isAvailableAsync())) {
                showAlert('Not Available', "Sharing isn't available on this device.", [{ text: 'OK' }]);
                return;
            }
            await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share your payment voucher' });
        }
    } catch (error) {
        console.error(`Error during voucher ${action}:`, error);
        showAlert('Error', `Oops, something went wrong while trying to ${action} the voucher.`, [{ text: 'OK' }]);
    } finally {
        setIsLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  }, [showAlert]);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={handleGoBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* --- THIS IS THE FIX --- */}
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
          <View style={{ backgroundColor: theme.surface }}>
            <View style={styles.voucherContainer}>
                <View style={styles.voucherHeader}>
                    <Ionicons name="receipt-outline" size={40} color={theme.primary} />
                    <Text style={styles.voucherTitle}>Fibear Internet</Text>
                </View>
                <Text style={styles.instructionText}>Present this voucher to the cashier for cash payment.</Text>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Name</Text>
                    <Text style={styles.detailValue}>{user.displayName}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Number</Text>
                    <Text style={styles.detailValue}>{user._id.toString().slice(-8).toUpperCase()}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Statement No.</Text>
                    <Text style={styles.detailValue}>{bill.id.toString().slice(-12).toUpperCase()}</Text>
                </View>

                <View style={styles.separator} />

                <Text style={styles.amountLabel}>AMOUNT DUE</Text>
                <Text style={styles.amountValue}>₱{bill.amount.toFixed(2)}</Text>
                <Text style={styles.dueDate}>Due on: {new Date(bill.dueDate).toLocaleDateString()}</Text>

                <View style={styles.qrContainer}>
                    <QRCode
                        value={JSON.stringify({ billId: bill.id.toString(), userId: user._id.toString() })}
                        size={180}
                        backgroundColor={theme.surface}
                        color={theme.text}
                    />
                </View>
            </View>
          </View>
        </ViewShot>

        <View style={styles.actionsContainer}>
          <ActionButton 
            icon="download-outline"
            text="Save to Photos"
            onPress={() => handleCapture('save')}
            isLoading={isLoading.save}
            disabled={isLoading.share}
          />
          <ActionButton 
            icon="share-social-outline"
            text="Share Voucher"
            onPress={() => handleCapture('share')}
            isLoading={isLoading.share}
            disabled={isLoading.save}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const getStyles = (theme) =>
  StyleSheet.create({
    actionButton: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      minWidth: 100,
      paddingHorizontal: 10,
      paddingVertical: 10,
      bottom: 10
    },
    disabledButton: { backgroundColor: theme.disabled },
    actionButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold', margin: 5 },
    actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, gap: 10 },
    amountLabel: { color: theme.textSecondary, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },
    amountValue: { color: theme.primary, fontSize: 42, fontWeight: 'bold', marginVertical: 5 },
    backButton: { padding: 5, zIndex: 1 },
    container: { backgroundColor: theme.background, flex: 1 },
    detailLabel: { color: theme.textSecondary, fontSize: 16 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, width: '100%' },
    detailValue: { color: theme.text, fontSize: 16, fontWeight: '500' },
    dueDate: { color: theme.textSecondary, fontSize: 14, fontStyle: 'italic' },
    header: { alignItems: 'center', borderBottomColor: theme.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10 },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: '600', position: 'absolute', left: 0, right: 0, textAlign: 'center' },
    instructionText: { color: theme.textSecondary, fontSize: 15, marginBottom: 25, textAlign: 'center' },
    qrContainer: { backgroundColor: theme.surface, borderRadius: 8, marginTop: 30, padding: 15 },
    scrollContent: { padding: 20 },
    separator: { backgroundColor: theme.border, height: 1, marginVertical: 20, width: '100%' },
    voucherContainer: { alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderRadius: 12, borderWidth: 1, padding: 25 },
    voucherHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: 15 },
    voucherTitle: { color: theme.text, fontSize: 24, fontWeight: 'bold', marginLeft: 15 },
  });