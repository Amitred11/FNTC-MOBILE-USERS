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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth, useTheme, useAlert, useMessage } from '../../contexts';
import TermsOfServiceText from '../../data/TermsOfServices';
import PrivacyPolicyText from '../../data/PrivacyPolicy';

// --- Sub-Components (Memoized for Performance & Improved Logic) ---

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

// IMPROVEMENT: Simplified the SettingItem component API.
// It now intelligently decides whether to show a switch or a chevron
// based on whether the `onValueChange` prop is provided.
const SettingItem = React.memo(({ icon, name, value, onValueChange, onPress, disabled = false, isDestructive = false }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  const isSwitch = typeof onValueChange === 'function';
  const itemColor = isDestructive ? theme.danger : theme.text;
  const iconColor = isDestructive ? theme.danger : theme.primary;
  const iconBgColor = isDestructive ? `${theme.danger}20` : (theme.isDarkMode ? '#2C2C2E' : '#EFEFF4');

  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={disabled || !onPress}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.settingText, { color: itemColor }]}>{name}</Text>
      {isSwitch ? (
        <Switch
          trackColor={{ false: theme.disabled, true: theme.primary }}
          thumbColor={theme.isDarkMode ? theme.primary : '#f4f3f4'}
          onValueChange={onValueChange}
          value={value}
          disabled={disabled}
        />
      ) : (
        <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
      )}
    </TouchableOpacity>
  );
});

// IMPROVEMENT: Styling logic for separators is now handled inside the Section,
// making the main component's layout cleaner and removing manual <View> separators.
const SettingsSection = React.memo(({ title, children }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.section}>
            {title && <Text style={styles.sectionHeader}>{title}</Text>}
            <View style={styles.card}>
                {React.Children.map(children, (child, index) => (
                    <>
                        {child}
                        {index < React.Children.count(children) - 1 && <View style={styles.separator} />}
                    </>
                ))}
            </View>
        </View>
    );
});


// --- Main Screen Component ---
export default function SettingsScreen() {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { showAlert } = useAlert();
  const { showMessage } = useMessage();

  const [dndEnabled, setDndEnabled] = useState(false);
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);

  // Load DND setting from persistent storage on component mount
  useEffect(() => {
    const loadDndSetting = async () => {
      try {
        const storedValue = await AsyncStorage.getItem('dnd_enabled');
        setDndEnabled(storedValue === 'true');
      } catch (error) {
        console.error("Failed to load DND setting:", error);
      }
    };
    loadDndSetting();
  }, []);

  const handleToggleDnd = useCallback(async (newValue) => {
    setDndEnabled(newValue);
    try {
      await AsyncStorage.setItem('dnd_enabled', String(newValue));
      showMessage(newValue ? 'Do Not Disturb has been enabled.' : 'Do Not Disturb has been disabled.');
    } catch (error) {
      console.error('Failed to save DND setting:', error.message);
      setDndEnabled(prev => !prev); // Revert on failure
      showAlert('Error', 'Could not save your Do Not Disturb preference.');
    }
  }, [showMessage, showAlert]);

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
          <SettingItem icon="moon-outline" name="Dark Mode" value={isDarkMode} onValueChange={toggleTheme} />
          <SettingItem icon="notifications-off-outline" name="Do Not Disturb" value={dndEnabled} onValueChange={handleToggleDnd} />
        </SettingsSection>
        
        {/* FIX: Merged "Help" and "Support & About" into a single, more logical section. */}
        <SettingsSection title="About & Support">
          <SettingItem icon="help-circle-outline" name="Help & Support" onPress={() => handleNavigate('Support')} />
          <SettingItem icon="book-outline" name="How to Use This App" onPress={() => handleNavigate('HowToUseScreen')} />
          <SettingItem icon="document-text-outline" name="Terms and Conditions" onPress={() => openPolicy('terms')} />
          <SettingItem icon="shield-checkmark-outline" name="Privacy Policy" onPress={() => openPolicy('privacy')} />
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
    // IMPROVEMENT: Centralized separator style
    separator: { height: 1, backgroundColor: theme.border, marginLeft: 68 },
  });