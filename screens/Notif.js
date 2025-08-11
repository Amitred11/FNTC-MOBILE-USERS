// screens/NotificationScreen.js (Refactored & Fixed)

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  BackHandler,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { useTheme, useAlert, useAuth, useMessage } from '../contexts';
import StatusDisplay from '../components/StatusDisplay'; // Make sure this path is correct

// --- Constants & Helpers ---
const NOTIFICATIONS_PER_PAGE = 20;

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const now = new Date();
  const notifDate = new Date(timestamp);
  const diffSeconds = Math.round((now - notifDate) / 1000);
  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// This ICON_MAP is fine, as it relies on properties that exist in the theme
const ICON_MAP = (theme) => ({
    payment: { name: 'wallet-outline', color: theme.success },
    billing: { name: 'receipt-outline', color: theme.success },
    billing_error: { name: 'alert-circle-outline', color: theme.warning },
    subscription_activation: { name: 'sparkles-outline', color: theme.primary },
    subscription_decline: { name: 'close-circle-outline', color: theme.danger },
    ticket: { name: 'chatbox-ellipses-outline', color: theme.info },
    ticket_update: { name: 'chatbox-ellipses-outline', color: theme.info },
    chat: { name: 'chatbubbles-outline', color: theme.info },
    promo: { name: 'megaphone-outline', color: theme.accent },
    warning: { name: 'warning-outline', color: theme.warning },
    default: { name: 'notifications-outline', color: theme.textSecondary },
});

// --- Sub-Components (No changes needed here) ---
const NotificationItem = React.memo(({ item, onPress, onLongPress, isSelectionMode, isSelected }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const iconInfo = ICON_MAP(theme)[item.type] || ICON_MAP(theme).default;
    const itemContainerStyle = [
      styles.cardContainer,
      !item.read && styles.unreadCard,
      isSelected && styles.selectedItem
    ];
    
    return (
        <Animatable.View animation="fadeInUp" duration={500} useNativeDriver={true}>
            <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8} style={itemContainerStyle}>
                <View style={[styles.iconContainer, { backgroundColor: `${iconInfo.color}20` }]}>
                    <Ionicons name={iconInfo.name} size={24} color={iconInfo.color} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, !item.read && styles.unreadTitle]} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
                </View>
                {isSelectionMode && (
                    <Animatable.View animation="zoomIn" duration={200} style={styles.checkboxContainer}>
                        <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={isSelected ? theme.primary : theme.border} />
                    </Animatable.View>
                )}
            </TouchableOpacity>
        </Animatable.View>
    );
});

