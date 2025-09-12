// screens/HomePage.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    SafeAreaView,
    BackHandler,
    RefreshControl,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { useSubscription, useAlert, useAuth, useTheme } from '../../contexts';
import { BottomNavBar } from '../../components/BottomNavBar';

// --- Sub-Components (Memoized for Performance) ---

const DrawerMenu = React.memo(({ isVisible, onClose, onNavigate, onLogout }) => {
    const { theme } = useTheme();
    const { user: profile } = useAuth();
    const styles = getStyles(theme);
    const photoSource = profile?.photoUrl ? { uri: profile.photoUrl } : require('../../assets/images/avatars/profilepic.jpg');

    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.drawerOverlay}>
                <Animatable.View animation="slideInLeft" duration={400} style={styles.drawerContainer}>
                    <LinearGradient
                        colors={theme.isDarkMode ? [theme.textBe, theme.primary] : [theme.primary, theme.textBe]}
                        style={styles.fullGradient}
                    >
                        <View style={styles.drawerHeader}>
                            <View style={styles.drawerProfileSection}>
                                <Image source={photoSource} style={styles.drawerProfileImage} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.drawerUsername} numberOfLines={1}>{profile?.displayName || 'User'}</Text>
                                    <Text style={styles.drawerEmail} numberOfLines={1}>{profile?.email || 'No email'}</Text>
                                </View>
                            </View>
                        </View>
                        <ScrollView contentContainerStyle={styles.drawerMenu}>
                            <DrawerItem icon="person-outline" label="My Profile" onPress={() => onNavigate('Profile')} />
                            <DrawerItem icon="settings-outline" label="App Settings" onPress={() => onNavigate('Settings')} />
                            <DrawerItem icon="headset-outline" label="Contact Support" onPress={() => onNavigate('Support')} />
                            <DrawerItem icon="information-circle-outline" label="About Us" onPress={() => onNavigate('About')} />
                            <DrawerItem icon="chatbubbles-outline" label="Customer Feedback" onPress={() => onNavigate('CustomerFeedbackScreen')} />
                        </ScrollView>
                        <TouchableOpacity style={styles.drawerLogoutButton} onPress={onLogout}>
                            <Feather name="log-out" size={20} color={theme.danger} />
                            <Text style={styles.drawerLogoutText}>Logout</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animatable.View>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animatable.View animation="fadeIn" duration={300} style={styles.drawerBackdrop} />
                </TouchableWithoutFeedback>
            </View>
        </Modal>
    );
});

