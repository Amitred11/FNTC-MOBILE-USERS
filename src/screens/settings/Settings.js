// screens/SettingsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  Linking,
  Clipboard, // Import Clipboard for copying
  Modal, // Import Modal for display
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth, useTheme, useAlert, useMessage } from '../../contexts';
import {
  registerForPushNotificationsAsync,
  unregisterForPushNotificationsAsync,
} from '../../services/notificationService';
import TermsOfServiceText from '../../data/TermsOfServices';
import PrivacyPolicyText from '../../data/PrivacyPolicy';

// --- Sub-Components (Memoized for Performance) ---

const Header = React.memo(({ onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.headerIcon}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={styles.headerIcon} />
        </View>
    );
});

const SettingItem = React.memo(({ icon, name, isNavigate = true, value, onValueChange, onPress, disabled = false, isDestructive = false }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const itemColor = isDestructive ? theme.danger : theme.text;
  const iconColor = isDestructive ? theme.danger : theme.primary;
  const iconBgColor = isDestructive ? `${theme.danger}20` : (theme.isDarkMode ? '#2C2C2E' : '#EFEFF4');

  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={disabled || !onPress}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.settingText, { color: itemColor }]}>{name}</Text>
      {isNavigate ? (
        <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
      ) : (
        <Switch
          trackColor={{ false: theme.disabled, true: theme.primary }}
          thumbColor={theme.isDarkMode ? theme.primary : '#f4f3f4'}
          onValueChange={onValueChange}
          value={value}
          disabled={disabled}
        />
      )}
    </TouchableOpacity>
  );
});

const SettingsSection = React.memo(({ title, children }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.section}>
            {title && <Text style={styles.sectionHeader}>{title}</Text>}
            <View style={styles.card}>{children}</View>
        </View>
    );
});

// --- RE-INTEGRATED Component: Recovery Code Display Modal ---
const RecoveryCodeModal = ({ code, onClose, theme }) => {
  const styles = getStyles(theme);

  const handleCopy = useCallback(() => {
    Clipboard.setString(code);
    alert('Recovery code copied to clipboard!');
  }, [code]);

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.recoveryModalOverlay}>
        <View style={styles.recoveryModalContent}>
          <Ionicons name="key-outline" size={60} color={theme.warning} style={styles.recoveryIcon} />
          <Text style={styles.recoveryTitle}>Your Recovery Code</Text>
          <Text style={styles.recoverySubtitle}>
            Please save this code in a safe place. You will need it to reset your password if you lose access to your email.
            <Text style={{ fontWeight: 'bold' }}> This is the ONLY way to recover your account without calling support. Please save your new recovery code immediately. Your old code is now invalid.</Text>
          </Text>
          <View style={styles.recoveryCodeBox}>
            <Text style={styles.recoveryCodeText}>{code}</Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
              <Ionicons name="copy-outline" size={24} color={theme.textOnPrimary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.recoveryModalButton} onPress={onClose}>
            <Text style={styles.recoveryModalButtonText}>I HAVE SAVED MY CODE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