const NotificationDetailModal = React.memo(({ notification, visible, onClose }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    if (!notification) return null;

    const iconInfo = ICON_MAP(theme)[notification.type] || ICON_MAP(theme).default;

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="slideInUp" duration={400} style={styles.modalContent}>
                       <TouchableWithoutFeedback>
                            <View style={{width: '100%'}}>
                                <View style={styles.gripper} />
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalIconContainer, {backgroundColor: `${iconInfo.color}20`}]}>
                                         <Ionicons name={iconInfo.name} size={30} color={iconInfo.color} />
                                    </View>
                                    <Text style={styles.modalTitle}>{notification.title}</Text>
                                </View>
                                <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                                    <Text style={styles.modalMessage}>{notification.message}</Text>
                                </ScrollView>
                                <Text style={styles.modalTimestamp}>{`Received ${formatTimestamp(notification.createdAt)}`}</Text>
                                <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                                    <Text style={styles.modalCloseButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                       </TouchableWithoutFeedback>
                    </Animatable.View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

const Header = React.memo(({ isSelectionMode, onCancelSelection, selectedCount, onSelectAll, allSelected, onDelete, onMarkAllRead, onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={[styles.header, isSelectionMode && styles.selectionHeader]}>
            <View style={styles.headerLeft}>
                <TouchableOpacity onPress={isSelectionMode ? onCancelSelection : onBackPress} style={styles.headerButton}>
                    <Animatable.View animation="fadeIn" duration={300} key={isSelectionMode ? 'close' : 'back'}>
                        <Ionicons name={isSelectionMode ? "close" : "arrow-back"} size={28} color={isSelectionMode ? theme.primary : theme.text} />
                    </Animatable.View>
                </TouchableOpacity>
            </View>
            
            <View style={styles.headerCenter}>
                 <Animatable.Text animation="fadeIn" duration={300} key={isSelectionMode ? `sel-${selectedCount}` : 'title'} style={styles.headerTitle}>
                    {isSelectionMode ? `${selectedCount} Selected` : 'Notifications'}
                </Animatable.Text>
            </View>

            <View style={styles.headerRight}>
                {isSelectionMode ? (
                    <Animatable.View animation="fadeIn" duration={300} style={styles.headerActions}>
                        <TouchableOpacity onPress={onSelectAll} style={styles.headerButton}>
                            <Ionicons name={allSelected ? 'checkbox' : 'square-outline'} size={24} color={theme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onDelete} disabled={selectedCount === 0} style={styles.headerButton}>
                            <Ionicons name="trash-outline" size={26} color={selectedCount === 0 ? theme.disabled : theme.danger} />
                        </TouchableOpacity>
                    </Animatable.View>
                ) : (
                    <Animatable.View animation="fadeIn" duration={300} style={styles.headerActions}>
                        <TouchableOpacity onPress={onMarkAllRead} style={styles.headerButton}>
                            <Ionicons name="checkmark-done-outline" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </Animatable.View>
                )}
            </View>
        </View>
    );
});

export default function NotificationScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user: profile, api } = useAuth();
  const { showAlert } = useAlert();
  const { showMessage } = useMessage(); 

  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingState, setLoadingState] = useState({ initial: true, refreshing: false, loadingMore: false });
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const isLoadingRef = useRef(false);

  const fetchNotifications = useCallback(async (isInitial = true, isRefreshing = false) => {
    if (isLoadingRef.current) return;

    let shouldFetch = true;
    let nextPage = 1;
    setPage(currentVal => {
        nextPage = (isInitial || isRefreshing) ? 1 : currentVal + 1;
        setTotalPages(currentTotal => {
            if (!isInitial && !isRefreshing && nextPage > currentTotal) {
                shouldFetch = false;
            }
            return currentTotal;
        });
        return nextPage;
    });

    if (!shouldFetch) return;

    isLoadingRef.current = true;
    setLoadingState({ initial: isInitial, refreshing: isRefreshing, loadingMore: !isInitial && !isRefreshing });

    try {
        const { data: response } = await api.get(`/notifications?page=${nextPage}&limit=${NOTIFICATIONS_PER_PAGE}`);
        const newNotifications = response.data || [];
        
        setTotalPages(response.pagination?.totalPages || 1);

        if (isInitial || isRefreshing) {
            setNotifications(newNotifications);
        } else {
            // Use functional update for appending to avoid needing 'notifications' in deps
            setNotifications(prev => [...prev, ...newNotifications]);
        }
    } catch (error) {
        if (isInitial) showAlert('Error', 'Could not fetch notifications.');
    } finally {
        isLoadingRef.current = false;
        setLoadingState({ initial: false, refreshing: false, loadingMore: false });
    }
  }, [api, showAlert]);

  useFocusEffect(useCallback(() => {
    fetchNotifications(true);
  }, []));

  useEffect(() => {
    const backAction = () => {
      if (isDetailModalVisible) { setDetailModalVisible(false); return true; }
      if (isSelectionMode) { setIsSelectionMode(false); setSelectedIds(new Set()); return true; }
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation, isSelectionMode, isDetailModalVisible]);

  // This is now stable because its dependency (fetchNotifications) is stable
  const onRefresh = useCallback(() => {
    if (isSelectionMode) return;
    fetchNotifications(true, true);
  }, [fetchNotifications, isSelectionMode]);

  const handleItemTap = useCallback(async (item) => {
    if (isSelectionMode) {
      setSelectedIds(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(item._id)) newSelected.delete(item._id);
        else newSelected.add(item._id);
        return newSelected;
      });
      return;
    }

    if (!item.read) {
      setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, read: true } : n));
      try { await api.post('/notifications/mark-read', { ids: [item._id] }); } catch (e) { /* silent fail, UI already updated */ }
    }

    setSelectedNotification(item);
    setDetailModalVisible(true);
  }, [isSelectionMode, api]);
  
  const handleItemLongPress = useCallback((item) => {
    if (isSelectionMode) return;
    setIsSelectionMode(true);
    setSelectedIds(new Set([item._id]));
  }, [isSelectionMode]);
  
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === notifications.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(notifications.map(n => n._id)));
  }, [selectedIds, notifications]);

  const handleDeleteSelected = useCallback(() => {
    showAlert(`Delete ${selectedIds.size} Notification(s)`, 'Are you sure? This action cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive',
            onPress: async () => {
                const idsToDelete = Array.from(selectedIds);
                setIsSelectionMode(false);
                setSelectedIds(new Set());
                setNotifications(prev => prev.filter(n => !idsToDelete.includes(n._id)));
                showMessage(`${idsToDelete.length} notification(s) deleted.`);
                try {
                    await api.post('/notifications/delete', { ids: idsToDelete });
                } catch (e) { 
                    showAlert('Error', 'Could not delete notifications. Restoring list.'); 
                    fetchNotifications(true);
                }
            }
        }
    ]);
  }, [selectedIds, api, showAlert, showMessage, fetchNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
    if (unreadIds.length === 0) { showMessage('All caught up!'); return; }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showMessage('All notifications marked as read.');
    try {
      await api.post('/notifications/mark-read', { ids: unreadIds });
    } catch (e) { showAlert('Error', 'Could not mark all as read.'); }
  }, [notifications, api, showMessage, showAlert]);

  const groupedNotifications = useMemo(() => {
    const today = [];
    const thisWeek = [];
    const earlier = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - now.getDay());

    notifications.forEach(n => {
        const notifDate = new Date(n.createdAt);
        if (notifDate >= startOfToday) today.push(n);
        else if (notifDate >= startOfWeek) thisWeek.push(n);
        else earlier.push(n);
    });

    const sections = [];
    if (today.length > 0) sections.push({ title: 'Today', data: today });
    if (thisWeek.length > 0) sections.push({ title: 'This Week', data: thisWeek });
    if (earlier.length > 0) sections.push({ title: 'Earlier', data: earlier });
    return sections;
  }, [notifications]);
  
  if (loadingState.initial) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBackPress={() => navigation.goBack()} onMarkAllRead={handleMarkAllAsRead} />
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        isSelectionMode={isSelectionMode}
        onCancelSelection={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
        selectedCount={selectedIds.size}
        onSelectAll={handleSelectAll}
        allSelected={notifications.length > 0 && selectedIds.size === notifications.length}
        onDelete={handleDeleteSelected}
        onMarkAllRead={handleMarkAllAsRead}
        onBackPress={() => navigation.goBack()}
      />
      
      {profile && !profile.pushToken ? (
        <View style={styles.statusDisplayWrapper}>
            <StatusDisplay 
                illustration={require('../assets/images/notifications_disabled.png')} 
                title="Notifications Disabled" 
                text="Enable push notifications in your device settings to receive important updates." 
                buttonText="Go to App Settings" 
                onButtonPress={() => Linking.openSettings()} 
            />
        </View>
      ) : (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <NotificationItem item={item} onPress={() => handleItemTap(item)} onLongPress={() => handleItemLongPress(item)} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item._id)} />}
          renderSectionHeader={({ section: { title } }) => <Text style={styles.sectionHeader}>{title}</Text>}
          ListEmptyComponent={<View style={styles.statusDisplayWrapper}><StatusDisplay illustration={require('../assets/images/no_notifications.png')} title="All Caught Up!" text="You have no new notifications right now." /></View>}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          stickySectionHeadersEnabled={false}
          onEndReached={() => { if (!loadingState.loadingMore && page < totalPages) fetchNotifications(false); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingState.loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} /> : null}
          refreshControl={<RefreshControl refreshing={loadingState.refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        />
      )}
      <NotificationDetailModal notification={selectedNotification} visible={isDetailModalVisible} onClose={() => setDetailModalVisible(false)} />
    </SafeAreaView>
  );
}

