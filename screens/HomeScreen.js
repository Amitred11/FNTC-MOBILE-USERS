// screens/HomePage.js (Final Corrected Version)

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
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { useSubscription, useAlert, useAuth, useTheme } from '../contexts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomNavBar } from '../components/BottomNavBar';

// --- Sub-Components (Memoized for Performance) ---

const DrawerMenu = React.memo(({ isVisible, onClose, onNavigate, onLogout }) => {
    const { theme } = useTheme();
    const { user: profile } = useAuth();
    const styles = getStyles(theme);
    const photoSource = profile?.photoUrl ? { uri: profile.photoUrl } : require('../assets/images/profilepic.jpg');

    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.drawerOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.drawerBackdrop} />
                </TouchableWithoutFeedback>
                <Animatable.View animation="fadeInLeft" duration={400} style={styles.drawerContainer}>
                    <View style={styles.drawerHeader}>
                        <TouchableOpacity onPress={onClose} style={styles.drawerBackIcon}>
                            <Ionicons name="arrow-back" size={24} color={theme.textOnPrimary} />
                        </TouchableOpacity>
                        <View style={styles.drawerProfileSection}>
                            <Text style={styles.drawerUsername} numberOfLines={1}>{profile?.displayName || 'User'}</Text>
                            <Text style={styles.drawerEmail} numberOfLines={1}>{profile?.email || 'No email'}</Text>
                        </View>
                        <Image source={photoSource} style={styles.drawerProfileImage} />
                    </View>
                    <ScrollView styles = {styles.drawerMenu}>
                        <DrawerItem icon="person-outline" label="Profile" onPress={() => onNavigate('Profile')} />
                        <DrawerItem icon="notifications-outline" label="Notifications" onPress={() => onNavigate('Notif')} />
                        <DrawerItem icon="settings" label="Settings" onPress={() => onNavigate('Settings')} />
                        <DrawerItem icon="chatbubbles-outline" label="Customer Feedback" onPress={() => onNavigate('CustomerFeedbackScreen')} />
                    </ScrollView>
                    <TouchableOpacity style={styles.drawerLogoutButton} onPress={onLogout}>
                        <Feather name="log-out" size={20} color={theme.textOnPrimary} />
                        <Text style={styles.drawerLogoutText}>Logout</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </View>
        </Modal>
    );
});

const DrawerItem = React.memo(({ icon, label, onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={styles.drawerMenuItem} onPress={onPress}>
            <Ionicons name={icon} size={22} color={theme.text} />
            <Text style={styles.drawerMenuLabel}>{label}</Text>
        </TouchableOpacity>
    );
});

const AccountInfoCard = React.memo(({ icon, label, value, color, onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={styles.accountCard} onPress={onPress} disabled={!onPress}>
            <View style={[styles.accountCardIconContainer, { backgroundColor: `${color}20` }]}>
                <Feather name={icon} size={22} color={color} />
            </View>
            <View style={styles.accountCardInfo}>
                <Text style={styles.accountCardLabel}>{label}</Text>
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
                            <Text style={styles.confirmModalCancelText}>No, Just kidding</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmModalConfirmButton} onPress={onConfirm}>
                            <Text style={styles.confirmModalConfirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animatable.View>
            </View>
        </Modal>
    );
});

