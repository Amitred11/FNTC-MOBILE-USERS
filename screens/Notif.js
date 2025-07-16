import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, SectionList,
  TouchableOpacity, BackHandler, ActivityIndicator,
  RefreshControl, Modal, ScrollView, Switch, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
// --- FIX: Centralized context imports and removed unused useProfile ---
import { useTheme, useAlert, useAuth, useMessage } from '../contexts';
import StatusDisplay from '../components/StatusDisplay';

// ... (Helper functions and components are unchanged)
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const notifDate = new Date(timestamp);
  const diffSeconds = Math.round((now - notifDate) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const NotificationItem = ({ item, onPress, onLongPress, theme, isSelectionMode, isSelected }) => {
    const styles = getStyles(theme);
    const iconMap = {
      payment: { name: 'wallet', color: theme.success },
      update: { name: 'arrow-up-circle', color: theme.accent },
      promo: { name: 'megaphone', color: theme.primary },
      warning: { name: 'alert-circle', color: theme.warning },
      error: { name: 'close-circle', color: theme.danger },
      chat: { name: 'chatbubbles', color: theme.primary },
      default: { name: 'notifications', color: theme.textSecondary },
    };
    const iconInfo = iconMap[item.type] || iconMap.default;
  
    return (
      <Animatable.View animation="fadeInUp" duration={400} useNativeDriver={true}>
        <TouchableOpacity style={[ styles.itemContainer, isSelected && styles.selectedItem ]} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8}>
          <View style={[styles.iconContainer, !item.read && { backgroundColor: `${iconInfo.color}20` }]}>
            <Ionicons name={iconInfo.name} size={24} color={!item.read ? iconInfo.color : theme.textSecondary} />
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
          </View>
          <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
          {isSelectionMode && (<Animatable.View animation="zoomIn" duration={200} style={styles.checkboxContainer}><Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={isSelected ? theme.primary : theme.border} /></Animatable.View>)}
        </TouchableOpacity>
      </Animatable.View>
    );
};
const NotificationDetailModal = ({ notification, visible, onClose, theme }) => {
    const styles = getStyles(theme);
    if (!notification) return null;
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={styles.modalContent}><Text style={styles.modalTitle}>{notification.title}</Text><ScrollView style={styles.modalScrollView}><Text style={styles.modalMessage}>{notification.message}</Text></ScrollView><Text style={styles.modalTimestamp}>{formatTimestamp(notification.createdAt)}</Text><TouchableOpacity style={styles.modalCloseButton} onPress={onClose}><Text style={styles.modalCloseButtonText}>Close</Text></TouchableOpacity></TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export default function NotificationScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  // --- FIX: Replaced `useProfile` with `useAuth` and aliased `user` to `profile` ---
  const { user: profile, api } = useAuth();
  const { showAlert } = useAlert();
  const { showMessage } = useMessage(); 
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // --- FIX: This logic is now correct because `profile` is the `user` object ---
  const notificationsEnabled = !!profile?.pushToken;

  useEffect(() => {
    const getDndStatus = async () => {
        const status = await AsyncStorage.getItem('dndEnabled');
        setDndEnabled(status === 'true');
    };
    getDndStatus();
  }, []);
  
  const toggleDnd = async () => {
    const newStatus = !dndEnabled;
    setDndEnabled(newStatus);
    await AsyncStorage.setItem('dndEnabled', newStatus.toString());
    showMessage(newStatus ? 'Do Not Disturb Enabled' : 'Do Not Disturb Disabled');
  };

  const fetchNotifications = useCallback(async (isInitial = true) => {
    if (isLoadingMore) return;
    if (isInitial) { setPage(1); setLoading(true); } 
    else { setIsLoadingMore(true); }

    if (!notificationsEnabled) {
      setNotifications([]); setLoading(false); return;
    }

    try {
      const targetPage = isInitial ? 1 : page + 1;
      const { data: response } = await api.get(`/notifications?page=${targetPage}&limit=20`);
      const responseData = response.data || []; // Ensure it's an array
      setTotalPages(response.pagination.totalPages);
      if (isInitial) {
        setNotifications(responseData);
      } else {
        setNotifications(prev => [...prev, ...responseData]);
      }
      if (!isInitial) setPage(targetPage);
    } catch (error) {
        if(isInitial) showAlert("Error", "Could not fetch notifications.", [{ text: "OK" }]);
    } finally {
      setLoading(false); setRefreshing(false); setIsLoadingMore(false);
    }
  }, [notificationsEnabled, api, showAlert, isLoadingMore, page]);

  useEffect(() => { if (isFocused) { fetchNotifications(true); } }, [isFocused, fetchNotifications]);
  
  // ... (rest of the component is unchanged and correct)
  useEffect(() => {
    const backAction = () => {
      if (isSelectionMode) { setIsSelectionMode(false); setSelectedIds(new Set()); return true; }
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation, isSelectionMode]);
  
  const onRefresh = () => { setRefreshing(true); fetchNotifications(true); };

  const handleItemTap = async (item) => {
    if (isSelectionMode) {
      const newSelectedIds = new Set(selectedIds);
      if (newSelectedIds.has(item._id)) { newSelectedIds.delete(item._id); } 
      else { newSelectedIds.add(item._id); }
      setSelectedIds(newSelectedIds);
      return;
    }
    
    if (!item.read) {
        setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, read: true } : n));
        try { await api.post('/notifications/mark-read', { ids: [item._id] }); }
        catch (error) { console.error("Failed to mark as read:", error); }
    }

    switch (item.type) {
        case 'payment': navigation.navigate('MyBills'); break;
        case 'update': navigation.navigate('Subscription'); break;
        case 'chat': navigation.navigate('LiveChatScreen'); break;
        default: setSelectedNotification(item); setDetailModalVisible(true); break;
    }
  };

  const handleItemLongPress = (item) => { setIsSelectionMode(true); setSelectedIds(new Set([item._id])); };
  const handleDeleteSelected = () => { const selectedCount = selectedIds.size; if (selectedCount === 0) return; showAlert( `Delete ${selectedCount} Notification(s)`, `Are you sure? This action cannot be undone.`, [ { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { try { await api.post('/notifications/delete', { ids: Array.from(selectedIds) }); setNotifications(prev => prev.filter(n => !selectedIds.has(n._id))); setIsSelectionMode(false); setSelectedIds(new Set()); showMessage(`${selectedCount} notification(s) deleted.`); } catch (error) { showAlert("Error", "Could not delete notifications.", [{ text: "OK" }]); } } } ] ); };
  const handleMarkAllAsRead = async () => { const unreadIds = notifications.filter(n => !n.read).map(n => n._id); if (unreadIds.length === 0) { showMessage("All Caught Up!", "No unread notifications."); return; } try { await api.post('/notifications/mark-read', { ids: unreadIds }); setNotifications(prev => prev.map(n => ({...n, read: true}))); showMessage("All notifications marked as read."); } catch (error) { showAlert("Error", "Could not mark all notifications as read.", [{ text: "OK" }]); } };
  const groupedNotifications = useMemo(() => { if (notifications.length === 0) return []; const unread = notifications.filter(n => !n.read); const read = notifications.filter(n => n.read); const sections = []; if (unread.length > 0) sections.push({ title: 'Unread', data: unread }); if (read.length > 0) sections.push({ title: 'All Notifications', data: read }); return sections; }, [notifications]);
  const renderHeader = () => { const selectedCount = selectedIds.size; if (isSelectionMode) { 
        const allSelected = notifications.length > 0 && selectedCount === notifications.length; }
  return ( 
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}><Ionicons name="arrow-back" size={26} color={theme.text} /></TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={styles.headerActions}>
                <Text style={styles.dndLabel}>DND</Text>
                <Switch value={dndEnabled} onValueChange={toggleDnd} trackColor={{ false: '#767577', true: theme.primary }} thumbColor={"#f4f3f4"} style={{ transform: [{ scaleX: .8 }, { scaleY: .8 }] }}/>
                <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerIcon}><Ionicons name="checkmark-done-outline" size={28} color={theme.text} /></TouchableOpacity>
            </View>
        </View> 
    ); 
  };
  if (loading) { return <SafeAreaView style={styles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View></SafeAreaView>; }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {!notificationsEnabled ? (
        <StatusDisplay illustration={require('../assets/images/notifications_disabled.png')} title="Notifications Disabled" text="Enable push notifications in settings to receive important updates." buttonText="Go to Settings" onButtonPress={() => navigation.navigate('Settings')} />
      ) : (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => ( <NotificationItem item={item} onPress={() => handleItemTap(item)} onLongPress={() => handleItemLongPress(item)} theme={theme} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(item._id)} /> )}
          renderSectionHeader={({ section: { title } }) => ( <Text style={styles.sectionHeader}>{title}</Text> )}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <StatusDisplay 
                illustration={require('../assets/images/no_notifications.png')} 
                title="All Caught Up!" 
                text="You have no new notifications right now." 
              />
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          stickySectionHeadersEnabled={false}
          onEndReached={() => { if (page < totalPages) fetchNotifications(false); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isLoadingMore && <ActivityIndicator style={{margin: 20}} color={theme.primary}/>}
          refreshControl={ <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} /> }
        />
      )}
      <NotificationDetailModal notification={selectedNotification} visible={isDetailModalVisible} onClose={() => setDetailModalVisible(false)} theme={theme} />
    </SafeAreaView>
  );
}

