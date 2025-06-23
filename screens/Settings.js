import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, SafeAreaView, BackHandler, Modal, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth, database } from '../config/firebaseConfig';
import { ref, get } from 'firebase/database';
import {
  createBroadcastNotification,
  registerForPushNotificationsAsync,
  unregisterForPushNotificationsAsync
} from '../services/notificationService';
import { useTheme } from '../contexts/ThemeContext';

// --- Placeholder text for policies ---
const TERMS_AND_CONDITIONS_TEXT = `Last updated: ${new Date().toLocaleDateString()}
\nWelcome to Fibear! These terms and conditions outline the rules and regulations for the use of our application.
\n1. Introduction
By accessing this app, we assume you accept these terms and conditions. Do not continue to use Fibear if you do not agree to all of the terms and conditions stated on this page.
\n2. Intellectual Property Rights
Other than the content you own, under these Terms, Fibear and/or its licensors own all the intellectual property rights and materials contained in this App.
\n3. Restrictions
You are specifically restricted from all of the following:
Publishing any App material in any other media.
Selling, sublicensing and/or otherwise commercializing any App material.
Publicly performing and/or showing any App material.
Using this App in any way that is or may be damaging to this App.
\n4. Your Content
In these App Standard Terms and Conditions, “Your Content” shall mean any audio, video text, images or other material you choose to display on this App. By displaying Your Content, you grant Fibear a non-exclusive, worldwide irrevocable, sub-licensable license to use, reproduce, adapt, publish, translate and distribute it in any and all media.
\n5. No warranties
This App is provided "as is," with all faults, and Fibear express no representations or warranties, of any kind related to this App or the materials contained on this App.
\n6. Limitation of liability
In no event shall Fibear, nor any of its officers, directors and employees, shall be held liable for anything arising out of or in any way connected with your use of this App whether such liability is under contract.`;
const PRIVACY_POLICY_TEXT = `Last updated: ${new Date().toLocaleDateString()}
\nFibear operates the Fibear mobile application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
\n1. Information Collection and Use
We collect several different types of information for various purposes to provide and improve our Service to you. Types of Data Collected include: Personal Data, Usage Data.
\n2. Use of Data
Fibear uses the collected data for various purposes:
To provide and maintain the Service.
To notify you about changes to our Service.
To allow you to participate in interactive features of our Service when you choose to do so.
To provide customer care and support.
\n3. Security of Data
The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
\n4. Service Providers
We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services or to assist us in analyzing how our Service is used.`;

// --- Reusable Setting Item Components (Now Theme-Aware) ---
const NavigateSettingItem = ({ icon, name, onPress, theme }) => (
    <TouchableOpacity style={getStyles(theme).settingItem} onPress={onPress}>
        <Ionicons name={icon} size={24} style={getStyles(theme).settingIcon} />
        <Text style={getStyles(theme).settingText}>{name}</Text>
        <Ionicons name="chevron-forward" size={22} color={theme.disabled} />
    </TouchableOpacity>
);

const ToggleSettingItem = ({ icon, name, value, onValueChange, disabled, theme }) => (
    <View style={getStyles(theme).settingItem}>
        <Ionicons name={icon} size={24} style={getStyles(theme).settingIcon} />
        <Text style={getStyles(theme).settingText}>{name}</Text>
        <Switch
            trackColor={{ false: theme.disabled, true: theme.primary }}
            thumbColor={"#f4f3f4"}
            onValueChange={onValueChange}
            value={value}
            disabled={disabled}
        />
    </View>
);

