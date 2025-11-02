// screens/main/HomePage.js (Corrected)
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    BackHandler,
    RefreshControl,
    ActivityIndicator,
    Linking,
    Platform,
    Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { WebView } from 'react-native-webview';
import { useSubscription, useAuth, useTheme } from '../../contexts';
import { BottomNavBar } from '../../components/BottomNavBar';

// --- Import separated components ---
import DrawerMenuComponent from './components/DrawerMenuComponent.js';
import ConfirmationModalComponent from './components/ConfirmationModalComponent.js';

// --- Sub-Components (Memoized for Performance) ---

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
    const { user: profile, refreshUser, signOut, api } = useAuth();
    const { subscriptionData, paymentHistory, subscriptionStatus, refreshSubscription, isLoading: isSubscriptionLoading } = useSubscription();

    const [uiState, setUiState] = useState({ isMenuVisible: false, isLogoutModalVisible: false, isExitModalVisible: false });
    const [refreshing, setRefreshing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isMapTouched, setIsMapTouched] = useState(false);
    const [showInstructionalModal, setShowInstructionalModal] = useState(false); // Start as false

    const isRefreshingRef = useRef(false);
    const hasDiscoveredScroll = useRef(false);

    // --- Check if instructional modal should be shown on startup ---
    useEffect(() => {
        const checkShouldShowModal = async () => {
            const hasBeenShown = await AsyncStorage.getItem(INSTRUCTION_MODAL_SHOWN_KEY);
            if (!hasBeenShown) {
                // Use a small delay to ensure the UI has settled before showing the modal
                setTimeout(() => {
                    setShowInstructionalModal(true);
                }, 500);
            }
        };
        checkShouldShowModal();
    }, []);

    // --- Handler for closing the instructional modal ---
    const handleModalClose = async (shouldRemember) => {
        if (shouldRemember) {
            await AsyncStorage.setItem(INSTRUCTION_MODAL_SHOWN_KEY, 'true');
        }
        setShowInstructionalModal(false);
    };

    // --- MAP LOCATION DATA ---
    const officeLocation = { latitude: 14.7397636, longitude: 121.1401032 };
    const officeAddress = "Blk 18, Lot 95, Phase 1D, Kasiglahan Village, San Jose, Rodriguez, Rizal";
    const officeName = "FiBear Network Technologies Corp. Kasiglahan Branch";

    const openGoogleMaps = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${officeLocation.latitude},${officeLocation.longitude}`;
        const label = officeName;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    const mapHtml = `
      <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }</style></head>
      <body><iframe id="map" src="https://www.google.com/maps?q=${officeLocation.latitude},${officeLocation.longitude}&output=embed" frameborder="0" style="border:0" allowfullscreen="" aria-hidden="false" tabindex="0"></iframe></body></html>
    `;

    const statusConfig = useMemo(() => ({
        'active': { text: 'Active', color: theme.success },
        'pending_change': { text: 'Active (Change Pending)', color: theme.success },
        'pending_installation': { text: 'Pending Installation', color: theme.warning },
        'pending_verification': { text: 'Pending Verification', color: theme.warning },
        'suspended': { text: 'Suspended', color: theme.danger },
        'declined': { text: 'Declined', color: theme.danger },
        'cancelled': { text: 'Cancelled', color: theme.textSecondary },
        'upcoming': { text: 'Upcoming', color: theme.info },
    }), [theme]);

    const hasDueOrOverdueBills = useMemo(() =>
        paymentHistory.some(bill => ['Due', 'Overdue'].includes(bill.status)),
        [paymentHistory]
    );

    const effectiveStatus =
        (subscriptionStatus === 'active' || subscriptionStatus === 'pending_installation') && !hasDueOrOverdueBills
        ? 'upcoming'
        : subscriptionStatus;

    const currentStatus = statusConfig[effectiveStatus] || { text: 'Not Subscribed', color: theme.disabled };
    const showScrollIndicator = !hasDiscoveredScroll.current && subscriptionStatus === 'active';

    const onRefresh = useCallback(async () => {
        if (isRefreshingRef.current || !api) return;

        isRefreshingRef.current = true;
        setRefreshing(true);
        try {
            await Promise.all([
                api.get('/notifications').then(res => {
                    if (res?.data?.data) {
                        setUnreadCount(res.data.data.filter(n => !n.read).length);
                    }
                }),
                refreshUser(),
                refreshSubscription(),
            ]);
        } catch (error) {
            if (error.response?.status !== 401) {
                 console.error("Error during refresh:", error.message);
            }
        } finally {
            isRefreshingRef.current = false;
            setRefreshing(false);
        }
    }, [api, refreshUser, refreshSubscription]);

    useFocusEffect(
      useCallback(() => {
        onRefresh();
      }, [onRefresh])
    );

    // --- UI State Handlers ---
    const handleUiStateChange = useCallback((key, value) => setUiState(prev => ({ ...prev, [key]: value })), []);
    const onConfirmLogout = useCallback(() => { handleUiStateChange('isLogoutModalVisible', false); signOut(); }, [signOut, handleUiStateChange]);
    const navigateAndCloseDrawer = useCallback((screenName) => { navigation.navigate(screenName); handleUiStateChange('isMenuVisible', false); }, [navigation, handleUiStateChange]);

    // --- Hardware Back Button Handler ---
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (uiState.isMenuVisible) { handleUiStateChange('isMenuVisible', false); return true; }
                if (uiState.isLogoutModalVisible || uiState.isExitModalVisible) {
                    handleUiStateChange('isLogoutModalVisible', false);
                    handleUiStateChange('isExitModalVisible', false);
                    return true;
                }
                handleUiStateChange('isExitModalVisible', true);
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [uiState, handleUiStateChange])
    );

    // --- Memoized Dashboard Component ---
    const renderDashboard = useMemo(() => {
        if (isSubscriptionLoading && !refreshing) {
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

        if (subscriptionStatus === 'suspended') return renderNoPlanCard('Account Suspended', 'Pay your bill to reactivate.', 'PayBills', 'warning-outline', true);
        if (!['active', 'pending_change', 'pending_installation'].includes(subscriptionStatus)) return renderNoPlanCard('Unlock Your Dashboard', 'Explore our plans now!', 'Subscription', 'sparkles-outline');

        const activePlan = subscriptionData?.planId;
        const renewalDate = subscriptionData?.renewalDate;
        const pendingBill = paymentHistory.find(bill => bill.status === 'Pending Verification');
        const dueBill = paymentHistory.find(bill => bill.status === 'Due' || bill.status === 'Overdue');
        const upcomingBill = paymentHistory.find(bill => bill.status === 'Upcoming');

        // --- FIX: Show upcoming status for new users without a due bill ---
        if (effectiveStatus === 'upcoming') {
            const firstBillDate = upcomingBill
                ? new Date(upcomingBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : (renewalDate ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Soon');

            return (
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContainer}>
                    <AccountInfoCard icon="file-text" label="First Bill" value="Upcoming" color={theme.info} onPress={() => navigation.navigate('MyBills')} />
                    <AccountInfoCard icon="bar-chart-2" label="Current Plan" value={activePlan?.name || 'N/A'} color={theme.primary} onPress={() => navigation.navigate('MySubscriptionScreen')} />
                    <AccountInfoCard icon="calendar" label="Billing Starts" value={firstBillDate} color={theme.textSecondary} onPress={() => navigation.navigate('MyBills')} />
                </ScrollView>
            );
        }

        let billAmount = 'All Paid',
            billColor = theme.success,
            billLabel = 'Current Bill',
            billOnPress = () => navigation.navigate('MyBills');

        if (pendingBill) {
            billAmount = `₱${(pendingBill.amount ?? 0).toFixed(2)}`;
            billColor = theme.warning;
            billLabel = 'Verifying Payment';
        } else if (dueBill) {
            billAmount = `₱${(dueBill.amount ?? 0).toFixed(2)}`;
            billColor = dueBill.status === 'Overdue' ? theme.danger : theme.warning;
            billLabel = dueBill.status === 'Overdue' ? 'Bill Overdue' : 'Bill Due';
            billOnPress = () => navigation.navigate('PayBills');
        }

        const nextBillDate = dueBill ? new Date(dueBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (renewalDate ? new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A');

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContainer} onScrollBeginDrag={() => { if (showScrollIndicator) hasDiscoveredScroll.current = true; }}>
                <AccountInfoCard icon="dollar-sign" label={billLabel} value={billAmount} color={billColor} onPress={billOnPress} />
                <AccountInfoCard icon="bar-chart-2" label="Current Plan" value={activePlan?.name || 'N/A'} color={theme.primary} onPress={() => navigation.navigate('MySubscriptionScreen')} />
                <AccountInfoCard icon="calendar" label={dueBill ? 'Due Date' : 'Next Renewal'} value={nextBillDate} color={theme.textSecondary} onPress={() => navigation.navigate('MyBills')} />
            </ScrollView>
        );
    }, [isSubscriptionLoading, refreshing, subscriptionStatus, paymentHistory, subscriptionData, theme, navigation, styles, effectiveStatus]);

    const photoSource = profile?.photoUrl ? { uri: profile.photoUrl } : require('../../assets/images/avatars/profilepic.jpg');

    return (
        <SafeAreaView style={styles.container}>
            <DrawerMenuComponent isVisible={uiState.isMenuVisible} onClose={() => handleUiStateChange('isMenuVisible', false)} onNavigate={navigateAndCloseDrawer} onLogout={() => { handleUiStateChange('isMenuVisible', false); handleUiStateChange('isLogoutModalVisible', true); }} />
            <ConfirmationModalComponent isVisible={uiState.isLogoutModalVisible} onClose={() => handleUiStateChange('isLogoutModalVisible', false)} onConfirm={onConfirmLogout} title="Logging Out" description="Are you sure you want to log out?" confirmText="Yes, Log Out" imageSource={require('../../assets/images/icons/logoutpic.png')} />
            <ConfirmationModalComponent isVisible={uiState.isExitModalVisible} onClose={() => handleUiStateChange('isExitModalVisible', false)} onConfirm={() => BackHandler.exitApp()} title="Exit Application?" description="Are you sure you want to close the application?" confirmText="Yes, Exit" imageSource={require('../../assets/images/icons/logoutpic.png')} />

            <View style={styles.headerContainer}>
                <BlurView intensity={90} style={styles.header}>
                    <TouchableOpacity onPress={() => handleUiStateChange('isMenuVisible', true)} style={styles.headerIcon}><Ionicons name="menu" size={28} color={theme.text} /></TouchableOpacity>
                    <Image source={require('../../assets/images/logos/logo.png')} style={styles.headerLogo} />
                    <TouchableOpacity onPress={() => navigation.navigate('Notif')} style={styles.headerIcon}>
                        {unreadCount > 0 && <View style={styles.notificationBadge} />}
                        <Ionicons name="notifications-outline" size={26} color={theme.text} />
                    </TouchableOpacity>
                </BlurView>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} progressViewOffset={120} />}
                contentContainerStyle={styles.scrollContent}
                onScrollBeginDrag={() => { if (showScrollIndicator) hasDiscoveredScroll.current = true; }}
                scrollEnabled={!isMapTouched}
            >
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
                                        <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
                                        <Text style={styles.statusText}>
                                            Plan Status: {currentStatus.text}
                                        </Text>
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
                        <QuickActionButton icon="info" label="Guide" onPress={() => navigation.navigate('HowToUseScreen')} />
                    </View>
                </View>

                <View style={styles.section}>
                    <FeedbackPromptCard onPress={() => navigation.navigate('CustomerFeedbackScreen')} />
                </View>

                {/* --- OUR OFFICE SECTION --- */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { marginBottom: 15, paddingHorizontal: 20 }]}>Our Office</Text>
                    <View
                        style={styles.mapContainer}
                        onTouchStart={() => setIsMapTouched(true)}
                        onTouchEnd={() => setIsMapTouched(false)}
                    >
                        <WebView
                            style={styles.map}
                            source={{ html: mapHtml }}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                        />
                    </View>
                    <View style={styles.footerCard}>
                        <Ionicons name="location-sharp" size={24} color={theme.primary} />
                        <View style={styles.footerTextContainer}>
                             <Text style={styles.footerTitle}>{officeName}</Text>
                             <Text style={styles.footerAddress}>{officeAddress}</Text>
                        </View>
                        <TouchableOpacity style={styles.directionsButton} onPress={openGoogleMaps}>
                            <Text style={styles.directionsButtonText}>Directions</Text>
                        </TouchableOpacity>
                    </View>
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
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
        headerIcon: { padding: 8 },
        headerLogo: { height: 35, width: 100, resizeMode: 'contain' },
        headerSpacer: { height: 80 },
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
            marginBottom: 12,
        },
        welcomeTextContainer: {
            alignItems: 'center',
            marginBottom: 12,
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
            marginRight: 8,
        },
        statusText: {
            fontSize: 13,
            fontWeight: '600',
            color: theme.textOnPrimary,
        },
        section: { marginBottom: 40 },
        sectionHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
        sectionTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text },
        scrollIndicator: { flexDirection: 'row', alignItems: 'center', opacity: 0.7 },
        scrollIndicatorText: { color: theme.textSecondary, fontStyle: 'italic', marginRight: 2 },
        horizontalScrollContainer: { paddingLeft: 20, paddingRight: 5, paddingBottom: 10 },
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
            boxShadow:'2px 4px 2px rgba(0,0,0,0.4)'
        },
        quickActionText: { fontSize: 14, fontWeight: '600', color: theme.text, textAlign: 'center' },
        feedbackPromptCard: {
            marginHorizontal: 20,
            borderRadius: 20,
            overflow: 'hidden',
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
        notificationBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: theme.danger, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: theme.surface },
        mapContainer: {
            height: 200,
            marginHorizontal: 20,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: theme.surface,
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme.isDarkMode ? 0.2 : 0.08,
            shadowRadius: 8,
        },
        map: {
            ...StyleSheet.absoluteFillObject,
        },
        footerCard: {
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 16,
            marginHorizontal: 20,
            marginTop: -20,
            flexDirection: 'row',
            alignItems: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: theme.isDarkMode ? 0.25 : 0.1,
            shadowRadius: 10,
        },
        footerTextContainer: {
            flex: 1,
            marginLeft: 12,
        },
        footerTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.text,
        },
        footerAddress: {
            fontSize: 13,
            color: theme.textSecondary,
            marginTop: 2,
        },
        directionsButton: {
            backgroundColor: `${theme.primary}20`,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
        },
        directionsButtonText: {
            color: theme.primary,
            fontWeight: '600',
            fontSize: 13,
        },
    });