// --- Styles (Fixed) ---
const getStyles = (theme) => {
  const isDarkMode = theme.background === '#000000';
  const shadowColor = '#000000';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statusDisplayWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: '20%' },

    // --- Header ---
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 60, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.background },
    selectionHeader: { backgroundColor: isDarkMode ? theme.surface : `${theme.primary}1A` },
    headerLeft: { flex: 1, alignItems: 'flex-start' },
    headerCenter: { flex: 3, alignItems: 'center' },
    headerRight: { flex: 1, alignItems: 'flex-end' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerButton: { padding: 8, borderRadius: 20 },

    // --- List ---
    sectionHeader: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', paddingVertical: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
    
    // --- Notification Item Card ---
    cardContainer: {
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        boxShadow: `0 2px 4px rgba(0, 0, 0, 0.5)`,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    // Use the inferred 'isDarkMode' boolean here
    unreadCard: {
        backgroundColor: isDarkMode ? theme.surface : '#ffffff',
        borderColor: isDarkMode ? `${theme.primary}80` : `${theme.primary}50`,
    },
    selectedItem: {
        borderColor: theme.primary,
        borderWidth: 2,
        transform: [{ scale: 1.02 }],
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.text,
        marginBottom: 4,
    },
    unreadTitle: {
        fontWeight: 'bold',
    },
    message: {
        fontSize: 14,
        color: theme.textSecondary,
        lineHeight: 20,
        marginBottom: 8,
    },
    timestamp: {
        fontSize: 12,
        color: theme.textSecondary,
        fontWeight: '500',
    },
    checkboxContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    
    // --- Modal ---
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingTop: 12, maxHeight: '85%', elevation: 10 },
    gripper: { width: 40, height: 5, backgroundColor: theme.border, borderRadius: 2.5, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { alignItems: 'center', marginBottom: 20 },
    modalIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    modalScrollView: { maxHeight: '60%', marginBottom: 16 },
    modalMessage: { fontSize: 16, color: theme.textSecondary, lineHeight: 24, textAlign: 'center' },
    modalTimestamp: { fontSize: 13, color: theme.textSecondary, opacity: 0.8, textAlign: 'center', marginVertical: 16 },
    modalCloseButton: { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    modalCloseButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
  });
}