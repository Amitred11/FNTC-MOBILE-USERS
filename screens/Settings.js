import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAuth, useTheme, useAlert } from '../contexts';
import {
  registerForPushNotificationsAsync,
  unregisterForPushNotificationsAsync
} from '../services/notificationService';
import { TERMS_AND_CONDITIONS_TEXT } from '../texts/Terms of Services';
import { PRIVACY_POLICY_TEXT } from '../texts/Privacy Policy';

// --- Reusable Setting Item Component ---
const SettingItem = ({ icon, name, isNavigate = true, value, onValueChange, onPress, theme, disabled = false, isDestructive = false }) => {
    const styles = getStyles(theme);
    const itemColor = isDestructive ? theme.danger : theme.text;
    const iconColor = isDestructive ? theme.danger : theme.primary;
    const iconBgColor = isDestructive 
        ? `${theme.danger}20` 
        : (theme.isDarkMode ? '#2C2C2E' : '#EFEFF4');

    return (
        <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={disabled || !onPress}>
            <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <Text style={[styles.settingText, { color: itemColor }]}>{name}</Text>
            {isNavigate && <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />}
            {!isNavigate && <Switch trackColor={{ false: theme.disabled, true: theme.primary }} thumbColor={"#f4f3f4"} onValueChange={onValueChange} value={value} disabled={disabled} />}
        </TouchableOpacity>
    );
};