// --- Main Screen Component ---
export default function SettingsScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { user: profile, signOut, api, refreshUser } = useAuth();
  const { showAlert } = useAlert();
  const { showMessage } = useMessage();

  const [notificationsEnabled, setNotificationsEnabled] = useState(!!profile?.pushToken);
  const [isLoadingToggle, setIsLoadingToggle] = useState(false);
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);

  // --- NEW STATE for Recovery Code Regeneration ---
  const [regeneratedRecoveryCode, setRegeneratedRecoveryCode] = useState(null);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);

  useEffect(() => {
    if (!isLoadingToggle) {
      setNotificationsEnabled(!!profile?.pushToken);
    }
  }, [profile?.pushToken, isLoadingToggle]);
  
  const handleToggleNotifications = useCallback(async (newValue) => {
    setIsLoadingToggle(true);
    setNotificationsEnabled(newValue); 
    try {
      if (newValue) {
        const token = await registerForPushNotificationsAsync(api); 
        if (token) {
            showMessage('Notifications have been enabled.');
        } else {
            setNotificationsEnabled(false); 
        }
      } else {
        await unregisterForPushNotificationsAsync(api); 
        showMessage('Notifications have been disabled.');
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error.message);
      setNotificationsEnabled(prev => !prev); 
      if (!error.message?.toLowerCase().includes('permission')) {
          showAlert('Error', 'Could not update notification settings.');
      }
    } finally {
      setIsLoadingToggle(false);
      refreshUser(); 
    }
  }, [api, showMessage, showAlert, refreshUser]);

  const handleLogout = useCallback(() => {
    showAlert('Logging Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  }, [showAlert, signOut]);

  const handleRegenerateRecoveryCode = useCallback(() => {
      showAlert('Regenerate Recovery Code', 'Are you sure you want to generate a new recovery code? Your old code will become invalid.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Generate', style: 'destructive', onPress: async () => {
              setIsRegeneratingCode(true);
              try {
                  const response = await api.post('/users/recovery-code/generate');
                  setRegeneratedRecoveryCode(response.data.recoveryCode);
              } catch (error) {
                  console.error('Error regenerating recovery code:', error.response?.data || error.message);
                  showAlert('Error', error.response?.data?.message || 'Failed to generate new code. Try again.');
              } finally {
                  setIsRegeneratingCode(false);
                  refreshUser(); // Refresh user to ensure context is updated
              }
          }}
      ]);
  }, [api, showAlert, refreshUser]);

  const openPolicy = useCallback(async (type) => {
    if (isPolicyLoading) return;
    setIsPolicyLoading(true);
    try {
      const { text, title } = type === 'terms'
        ? { text: TermsOfServiceText, title: 'Terms and Conditions' }
        : { text: PrivacyPolicyText, title: 'Privacy Policy' };
      
      const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const processedText = text.replace('{{LAST_UPDATED}}', formattedDate);
      
      navigation.navigate('LegalDocument', { title, content: processedText });
    } catch (error) {
      showAlert('Error', 'Could not load the document.');
    } finally {
      setIsPolicyLoading(false);
    }
  }, [isPolicyLoading, navigation, showAlert]);
  
  const handleNavigate = useCallback((screen) => navigation.navigate(screen), [navigation]);
  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView style={getStyles(theme).container}>
      <Header onBackPress={handleGoBack} />
      <ScrollView contentContainerStyle={getStyles(theme).scrollContainer} showsVerticalScrollIndicator={false}>
        <SettingsSection title="Account">
          <SettingItem icon="key-outline" name="Change Password" onPress={() => handleNavigate('ChangePassword')} />
          <View style={getStyles(theme).separator} />
          <SettingItem 
              icon="shield-checkmark-outline" 
              name="Regenerate Recovery Code" 
              onPress={handleRegenerateRecoveryCode} 
              disabled={isRegeneratingCode}
              value={isRegeneratingCode} 
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingItem icon="moon-outline" name="Dark Mode" isNavigate={false} value={isDarkMode} onValueChange={toggleTheme} />
          <View style={getStyles(theme).separator} />
          <SettingItem icon="notifications-outline" name="Push Notifications" isNavigate={false} value={notificationsEnabled} onValueChange={handleToggleNotifications} disabled={isLoadingToggle} />
        </SettingsSection>

        <SettingsSection title="Support & About">
          <SettingItem icon="help-circle-outline" name="Help & Support" onPress={() => handleNavigate('Support')} />
          <View style={getStyles(theme).separator} />
          <SettingItem icon="document-text-outline" name="Terms and Conditions" onPress={() => openPolicy('terms')} />
          <View style={getStyles(theme).separator} />
          <SettingItem icon="shield-checkmark-outline" name="Privacy Policy" onPress={() => openPolicy('privacy')} />
          <View style={getStyles(theme).separator} />
          <SettingItem icon="information-circle-outline" name="About This App" onPress={() => handleNavigate('About')} />
        </SettingsSection>

        <SettingsSection>
          <SettingItem icon="log-out-outline" name="Log Out" isDestructive={true} onPress={handleLogout} />
        </SettingsSection>
      </ScrollView>

      {regeneratedRecoveryCode && (
        <RecoveryCodeModal 
          code={regeneratedRecoveryCode} 
          onClose={() => setRegeneratedRecoveryCode(null)} 
          theme={theme}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerTitle: { fontSize: 18, fontWeight: '600', color: theme.text },
    headerIcon: { width: 40, alignItems: 'flex-start' },
    scrollContainer: { paddingBottom: 40, paddingHorizontal: 16, paddingTop: 20 },
    section: { marginBottom: 25 },
    sectionHeader: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 12, paddingHorizontal: 10 },
    card: { backgroundColor: theme.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
    settingItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    iconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    settingText: { flex: 1, fontSize: 16, fontWeight: '500' },
    separator: { height: 1, backgroundColor: theme.border, marginLeft: 68 },
    // --- Recovery Code Modal Styles (re-used/adapted from SignUpScreen) ---
    recoveryModalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    recoveryModalContent: {
      backgroundColor: theme.surface, // Use theme
      borderRadius: 15,
      padding: 30,
      alignItems: 'center',
      marginHorizontal: 20,
      maxWidth: 350,
      shadowColor: '#000', // Add shadow for modal elevation
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    },
    recoveryIcon: {
      marginBottom: 20,
      color: theme.warning, // Use theme color
    },
    recoveryTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text, // Use theme color
      marginBottom: 10,
      textAlign: 'center',
    },
    recoverySubtitle: {
      fontSize: 15,
      color: theme.textSecondary, // Use theme color
      lineHeight: 22,
      marginBottom: 25,
      textAlign: 'center',
    },
    recoveryCodeBox: {
      backgroundColor: theme.background, // Use theme color
      borderRadius: 8,
      padding: 15,
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
      borderWidth: 1,
      borderColor: theme.border, // Use theme color
    },
    recoveryCodeText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary, // Use theme color
      flexShrink: 1,
      marginRight: 10,
    },
    copyButton: {
      backgroundColor: theme.primary, // Use theme color
      borderRadius: 8,
      padding: 10,
    },
    recoveryModalButton: {
      backgroundColor: theme.primary, // Use theme color
      borderRadius: 12,
      padding: 16,
      width: '90%',
      alignItems: 'center',
    },
    recoveryModalButtonText: {
      color: theme.textOnPrimary, // Use theme color
      fontSize: 12,
      fontWeight: 'bold',
    },
  });