const FeedbackCard = React.memo(({ item, profile, isActiveMenu, onToggleMenu, onEdit, onDelete, isExpanded, onToggleExpand }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    
    const photoUrl = item.userId?.photoUrl;
    const displayName = item.userId?.displayName || 'Anonymous';
    const feedbackOwnerId = item.userId?._id;

    // Determine if the "See More" button is needed based on character count
    const isLongFeedback = item.text.length > 120;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Image style={styles.avatar} source={photoUrl ? { uri: photoUrl } : require('../assets/images/profilepic.jpg')} />
                <Text style={styles.name}>{displayName}</Text>
            </View>

            {profile?._id === feedbackOwnerId && (
                <TouchableOpacity style={styles.menuButton} onPress={onToggleMenu}>
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
            )}

            {isActiveMenu && (
                <Animatable.View animation="fadeIn" duration={300} style={styles.popoverMenu}>
                    <TouchableOpacity style={styles.popoverItem} onPress={onEdit}>
                        <Ionicons name="create-outline" size={18} color={theme.text} />
                        <Text style={styles.popoverText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.popoverItem} onPress={onDelete}>
                        <Ionicons name="trash-outline" size={18} color={theme.danger} />
                        <Text style={[styles.popoverText, { color: theme.danger }]}>Delete</Text>
                    </TouchableOpacity>
                </Animatable.View>
            )}

            <View style={styles.stars}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <Ionicons key={i} name={i < item.rating ? 'star' : 'star-outline'} size={16} color="#FFC700" />
                ))}
            </View>
            
            <Text style={styles.feedback} numberOfLines={isExpanded ? undefined : 2}>
                {item.text}
            </Text>

            {isLongFeedback && (
                <TouchableOpacity onPress={onToggleExpand} style={styles.seeMoreButton}>
                    <Text style={styles.seeMoreText}>
                        {isExpanded ? 'See Less' : 'See More...'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
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

  const [uiState, setUiState] = useState({
      isMenuVisible: false,
      isLogoutModalVisible: false,
      isExitModalVisible: false,
      activeMenuFeedbackId: null,
  });
  const [feedbacks, setFeedbacks] = useState([]);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState(null); // State for expanded feedback
  const [dataState, setDataState] = useState({ 
      isFeedbackLoading: true, 
      unreadCount: 0, 
      refreshing: false 
  });
  const hasDiscoveredScroll = useRef(false);
  
  const showScrollIndicator = !hasDiscoveredScroll.current && subscriptionStatus === 'active';

  const fetchAllData = useCallback(async () => {
    if (!api) return;
    setDataState(prev => ({ ...prev, refreshing: true }));
    try {
        const [feedbackRes, notificationsRes] = await Promise.all([
            api.get('/feedback?limit=5'),
            api.get('/notifications'),
            refreshUser(),
            refreshSubscription(),
        ]);

        if (feedbackRes?.data?.data) {
            setFeedbacks(feedbackRes.data.data);
            await AsyncStorage.setItem('cachedFeedbacks', JSON.stringify(feedbackRes.data.data));
        } else {
            const cached = await AsyncStorage.getItem('cachedFeedbacks');
            if (cached) setFeedbacks(JSON.parse(cached));
        }

        if (notificationsRes?.data?.data) {
            const notifications = notificationsRes.data.data;
            setDataState(prev => ({ ...prev, unreadCount: notifications.filter(n => !n.read).length }));
        }
    } catch (error) {
        console.error("Error fetching homepage data:", error.message);
    } finally {
        setDataState(prev => ({ ...prev, refreshing: false, isFeedbackLoading: false }));
    }
  }, [api, refreshUser, refreshSubscription]);

  useFocusEffect(useCallback(() => { fetchAllData(); }, [fetchAllData]));

  const handleUiStateChange = useCallback((key, value) => {
    setUiState(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const handleToggleExpand = useCallback((feedbackId) => {
    setExpandedFeedbackId(prevId => (prevId === feedbackId ? null : feedbackId));
  }, []);

  const onConfirmLogout = useCallback(() => {
    handleUiStateChange('isLogoutModalVisible', false);
    signOut();
  }, [signOut, handleUiStateChange]);

  const navigateAndCloseDrawer = useCallback((screenName) => {
    navigation.navigate(screenName);
    handleUiStateChange('isMenuVisible', false);
  }, [navigation, handleUiStateChange]);

  const handleDeleteFeedback = useCallback((feedbackId) => {
    handleUiStateChange('activeMenuFeedbackId', null);
    showAlert('Delete Feedback', 'Are you sure you want to permanently delete your feedback?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/feedback/${feedbackId}`);
            setFeedbacks((prev) => prev.filter((f) => f._id !== feedbackId));
          } catch (error) {
            showAlert('Error', 'Could not delete feedback.');
          }
        },
      },
    ]);
  }, [api, showAlert, handleUiStateChange]);

  const handleEditFeedback = useCallback((item) => {
      handleUiStateChange('activeMenuFeedbackId', null);
      navigation.navigate('CustomerFeedbackScreen', { feedbackItem: item });
  }, [navigation, handleUiStateChange]);

  const handleHorizontalScroll = () => {
    if (showScrollIndicator) {
      hasDiscoveredScroll.current = true;
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (expandedFeedbackId) {
            setExpandedFeedbackId(null);
            return true;
        }
        if (uiState.activeMenuFeedbackId) {
          handleUiStateChange('activeMenuFeedbackId', null);
          return true;
        }
        if (uiState.isMenuVisible) {
          handleUiStateChange('isMenuVisible', false);
          return true;
        }
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
    }, [uiState, expandedFeedbackId, handleUiStateChange]) // Add expandedFeedbackId dependency
  );
  
  const renderDashboard = useMemo(() => {
    if (isSubscriptionLoading && !dataState.refreshing) {
      return <View style={styles.dashboardLoader}><ActivityIndicator color={theme.primary} /></View>;
    }
    
    if (subscriptionStatus === 'suspended') {
      return (
        <TouchableOpacity style={styles.noPlanCard} onPress={() => navigation.navigate('MyBills')}>
          <Ionicons name="warning-outline" size={32} color={theme.danger} />
          <View style={styles.noPlanCardContent}>
            <Text style={styles.noPlanTitle}>Account Suspended</Text>
            <Text style={styles.noPlanSubtitle}>Tap here to pay your bill and reactivate.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      );
    }

    if (subscriptionStatus !== 'active' || !subscriptionData) {
      return (
        <TouchableOpacity style={styles.noPlanCard} onPress={() => navigation.navigate('Subscription')}>
          <Ionicons name="wifi-outline" size={32} color={theme.primary} />
          <View style={styles.noPlanCardContent}>
            <Text style={styles.noPlanTitle}>No Active Subscription</Text>
            <Text style={styles.noPlanSubtitle}>Tap here to explore our plans.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      );
    }

    const activePlan = subscriptionData.planId;
    const renewalDate = subscriptionData.renewalDate;
    
    const pendingBill = paymentHistory.find(bill => bill.type === 'bill' && bill.status === 'Pending Verification');
    const dueBill = paymentHistory.find(bill => bill.type === 'bill' && (bill.status === 'Due' || bill.status === 'Overdue'));
    
    const getBandwidth = () => {
      if (!activePlan?.features) return 'N/A';
      let bw = activePlan.features.find(f => f.toLowerCase().includes('mbps'));
      if (bw) return bw.replace('Up to ', '');
      bw = activePlan.features.find(f => f.toLowerCase().includes('gb') || f.toLowerCase().includes('unlimited'));
      return bw || 'Standard';
    };

    let billAmount = 'All Paid';
    let billColor = theme.success;
    let billLabel = 'Current Bill';
    let billOnPress = () => navigation.navigate('MyBills');

    if (pendingBill) {
      billAmount = `₱${pendingBill.amount.toFixed(2)}`;
      billColor = theme.warning;
      billLabel = 'Payment Verifying';
    } else if (dueBill) {
      billAmount = `₱${dueBill.amount.toFixed(2)}`;
      billColor = dueBill.status === 'Overdue' ? theme.danger : theme.warning;
      billOnPress = () => navigation.navigate('PayBills');
    }

    const nextBillDate = dueBill
      ? new Date(dueBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : new Date(renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContainer} onScrollBeginDrag={handleHorizontalScroll}>
        <AccountInfoCard icon="dollar-sign" label={billLabel} value={billAmount} color={billColor} onPress={billOnPress} />
        <AccountInfoCard icon="bar-chart-2" label="Current Plan" value={activePlan?.name || 'N/A'} color={theme.primary} onPress={() => navigation.navigate('MySubscriptionScreen')} />
        <AccountInfoCard icon="wifi" label="Bandwidth" value={getBandwidth()} color={theme.accent} onPress={() => navigation.navigate('MySubscriptionScreen')} />
        <AccountInfoCard icon="calendar" label={dueBill ? 'Bill Due' : 'Next Renewal'} value={nextBillDate} color={theme.textSecondary} onPress={() => navigation.navigate('MyBills')} />
      </ScrollView>
    );
  }, [isSubscriptionLoading, dataState.refreshing, subscriptionStatus, paymentHistory, subscriptionData, theme, navigation, styles]);

  const photoSource = profile?.photoUrl ? { uri: profile.photoUrl } : require('../assets/images/profilepic.jpg');

  return (
    <SafeAreaView style={styles.container}>
        <DrawerMenu 
            isVisible={uiState.isMenuVisible}
            onClose={() => handleUiStateChange('isMenuVisible', false)}
            onNavigate={navigateAndCloseDrawer}
            onLogout={() => {
                handleUiStateChange('isMenuVisible', false);
                handleUiStateChange('isLogoutModalVisible', true);
            }}
        />
        <ConfirmationModal 
            isVisible={uiState.isLogoutModalVisible}
            onClose={() => handleUiStateChange('isLogoutModalVisible', false)}
            onConfirm={onConfirmLogout}
            title="Logging Out"
            description="Are you sure you want to log out?"
            confirmText="Yes, Log Me Out"
            imageSource={require('../assets/images/logoutpic.png')}
        />
        <ConfirmationModal 
            isVisible={uiState.isExitModalVisible}
            onClose={() => handleUiStateChange('isExitModalVisible', false)}
            onConfirm={() => BackHandler.exitApp()}
            title="Exit Application?"
            description="Are you sure you want to close the application?"
            confirmText="Yes, Exit"
            imageSource={require('../assets/images/logoutpic.png')}
        />

        <View style={styles.headerContainer}>
            <BlurView intensity={Platform.OS === 'ios' ? 60 : 90} style={styles.header}>
            <TouchableOpacity onPress={() => handleUiStateChange('isMenuVisible', true)} style={styles.headerIcon}>
                <Ionicons name="menu" size={28} color={theme.text} />
            </TouchableOpacity>
            <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} />
            <TouchableOpacity onPress={() => navigation.navigate('Notif')} style={styles.headerIcon}>
                {dataState.unreadCount > 0 && <View style={styles.notificationBadge} />}
                <Ionicons name="notifications-outline" size={26} color={theme.text} />
            </TouchableOpacity>
            </BlurView>
        </View>

        <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={dataState.refreshing} onRefresh={fetchAllData} tintColor={theme.primary} progressViewOffset={100} />}
            contentContainerStyle={styles.scrollContent}
            onScrollBeginDrag={() => {
                if(showScrollIndicator) hasDiscoveredScroll.current = true;
                handleUiStateChange('activeMenuFeedbackId', null);
            }}
        >
            <View style={styles.headerSpacer} />

            <Animatable.View animation="fadeInDown" duration={700} style={styles.welcomeCard}>
                <View style={styles.welcomeTextContainer}>
                    <Text style={styles.welcomeTitle}>Welcome back,</Text>
                    <Text style={styles.welcomeName} numberOfLines={1}>{profile?.displayName?.split(' ')[0] || 'User'}!</Text>
                    <Text style={styles.welcomeEmail} numberOfLines={1}>{profile?.email}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                    <Image source={photoSource} style={styles.profilePic} />
                </TouchableOpacity>
            </Animatable.View>

            <View style={styles.section}>
                <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionTitle}>Dashboard</Text>
                    {showScrollIndicator && (
                    <Animatable.View animation="slideInRight" duration={1500} iterationCount="infinite" style={styles.scrollIndicator}>
                        <Text style={styles.scrollIndicatorText}>swipe</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                    </Animatable.View>
                    )}
                </View>
                {renderDashboard}
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, {left: 25}]}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PayBills')}>
                        <Feather name="credit-card" size={24} color={theme.primary} />
                        <Text style={styles.actionText}>Pay Bill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('OurServicesScreen')}>
                        <Feather name="layers" size={24} color={theme.primary} />
                        <Text style={styles.actionText}>Our Services</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('About')}>
                        <Feather name="info" size={24} color={theme.primary} />
                        <Text style={styles.actionText}>About Us</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, {left: 25}]}>Customer Feedback</Text>
                {dataState.isFeedbackLoading ? (
                    <ActivityIndicator style={{ height: 150 }} size="large" color={theme.primary} />
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 5 }}>
                    {feedbacks.length > 0 ? (
                        feedbacks.map((item) => (
                            <FeedbackCard
                                key={item._id}
                                item={item}
                                profile={profile}
                                isActiveMenu={uiState.activeMenuFeedbackId === item._id}
                                onToggleMenu={() => handleUiStateChange('activeMenuFeedbackId', uiState.activeMenuFeedbackId === item._id ? null : item._id)}
                                onEdit={() => handleEditFeedback(item)}
                                onDelete={() => handleDeleteFeedback(item._id)}
                                isExpanded={expandedFeedbackId === item._id}
                                onToggleExpand={() => handleToggleExpand(item._id)}
                            />
                        ))
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

const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    scrollContent: { paddingBottom: 120 },
    headerContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      borderBottomWidth: 1,
      borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      paddingBottom: 10,
    },
    headerIcon: { padding: 8 },
    headerLogo: { height: 35, width: 100, resizeMode: 'contain' },
    headerSpacer: { height: 90 }, // Space for the absolute positioned header
    
    welcomeCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 20,
      marginBottom: 30,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDarkMode ? 0.2 : 0.05,
      shadowRadius: 4,
    },
    welcomeTextContainer: { flex: 1 },
    welcomeTitle: { fontSize: 20, color: theme.textSecondary },
    welcomeName: { fontSize: 26, fontWeight: 'bold', color: theme.text },
    welcomeEmail: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    profilePic: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: theme.primary },
    
    section: { marginBottom: 30 },
    sectionHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
    scrollIndicator: { flexDirection: 'row', alignItems: 'center', opacity: 0.7 },
    scrollIndicatorText: { color: theme.textSecondary, fontStyle: 'italic', marginRight: 2 },
    
    horizontalScrollContainer: { paddingLeft: 20, paddingRight: 5, paddingBottom: 10 },
    accountCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      width: 160,
      padding: 15,
      marginRight: 15,
      borderWidth: 1,
      borderColor: theme.border,
    },
    accountCardIconContainer: {
      padding: 10,
      borderRadius: 12,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    accountCardInfo: {},
    accountCardLabel: { fontSize: 14, color: theme.textSecondary, marginBottom: 4 },
    accountCardValue: { fontSize: 16, fontWeight: '600', color: theme.text },
    
    noPlanCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    noPlanCardContent: { flex: 1, marginLeft: 15 },
    noPlanTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    noPlanSubtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    dashboardLoader: {
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 18,
      marginHorizontal: 20,
    },

    actionsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 15,
      marginHorizontal: 20,
    },
    actionButton: { alignItems: 'center', flex: 1 },
    actionText: { fontSize: 12, fontWeight: '600', color: theme.primary, marginTop: 8 },

    card: {
      backgroundColor: theme.surface,
      width: 280,
      borderRadius: 12,
      padding: 15,
      marginRight: 15,
      borderWidth: 1,
      borderColor: theme.border,
      position: 'relative',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 35, height: 35, borderRadius: 17.5 },
    name: { fontSize: 14, fontWeight: 'bold', color: theme.text },
    menuButton: { position: 'absolute', top: 8, right: 8, padding: 5, zIndex: 10 },
    popoverMenu: {
      position: 'absolute',
      top: 38,
      right: 8,
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 5,
      zIndex: 9,
    },
    popoverItem: { flexDirection: 'row', alignItems: 'center', padding: 12, width: 120 },
    popoverText: { fontSize: 14, color: theme.text, marginLeft: 10 },
    stars: { flexDirection: 'row', marginVertical: 8 },
    feedback: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
    seeMoreButton: {
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    seeMoreText: {
        color: theme.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    noFeedbackCard: {
      width: 280,
      height: 150,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    noFeedbackText: { color: theme.textSecondary, fontStyle: 'italic' },
    
    // --- Modals ---
    drawerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      flexDirection: 'row',
    },
    drawerBackdrop: {
      flex: 1,
    },
    drawerMenu: { marginTop: 30, paddingHorizontal: 10 },
    drawerContainer: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      elevation: 10,
      marginHorizontal: 25,
      marginVertical: 30,
      maxWidth: 320,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 10,
      width: '85%',
    },
    drawerHeader: {
      backgroundColor: theme.primary,
      borderBottomLeftRadius: 20,
      paddingBottom: 20,
      paddingHorizontal: 20,
      paddingTop: 40,
    },
    drawerBackIcon: {
      position: 'absolute',
      top: 20,
      left: 20,
      padding: 5,
    },
    drawerProfileSection: {marginTop: 35, paddingRight: 70},
    drawerUsername: { color: theme.textOnPrimary, fontSize: 15, fontWeight: 'bold' },
    drawerEmail: { color: theme.textOnPrimary, fontSize: 12, marginTop: 2, opacity: 0.9 },
    drawerProfileImage: {
      borderColor: theme.surface,
      borderRadius: 35,
      borderWidth: 2,
      height: 70,
      position: 'absolute',
      right: 20,
      top: 95,
      width: 70,
    },
    drawerMenuItem: {
      top: 25,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      flexDirection: 'row',
      marginBottom: 5,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    drawerMenuLabel: {
      color: theme.text, fontSize: 12, fontWeight: '400', marginLeft: 20 },
    drawerLogoutButton: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 12,
      elevation: 2,
      flexDirection: 'row',
      justifyContent: 'center',
      margin: 20,
      marginBottom: 30,
      marginLeft: 90,
      paddingVertical: 5,
    },
    drawerLogoutText: {
      color: theme.textOnPrimary, fontSize: 12, fontWeight: 'bold', marginLeft: 10 },
    confirmModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    confirmModalContent: {
      backgroundColor: theme.surface,
      borderRadius: 15,
      padding: 25,
      alignItems: 'center',
      width: '90%',
    },
    confirmModalImage: { width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 },
    confirmModalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 10, textAlign: 'center' },
    confirmModalDescription: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 30 },
    confirmModalButtonContainer: { flexDirection: 'row', gap: 10 },
    confirmModalCancelButton: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
      flex: 1,
      alignItems: 'center',
    },
    confirmModalCancelText: { color: theme.text, fontSize: 13 },
    confirmModalConfirmButton: {
      backgroundColor: theme.danger,
      borderRadius: 10,
      paddingVertical: 12,
      flex: 1,
      alignItems: 'center',
    },
    confirmModalConfirmText: { color: theme.textOnPrimary, fontSize: 13 },
    notificationBadge: {
      position: 'absolute',
      top: 5,
      right: 5,
      backgroundColor: theme.danger,
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: theme.surface,
    }
  });