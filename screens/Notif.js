import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, BackHandler, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, database } from '../config/firebaseConfig';
import { ref, onValue, update, remove } from 'firebase/database';
import { useTheme } from '../contexts/ThemeContext';

// --- Helper function to format timestamp ---
function formatTimestamp(timestamp) {
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
  return notifDate.toLocaleDateString();
}

// --- Reusable Component (Supports selection state) ---
const NotificationItem = ({ item, onPress, onLongPress, theme, isSelectionMode, isSelected }) => {
  const styles = getStyles(theme);
  const iconMap = {
    payment: 'wallet-outline',
    update: 'arrow-up-circle-outline',
    promo: 'megaphone-outline',
    default: 'notifications-outline',
  };

  return (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        !item.read && styles.unreadItem,
        isSelected && styles.selectedItem,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {isSelectionMode && (
        <View style={styles.checkboxContainer}>
          <Ionicons
            name={isSelected ? 'checkbox' : 'square-outline'}
            size={24}
            color={isSelected ? theme.primary : theme.textSecondary}
          />
        </View>
      )}
      <Ionicons
        name={iconMap[item.type] || iconMap.default}
        size={28}
        color={!item.read ? theme.primary : theme.textSecondary}
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function NotificationScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const notificationsRef = ref(database, `notifications/${currentUser.uid}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notificationList = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(notificationList);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (isSelectionMode) {
        handleCancelSelection();
        return true;
      }
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation, isSelectionMode]);

  const handleLongPress = (id) => {
    setIsSelectionMode(true);
    setSelectedIds([id]);
  };

  const handleItemTap = (id) => {
    if (!isSelectionMode) {
      handleMarkAsRead(id);
      return;
    }
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id];
    setSelectedIds(newSelectedIds);
    if (newSelectedIds.length === 0) {
      setIsSelectionMode(false);
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Delete Notifications",
      `Are you sure you want to delete ${selectedIds.length} notification(s)? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            const updates = {};
            selectedIds.forEach(id => {
              updates[`/notifications/${currentUser.uid}/${id}`] = null;
            });
            try {
              await update(ref(database), updates);
              handleCancelSelection();
            } catch (error) {
              Alert.alert("Error", "Could not delete notifications. Please try again.");
            }
          },
          style: "destructive" 
        }
      ]
    );
  };

  const handleMarkAsRead = (id) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const notificationRef = ref(database, `notifications/${currentUser.uid}/${id}`);
    update(notificationRef, { read: true });
  };
  
  const handleMarkAllAsRead = () => {
    const currentUser = auth.currentUser;
    if (!currentUser || notifications.length === 0) return;
    const updates = {};
    notifications.forEach(notif => {
      if (!notif.read) {
        updates[`/notifications/${currentUser.uid}/${notif.id}/read`] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      update(ref(database), updates);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const renderHeader = () => {
    if (isSelectionMode) {
      const allSelected = selectedIds.length === notifications.length && notifications.length > 0;
      return (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancelSelection} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={theme.textOnPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{`${selectedIds.length} Selected`}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSelectAll} style={styles.headerButton}>
              <Ionicons name={allSelected ? "checkbox" : "checkbox-outline"} size={26} color={theme.textOnPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteSelected} style={[styles.headerButton, selectedIds.length === 0 && { opacity: 0.5 }]} disabled={selectedIds.length === 0}>
              <Ionicons name="trash-outline" size={26} color={theme.textOnPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            item={item}
            onPress={() => handleItemTap(item.id)}
            onLongPress={() => handleLongPress(item.id)}
            theme={theme}
            isSelectionMode={isSelectionMode}
            isSelected={selectedIds.includes(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={80} color={theme.disabled} />
            <Text style={styles.emptyText}>You're all caught up!</Text>
            <Text style={styles.emptySubText}>No new notifications right now.</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
        extraData={selectedIds}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  header: {
    backgroundColor: theme.primary,
    paddingTop: 55, paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  backButton: { position: 'absolute', left: 16, bottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: theme.textOnPrimary },
  markAllButton: { position: 'absolute', right: 16, bottom: 22 },
  markAllText: { color: theme.textOnPrimary, fontSize: 13, fontWeight: '500', opacity: 0.9 },
  headerButton: { paddingHorizontal: 10 },
  headerActions: { flexDirection: 'row', position: 'absolute', right: 16, bottom: 20 },
  itemContainer: {
    backgroundColor: theme.surface,
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    alignItems: 'center',
  },
  unreadItem: { backgroundColor: theme.isDarkMode ? '#003e39' : '#003e39' },
  selectedItem: { backgroundColor: theme.isDarkMode ? '#004D40' : '#003e39' },
  checkboxContainer: { marginRight: 15 },
  icon: { marginRight: 16 },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: 'bold', color: theme.text },
  unreadTitle: { color: theme.primary },
  message: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
  timestamp: { fontSize: 12, color: theme.textSecondary, opacity: 0.8, marginTop: 8 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary, marginLeft: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: theme.textSecondary, marginTop: 16 },
  emptySubText: { fontSize: 15, color: theme.textSecondary, opacity: 0.8, marginTop: 8 },
});