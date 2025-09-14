// screens/ChangePasswordScreen.js (REFURBISHED)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useTheme, useAuth, useAlert } from '../../contexts';
import * as Animatable from 'react-native-animatable';
import {PASSWORD_REGEX, REQUIREMENTS} from '../../data/Constants-Data';

// --- Sub-Components (Memoized for Performance) ---

const PasswordInput = React.memo(({ label, value, onChangeText, error, ...props }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  
  const containerStyle = [
    styles.inputContainer,
    isFocused && styles.inputContainerActive,
    error && styles.inputContainerError,
  ];

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={containerStyle}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          placeholderTextColor={theme.textSecondary}
          {...props}
        />
        <TouchableOpacity onPress={() => setPasswordVisible(v => !v)} style={styles.eyeIcon}>
          <Ionicons name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

const PasswordStrengthMeter = React.memo(({ password }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const fulfilledRequirements = useMemo(() => {
        return REQUIREMENTS.map(req => ({
            ...req,
            isMet: req.regex.test(password),
        }));
    }, [password]);

    if (!password) return null;

    return (
        <Animatable.View animation="fadeIn" duration={400} style={styles.strengthContainer}>
            {fulfilledRequirements.map(req => (
                <View key={req.id} style={styles.requirementRow}>
                    <Ionicons
                        name={req.isMet ? 'checkmark-circle' : 'close-circle-outline'}
                        size={20}
                        color={req.isMet ? theme.success : theme.danger}
                        style={styles.requirementIcon}
                    />
                    <Text style={[styles.requirementText, req.isMet ? styles.requirementMet : styles.requirementPending]}>
                        {req.text}
                    </Text>
                </View>
            ))}
        </Animatable.View>
    );
});


// --- Main Screen Component ---
export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { api } = useAuth();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (confirmPassword && newPassword !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match.' }));
    } else {
      if (errors.confirmPassword) {
        setErrors(prev => {
          const { confirmPassword, ...rest } = prev;
          return rest;
        });
      }
    }
  }, [newPassword, confirmPassword, errors.confirmPassword]);

  const handleUpdatePassword = async () => {
    const currentErrors = {};
    if (!currentPassword) currentErrors.currentPassword = 'Current password is required.';
    if (!newPassword) currentErrors.newPassword = 'New password is required.';
    if (!PASSWORD_REGEX.test(newPassword)) currentErrors.newPassword = 'Please meet all password requirements.';
    if (newPassword !== confirmPassword) currentErrors.confirmPassword = 'Passwords do not match.';
    
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }
    
    setErrors({});
    setIsLoading(true);

    try {
      await api.put('/users/change-password', { currentPassword, newPassword });
      showAlert( 'Success', 'Your password has been changed successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An unexpected error occurred.';
      setErrors({ currentPassword: errorMessage });
      setIsLoading(false);
    }
  };

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  
  const isButtonDisabled = isLoading || !currentPassword || !newPassword || !confirmPassword || !!errors.confirmPassword;

  useEffect(() => {
    navigation.setOptions({
        headerTitle: 'Change Password',
        headerLeft: () => (
             <TouchableOpacity onPress={handleGoBack} style={{ marginLeft: 16 }}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
        ),
        headerRight: () => <View style={{ width: 26, marginRight: 16 }} />,
        headerShadowVisible: true,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
    });
  }, [navigation, theme]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <Animatable.View animation="fadeInDown" duration={600}>
            <Ionicons name="key-outline" size={50} color={theme.primary} style={styles.iconHeader} />
            <Text style={styles.title}>Secure Your Account</Text>
            <Text style={styles.subtitle}>Create a new password to keep your account safe.</Text>
          </Animatable.View>

          <Animatable.View animation="fadeInUp" duration={600} delay={200}>
            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!isLoading}
              error={errors.currentPassword}
            />
            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!isLoading}
              error={errors.newPassword}
            />

            <PasswordStrengthMeter password={newPassword} />

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
              error={errors.confirmPassword}
            />
          </Animatable.View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleUpdatePassword}
          disabled={isButtonDisabled}
        >
          {isLoading ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>Update Password</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContent: { flexGrow: 1, padding: 25, paddingTop: 30 },
    iconHeader: { alignSelf: 'center', marginBottom: 15 },
    title: { fontSize: 26, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 35 },
    
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 15, fontWeight: '500', color: theme.text, marginBottom: 10, paddingLeft: 4 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.border,
    },
    inputContainerActive: { borderColor: theme.primary },
    inputContainerError: { borderColor: theme.danger },
    input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: theme.text },
    eyeIcon: { paddingHorizontal: 12 },
    errorText: { color: theme.danger, fontSize: 13, marginTop: 6, marginLeft: 8 },

    strengthContainer: {
        marginTop: -10,
        marginBottom: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: theme.surface,
        borderRadius: 10,
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    requirementIcon: {
        marginRight: 10,
    },
    requirementText: {
        fontSize: 14,
    },
    requirementMet: {
        color: theme.success,
    },
    requirementPending: {
        color: theme.textSecondary,
    },
    
    buttonContainer: {
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        backgroundColor: theme.background,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 8,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
  });