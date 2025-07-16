// screens/ChangePasswordScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth, useAlert } from '../contexts';
import * as Animatable from 'react-native-animatable';


const PasswordInput = ({ label, value, onChangeText, isVisible, onToggleVisibility, editable, theme }) => {
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
                    <Ionicons name={isVisible ? "eye-off-outline" : "eye-outline"} size={24} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { api } = useAuth();
  const { showAlert } = useAlert();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isCurrentVisible, setIsCurrentVisible] = useState(false);
  const [isNewVisible, setIsNewVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const errorRef = useRef(null); 

  const handleUpdatePassword = async () => {
    setError('');
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      errorRef.current?.shake(800);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      errorRef.current?.shake(800);
      return;
    }
    if (!passwordRegex.test(newPassword)) {
      setError("Password must be 8+ characters and include an uppercase letter, a number, and a special character.");
      errorRef.current?.shake(800);
      return;
    }

    setIsLoading(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: currentPassword,
        newPassword: newPassword,
      });

      showAlert(
        "Success",
        "Your password has been changed successfully. You will be logged out from other devices.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      errorRef.current?.shake(800);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- Redesigned Header --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Ionicons name="lock-closed-outline" size={60} color={theme.primary} style={styles.iconHeader} />
          <Text style={styles.title}>Update Your Password</Text>
          <Text style={styles.subtitle}>Enter your current password and a new secure password.</Text>

          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            isVisible={isCurrentVisible}
            onToggleVisibility={() => setIsCurrentVisible(v => !v)}
            editable={!isLoading}
            theme={theme}
          />
          <PasswordInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            isVisible={isNewVisible}
            onToggleVisibility={() => setIsNewVisible(v => !v)}
            editable={!isLoading}
            theme={theme}
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isVisible={isNewVisible} 
            onToggleVisibility={() => setIsNewVisible(v => !v)}
            editable={!isLoading}
            theme={theme}
          />

          {error ? (
            <Animatable.View ref={errorRef}>
                <Text style={styles.errorText}>{error}</Text>
            </Animatable.View>
          ) : null}
          
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  backButton: {}, 
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  iconHeader: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  inputGroup: {
      marginBottom: 20,
  },
  label: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: theme.text,
  },
  eyeIcon: {
    padding: 12,
  },
  errorText: {
    color: theme.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.background,
  },
  button: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 14, 
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  buttonDisabled: { backgroundColor: theme.disabled },
  buttonText: {
    color: theme.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});