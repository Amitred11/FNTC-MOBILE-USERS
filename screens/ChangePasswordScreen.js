// screens/ChangePasswordScreen.js (Cleaned)

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
import { useTheme, useAuth, useAlert } from '../contexts';
import * as Animatable from 'react-native-animatable';

// --- Constants ---
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
const PASSWORD_REQUIREMENT_TEXT = 'Password must be 8+ characters and include an uppercase letter, a number, and a special character.';

// --- Sub-Components (Memoized for Performance) ---
const Header = React.memo(({ onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Change Password</Text>
            <View style={{ width: 26 }} />
        </View>
    );
});

const PasswordInput = React.memo(({ label, value, onChangeText, isVisible, onToggleVisibility, editable }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!isVisible}
          editable={editable}
          autoCapitalize="none"
          placeholderTextColor={theme.textSecondary}
        />
        <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeIcon}>
          <Ionicons
            name={isVisible ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
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

  const [visibility, setVisibility] = useState({ current: false, new: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const errorRef = useRef(null);

  const handleValidation = useCallback(() => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return 'All fields are required.';
    }
    if (newPassword !== confirmPassword) {
      return 'New passwords do not match.';
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      return PASSWORD_REQUIREMENT_TEXT;
    }
    return null; // No error
  }, [currentPassword, newPassword, confirmPassword]);

  const handleUpdatePassword = async () => {
    const validationError = handleValidation();
    if (validationError) {
      setError(validationError);
      errorRef.current?.shake(800);
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      await api.put('/users/change-password', {
        currentPassword,
        newPassword,
      });

      showAlert(
        'Success',
        'Your password has been changed successfully. You will be logged out from other devices.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      errorRef.current?.shake(800);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVisibility = useCallback((field) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);
  
  const isButtonDisabled = useMemo(() => {
    return isLoading || !currentPassword || !newPassword || !confirmPassword;
  }, [isLoading, currentPassword, newPassword, confirmPassword]);

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={handleGoBack} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Ionicons
            name="lock-closed-outline"
            size={60}
            color={theme.primary}
            style={styles.iconHeader}
          />
          <Text style={styles.title}>Update Your Password</Text>
          <Text style={styles.subtitle}>
            Enter your current password and a new secure password.
          </Text>

          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            isVisible={visibility.current}
            onToggleVisibility={() => handleToggleVisibility('current')}
            editable={!isLoading}
          />
          <PasswordInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            isVisible={visibility.new}
            onToggleVisibility={() => handleToggleVisibility('new')}
            editable={!isLoading}
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isVisible={visibility.new} // Should match new password visibility
            onToggleVisibility={() => handleToggleVisibility('new')}
            editable={!isLoading}
          />

          {error ? (
            <Animatable.View ref={errorRef} style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </Animatable.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleUpdatePassword}
          disabled={isButtonDisabled}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    backButton: {},
    button: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 14,
      height: 54,
      justifyContent: 'center',
      padding: 16,
    },
    buttonContainer: {
      backgroundColor: theme.background,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      padding: 20,
      paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
    container: { backgroundColor: theme.background, flex: 1 },
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
    eyeIcon: {
      padding: 12,
    },
    header: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { color: theme.text, fontSize: 17, fontWeight: '600' },
    iconHeader: {
      alignSelf: 'center',
      marginBottom: 20,
    },
    input: {
      color: theme.text,
      flex: 1,
      fontSize: 16,
      padding: 16,
    },
    inputContainer: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
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
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      marginBottom: 40,
      textAlign: 'center',
    },
    title: {
      color: theme.text,
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
  });