// Styles are unchanged
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: theme.surface, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.border },
    headerIcon: { padding: 5 },
    headerTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    headerActionText: { color: theme.primary, fontSize: 16, fontWeight: '600' },
    dndLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: '500' },
    itemContainer: { backgroundColor: theme.surface, flexDirection: 'row', padding: 16, alignItems: 'center' },
    selectedItem: { backgroundColor: `${theme.primary}20` },
    iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16, position: 'relative' },
    unreadDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.primary, position: 'absolute', top: -2, right: -2, borderWidth: 2, borderColor: theme.surface },
    textContainer: { flex: 1 },
    title: { fontSize: 16, color: theme.text, fontWeight: '500' },
    unreadTitle: { fontWeight: 'bold' },
    message: { fontSize: 14, color: theme.textSecondary, marginTop: 4, lineHeight: 20 },
    timestamp: { fontSize: 12, color: theme.textSecondary, alignSelf: 'flex-start', marginLeft: 10 },
    checkboxContainer: { marginLeft: 'auto', paddingLeft: 10 },
    separator: { height: 1, backgroundColor: theme.border, marginLeft: 80 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    enableButton: { marginTop: 25, backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
    enableButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { width: '90%', maxHeight: '70%', backgroundColor: theme.surface, borderRadius: 15, padding: 20, elevation: 10, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 15, textAlign: 'center' },
    modalScrollView: { marginVertical: 10, width: '100%' },
    modalMessage: { fontSize: 16, color: theme.textSecondary, lineHeight: 24 },
    modalTimestamp: { fontSize: 12, color: theme.textSecondary, opacity: 0.8, marginTop: 15, alignSelf: 'flex-end' },
    modalCloseButton: { backgroundColor: theme.primary, borderRadius: 8, padding: 12, marginTop: 20, alignItems: 'center', width: '100%' },
    modalCloseButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    sectionHeader: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, backgroundColor: theme.background, paddingHorizontal: 16, paddingVertical: 8, paddingTop: 20, textTransform: 'uppercase' },
    emptyListContainer: {
      flex: 1,
      marginTop: 50, // Give it some space from the header
      alignItems: 'center',
      justifyContent: 'center',
    },
});