const DrawerItem = React.memo(({ icon, label, onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const itemColor = theme.textOnPrimary;
    return (
        <TouchableOpacity style={styles.drawerMenuItem} onPress={onPress}>
            <Ionicons name={icon} size={24} color={itemColor} />
            <Text style={[styles.drawerMenuLabel, { color: itemColor }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={20} color={itemColor} />
        </TouchableOpacity>
    );
});

const AccountInfoCard = React.memo(({ icon, label, value, color, onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={styles.accountCard} onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
            <View style={[styles.accountCardStripe, { backgroundColor: color }]} />
            <View style={styles.accountCardContent}>
                <View style={styles.accountCardHeader}>
                    <View style={[styles.accountCardIconContainer, { backgroundColor: `${color}20` }]}>
                        <Feather name={icon} size={18} color={color} />
                    </View>
                    <Text style={styles.accountCardLabel}>{label}</Text>
                </View>
                <Text style={styles.accountCardValue} numberOfLines={1}>{value}</Text>
            </View>
        </TouchableOpacity>
    );
});


const ConfirmationModal = React.memo(({ isVisible, onClose, onConfirm, title, description, confirmText, imageSource }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.confirmModalOverlay}>
                <Animatable.View animation="zoomIn" duration={300} style={styles.confirmModalContent}>
                    <Image source={imageSource} style={styles.confirmModalImage} />
                    <Text style={styles.confirmModalTitle}>{title}</Text>
                    <Text style={styles.confirmModalDescription}>{description}</Text>
                    <View style={styles.confirmModalButtonContainer}>
                        <TouchableOpacity style={styles.confirmModalCancelButton} onPress={onClose}>
                            <Text style={styles.confirmModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.confirmModalConfirmButton, confirmText.includes('Exit') && { backgroundColor: theme.primary }]} onPress={onConfirm}>
                            <Text style={styles.confirmModalConfirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animatable.View>
            </View>
        </Modal>
    );
});

const QuickActionButton = ({ icon, label, onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={styles.quickActionContainer} onPress={onPress}>
            <View style={styles.quickActionIconCircle}>
                <Feather name={icon} size={26} color={theme.primary} />
            </View>
            <Text style={styles.quickActionText}>{label}</Text>
        </TouchableOpacity>
    );
};

const FeedbackPromptCard = React.memo(({ onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={styles.feedbackPromptCard} onPress={onPress}>
            <LinearGradient
                colors={theme.isDarkMode ? [theme.accent, theme.primary] : [theme.primary, theme.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.feedbackPromptGradient}
            >
                <View style={styles.feedbackPromptContent}>
                    <Ionicons name="chatbubbles-outline" size={30} color={theme.textOnPrimary} />
                    <View style={styles.feedbackPromptTextContainer}>
                        <Text style={styles.feedbackPromptTitle}>Share Your Thoughts!</Text>
                        <Text style={styles.feedbackPromptSubtitle}>Help us improve by leaving feedback.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={theme.textOnPrimary} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
});

// --- Main Screen Component ---
export default function HomePage() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const { user: profile, refreshUser, signOut, api } = useAuth();
    const { subscriptionData, paymentHistory, subscriptionStatus, refreshSubscription, isLoading: isSubscriptionLoading } = useSubscription();

    const [uiState, setUiState] = useState({ isMenuVisible: false, isLogoutModalVisible: false, isExitModalVisible: false });
    const [dataState, setDataState] = useState({ unreadCount: 0, refreshing: false });
    const hasDiscoveredScroll = useRef(false);

    const showScrollIndicator = !hasDiscoveredScroll.current && subscriptionStatus === 'active';

    const fetchAllData = useCallback(async () => {
        if (!api) return;
        setDataState(prev => ({ ...prev, refreshing: true }));
        try {
            const [notificationsRes] = await Promise.all([
                api.get('/notifications'),
                refreshUser(),
                refreshSubscription(),
            ]);
            if (notificationsRes?.data?.data) {
                setDataState(prev => ({ ...prev, unreadCount: notificationsRes.data.data.filter(n => !n.read).length }));
            }
        } catch (error) {
            console.error("Error fetching homepage data:", error.message);
        } finally {
            setDataState(prev => ({ ...prev, refreshing: false }));
        }
    }, [api, refreshUser, refreshSubscription]);

    useFocusEffect(useCallback(() => { fetchAllData(); }, [fetchAllData]));

    const handleUiStateChange = useCallback((key, value) => setUiState(prev => ({ ...prev, [key]: value })), []);
    const onConfirmLogout = useCallback(() => { handleUiStateChange('isLogoutModalVisible', false); signOut(); }, [signOut, handleUiStateChange]);
    const navigateAndCloseDrawer = useCallback((screenName) => { navigation.navigate(screenName); handleUiStateChange('isMenuVisible', false); }, [navigation, handleUiStateChange]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (uiState.isMenuVisible) { handleUiStateChange('isMenuVisible', false); return true; }
                if (uiState.isLogoutModalVisible || uiState.isExitModalVisible) { handleUiStateChange('isLogoutModalVisible', false); handleUiStateChange('isExitModalVisible', false); return true; }
                handleUiStateChange('isExitModalVisible', true);
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [uiState, handleUiStateChange])
    );

    const renderDashboard = useMemo(() => {
        if (isSubscriptionLoading && !dataState.refreshing) {
            return <View style={styles.dashboardLoader}><ActivityIndicator color={theme.primary} /></View>;
        }

        const renderNoPlanCard = (title, subtitle, screen, iconName, isSuspended = false) => (
            <TouchableOpacity onPress={() => navigation.navigate(screen)}>
                <LinearGradient colors={isSuspended ? [theme.danger, '#a10a0a'] : [theme.primary, theme.accent]} style={styles.noPlanCard}>
                    <Ionicons name={iconName} size={40} color={theme.textOnPrimary} />
                    <View style={styles.noPlanCardContent}>
                        <Text style={styles.noPlanTitle}>{title}</Text>
                        <Text style={styles.noPlanSubtitle}>{subtitle}</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={32} color={theme.textOnPrimary} />
                </LinearGradient>
            </TouchableOpacity>
        );

        if (subscriptionStatus === 'suspended') return renderNoPlanCard('Account Suspended', 'Pay your bill to reactivate.', 'MyBills', 'warning-outline', true);
        if (subscriptionStatus !== 'active' || !subscriptionData) return renderNoPlanCard('Unlock Your Dashboard', 'Explore our plans now!', 'Subscription', 'sparkles-outline');

        const activePlan = subscriptionData.planId;
        const renewalDate = subscriptionData.renewalDate;
        const pendingBill = paymentHistory.find(bill => bill.type === 'bill' && bill.status === 'Pending Verification');
        const dueBill = paymentHistory.find(bill => bill.type === 'bill' && (bill.status === 'Due' || bill.status === 'Overdue'));

        let billAmount = 'All Paid', billColor = theme.success, billLabel = 'Current Bill', billOnPress = () => navigation.navigate('MyBills');

        if (pendingBill) { billAmount = `₱${pendingBill.amount.toFixed(2)}`; billColor = theme.warning; billLabel = 'Payment Verifying'; }
        else if (dueBill) { billAmount = `₱${dueBill.amount.toFixed(2)}`; billColor = dueBill.status === 'Overdue' ? theme.danger : theme.warning; billOnPress = () => navigation.navigate('PayBills'); }

        const nextBillDate = dueBill ? new Date(dueBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContainer} onScrollBeginDrag={() => { if (showScrollIndicator) hasDiscoveredScroll.current = true; }}>
                <AccountInfoCard icon="dollar-sign" label={billLabel} value={billAmount} color={billColor} onPress={billOnPress} />
                <AccountInfoCard icon="bar-chart-2" label="Current Plan" value={activePlan?.name || 'N/A'} color={theme.primary} onPress={() => navigation.navigate('MySubscriptionScreen')} />
                <AccountInfoCard icon="calendar" label={dueBill ? 'Bill Due' : 'Next Renewal'} value={nextBillDate} color={theme.textSecondary} onPress={() => navigation.navigate('MyBills')} />
            </ScrollView>
        );
    }, [isSubscriptionLoading, dataState.refreshing, subscriptionStatus, paymentHistory, subscriptionData, theme, navigation, styles]);

    const photoSource = profile?.photoUrl ? { uri: profile.photoUrl } : require('../../assets/images/avatars/profilepic.jpg');

    return (
        <SafeAreaView style={styles.container}>
            <DrawerMenu isVisible={uiState.isMenuVisible} onClose={() => handleUiStateChange('isMenuVisible', false)} onNavigate={navigateAndCloseDrawer} onLogout={() => { handleUiStateChange('isMenuVisible', false); handleUiStateChange('isLogoutModalVisible', true); }} />
            <ConfirmationModal isVisible={uiState.isLogoutModalVisible} onClose={() => handleUiStateChange('isLogoutModalVisible', false)} onConfirm={onConfirmLogout} title="Logging Out" description="Are you sure you want to log out?" confirmText="Yes, Log Out" imageSource={require('../../assets/images/icons/logoutpic.png')} />
            <ConfirmationModal isVisible={uiState.isExitModalVisible} onClose={() => handleUiStateChange('isExitModalVisible', false)} onConfirm={() => BackHandler.exitApp()} title="Exit Application?" description="Are you sure you want to close the application?" confirmText="Yes, Exit" imageSource={require('../../assets/images/icons/logoutpic.png')} />

            <View style={styles.headerContainer}>
                <BlurView intensity={Platform.OS === 'ios' ? 60 : 90} style={styles.header}>
                    <TouchableOpacity onPress={() => handleUiStateChange('isMenuVisible', true)} style={styles.headerIcon}><Ionicons name="menu" size={28} color={theme.text} /></TouchableOpacity>
                    <Image source={require('../../assets/images/logos/logo.png')} style={styles.headerLogo} />
                    <TouchableOpacity onPress={() => navigation.navigate('Notif')} style={styles.headerIcon}>
                        {dataState.unreadCount > 0 && <View style={styles.notificationBadge} />}
                        <Ionicons name="notifications-outline" size={26} color={theme.text} />
                    </TouchableOpacity>
                </BlurView>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={dataState.refreshing} onRefresh={fetchAllData} tintColor={theme.primary} progressViewOffset={120} />} contentContainerStyle={styles.scrollContent} onScrollBeginDrag={() => { if (showScrollIndicator) hasDiscoveredScroll.current = true; }}>
                <View style={styles.headerSpacer} />

                {/* --- WELCOME CARD --- */}
                <View style={styles.welcomeCardWrapper}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Profile')}>
                        <LinearGradient colors={theme.isDarkMode ? [theme.primary, theme.accent] : [theme.accent, theme.primary]} style={styles.welcomeCard}>
                            <Image source={require('../../assets/images/backgrounds/welcome-bg.jpg')} style={styles.welcomeBg} />
                            
                            <View style={styles.welcomeContent}>
                                <Image source={photoSource} style={styles.profilePic} />
                                    <View style={styles.welcomeTextContainer}>
                                        <Text style={styles.welcomeTitle}>Welcome back,</Text>
                                        <Text style={styles.welcomeName} numberOfLines={1}>{profile?.displayName?.split(' ')[0] || 'User'}!</Text>
                                    </View>
                                    <View style={styles.statusContainer}>
                                        <View style={styles.statusDot} />
                                        <Text style={styles.statusText}>Plan Status: Active</Text>
                                    </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeaderContainer}>
                        <Text style={styles.sectionTitle}>My Dashboard</Text>
                        {showScrollIndicator && <Animatable.View animation="fadeInRight" delay={500} duration={1500} iterationCount="infinite" style={styles.scrollIndicator}><Text style={styles.scrollIndicatorText}>swipe</Text><Ionicons name="chevron-forward" size={16} color={theme.textSecondary} /></Animatable.View>}
                    </View>
                    {renderDashboard}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { marginBottom: 15, paddingHorizontal: 20 }]}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <QuickActionButton icon="credit-card" label="Pay Bill" onPress={() => navigation.navigate('PayBills')} />
                        <QuickActionButton icon="layers" label="Services" onPress={() => navigation.navigate('OurServicesScreen')} />
                        <QuickActionButton icon="headphones" label="Support" onPress={() => navigation.navigate('Support')} />
                    </View>
                </View>

                <View style={styles.section}>
                    <FeedbackPromptCard onPress={() => navigation.navigate('CustomerFeedbackScreen')} />
                </View>

            </ScrollView>
            <BottomNavBar activeScreen="Home" />
        </SafeAreaView>
    );
}