const PolicyModal = ({ visible, title, content, onClose, theme }) => {
    const styles = getStyles(theme);
    return (
        <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
            <SafeAreaView style={styles.policyContainer}>
                <View style={styles.policyHeader}>
                    <Text style={styles.policyTitle}>{title}</Text>
                    <TouchableOpacity style={styles.policyCloseButton} onPress={onClose}>
                        <Text style={styles.policyCloseButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.policyContent}>
                    <Text style={styles.policyText}>{content}</Text>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

// --- Main Settings Screen Component ---
export default function SettingsScreen() {
    const navigation = useNavigation();
    const { theme, isDarkMode, toggleTheme } = useTheme(); // <-- The single source of truth for theme
    const styles = getStyles(theme);

    // Local state is only for things this component exclusively controls
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
    const [isAboutModalVisible, setAboutModalVisible] = useState(false);
    const [isPolicyModalVisible, setPolicyModalVisible] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', text: '' });
    const [isLoadingToggle, setIsLoadingToggle] = useState(true);

    useEffect(() => {
        const checkNotificationStatus = async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                setNotificationsEnabled(false);
                setIsLoadingToggle(false);
                return;
            }
            const userProfileRef = ref(database, `users/${currentUser.uid}/pushToken`);
            const snapshot = await get(userProfileRef);
            setNotificationsEnabled(snapshot.exists());
            setIsLoadingToggle(false);
        };
        checkNotificationStatus();
    }, []);

    const handleToggleNotifications = async (newValue) => {
        if (isLoadingToggle) return;
        setNotificationsEnabled(newValue);
        try {
            if (newValue) {
                const token = await registerForPushNotificationsAsync();
                if (token) {
                    Alert.alert("Notifications Enabled", "You will now receive push notifications from Fibear.");
                } else {
                    setNotificationsEnabled(false);
                }
            } else {
                await unregisterForPushNotificationsAsync();
                Alert.alert("Notifications Disabled", "You will no longer receive push notifications.");
            }
        } catch (error) {
            console.error("Error toggling notifications:", error);
            setNotificationsEnabled(!newValue);
            Alert.alert("Error", "An error occurred. Please try again.");
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            navigation.reset({ index: 0, routes: [{ name: 'GetStarted' }] });
        } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert("Logout Error", "An error occurred while signing out.");
        }
    };
    
    useEffect(() => {
        const backAction = () => { navigation.goBack(); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [navigation]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Account</Text>
                    <NavigateSettingItem icon="key-outline" name="Change Password" onPress={() => navigation.navigate('ChangePassword')} theme={theme} />
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Preferences</Text>
                    <ToggleSettingItem
                        icon="moon-outline"
                        name="Dark Mode"
                        value={isDarkMode}
                        onValueChange={toggleTheme} // Directly use the function from the context
                        theme={theme}
                    />
                    <View style={styles.separator} />
                    <ToggleSettingItem
                        icon="notifications-outline"
                        name="Enable Notifications"
                        value={notificationsEnabled}
                        onValueChange={handleToggleNotifications}
                        disabled={isLoadingToggle}
                        theme={theme}
                    />
                </View>

                {/* Support & About Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Support & About</Text>
                    <NavigateSettingItem icon="help-circle-outline" name="Help & Support" onPress={() => navigation.navigate('Support')} theme={theme} />
                    <View style={styles.separator} />
                    <NavigateSettingItem icon="document-text-outline" name="Terms and Conditions" onPress={() => { setModalContent({ title: 'Terms and Conditions', text: TERMS_AND_CONDITIONS_TEXT }); setPolicyModalVisible(true); }} theme={theme} />
                    <View style={styles.separator} />
                    <NavigateSettingItem icon="shield-checkmark-outline" name="Privacy Policy" onPress={() => { setModalContent({ title: 'Privacy Policy', text: PRIVACY_POLICY_TEXT }); setPolicyModalVisible(true); }} theme={theme} />
                     <View style={styles.separator} />
                    <NavigateSettingItem icon="information-circle-outline" name="About This App" onPress={() => setAboutModalVisible(true)} theme={theme} />
                </View>
                
                {/* Developer Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Developer</Text>
                    <NavigateSettingItem
                        icon="paper-plane-outline"
                        name="Simulate App Update Notif"
                        onPress={() => Alert.alert("Simulate Update", "Send a notification about a new app update to all users?", [{ text: "Cancel", style: "cancel" }, { text: "Send", onPress: () => createBroadcastNotification({ title: 'App Update Available', message: 'Version 1.1.0 is here! Update now for new features and bug fixes.', type: 'update' })}])}
                        theme={theme}
                    />
                </View>

                {/* Logout Section */}
                 <View style={styles.section}>
                    <TouchableOpacity style={getStyles(theme).logoutButton} onPress={() => setLogoutModalVisible(true)}>
                        <Ionicons name="log-out-outline" size={24} style={{ color: theme.danger, marginRight: 16 }} />
                        <Text style={{ flex: 1, fontSize: 16, color: theme.danger, fontWeight: 'bold' }}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* --- ALL MODALS (Theme-aware) --- */}
            <Modal animationType="fade" transparent={true} visible={isLogoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
                <View style={styles.genericModalOverlay}>
                    <View style={styles.genericModalContent}>
                        <Image source={require('../assets/images/logoutpic.png')} style={styles.genericModalImage}/>
                        <Text style={styles.genericModalTitle}>Logging Out</Text>
                        <Text style={styles.genericModalDescription}>Are you sure you want to log out?</Text>
                        <View style={styles.genericModalButtonContainer}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setLogoutModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>No, Just kidding</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleSignOut}>
                                <Text style={styles.confirmButtonText}>Yes, Log Me Out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            {/* About App Modal */}
            <Modal animationType="fade" transparent={true} visible={isAboutModalVisible} onRequestClose={() => setAboutModalVisible(false)}>
                <View style={styles.genericModalOverlay}>
                    <View style={styles.genericModalContent}>
                        <Ionicons name="information-circle" size={60} color={theme.primary} style={{marginBottom: 15}}/>
                        <Text style={styles.genericModalTitle}>About Fibear App</Text>
                        <Text style={styles.aboutVersionText}>Version 1.0.0</Text>
                        <Text style={styles.aboutDescriptionText}>Developed with ❤️ for our users.</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setAboutModalVisible(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <PolicyModal
                visible={isPolicyModalVisible}
                title={modalContent.title}
                content={modalContent.text}
                onClose={() => setPolicyModalVisible(false)}
                theme={theme}
            />
        </SafeAreaView>
    );
}

// --- Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { backgroundColor: theme.primary, paddingTop: 55, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: theme.textOnPrimary },
    backButton: { position: 'absolute', left: 16, bottom: 20 },
    scrollContainer: { paddingBottom: 40 },
    section: { marginTop: 20 },
    sectionHeader: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginHorizontal: 16, marginBottom: 8, textTransform: 'uppercase' },
    settingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 14 },
    settingIcon: { color: theme.textSecondary, marginRight: 16 },
    settingText: { flex: 1, fontSize: 16, color: theme.text },
    separator: { height: 1, backgroundColor: theme.border, marginLeft: 56 },
    logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 14 },
    
    // --- Generic Modal Styles ---
    genericModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    genericModalContent: { width: '100%', maxWidth: 350, backgroundColor: theme.surface, borderRadius: 15, padding: 25, alignItems: 'center' },
    genericModalImage: { width: 120, height: 120, marginBottom: 15 },
    genericModalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 8 },
    genericModalDescription: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 25 },
    genericModalButtonContainer: { flexDirection: 'row', width: '100%' },
    
    // Logout Modal Buttons
    cancelButton: { flex: 1, backgroundColor: theme.disabled, paddingVertical: 12, borderRadius: 8, marginRight: 10, alignItems: 'center' },
    cancelButtonText: { color: theme.text, fontSize: 14, fontWeight: 'bold' },
    confirmButton: { flex: 1, backgroundColor: theme.danger, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    confirmButtonText: { color: theme.textOnPrimary, fontSize: 14, fontWeight: 'bold' },

    // About Modal
    aboutVersionText: { fontSize: 14, color: theme.textSecondary, marginBottom: 10 },
    aboutDescriptionText: { fontSize: 16, color: theme.text, textAlign: 'center', marginBottom: 30 },
    closeButton: { backgroundColor: theme.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', width: '100%' },
    closeButtonText: { color: theme.textOnPrimary, fontSize: 14, fontWeight: 'bold' },
    
    // Policy Modal Styles
    policyContainer: { flex: 1, backgroundColor: theme.surface },
    policyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    policyTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    policyCloseButton: { paddingHorizontal: 12, paddingVertical: 6 },
    policyCloseButtonText: { fontSize: 17, fontWeight: '600', color: theme.accent },
    policyContent: { paddingVertical: 20, paddingHorizontal: 24 },
    policyText: { fontSize: 16, lineHeight: 26, color: theme.text, textAlign: 'justify' },
});