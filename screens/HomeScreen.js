import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity,
  Modal, TouchableWithoutFeedback, SafeAreaView, BackHandler, RefreshControl, ActivityIndicator, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
// --- FIX: Import useSubscription from the corrected context file ---
import { useSubscription, useAlert, useAuth, useTheme } from '../contexts'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomNavBar } from '../components/BottomNavBar'; 

// --- Reusable Drawer Item Component ---
const DrawerItem = ({ icon, label, onPress, theme }) => {
  const styles = getStyles(theme);
  return (
    <TouchableOpacity style={styles.amenuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={theme.text} />
      <Text style={styles.amenuLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// --- Reusable Component for Account Overview Cards ---
const AccountInfoCard = ({ icon, label, value, color, onPress, theme }) => {
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={styles.accountCard} onPress={onPress} disabled={!onPress}>
            <View style={[styles.accountCardIconContainer, { backgroundColor: `${color}20` }]}>
                <Feather name={icon} size={22} color={color} />
            </View>
            <View style={styles.accountCardInfo}>
                <Text style={styles.accountCardLabel}>{label}</Text>
                <Text style={styles.accountCardValue}>{value}</Text>
            </View>
        </TouchableOpacity>
    );
};


export default function HomePage() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { showAlert } = useAlert();

  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isExitModalVisible, setExitModalVisible] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMenuFeedbackId, setActiveMenuFeedbackId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- FIX: Correctly destructured signOut and renamed refreshAuthUser to refreshUser ---
  const { user: profile, refreshUser, signOut, api } = useAuth();
  // --- FIX: Get isLoading from the subscription context ---
  const { 
      activePlan, 
      paymentHistory, 
      subscriptionStatus, 
      renewalDate, 
      refreshSubscription,
      isLoading: isSubscriptionLoading // Rename to avoid conflicts
  } = useSubscription();

  const hasDiscoveredScroll = useRef(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(!hasDiscoveredScroll.current);

const fetchFeedbacks = useCallback(async () => {
    setIsFeedbackLoading(true);
    try {
        // --- FIX: API response is already an object with data and pagination ---
        const { data: apiResponse } = await api.get('/feedback?limit=5');
        const feedbackList = apiResponse.data || []; 

        // The mapping is correct, as the backend populates `userId`
        setFeedbacks(feedbackList);
        await AsyncStorage.setItem('cachedFeedbacks', JSON.stringify(feedbackList));

    } catch (err) {
      console.error('Could not fetch feedbacks:', err.response?.data?.message || err.message);
      try {
        const cached = await AsyncStorage.getItem('cachedFeedbacks');
        if (cached) setFeedbacks(JSON.parse(cached));
      } catch (cacheErr) { console.error('Could not load cached feedbacks:', cacheErr); }
    } finally {
      setIsFeedbackLoading(false);
    }
  }, [api]);

  const fetchUnreadNotifications = useCallback(async () => {
    if (!api) return;
    try {
      // --- FIX: The API response contains a `data` array and a `pagination` object ---
      const { data: response } = await api.get('/notifications');
      const notifications = response.data || [];
      const count = notifications.filter(n => !n.read).length;
      setUnreadCount(count);
    } catch (error) {
        console.error("Could not fetch notification count:", error.response?.data?.message || error.message);
        setUnreadCount(0); 
    }
}, [api]);
  
  const fetchAllData = useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            refreshUser(), 
            refreshSubscription(),
            fetchFeedbacks(),
            fetchUnreadNotifications()
        ]);
        setRefreshing(false);
    }, [refreshUser, refreshSubscription, fetchFeedbacks, fetchUnreadNotifications]);

  const onRefresh = useCallback(async () => {
        await fetchAllData();
    }, [fetchAllData]);

  useEffect(() => { 
    if (isFocused) {
        fetchAllData();
    }
  }, [isFocused, fetchAllData]);
  
  useFocusEffect(
    useCallback(() => {
        const onBackPress = () => {
            if (activeMenuFeedbackId) { setActiveMenuFeedbackId(null); return true; }
            if (isMenuVisible) { setMenuVisible(false); return true; }
            if (isLogoutModalVisible) { setLogoutModalVisible(false); return true; }
            setExitModalVisible(true);
            return true;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [isMenuVisible, isLogoutModalVisible, activeMenuFeedbackId])
  );
  
  const onConfirmLogout = () => { setLogoutModalVisible(false); signOut(); };
  const navigateAndCloseDrawer = (screenName) => { navigation.navigate(screenName); setMenuVisible(false); };
  const handleEdit = (feedbackItem) => { setActiveMenuFeedbackId(null); navigation.navigate('CustomerFeedbackScreen', { feedbackItem }); };
  const handleDelete = (feedbackId) => {
    setActiveMenuFeedbackId(null);
    showAlert( "Delete Feedback", "Are you sure you want to permanently delete your feedback?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/feedback/${feedbackId}`);
            setFeedbacks(prev => prev.filter(f => f._id !== feedbackId));
          } catch (error) { showAlert("Error", "Could not delete feedback. Please try again.", [{ text: "OK" }]); }
        },
      }
    ]);
  };

  const handleHorizontalScroll = () => {
    if (showScrollIndicator) {
      hasDiscoveredScroll.current = true;
      setShowScrollIndicator(false);
    }
  };

  const renderDashboard = () => {
    if (isSubscriptionLoading && !refreshing) {
        return (
            <View style={styles.dashboardLoader}>
                <ActivityIndicator color={theme.primary} />
            </View>
        );
    }
    if (subscriptionStatus === 'suspended') {
      return (
        <TouchableOpacity style={styles.noPlanCard} onPress={() => navigation.navigate('MyBills')}>
          <Ionicons name="warning-outline" size={32} color={theme.danger} />
          <View style={{flex: 1, marginLeft: 15}}>
            <Text style={styles.noPlanTitle}>Account Suspended</Text>
            <Text style={styles.noPlanSubtitle}>Tap here to pay your bill and reactivate.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      );
    }
    
    if (subscriptionStatus !== 'active') {
      return (
        <TouchableOpacity style={styles.noPlanCard} onPress={() => navigation.navigate('Subscription')}>
          <Ionicons name="wifi-outline" size={32} color={theme.primary} />
          <View style={{flex: 1, marginLeft: 15}}><Text style={styles.noPlanTitle}>No Active Subscription</Text><Text style={styles.noPlanSubtitle}>Tap here to explore our plans.</Text></View>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      );
    }
    
    const dueBill = paymentHistory.find(bill => bill.type === 'bill' && (bill.status === 'Due' || bill.status === 'Overdue'));
    // --- FIX: Use `activePlan` from context which correctly points to the populated plan object ---
    const getBandwidth = () => {
        if (!activePlan?.features) return 'N/A';
        // Prioritize Mbps
        let bwFeature = activePlan.features.find(f => f.toLowerCase().includes('mbps'));
        if (bwFeature) return bwFeature.replace('Up to ', '');
        
        // Fallback to data cap info
        bwFeature = activePlan.features.find(f => f.toLowerCase().includes('gb') || f.toLowerCase().includes('unlimited'));
        if (bwFeature) return bwFeature;
        
        // Final fallback
        return 'Standard';
    };
    const bandwidth = getBandwidth();
    
    let billAmount = 'All Paid';
    let billColor = theme.success; 
    
    if (dueBill) {
        billAmount = `₱${dueBill.amount.toFixed(2)}`;
        billColor = dueBill.status === 'Overdue' ? theme.danger : theme.warning;
    }

    const nextBillDate = dueBill 
      ? new Date(dueBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const nextBillLabel = dueBill ? "Next Bill Due" : "Next Renewal";

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScrollContainer}
        onScrollBeginDrag={handleHorizontalScroll}
      >
        <AccountInfoCard icon="dollar-sign" label="Current Bill" value={billAmount} color={billColor} onPress={() => navigation.navigate('MyBills')} theme={theme} />
        <AccountInfoCard icon="bar-chart-2" label="Current Plan" value={activePlan?.name || 'N/A'} color={theme.primary} onPress={() => navigation.navigate('Subscription')} theme={theme} />
        <AccountInfoCard icon="wifi" label="Bandwidth" value={bandwidth} color={theme.accent} onPress={() => navigation.navigate('Subscription')} theme={theme} />
        <AccountInfoCard icon="calendar" label={nextBillLabel} value={nextBillDate} color={theme.textSecondary} onPress={() => navigation.navigate('PayBills')} theme={theme} />
      </ScrollView>
    );
  };
  
    const photoSource = profile?.photoUrl ? { uri: profile.photoUrl } : require('../assets/images/profilepic.jpg');

  return (
    <SafeAreaView style={styles.container}>
      {/* --- Modals --- */}
      <Modal animationType="fade" transparent={true} visible={isExitModalVisible} onRequestClose={() => setExitModalVisible(false)}><View style={styles.logmodalOverlay}><View style={styles.logmodalContent}><Image source={require('../assets/images/logoutpic.png')} style={styles.logimage} /><Text style={styles.logtitle}>Exit Application?</Text><Text style={styles.logmodalDescription}>Are you sure you want to close the application?</Text><View style={styles.logbuttonContainer}><TouchableOpacity style={styles.logcancelButton} onPress={() => setExitModalVisible(false)}><Text style={styles.logcancelText}>No, Just kidding</Text></TouchableOpacity><TouchableOpacity style={styles.logconfirmButton} onPress={() => BackHandler.exitApp()}><Text style={styles.logconfirmText}>Yes, Exit</Text></TouchableOpacity></View></View></View></Modal>
      <Modal animationType="fade" transparent={true} visible={isLogoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}><View style={styles.logmodalOverlay}><View style={styles.logmodalContent}><Image source={require('../assets/images/logoutpic.png')} style={styles.logimage} /><Text style={styles.logtitle}>Logging Out</Text><Text style={styles.logmodalDescription}>Are you sure you want to log out?</Text><View style={styles.logbuttonContainer}><TouchableOpacity style={styles.logcancelButton} onPress={() => setLogoutModalVisible(false)}><Text style={styles.logcancelText}>No, Just kidding</Text></TouchableOpacity><TouchableOpacity style={styles.logconfirmButton} onPress={onConfirmLogout}><Text style={styles.logconfirmText}>Yes, Log Me Out</Text></TouchableOpacity></View></View></View></Modal>
      <Modal animationType="fade" transparent={true} visible={isMenuVisible} onRequestClose={() => setMenuVisible(false)}><View style={styles.drawerOverlay}><Animatable.View animation="fadeInLeft" duration={400} style={styles.acontainer}><View style={styles.aheader}><TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.abackIcon}><Ionicons name="arrow-back" size={24} color={theme.textOnPrimary} /></TouchableOpacity><View style={styles.aprofileSection}><Text style={styles.ausername} numberOfLines={1}>{profile?.displayName || 'User'}</Text><Text style={styles.aemail} numberOfLines={1}>{profile?.email || 'No email'}</Text></View><Image source={photoSource} style={styles.aprofileImage} /></View><ScrollView style={styles.amenu}><DrawerItem icon="person-outline" label="Profile" onPress={() => navigateAndCloseDrawer('Profile')} theme={theme} /><DrawerItem icon="notifications-outline" label="Notifications" onPress={() => navigateAndCloseDrawer('Notif')} theme={theme} /><DrawerItem icon="settings" label="Settings" onPress={() => navigateAndCloseDrawer('Settings')} theme={theme} /><DrawerItem icon="chatbubbles-outline" label="Customer Feedback" onPress={() => navigateAndCloseDrawer('CustomerFeedbackScreen')} theme={theme} /></ScrollView><TouchableOpacity style={styles.alogoutButton} onPress={() => { setMenuVisible(false); setLogoutModalVisible(true); }}><Feather name="log-out" size={20} color={theme.textOnPrimary} /><Text style={styles.alogoutText}>Logout</Text></TouchableOpacity></Animatable.View><TouchableWithoutFeedback onPress={() => setMenuVisible(false)}><View style={styles.drawerBackdrop} /></TouchableWithoutFeedback></View></Modal>
      {/* --- Floating Header --- */}
      <View style={styles.headerContainer}>
        <BlurView intensity={60} style={styles.header}>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerIcon}><Ionicons name="menu" size={28} color={theme.text} /></TouchableOpacity>
            <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} />
            <TouchableOpacity onPress={() => navigation.navigate('Notif')} style={styles.headerIcon}>{unreadCount > 0 && (<View style={styles.notificationBadge} />)}
                <Ionicons name="notifications-outline" size={26} color={theme.text} />
            </TouchableOpacity>
        </BlurView>
      </View>

      {/* --- Main Content --- */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} progressViewOffset={100} />}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => setActiveMenuFeedbackId(null)}
      >
        <View style={styles.headerSpacer} />
        
        <Animatable.View animation="fadeInDown" duration={700} style={styles.welcomeCard}>
            <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeTitle}>Welcome back,</Text>
                <Text style={styles.welcomeName} numberOfLines={1}>{profile?.displayName?.split(' ')[0] || 'User'}!</Text>
                <Text style={styles.welcomeEmail} numberOfLines={1}>{profile?.email}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Image 
                    source={profile?.photoUrl ? { uri: profile.photoUrl } : require('../assets/images/profilepic.jpg')} 
                    style={styles.profilePic}
                />
            </TouchableOpacity>
        </Animatable.View>
        <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionTitle}>Dashboard</Text>
                {showScrollIndicator && subscriptionStatus === 'active' && (
                    <Animatable.View 
                        animation="slideInRight" 
                        duration={1500}
                        iterationCount="infinite"
                        style={styles.scrollIndicator}
                    >
                        <Text style={styles.scrollIndicatorText}>swipe</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                    </Animatable.View>
                )}
            </View>
            {renderDashboard()}
        </View>
        
        

        <View style={styles.section}>
            <Text style={[styles.sectionTitle, {left: 20}]}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PayBills')}><Feather name="credit-card" size={24} color={theme.primary} /><Text style={styles.actionText}>Pay Bill</Text></TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Profile')}><Feather name="user" size={24} color={theme.primary} /><Text style={styles.actionText}>View Profile</Text></TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CustomerFeedbackScreen')}><Feather name="edit" size={24} color={theme.primary} /><Text style={styles.actionText}>Give Feedback</Text></TouchableOpacity>
            </View>
        </View>

        <View style={styles.section}>
            <Text style={[styles.sectionTitle, {left: 20}]}>Customer Feedback</Text>
            {isFeedbackLoading ? (
        <ActivityIndicator style={{ height: 150, alignSelf: 'center' }} size="large" color={theme.primary} />
    ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
            {feedbacks.length > 0 ? (
                feedbacks.map((item) => {
                    const photoUrl = item.userId?.photoUrl;
                    const displayName = item.userId?.displayName || 'Anonymous';
                    const feedbackOwnerId = item.userId?._id;

                    return (
                        <View key={item._id} style={styles.card}>
                            <View style={styles.rowlogo}>
                                <Image 
                                    style={styles.avatar} 
                                    source={photoUrl ? { uri: photoUrl } : require('../assets/images/profilepic.jpg')} 
                                />
                                <Text style={styles.name}>{displayName}</Text>
                            </View>

                            {/* --- FIX 2: Correctly compare the user's ID with the feedback owner's ID --- */}
                            {profile?._id === feedbackOwnerId && (
                                <TouchableOpacity 
                                    style={styles.menuButton} 
                                    onPress={() => setActiveMenuFeedbackId(prevId => prevId === item._id ? null : item._id)}
                                >
                                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}

                            {activeMenuFeedbackId === item._id && (
                                <Animatable.View animation="fadeIn" duration={300} style={styles.popoverMenu}>
                                    <TouchableOpacity style={styles.popoverItem} onPress={() => handleEdit(item)}>
                                        <Ionicons name="create-outline" size={18} color={theme.text} />
                                        <Text style={styles.popoverText}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.popoverItem} onPress={() => handleDelete(item._id)}>
                                        <Ionicons name="trash-outline" size={18} color={theme.danger} />
                                        <Text style={[styles.popoverText, { color: theme.danger }]}>Delete</Text>
                                    </TouchableOpacity>
                                </Animatable.View>
                            )}
                            
                            <View style={styles.stars}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Ionicons key={i} name={i < item.rating ? "star" : "star-outline"} size={16} color="#FFC700" />
                                ))}
                            </View>
                            <Text style={styles.feedback} numberOfLines={2}>{item.text}</Text>
                        </View>
                    );
                })
            ) : (
                <View style={styles.noFeedbackCard}>
                    <Text style={styles.noFeedbackText}>Be the first to leave feedback!</Text>
                </View>
            )}
        </ScrollView>
    )}