const getStyles = (theme) =>
    StyleSheet.create({
        container: { backgroundColor: theme.background, flex: 1 },
        scrollContent: { paddingBottom: 120 },
        headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 12 },
        headerIcon: { padding: 8 },
        headerLogo: { height: 35, width: 100, resizeMode: 'contain' },
        headerSpacer: { height: Platform.OS === 'ios' ? 100 : 80 },

        // --- ANIMATED WelcomeCard Styles ---
        welcomeCardWrapper: { 
            marginHorizontal: 20, 
            marginTop: 12, 
            marginBottom: 40, 
            borderRadius: 24, 
            shadowColor: theme.primary, 
            shadowOffset: { width: 0, height: 8 }, 
            shadowOpacity: 0.3, 
            shadowRadius: 15, 
            elevation: 12 
        },
        welcomeCard: { 
            borderRadius: 24, 
            overflow: 'hidden' 
        },
        welcomeBg: { 
            position: 'absolute', 
            width: '100%', 
            height: '100%', 
            opacity: 0.2
        },
        welcomeContent: { 
            alignItems: 'center', 
            padding: 20 
        },
        profilePic: { 
            width: 80, 
            height: 80, 
            borderRadius: 40, 
            borderWidth: 4, 
            borderColor: 'rgba(255,255,255,0.8)',
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            shadowOffset: { width: 0, height: 5 },
            shadowRadius: 10,
            marginBottom: -40,
            zIndex: 1,
            right: 100,
            top: 23
        },
        welcomeTextContainer: { 
            alignItems: 'center',
            marginBottom: 12,
            left: 50,
            bottom: 10
        },
        welcomeTitle: { 
            fontSize: 20, 
            color: theme.textOnPrimary, 
            opacity: 0.8,
        },
        welcomeName: { 
            fontSize: 24, 
            fontWeight: 'bold', 
            color: theme.textOnPrimary,
        },
        statusContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.15)',
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 12,
        },
        statusDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.success,
            marginRight: 8,
        },
        statusText: {
            fontSize: 13,
            fontWeight: '600',
            color: theme.textOnPrimary,
        },

        // --- SECTION ---
        section: { marginBottom: 20 },
        sectionHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
        sectionTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text },
        scrollIndicator: { flexDirection: 'row', alignItems: 'center', opacity: 0.7 },
        scrollIndicatorText: { color: theme.textSecondary, fontStyle: 'italic', marginRight: 2 },
        horizontalScrollContainer: { paddingLeft: 20, paddingRight: 5, paddingBottom: 10 },

        // --- SMALLER AccountInfoCard ---
        accountCard: { 
            backgroundColor: theme.surface, 
            borderRadius: 20, 
            width: 150,
            marginRight: 15, 
            shadowColor: '#000', 
            shadowOffset: { width: 0, height: 2 }, 
            shadowOpacity: theme.isDarkMode ? 0.2 : 0.05, 
            shadowRadius: 8, 
            elevation: 4,
            flexDirection: 'row',
            overflow: 'hidden',
        },
        accountCardStripe: {
            width: 6,
        },
        accountCardContent: {
            flex: 1,
            padding: 14,
            justifyContent: 'space-between',
        },
        accountCardHeader: {},
        accountCardIconContainer: { 
            padding: 10, 
            borderRadius: 14, 
            alignSelf: 'flex-start',
            marginBottom: 10,
        },
        accountCardLabel: { 
            fontSize: 13, 
            color: theme.textSecondary, 
            fontWeight: '500',
        },
        accountCardValue: { 
            fontSize: 22, 
            fontWeight: 'bold', 
            color: theme.text,
            marginTop: 4,
        },
        
        noPlanCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 30, marginHorizontal: 20 },
        noPlanCardContent: { flex: 1, marginHorizontal: 20 },
        noPlanTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textOnPrimary },
        noPlanSubtitle: { fontSize: 14, color: theme.textOnPrimary, marginTop: 4, opacity: 0.9 },
        dashboardLoader: { height: 160, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 20, marginHorizontal: 20 },

        actionsGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 15 },
        quickActionContainer: { alignItems: 'center', flex: 1, marginHorizontal: 5 },
        quickActionIconCircle: { 
            backgroundColor: theme.surface, 
            width: 70, 
            height: 70, 
            borderRadius: 35, 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: theme.isDarkMode ? 0.2 : 0.08,
            shadowRadius: 6,
            elevation: 8,
        },
        quickActionText: { fontSize: 14, fontWeight: '600', color: theme.text, textAlign: 'center' },

        feedbackPromptCard: {
            marginHorizontal: 20,
            borderRadius: 20,
            overflow: 'hidden',
            marginTop: 10,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 6,
        },
        feedbackPromptGradient: { padding: 20 },
        feedbackPromptContent: { flexDirection: 'row', alignItems: 'center' },
        feedbackPromptTextContainer: { flex: 1, marginLeft: 15 },
        feedbackPromptTitle: { fontSize: 18, fontWeight: 'bold', color: theme.textOnPrimary, marginBottom: 4 },
        feedbackPromptSubtitle: { fontSize: 13, color: theme.textOnPrimary, opacity: 0.8 },

        drawerOverlay: { flex: 1, backgroundColor: 'transparent', flexDirection: 'row' },
        drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
        drawerContainer: { width: '85%', maxWidth: 320, elevation: 16, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
        fullGradient: { flex: 1 },
        drawerHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
        drawerProfileSection: { flexDirection: 'row', alignItems: 'center', gap: 15 },
        drawerUsername: { fontSize: 18, fontWeight: 'bold', color: theme.textOnPrimary },
        drawerEmail: { fontSize: 14, color: theme.textOnPrimary, opacity: 0.8 },
        drawerProfileImage: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.5)' },
        drawerMenu: { padding: 10 },
        drawerMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 10, marginBottom: 5 },
        drawerMenuLabel: { fontSize: 16, marginLeft: 20, flex: 1, fontWeight: '500' },
        drawerLogoutButton: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 40, marginTop: 10, padding: 15, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)' },
        drawerLogoutText: { color: theme.danger, fontSize: 16, fontWeight: 'bold', marginLeft: 20 },

        confirmModalOverlay: { flex: 1, backgroundColor: 'rgba(7, 7, 7, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
        confirmModalContent: { backgroundColor: theme.background, borderRadius: 20, padding: 25, alignItems: 'center', width: '100%', maxWidth: 350 },
        confirmModalImage: { width: 100, height: 100, resizeMode: 'contain', marginBottom: 20 },
        confirmModalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.primary, marginBottom: 10, textAlign: 'center' },
        confirmModalDescription: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 24 },
        confirmModalButtonContainer: { flexDirection: 'row', gap: 10 },
        confirmModalCancelButton: { backgroundColor: theme.isDarkMode ? theme.background : '#E9E9E9', borderRadius: 12, paddingVertical: 14, flex: 1, alignItems: 'center' },
        confirmModalCancelText: { color: theme.textBe, fontSize: 16, fontWeight: '600' },
        confirmModalConfirmButton: { backgroundColor: theme.danger, borderRadius: 12, paddingVertical: 14, flex: 1, alignItems: 'center' },
        confirmModalConfirmText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: '600' },
        notificationBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: theme.danger, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: theme.surface }
    }); 