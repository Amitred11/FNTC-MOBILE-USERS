// screens/ForgotPasswordScreen.js

import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useMessage, useAlert } from '../contexts';
import * as Animatable from 'react-native-animatable';
import { CommonActions } from '@react-navigation/native';

const Header = React.memo(({ onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Forgot Password</Text>
            <View style={{ width: 26 }} />
        </View>
    );
});

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { api } = useAuth();
  const { showMessage } = useMessage();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);

  const [email, setEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetToken, setResetToken] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [flowStep, setFlowStep] = useState(1);

  const errorRef = useRef(null);

  const validateNewPassword = useCallback(() => {
    if (!newPassword || !confirmPassword) return 'All password fields are required.'; 
    if (newPassword !== confirmPassword) return 'New passwords do not match.';
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    if (!passwordRegex.test(newPassword)) return 'Password must be 8+ characters and include an uppercase letter, a number, and a special character.';
    return null;
  }, [newPassword, confirmPassword]);

  const handleVerifyRecoveryCode = async () => {
    if (!email.trim() || !recoveryCode.trim()) {
      setErrorMessage('Email and Recovery Code are required.');
      errorRef.current?.shake(800);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password-recovery-code', { email, recoveryCode });
      setResetToken(response.data.token);
      setFlowStep(2);
      showMessage('Recovery code verified!');
    } catch (error) {
      console.error('Recovery code verification failed:', error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || 'Invalid email or recovery code.');
      errorRef.current?.shake(800);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    const validationError = validateNewPassword();
    if (validationError) { setErrorMessage(validationError); errorRef.current?.shake(800); return; }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await api.put(`/auth/reset-password-recovery-code/${resetToken}`, { newPassword: newPassword, confirmPassword: newPassword }); 
      showAlert(
        'Password Reset Successful',
        'Your password has been reset. Please log in with your new password.',
        [{ text: 'OK', onPress: () => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'SignUp', params: { screen: 'Login' } }] })) }]
      );
    } catch (error) {
      console.error('Set new password failed:', error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || 'Failed to set new password. Token might be expired.');
      errorRef.current?.shake(800);
    } finally { setIsLoading(false); }
  };

  const handleGoBack = useCallback(() => {
    if (flowStep > 1) {
      setFlowStep(1);
      setErrorMessage('');
      setResetToken(null);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      navigation.goBack();
    }
  }, [flowStep, navigation]);

  const handleContactSupport = useCallback(() => {
    showAlert(
        'Contact Support',
        'You will be redirected to the support page to create a ticket or chat with an agent for assistance with your recovery code.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Proceed', onPress: () => navigation.navigate('SupportHelp') }] // Navigate to SupportHelp
    );
  }, [navigation, showAlert]);

  const isButtonDisabled = useMemo(() => {
    if (isLoading) return true;
    if (flowStep === 1) return !email.trim() || !recoveryCode.trim();
    if (flowStep === 2) return !newPassword || !confirmPassword;
    return true;
  }, [isLoading, flowStep, email, recoveryCode, newPassword, confirmPassword]);

  const getFlowTitle = useMemo(() => {
    return flowStep === 1 ? "Forgot Your Password?" : "Set New Password";
  }, [flowStep]);

  const getFlowSubtitle = useMemo(() => {
    return flowStep === 1 ? "Enter your email and recovery code to reset your password." : "Enter and confirm your new password.";
  }, [flowStep]);

  const getFlowIcon = useMemo(() => {
    return flowStep === 1 ? "key-outline" : "lock-closed-outline";
  }, [flowStep]);

  const getButtonText = useMemo(() => {
    if (isLoading) return <ActivityIndicator color={theme.textOnPrimary} />;
    return flowStep === 1 ? "Verify Code" : "Reset Password";
  }, [isLoading, flowStep, theme]);

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={handleGoBack} />

      <View style={{ bottom: 0, flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Ionicons
            name={getFlowIcon}
            size={60}
            color={theme.primary}
            style={styles.iconHeader}
          />
          <Text style={styles.title}>{getFlowTitle}</Text>
          <Text style={styles.subtitle}>{getFlowSubtitle}</Text>

          {/* --- STEP 1: Enter Email & Recovery Code --- */}
          {flowStep === 1 && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="youremail@example.com"
                    placeholderTextColor={theme.textSecondary}
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Recovery Code</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={recoveryCode}
                    onChangeText={setRecoveryCode}
                    secureTextEntry={true}
                    autoCapitalize="none"
                    placeholder="Enter your recovery code"
                    placeholderTextColor={theme.textSecondary}
                    editable={!isLoading}
                  />
                </View>
              </View>
            </>
          )}

          {/* --- STEP 2: Set New Password --- */}
          {flowStep === 2 && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={true}
                    placeholderTextColor={theme.textSecondary}
                    editable={!isLoading}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={true}
                    placeholderTextColor={theme.textSecondary}
                    editable={!isLoading}
                  />
                </View>
              </View>
            </>
          )}

          {errorMessage ? (
            <Animatable.View ref={errorRef} animation="shake" duration={800} style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </Animatable.View>
          ) : null}
          <TouchableOpacity onPress={handleContactSupport}>
            <Text style={styles.helpButtonText}>Lost your recovery code? Get Help.</Text>
      </TouchableOpacity>

        </ScrollView>
      </View>
     <KeyboardAvoidingView style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <View style={styles.buttonContainer}> 
          <TouchableOpacity
            style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
            onPress={flowStep === 1 ? handleVerifyRecoveryCode : handleSetNewPassword}
            disabled={isButtonDisabled}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>
                {flowStep === 1 ? "Verify Code" : "Reset Password"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: { padding: 5 },
    headerTitle: { color: theme.text, fontSize: 17, fontWeight: '600' },
    iconHeader: {
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      color: theme.text,
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      marginBottom: 40,
      textAlign: 'center',
      paddingHorizontal: 10,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      color: theme.textSecondary,
      fontSize: 14,
      marginBottom: 8,
      marginLeft: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 12,
    },
    input: {
      flex: 1,
      color: theme.text,
      fontSize: 16,
      padding: 16,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${theme.danger}20`,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
    },
    errorText: {
      color: theme.danger,
      fontSize: 14,
      flex: 1, 
      marginLeft: 10,
    },
    buttonContainer: {
      backgroundColor: theme.background,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 14,
      height: 54,
      justifyContent: 'center',
      padding: 16,
    },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
    helpText: { // Old style removed/replaced
        color: theme.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
    helpButtonText: { // NEW style for the help button link
        color: theme.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 15,
        bottom: 12,
    }
  });