// --- Reusable Policy Modal ---
const PolicyModal = ({ visible, title, content, onClose, theme }) => {
    const styles = getStyles(theme);
    return (
        <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
            <SafeAreaView style={styles.policyContainer}>
                <View style={styles.policyHeader}>
                    <Text style={styles.policyTitle}>{title}</Text>
                    <TouchableOpacity style={styles.policyCloseButton} onPress={onClose}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.policyContent}><Text style={styles.policyText}>{content}</Text></ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { theme, isDarkMode, toggleTheme } = useTheme();
    const styles = getStyles(theme);
    const isFocused = useIsFocused();
    const { user: profile, signOut, updateLocalPushToken, api } = useAuth();
    const { showAlert } = useAlert();

    const [notificationsEnabled, setNotificationsEnabled] = useState(!!profile?.pushToken);
    const [isAboutModalVisible, setAboutModalVisible] = useState(false);
    const [isPolicyModalVisible, setPolicyModalVisible] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', text: '' });
    const [isLoadingToggle, setIsLoadingToggle] = useState(false);
    
    useEffect(() => {
        if (!isLoadingToggle) {
            setNotificationsEnabled(!!profile?.pushToken);
        }
    }, [profile?.pushToken, isLoadingToggle]);
    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            title: 'Settings',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: theme.background },
            headerTitleStyle: { color: theme.text, fontWeight: '600', left: 96 },
            headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 16 }}>
                    <Ionicons name="arrow-back" size={26} color={theme.text} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, theme]);

    const handleToggleNotifications = async (newValue) => {
        if (isLoadingToggle) return;
        
        setIsLoadingToggle(true);
        setNotificationsEnabled(newValue);

        try {
            if (newValue) {
                const token = await registerForPushNotificationsAsync(api);
                updateLocalPushToken(token);
                requestAnimationFrame(() => {
                showAlert("Success", "Notifications have been enabled.");
            });
        } else {
            await unregisterForPushNotificationsAsync(api);
            updateLocalPushToken(null);

            requestAnimationFrame(() => {
                showAlert("Success", "Notifications have been disabled.");
            });
        }
    } catch (error) {
        console.error("Failed to toggle notifications:", error.message);
        setNotificationsEnabled(prev => !prev);

        if (error.message && !error.message.toLowerCase().includes('permission')) {
            requestAnimationFrame(() => {
                showAlert(
                    "Error",
                    "Could not update notification settings. Please check your connection and try again."
              );
            });
        }
    } finally {
        setIsLoadingToggle(false);
    }
};

    const handleLogout = () => {
        showAlert("Logging Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: signOut }
        ]);
    };

    
    const openPolicyModal = (type) => {
        setModalContent({ 
            title: type === 'terms' ? 'Terms and Conditions' : 'Privacy Policy', 
            text: type === 'terms' ? TERMS_AND_CONDITIONS_TEXT : PRIVACY_POLICY_TEXT 
        });
        setPolicyModalVisible(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Account</Text>
                    <View style={styles.card}>
                        <SettingItem icon="key-outline" name="Change Password" onPress={() => navigation.navigate('ChangePassword')} theme={theme} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Preferences</Text>
                    <View style={styles.card}>
                        <SettingItem icon="moon-outline" name="Dark Mode" isNavigate={false} value={isDarkMode} onValueChange={toggleTheme} theme={theme} />
                        <View style={styles.separator} />
                        <SettingItem 
                            icon="notifications-outline" 
                            name="Push Notifications" 
                            isNavigate={false} 
                            value={notificationsEnabled} 
                            onValueChange={handleToggleNotifications} 
                            disabled={isLoadingToggle} 
                            theme={theme} 
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Support & About</Text>
                    <View style={styles.card}>
                        <SettingItem icon="help-circle-outline" name="Help & Support" onPress={() => navigation.navigate('Support')} theme={theme} />
                        <View style={styles.separator} />
                        <SettingItem icon="document-text-outline" name="Terms and Conditions" onPress={() => openPolicyModal('terms')} theme={theme} />
                        <View style={styles.separator} />
                        <SettingItem icon="shield-checkmark-outline" name="Privacy Policy" onPress={() => openPolicyModal('privacy')} theme={theme} />
                         <View style={styles.separator} />
                        <SettingItem icon="information-circle-outline" name="About This App" onPress={() => setAboutModalVisible(true)} theme={theme} />
                    </View>
                </View>

                <View style={styles.section}>
                     <View style={styles.card}>
                        <SettingItem icon="log-out-outline" name="Log Out" isDestructive={true} onPress={handleLogout} theme={theme} />
                    </View>
                </View>
            </ScrollView>

            <Modal animationType="fade" transparent={true} visible={isAboutModalVisible} onRequestClose={() => setAboutModalVisible(false)}>
                 <View style={styles.genericModalOverlay}>
                    <View style={styles.genericModalContent}>
                        <Ionicons name="information-circle" size={60} color={theme.primary} style={{marginBottom: 15}}/>
                        <Text style={styles.genericModalTitle}>About Fibear App</Text>
                        <Text style={styles.aboutVersionText}>Version 2.0.1</Text>
                        <Text style={styles.aboutDescriptionText}>Developed by ME. For internal use only.</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setAboutModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            
            <PolicyModal visible={isPolicyModalVisible} title={modalContent.title} content={modalContent.text} onClose={() => setPolicyModalVisible(false)} theme={theme} />
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContainer: { paddingVertical: 10, paddingHorizontal: 16, paddingBottom: 40 },
    section: { marginBottom: 25 },
    sectionHeader: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 12, paddingHorizontal: 10 },
    card: { backgroundColor: theme.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
    settingItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent' },
    iconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    settingText: { flex: 1, fontSize: 16, fontWeight: '500' },
    separator: { height: 1, backgroundColor: theme.border, marginLeft: 68 },
    
    // Generic Modal styles for About Modal
    genericModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    genericModalContent: { width: '100%', maxWidth: 350, backgroundColor: theme.surface, borderRadius: 15, padding: 25, alignItems: 'center' },
    genericModalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 8 },
    aboutVersionText: { fontSize: 14, color: theme.textSecondary, marginBottom: 15 },
    aboutDescriptionText: { fontSize: 16, color: theme.text, textAlign: 'center', marginBottom: 30 },
    closeButton: { backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', width: '100%' },
    closeButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },

    // Policy Modal Styles
    policyContainer: { flex: 1, backgroundColor: theme.surface },
    policyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    policyTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    policyCloseButton: { padding: 8 },
    policyCloseButtonText: { fontSize: 17, fontWeight: '600', color: theme.accent },
    policyContent: { paddingVertical: 20, paddingHorizontal: 24 },
    policyText: { fontSize: 16, lineHeight: 26, color: theme.text, textAlign: 'justify' },
});