</View>
      </ScrollView>
      <BottomNavBar activeScreen="Home" />
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.2)' : theme.border, borderBottomWidth: 1},
  header: { flexDirection: 'row', backgroundColor: theme.surface, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 10 },
  headerIcon: { padding: 8 },
  headerLogo: { width: 100, height: 35, resizeMode: 'contain' },
  notificationBadge: { position: 'absolute', right: 7, top: 7, backgroundColor: theme.danger, borderRadius: 8, width: 10, height: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: theme.surface },
  notificationBadgeText: { color: theme.textOnPrimary, fontSize: 5, fontWeight: 'bold'},
  scrollContent: { paddingTop: 20, paddingBottom: 120 },
  headerSpacer: { height: 80 },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.isDarkMode ? 0.2 : 0.05,
    shadowRadius: 4,
  },
  welcomeTextContainer: { flex: 1 },
  welcomeTitle: { fontSize: 20, color: theme.textSecondary, fontWeight: '400' },
  welcomeName: { fontSize: 26, color: theme.text, fontWeight: 'bold' },
  welcomeEmail: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
  profilePic: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: theme.primary, },
  section: { marginBottom: 30 },
  sectionHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
  scrollIndicator: { flexDirection: 'row', alignItems: 'center', opacity: 0.7 },
  scrollIndicatorText: { fontSize: 13, color: theme.textSecondary, fontStyle: 'italic', marginRight: 2, },
  horizontalScrollContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  accountCard: { backgroundColor: theme.surface, borderRadius: 18, padding: 15, width: 160, marginRight: 15, borderWidth: 1, borderColor: theme.border, },
  accountCardIconContainer: { padding: 10, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12, },
  accountCardInfo: {},
  accountCardLabel: { fontSize: 14, color: theme.textSecondary, marginBottom: 4, },
  accountCardValue: { fontSize: 16, color: theme.text, fontWeight: '600' },
  noPlanCard: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
  noPlanTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  noPlanSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
  actionsGrid: { marginHorizontal: 20, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: theme.surface, borderRadius: 16, paddingVertical: 10, borderWidth: 1, borderColor: theme.border },
  actionButton: { alignItems: 'center', padding: 10, flex: 1 },
  actionText: { color: theme.primary, marginTop: 8, fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: theme.isDarkMode ? 0 : 0.05, shadowRadius: 5, borderRadius: 12, padding: 15, marginRight: 12, width: 250, position: 'relative', marginLeft: 10, marginRight: 1 },
  noFeedbackCard: { alignItems: 'center', justifyContent: 'center', width: 250, height: 150, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  noFeedbackText: { color: theme.textSecondary, fontStyle: 'italic' },
  rowlogo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 35, height: 35, borderRadius: 17.5 },
  name: { fontWeight: 'bold', fontSize: 14, color: theme.text },
  stars: { flexDirection: 'row', marginVertical: 8 },
  feedback: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
  menuButton: { position: 'absolute', top: 8, right: 8, padding: 5, zIndex: 10 },
  popoverMenu: { position: 'absolute', top: 34, right: 8, backgroundColor: theme.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.border, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, zIndex: 9 },
  popoverItem: { flexDirection: 'row', alignItems: 'center', padding: 12, width: 120 },
  popoverText: { marginLeft: 10, fontSize: 14, color: theme.text },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row' },
  drawerBackdrop: { flex: 1 },
  acontainer: { backgroundColor: theme.surface, width: '85%', maxWidth: 320, borderRadius: 20, marginVertical: 30, marginHorizontal: 25, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  aheader: { backgroundColor: theme.primary, paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20 },
  abackIcon: { position: 'absolute', top: 20, left: 20, zIndex: 1 },
  aprofileSection: { marginTop: 30, paddingRight: 70 },
  ausername: { color: theme.textOnPrimary, fontSize: 15, fontWeight: 'bold' },
  aemail: { color: theme.textOnPrimary, fontSize: 12, marginTop: 2, opacity: 0.9 },
  aprofileImage: { width: 70, height: 70, borderRadius: 35, position: 'absolute', top: 95, right: 20, borderWidth: 2, borderColor: theme.surface },
  amenu: { marginTop: 30, paddingHorizontal: 10 },
  amenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, borderBottomWidth: 1, borderColor: theme.border, marginBottom: 5 },
  amenuLabel: { fontSize: 12, marginLeft: 20, color: theme.text, fontWeight: '400' },
  alogoutButton: { backgroundColor: theme.primary, margin: 20, marginBottom: 30, marginLeft: 90, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  alogoutText: { color: theme.textOnPrimary, fontSize: 12, marginLeft: 10, fontWeight: 'bold' },
  logmodalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  logmodalContent: { width: '85%', backgroundColor: theme.surface, borderRadius: 10, padding: 20, alignItems: 'center' },
  logimage: { width: 150, height: 150, marginBottom: 20, resizeMode: 'contain' },
  logtitle: { fontSize: 18, fontWeight: '600', color: theme.text, textAlign: 'center', marginBottom: 10 },
  logmodalDescription: { textAlign: 'center', color: theme.textSecondary, marginBottom: 30 },
  logbuttonContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  logcancelButton: { backgroundColor: theme.textSecondary, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  logconfirmButton: { borderWidth: 1.2, borderColor: theme.text, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  logcancelText: { color: theme.textOnPrimary, fontSize: 12 },
  logconfirmText: { color: theme.text, fontSize: 12 },
  dashboardLoader: {
    height: 100, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 18,
    marginHorizontal: 20,
  }
});