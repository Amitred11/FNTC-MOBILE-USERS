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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { lightTheme } from '../../constants/colors';
import { useAuth, useMessage, useAlert } from '../../contexts';
import * as Animatable from 'react-native-animatable';
import { CommonActions } from '@react-navigation/native';

// --- Sub-components for better structure ---

const Header = React.memo(({ onBackPress, title }) => {
  const theme = lightTheme;
  const styles = getStyles(theme);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={26} color={theme.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
});

const InputField = React.memo(({ icon, ...props }) => {
  const theme = lightTheme;
  const styles = getStyles(theme);
  return (
    <View style={styles.inputContainer}>
      {icon && <Ionicons name={icon} size={22} color={theme.textSecondary} style={styles.inputIcon} />}
      <TextInput style={styles.input} placeholderTextColor={theme.textSecondary} {...props} />
    </View>
  );
});

const RecoveryOptionCard = React.memo(({ icon, title, description, onPress }) => {
  const theme = lightTheme;
  const styles = getStyles(theme);
  return (
    <TouchableOpacity style={styles.optionCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.optionIconContainer}>
        <Ionicons name={icon} size={28} color={theme.primary} />
      </View>
      <View style={styles.optionTextContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
    </TouchableOpacity>
  );
});


// --- Main Screen Component ---

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const theme = lightTheme;
  const { api } = useAuth();
  const { showMessage } = useMessage();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);

  // --- State Management ---
  const [flowState, setFlowState] = useState('initialChoice');
  // States: 'initialChoice', 'enterEmailForOtp', 'verifyOtp', 'enterRecoveryCode', 'resetPassword'

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetToken, setResetToken] = useState(null);

  const errorRef = useRef(null);

  // --- Navigation and Flow Control ---
  const handleGoBack = useCallback(() => {
    setErrorMessage('');
    if (flowState === 'verifyOtp') {
      setFlowState('enterEmailForOtp');
    } else if (flowState === 'enterEmailForOtp' || flowState === 'enterRecoveryCode' || flowState === 'resetPassword') {
      setFlowState('initialChoice');
    } else {
      navigation.goBack();
    }
  }, [flowState, navigation]);

  // NEW: Navigation handler for the support screen
  const handleNavigateToSupport = useCallback(() => {
    navigation.navigate('SupportHelp');
  }, [navigation]);


  // --- API Handlers ---
  const handleRequestOtp = async () => {
    if (!email.trim()) { setErrorMessage('Please enter your email address.'); errorRef.current?.shake(800); return; }
    setErrorMessage('');
    setIsLoading(true);
    try {
      await api.post('/auth/request-password-reset-otp', { email });
      showMessage('OTP sent to your email!');
      setFlowState('verifyOtp');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to send OTP.');
      errorRef.current?.shake(800);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (method) => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      let response;
      if (method === 'otp') {
        if (!otp.trim()) throw new Error('OTP is required.');
        response = await api.post('/auth/verify-password-reset-otp', { email, otp });
      } else {
        if (!email.trim() || !recoveryCode.trim()) throw new Error('Email and Recovery Code are required.');
        response = await api.post('/auth/forgot-password-recovery-code', { email, recoveryCode });
      }
      
      setResetToken(response.data.token);
      showMessage('Verification successful!');
      setFlowState('resetPassword');
    } catch (error) {
      const message = error.response?.data?.message || `Invalid ${method === 'otp' ? 'OTP' : 'recovery code'}.`;
      setErrorMessage(message);
      errorRef.current?.shake(800);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    if (!newPassword || !confirmPassword) { setErrorMessage('All password fields are required.'); errorRef.current?.shake(800); return; }
    if (newPassword !== confirmPassword) { setErrorMessage('New passwords do not match.'); errorRef.current?.shake(800); return; }
    if (!passwordRegex.test(newPassword)) { setErrorMessage('Password must be 8+ characters and include an uppercase letter, a number, and a special character.'); errorRef.current?.shake(800); return; }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await api.put(`/auth/reset-password-recovery-code/${resetToken}`, { newPassword, confirmPassword });
      showAlert('Password Reset Successful', 'Please log in with your new password.',
        [{ text: 'OK', onPress: () => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'SignUp', params: { screen: 'Login' } }] })) }]
      );
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to set new password.');
      errorRef.current?.shake(800);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Dynamic Content ---
  const { title, subtitle, showButton } = useMemo(() => {
    switch (flowState) {
      case 'initialChoice':
        return { title: 'Forgot Password?', subtitle: "How would you like to recover your account?", showButton: false };
      case 'enterEmailForOtp':
        return { title: 'Recover via Email', subtitle: "Enter your account's email to receive a 6-digit code.", showButton: true };
      case 'verifyOtp':
        return { title: 'Check Your Email', subtitle: `We've sent a code to ${email}.`, showButton: true };
      case 'enterRecoveryCode':
        return { title: 'Recover with Code', subtitle: "Enter your email and the 32-character recovery code you saved.", showButton: true };
      case 'resetPassword':
        return { title: 'Set New Password', subtitle: 'Your new password must be different from the one previously used.', showButton: true };
      default: return {};
    }
  }, [flowState, email]);

  const renderContent = () => {
    switch(flowState) {
      case 'initialChoice':
        return (
          <>
            <RecoveryOptionCard icon="mail-outline" title="Email me an OTP" description="Receive a 6-digit code to your email." onPress={() => setFlowState('enterEmailForOtp')} />
            <RecoveryOptionCard icon="shield-checkmark-outline" title="Use a Recovery Code" description="Use your unique, saved recovery code." onPress={() => setFlowState('enterRecoveryCode')} />
            
            {/* --- NEW: VISUAL SEPARATOR AND SUPPORT OPTION --- */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            <RecoveryOptionCard
              icon="headset-outline"
              title="Contact Support"
              description="Lost both? We're here to help you."
              onPress={handleNavigateToSupport}
            />
          </>
        );
      case 'enterEmailForOtp':
        return <InputField icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="youremail@example.com" editable={!isLoading} />;
      case 'verifyOtp':
        return <InputField icon="keypad-outline" value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="6-digit code" maxLength={6} editable={!isLoading} />;
      case 'enterRecoveryCode':
        return (
          <>
            <InputField icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="youremail@example.com" editable={!isLoading} />
            <InputField icon="key-outline" value={recoveryCode} onChangeText={setRecoveryCode} placeholder="32-character recovery code" autoCapitalize="none" editable={!isLoading} secureTextEntry />
          </>
        );
      case 'resetPassword':
        return (
          <>
            <InputField icon="lock-closed-outline" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="New password" editable={!isLoading} />
            <InputField icon="lock-closed-outline" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Confirm new password" editable={!isLoading} />
          </>
        );
      default: return null;
    }
  };

  const getButtonAction = () => {
    switch(flowState) {
        case 'enterEmailForOtp': return handleRequestOtp;
        case 'verifyOtp': return () => handleVerify('otp');
        case 'enterRecoveryCode': return () => handleVerify('recovery');
        case 'resetPassword': return handleSetNewPassword;
        default: return () => {};
    }
  };

  const getButtonText = () => {
    switch(flowState) {
        case 'enterEmailForOtp': return "Send Code";
        case 'verifyOtp':
        case 'enterRecoveryCode': return "Verify";
        case 'resetPassword': return "Reset Password";
        default: return "";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={handleGoBack} title={title} />
      <View style={{flex: 1}}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>{subtitle}</Text>
          
          <Animatable.View key={flowState} animation="fadeInUp" duration={400}>
            {renderContent()}
          </Animatable.View>

          {errorMessage ? (
            <Animatable.View ref={errorRef} style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </Animatable.View>
          ) : null}
        </ScrollView>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        {showButton && (
            <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={getButtonAction()} disabled={isLoading} activeOpacity={0.7}>
                {isLoading ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>{getButtonText()}</Text>}
            </TouchableOpacity>
            </View>
        )}
      </KeyboardAvoidingView>
    </View>
    </SafeAreaView>
  );
}


// --- Styles ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: { padding: 5 },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 20,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 30,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 58,
      marginBottom: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: theme.text, fontSize: 16 },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.danger}1A`,
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 14,
      marginTop: 20,
      borderWidth: 1,
      borderColor: `${theme.danger}40`,
    },
    errorText: {
      color: theme.danger,
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
      marginLeft: 10,
    },
    buttonContainer: {
      paddingHorizontal: 24,
      paddingVertical: 20,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      backgroundColor: theme.background,
      borderTopColor: theme.border,
      borderTopWidth: 1,
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 16,
      height: 56,
      justifyContent: 'center',
    },
    buttonText: { color: theme.textOnPrimary, fontSize: 18, fontWeight: 'bold' },
    optionCard: {
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: theme.border,
    },
    optionIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: `${theme.primary}1A`,
        marginRight: 15,
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 4,
    },
    optionDescription: {
        fontSize: 14,
        color: theme.textSecondary,
        lineHeight: 20,
    },
    // --- NEW STYLES FOR DIVIDER ---
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 25,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.border,
    },
    dividerText: {
        marginHorizontal: 15,
        color: theme.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
  });