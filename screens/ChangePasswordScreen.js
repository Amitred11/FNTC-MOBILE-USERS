import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../config/firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useTheme } from '../contexts/ThemeContext'; // <-- 1. Import useTheme

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme(); // <-- 2. Get theme from context
  const styles = getStyles(theme); // <-- 3. Get theme-specific styles

  // State for input fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State for UI control
  const [isCurrentVisible, setIsCurrentVisible] = useState(false);
  const [isNewVisible, setIsNewVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // All logic functions are unchanged
  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No user is currently logged in.");
      setIsLoading(false);
      return;
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert(
        "Success",
        "Your password has been changed successfully.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      if (err.code === 'auth/wrong-password') {
        setError('The current password you entered is incorrect.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.infoText}>
          For your security, please enter your current password before choosing a new one.
        </Text>

        {/* Current Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Current Password"
            placeholderTextColor={theme.textSecondary}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!isCurrentVisible}
            editable={!isLoading}
          />
          <TouchableOpacity onPress={() => setIsCurrentVisible(!isCurrentVisible)} style={styles.eyeIcon}>
            <Ionicons name={isCurrentVisible ? "eye-off-outline" : "eye-outline"} size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor={theme.textSecondary}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!isNewVisible}
            editable={!isLoading}
          />
          <TouchableOpacity onPress={() => setIsNewVisible(!isNewVisible)} style={styles.eyeIcon}>
            <Ionicons name={isNewVisible ? "eye-off-outline" : "eye-outline"} size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Confirm New Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor={theme.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!isNewVisible}
            editable={!isLoading}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleUpdatePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- 4. Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    backgroundColor: theme.primary, paddingTop: 55, paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  backButton: { position: 'absolute', left: 16, bottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: theme.textOnPrimary },
  contentContainer: { padding: 20 },
  infoText: {
    fontSize: 15, color: theme.textSecondary, textAlign: 'center',
    marginBottom: 30, lineHeight: 22
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface,
    borderRadius: 10, borderWidth: 1, borderColor: theme.border, marginBottom: 20,
  },
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 16, color: theme.text
  },
  eyeIcon: { paddingHorizontal: 12 },
  errorText: {
    color: theme.danger, fontSize: 14, textAlign: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: theme.primary, padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 10
  },
  buttonDisabled: { backgroundColor: theme.disabled },
  buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
});