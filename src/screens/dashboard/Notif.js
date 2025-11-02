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
  BackHandler,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { useTheme, useAlert, useAuth, useBanner } from '../../contexts';
import StatusDisplay from '../../components/StatusDisplay'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Import separated components ---
import NotificationItemComponent from './components/NotificationItemComponent.js';
import NotificationDetailModalComponent from './components/NotificationDetailModalComponent.js';

// --- Helpers ---
const NOTIFICATIONS_PER_PAGE = 20;

const Header = React.memo(({ isSelectionMode, onCancelSelection, selectedCount, onSelectAll, allSelected, onDelete, onMarkAllRead, onBackPress, dndEnabled, onToggleDnd }) => {
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
                        <TouchableOpacity onPress={onToggleDnd} style={styles.headerButton}>
                            <Ionicons name={dndEnabled ? "notifications-off-circle" : "notifications-circle-outline"} size={28} color={dndEnabled ? theme.primary : theme.text} />
                        </TouchableOpacity>
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
  const { showBanner } = useBanner(); 

  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingState, setLoadingState] = useState({ initial: true, refreshing: false, loadingMore: false });
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [dndEnabled, setDndEnabled] = useState(false);
  const notifiedIdsRef = useRef(new Set()); 

  const isLoadingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
        const loadDndSetting = async () => {
            try {
                const storedValue = await AsyncStorage.getItem('dnd_enabled');
                setDndEnabled(storedValue === 'true');
            } catch (error) {
                console.error("Failed to load DND setting:", error);
            }
        };
        loadDndSetting();
    }, [])
  );

  const handleToggleDnd = useCallback(async () => {
    const newValue = !dndEnabled;
    setDndEnabled(newValue);
    try {
      await AsyncStorage.setItem('dnd_enabled', String(newValue));
      showBanner('info', 'Settings Updated', newValue ? 'Sounds are silenced.' : 'Sounds are enabled.');
    } catch (error) {
      console.error('Failed to save DND setting:', error.message);
      setDndEnabled(prev => !prev); // Revert UI on failure
      showAlert('Error', 'Could not save your preference.');
    }
  }, [dndEnabled, showBanner, showAlert]);

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
                showBanner('success', 'Notifications Deleted', `${idsToDelete.length} notification(s) deleted successfully.`);
                try {
                    await api.post('/notifications/delete', { ids: idsToDelete });
                } catch (e) { 
                    showAlert('Error', 'Could not delete notifications. Restoring list.'); 
                    fetchNotifications(true);
                }
            }
        }
    ]);
  }, [selectedIds, api, showAlert, showBanner, fetchNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n._id);
    if (unreadIds.length === 0) { showBanner('success', 'All Caught Up!', 'You have no unread notifications.'); return; }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showBanner('success', 'Success', 'All notifications have been marked as read.');
    try {
      await api.post('/notifications/mark-read', { ids: unreadIds });
    } catch (e) { showAlert('Error', 'Could not mark all as read.'); }
  }, [notifications, api, showBanner, showAlert]);

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
        <Header onBackPress={() => navigation.goBack()} onMarkAllRead={handleMarkAllAsRead} dndEnabled={dndEnabled} onToggleDnd={handleToggleDnd}/>
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
        dndEnabled={dndEnabled}
        onToggleDnd={handleToggleDnd}
      />
      
      <SectionList
        sections={groupedNotifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <NotificationItemComponent 
            item={item} 
            onPress={() => handleItemTap(item)} 
            onLongPress={() => handleItemLongPress(item)} 
            isSelectionMode={isSelectionMode} 
            isSelected={selectedIds.has(item._id)} 
          />
        )}
        renderSectionHeader={({ section: { title } }) => <Text style={styles.sectionHeader}>{title}</Text>}
        ListEmptyComponent={<View style={styles.statusDisplayWrapper}><StatusDisplay illustration={require('../../assets/images/icons/no_notifications.png')} title="All Caught Up!" text="You have no new notifications right now."/></View>}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        stickySectionHeadersEnabled={false}
        onEndReached={() => { if (!loadingState.loadingMore && page < totalPages) fetchNotifications(false); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingState.loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} /> : null}
        refreshControl={<RefreshControl refreshing={loadingState.refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
      />
      
      <NotificationDetailModalComponent notification={selectedNotification} visible={isDetailModalVisible} onClose={() => setDetailModalVisible(false)} />
    </SafeAreaView>
  );
}

// --- Styles  ---
const getStyles = (theme) => {
  const isDarkMode = theme.background === '#000000';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statusDisplayWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: '20%' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 60, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.background },
    selectionHeader: { backgroundColor: isDarkMode ? theme.surface : `${theme.primary}1A` },
    headerLeft: { flex: 1, alignItems: 'flex-start' },
    headerCenter: { flex: 3, alignItems: 'center' },
    headerRight: { flex: 1, alignItems: 'flex-end' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerButton: { padding: 8, borderRadius: 20 },
    sectionHeader: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', paddingVertical: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  });
}