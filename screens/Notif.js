import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

const ICON_MAP = (theme) => ({
    payment: { name: 'wallet', color: theme.success },
    update: { name: 'arrow-up-circle', color: theme.accent },
    promo: { name: 'megaphone', color: theme.primary },
    warning: { name: 'alert-circle', color: theme.warning },
    error: { name: 'close-circle', color: theme.danger },
    chat: { name: 'chatbubbles', color: theme.info },
    default: { name: 'notifications', color: theme.textSecondary },
});

// --- Sub-Components (Memoized for Performance) ---
const NotificationItem = React.memo(({ item, onPress, onLongPress, isSelectionMode, isSelected }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const iconInfo = ICON_MAP(theme)[item.type] || ICON_MAP(theme).default;

    return (
        <Animatable.View animation="fadeInUp" duration={400} useNativeDriver={true}>
            <TouchableOpacity 
                style={[styles.cardContainer, isSelected && styles.selectedItem]} 
                onPress={onPress} 
                onLongPress={onLongPress} 
                activeOpacity={0.9}
            >
                <View style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: `${iconInfo.color}20` }]}>
                        <Ionicons name={iconInfo.name} size={22} color={iconInfo.color} />
                    </View>
                    <View style={styles.textContainer}>
                        <View style={styles.titleRow}>
                            <View style={styles.titleWrapper}>
                                {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
                                <Text style={[styles.title, !item.read && styles.unreadTitle]} numberOfLines={1}>{item.title}</Text>
                            </View>
                            <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    </View>
                </View>
                {isSelectionMode && (
                    <Animatable.View animation="zoomIn" duration={200} style={styles.checkboxContainer}>
                        <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={isSelected ? theme.primary : theme.border} />
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
                                         <Ionicons name={iconInfo.name} size={24} color={iconInfo.color} />
                                    </View>
                                    <Text style={styles.modalTitle}>{notification.title}</Text>
                                </View>
                                <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                                    <Text style={styles.modalMessage}>{notification.message}</Text>
                                </ScrollView>
                                <Text style={styles.modalTimestamp}>{`Received ${formatTimestamp(notification.createdAt)}`}</Text>
                                <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                                    <Text style={styles.modalCloseButtonText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                       </TouchableWithoutFeedback>
                    </Animatable.View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

const Header = React.memo(({ isSelectionMode, onCancelSelection, selectedCount, onSelectAll, allSelected, onDelete, onMarkAllRead, onToggleDnd, dndEnabled, onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={[styles.header, isSelectionMode && styles.selectionHeader]}>
            <View style={styles.headerLeft}>
                {isSelectionMode ? (
                    <Animatable.View animation="fadeIn" duration={300}>
                         <TouchableOpacity onPress={onCancelSelection} style={styles.headerIcon}>
                            <Ionicons name="close" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </Animatable.View>
                ) : (
                    <Animatable.View animation="fadeIn" duration={300}>
                        <TouchableOpacity onPress={onBackPress} style={styles.headerIcon}>
                            <Ionicons name="arrow-back" size={26} color={theme.text} />
                        </TouchableOpacity>
                    </Animatable.View>
                )}
            </View>
            
            <View style={styles.headerCenter}>
                {isSelectionMode ? (
                     <Animatable.Text animation="fadeIn" duration={300} style={styles.headerTitle}>{selectedCount} Selected</Animatable.Text>
                ) : (
                     <Animatable.Text animation="fadeIn" duration={300} style={styles.headerTitle}>Notifications</Animatable.Text>
                )}
            </View>

            <View style={styles.headerRight}>
                {isSelectionMode ? (
                    <Animatable.View animation="fadeIn" duration={300} style={styles.headerActions}>
                        <TouchableOpacity onPress={onSelectAll} style={styles.headerIcon}>
                            <Ionicons name={allSelected ? 'checkbox' : 'square-outline'} size={24} color={theme.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onDelete} disabled={selectedCount === 0} style={styles.headerIcon}>
                            <Ionicons name="trash-outline" size={26} color={selectedCount === 0 ? theme.disabled : theme.danger} />
                        </TouchableOpacity>
                    </Animatable.View>
                ) : (
                    <Animatable.View animation="fadeIn" duration={300} style={styles.headerActions}>
                        <TouchableOpacity onPress={onToggleDnd} style={styles.headerIcon}>
                            <Ionicons name={dndEnabled ? "notifications-outline" : "notifications-off-outline"} size={26} color={dndEnabled ? theme.primary : theme.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onMarkAllRead} style={styles.headerIcon}>
                            <Ionicons name="mail-unread-outline" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </Animatable.View>
                )}
            </View>
        </View>
    );
});


// --- Main Screen Component ---
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
  const [dndEnabled, setDndEnabled] = useState(profile?.dndEnabled || false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingState, setLoadingState] = useState({ initial: true, refreshing: false, loadingMore: false });
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  useEffect(() => { setDndEnabled(profile?.dndEnabled || false); }, [profile]);

  const fetchNotifications = useCallback(async (isInitial = true, isRefreshing = false) => {
    const isCurrentlyLoadingMore = loadingState.loadingMore;
    const currentRequestPage = (isInitial || isRefreshing) ? 1 : page + 1;
    if (isCurrentlyLoadingMore || (!isInitial && !isRefreshing && currentRequestPage > totalPages)) return;
    
    setLoadingState(prev => ({ ...prev, initial: isInitial, refreshing: isRefreshing, loadingMore: !isInitial && !isRefreshing }));

    try {
        const { data: response } = await api.get(`/notifications?page=${currentRequestPage}&limit=${NOTIFICATIONS_PER_PAGE}`);
        const newNotifications = response.data || [];
        setTotalPages(response.pagination?.totalPages || 1);
        if (isInitial || isRefreshing) {
            setNotifications(newNotifications);
        } else {
            setNotifications(prev => [...prev, ...newNotifications]);
        }
        setPage(currentRequestPage);
    } catch (error) {
        if (isInitial) showAlert('Error', 'Could not fetch notifications.');
    } finally {
        setLoadingState({ initial: false, refreshing: false, loadingMore: false });
    }
  }, [api, showAlert, loadingState.loadingMore, page, totalPages]);
  
  useFocusEffect(useCallback(() => { fetchNotifications(true); }, [fetchNotifications]));

  useEffect(() => {
    const backAction = () => {
      if (isSelectionMode) { setIsSelectionMode(false); setSelectedIds(new Set()); return true; }
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation, isSelectionMode]);

  const onRefresh = useCallback(() => { fetchNotifications(true, true); }, [fetchNotifications]);

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
    setIsSelectionMode(true);
    setSelectedIds(new Set([item._id]));
  }, []);
  
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
    if (unreadIds.length === 0) { showMessage('No unread notifications.'); return; }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showMessage('All notifications marked as read.');
    try {
      await api.post('/notifications/mark-read', { ids: unreadIds });
    } catch (e) { showAlert('Error', 'Could not mark all as read.'); }
  }, [notifications, api, showMessage, showAlert]);

  const toggleDnd = useCallback(async () => {
    const newStatus = !dndEnabled;
    setDndEnabled(newStatus);
    showMessage(newStatus ? 'Do Not Disturb Enabled' : 'Do Not Disturb Disabled');
    try {
      await api.put('/users/dnd-status', { dndEnabled: newStatus });
    } catch (e) {
      showAlert('Error', 'Could not update DND status.');
      setDndEnabled(!newStatus);
    }
  }, [dndEnabled, api, showMessage, showAlert]);

  const groupedNotifications = useMemo(() => {
    const unread = notifications.filter((n) => !n.read);
    const read = notifications.filter((n) => n.read);
    const sections = [];
    if (unread.length > 0) sections.push({ title: 'New', data: unread });
    if (read.length > 0) sections.push({ title: 'Earlier', data: read });
    return sections;
  }, [notifications]);
  
  if (loadingState.initial) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBackPress={() => navigation.goBack()} dndEnabled={dndEnabled} onToggleDnd={toggleDnd} onMarkAllRead={handleMarkAllAsRead} />
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
        onToggleDnd={toggleDnd}
        dndEnabled={dndEnabled}
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
          contentContainerStyle={{ paddingVertical: 8 }}
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

// --- Styles ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statusDisplayWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: '20%' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 60, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    selectionHeader: { backgroundColor: theme.isDarkMode ? '#2c3e50' : '#eaf2f8' },
    headerLeft: { flex: 1, alignItems: 'flex-start' },
    headerCenter: { flex: 2, alignItems: 'center' },
    headerRight: { flex: 1, alignItems: 'flex-end' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: theme.text },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    headerIcon: { padding: 4 },
    
    sectionHeader: { color: theme.textSecondary, fontSize: 13, fontWeight: 'bold', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    
    cardContainer: {
        backgroundColor: theme.surface,
        borderRadius: 12,
        marginVertical: 6,
        marginHorizontal: 16,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedItem: {
        borderColor: theme.primary,
        borderWidth: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    titleWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: 8,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
        alignSelf: 'center',
    },
    title: {
        fontSize: 16,
        color: theme.text,
        fontWeight: '500',
    },
    unreadTitle: {
        fontWeight: 'bold',
        color: theme.text,
    },
    message: {
        fontSize: 14,
        color: theme.textSecondary,
        lineHeight: 20,
    },
    timestamp: {
        fontSize: 12,
        color: theme.textSecondary,
        fontWeight: '400',
        paddingTop: 2,
    },
    checkboxContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 26,
        height: 26,
        backgroundColor: theme.surface,
        borderRadius: 13,
    },
    
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%', elevation: 10 },
    gripper: { width: 40, height: 5, backgroundColor: theme.border, borderRadius: 2.5, alignSelf: 'center', marginBottom: 12 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    modalIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    modalTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: theme.text },
    modalScrollView: { maxHeight: '60%', marginBottom: 16 },
    modalMessage: { fontSize: 16, color: theme.textSecondary, lineHeight: 24 },
    modalTimestamp: { fontSize: 12, color: theme.textSecondary, opacity: 0.8, textAlign: 'center', marginBottom: 16 },
    modalCloseButton: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    modalCloseButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
  });