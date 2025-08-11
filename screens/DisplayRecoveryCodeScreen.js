// screens/DisplayRecoveryCodeScreen.js (Redesigned with Improved Copy)

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { lightTheme } from '../constants/colors';
import { useMessage, useAlert, useAuth } from '../contexts';  
import * as Animatable from 'react-native-animatable';


const Header = React.memo(() => {
  const styles = getStyles(lightTheme);
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Your Account Recovery Code</Text>
    </View>
  );
});

const Guideline = React.memo(({ icon, text }) => {
    const styles = getStyles(lightTheme);
    return (
        <View style={styles.guidelineRow}>
            <Ionicons name={icon} size={22} color={lightTheme.primary} style={styles.guidelineIcon} />
            <Text style={styles.guidelineText}>{text}</Text>
        </View>
    );
})

export default function DisplayRecoveryCodeScreen() {
  const navigation = useNavigation();
  const theme = lightTheme;
  const { showMessage } = useMessage();
  const { showAlert } = useAlert();
  const { pendingRecoveryCode, acknowledgeRecoveryCode } = useAuth();
  const styles = getStyles(theme);

  const formattedCode = useMemo(() => {
    if (!pendingRecoveryCode) return 'Loading...';
    return pendingRecoveryCode.match(/.{1,8}/g)?.join('  ') || pendingRecoveryCode;
  }, [pendingRecoveryCode]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    const backAction = () => {
      showAlert("Save Your Code", "You must save your recovery code before proceeding. This is the only time it will be shown.", [{ text: "OK" }]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation, showAlert]);


  const handleCopyCode = useCallback(() => {
    if (pendingRecoveryCode) {
        Clipboard.setString(pendingRecoveryCode);
        showMessage('Recovery code copied to clipboard!');
    }
  }, [pendingRecoveryCode, showMessage]);

  const handleContinue = useCallback(() => {
    showAlert(
      "Confirm You've Saved Your Code",
      "Have you written down or stored this code in a secure location?",
      [
        { text: "Not Yet", style: "cancel" },
        { text: "Yes, I Have", onPress: acknowledgeRecoveryCode, style: "default" }
      ]
    );
  }, [acknowledgeRecoveryCode, showAlert]);

  useEffect(() => {
    if (!pendingRecoveryCode) {
      console.warn("DisplayRecoveryCodeScreen rendered without a pending code. Acknowledging to proceed.");
      acknowledgeRecoveryCode(); 
    }
  }, [pendingRecoveryCode, acknowledgeRecoveryCode]);
  
  return (
    <SafeAreaView style={styles.container}>
      <Header /> 
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
                <Ionicons name="shield-checkmark-outline" size={50} color={theme.primary} />
            </View>
            <Text style={styles.title}>Save This Code!</Text>
            <Text style={styles.subtitle}>
                This is the <Text style={{fontWeight: 'bold'}}>only way</Text> to recover your account if you lose your password.
            </Text>
        </View>
        
        <Animatable.View animation="fadeInUp" duration={600} delay={300} style={styles.codeCard}>
            <TouchableOpacity style={styles.recoveryCodeWrapper} onPress={handleCopyCode} activeOpacity={0.7}>
                <Text style={styles.recoveryCodeText}>{formattedCode}</Text>
                <Ionicons name="copy-outline" size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={24} color={theme.danger} style={styles.warningIcon} />
                <Text style={styles.warningText}>
                    <Text style={{fontWeight: 'bold'}}>This is the only time this code will be displayed.</Text> We cannot recover this code for you.
                </Text>
            </View>
        </Animatable.View>
        
        <Animatable.View animation="fadeInUp" duration={600} delay={400}>
            <Text style={styles.guidelineTitle}>How to Keep It Safe</Text>
            <Guideline icon="document-text-outline" text="Write it down on paper and store it in a secure place (like a safe)." />
            <Guideline icon="camera-outline" text="Do NOT save this as a screenshot on your phone." />
            <Guideline icon="eye-off-outline" text="Never share this code. Our staff will never ask for it." />
        </Animatable.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>I Understand & Have Saved My Code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      paddingVertical: 12,
      backgroundColor: theme.background,
      alignItems: 'center',
    },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 120,
    },
    heroSection: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 20,
    },
    heroIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: theme.border,
    },
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      maxWidth: '90%',
    },
    codeCard: {
        backgroundColor: theme.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: theme.border,
    },
    recoveryCodeWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: `${theme.primary}10`,
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    recoveryCodeText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.primary,
      letterSpacing: 2,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${theme.danger}1A`,
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: `${theme.danger}40`
    },
    warningIcon: {
        marginRight: 12,
    },
    warningText: {
      color: theme.danger,
      fontSize: 14,
      lineHeight: 21,
      flex: 1,
    },
    guidelineTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 15,
    },
    guidelineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    guidelineIcon: {
        marginRight: 15,
    },
    guidelineText: {
        fontSize: 16,
        color: theme.textSecondary,
        flex: 1,
        lineHeight: 22,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.background,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 34 : 24,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    continueButton: {
      backgroundColor: theme.primary,
      borderRadius: 16,
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
    },
    continueButtonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });