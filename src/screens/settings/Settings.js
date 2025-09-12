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
  });