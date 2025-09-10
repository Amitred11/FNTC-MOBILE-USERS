// screens/TicketListScreen.js
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Image,
  FlatList
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';

import { useTheme, useAuth, useMessage, useAlert } from '../../contexts';

// --- TICKET COMPONENTS ---
const TicketListItem = ({ item, onView, onDelete }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const statusColors = {
      Open: theme.success,
      'In Progress': theme.warning,
      Resolved: theme.primary,
      Closed: theme.textSecondary,
    };
    const renderRightActions = () => (
      <TouchableOpacity onPress={onDelete} style={styles.deleteAction}>
        <Ionicons name="trash" size={24} color="#FFF" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
    return (
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity style={styles.ticketItem} onPress={onView} activeOpacity={0.8}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.ticketSubject} numberOfLines={1}>{item.subject}</Text>
            <Text style={styles.ticketDate}>Last updated: {new Date(item.updatedAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: statusColors[item.status] || theme.disabled }]}>
            <Text style={styles.statusTagText}>{item.status}</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
};
  
const TicketListScreen = forwardRef(({ onCreate, isRefreshing, onRefresh }, ref) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { api } = useAuth();
    const { showMessage } = useMessage();
    const isFocused = useIsFocused();
    const { showAlert } = useAlert();
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [isDetailVisible, setDetailVisible] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
    const fetchTickets = useCallback(
      async (isInitial = true) => {
        const targetPage = isInitial ? 1 : page + 1;
        if (isInitial) {
          setIsLoading(true);
          setPage(1);
        } else {
          setIsFetchingMore(true);
        }
        try {
          const { data } = await api.get(`/support/tickets?page=${targetPage}&limit=20`);
          setTickets((prev) => (isInitial ? data.data : [...prev, ...data.data]));
          setTotalPages(data.pagination.totalPages);
          if (!isInitial) setPage(targetPage);
        } catch (error) {
          if (isInitial) setTickets([]);
          showMessage('Could not fetch tickets.');
        } finally {
          setIsLoading(false);
          setIsFetchingMore(false);
        }
      },
      [api, page]
    );
  
    useEffect(() => {
      if (isFocused) {
        fetchTickets(true);
      }
    }, [isFocused]); // Removed fetchTickets from deps to avoid loop with `page`
  
    useImperativeHandle(ref, () => ({
      refresh: () => fetchTickets(true),
    }));
  
    const handleLoadMore = () => {
      if (!isFetchingMore && page < totalPages) {
        fetchTickets(false);
      }
    };
  
    const handleViewTicket = async (ticketId) => {
      setSelectedTicket(null);
      setIsLoadingDetail(true);
      setDetailVisible(true);
      try {
        const { data } = await api.get(`/support/tickets/${ticketId}`);
        setSelectedTicket(data);
      } catch (error) {
        showAlert('Error', 'Could not load ticket details.');
        setDetailVisible(false);
      } finally {
        setIsLoadingDetail(false);
      }
    };
  
    const handleCloseTicket = () => {
      showAlert('Close Ticket', 'Are you sure you want to close this ticket?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Close It',
          onPress: async () => {
            if (!selectedTicket?._id) return;
            try {
              const { data } = await api.post(`/support/tickets/${selectedTicket._id}/close`);
              setSelectedTicket(data.ticket);
              showMessage('Ticket Closed');
              fetchTickets(true); // Refresh list
            } catch (err) {
              showAlert('Error', 'Could not close the ticket.');
            }
          },
        },
      ]);
    };
  
    const handleDeleteUserTicket = (ticketId) => {
      showAlert('Delete Ticket', 'Are you sure you want to delete this ticket forever?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/support/tickets/${ticketId}`);
              setTickets((prevTickets) => prevTickets.filter((t) => t._id !== ticketId));
              showMessage('Ticket Deleted');
            } catch (err) {
              showAlert('Error', 'Could not delete the ticket.');
            }
          },
        },
      ]);
    };
  
    return (
      <View style={styles.container}>
        <Modal animationType="slide" transparent={false} visible={isDetailVisible} onRequestClose={() => setDetailVisible(false)}>
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket Details</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {isLoadingDetail ? (
              <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />
            ) : selectedTicket ? (
              <>
                <ScrollView style={styles.modalScrollView}>
                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptLabel}>Ticket ID</Text>
                    <Text style={styles.receiptValue}>{selectedTicket._id}</Text>
                  </View>
                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptLabel}>Subject</Text>
                    <Text style={styles.receiptValue}>{selectedTicket.subject}</Text>
                  </View>
                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptLabel}>Status</Text>
                    <Text style={[styles.receiptValue, { fontWeight: 'bold', color: theme.primary }]}>{selectedTicket.status}</Text>
                  </View>
                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptLabel}>Your Initial Report</Text>
                    <Text style={styles.receiptDescription}>{selectedTicket.description}</Text>
                  </View>
                  {selectedTicket.imageUrl && (
                    <View style={styles.receiptSection}>
                      <Text style={styles.receiptLabel}>Attached Image</Text>
                      <Image source={{ uri: selectedTicket.imageUrl }} style={styles.ticketImage} />
                    </View>
                  )}
                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptLabel}>Conversation</Text>
                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                      selectedTicket.messages.map((msg) => (
                        <View key={msg._id} style={msg.isAdmin ? styles.adminReply : styles.userInitialMessage}>
                          <Text style={styles.replySender}>{msg.senderName}</Text>
                          <Text style={msg.isAdmin ? styles.adminReplyText : styles.userReplyText}>{msg.text}</Text>
                          <Text style={styles.replyTimestamp}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noRepliesText}>No messages yet. An agent will respond shortly.</Text>
                    )}
                  </View>
                </ScrollView>
                {selectedTicket.status !== 'Closed' && (
                  <View style={styles.replySection}>
                    <TouchableOpacity style={styles.closeTicketButton} onPress={handleCloseTicket}>
                      <Text style={styles.closeTicketButtonText}>I no longer need help, close ticket</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <Text style={{ textAlign: 'center', padding: 20, color: theme.text }}>Could not load ticket details.</Text>
            )}
          </KeyboardAvoidingView>
        </Modal>
        <View style={{ flex: 1 }}>
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 50 }} size="large" color={theme.primary} />
          ) : (
            <FlatList
              data={tickets}
              renderItem={({ item }) => <TicketListItem item={item} onView={() => handleViewTicket(item._id)} onDelete={() => handleDeleteUserTicket(item._id)} />}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={
                <View style={styles.placeholderContent}>
                  <Ionicons name="ticket-outline" size={80} color={theme.disabled} />
                  <Text style={styles.placeholderTitle}>No Tickets Found</Text>
                  <Text style={styles.placeholderText}>Create a new ticket to get started.</Text>
                </View>
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={isFetchingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} /> : null}
              contentContainerStyle={{ flexGrow: 1 }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => onRefresh()} colors={[theme.primary]} tintColor={theme.primary} />}
            />
          )}
        </View>
        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity style={styles.button} onPress={onCreate}>
            <Text style={styles.buttonText}>Create New Ticket</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
});

export default TicketListScreen;

// --- STYLESHEET ---
const getStyles = (theme) => StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    // Ticket List styles
    ticketItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    ticketSubject: { fontSize: 16, fontWeight: '600', color: theme.text },
    ticketDate: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
    statusTagText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    deleteAction: { backgroundColor: theme.danger, justifyContent: 'center', alignItems: 'center', width: 100, flexDirection: 'row', gap: 8 },
    deleteActionText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    placeholderContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: theme.background },
    placeholderTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginTop: 20, marginBottom: 8 },
    placeholderText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 },
    fixedButtonContainer: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border },
    button: { backgroundColor: theme.primary, padding: 16, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    buttonDisabled: { backgroundColor: theme.disabled },
  
    // Ticket Detail styles
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border, paddingTop: Platform.OS === 'ios' ? 40 : 20, paddingHorizontal: 20},
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
    modalScrollView: { paddingVertical: 10 },
    receiptSection: { paddingHorizontal: 20, marginBottom: 25 },
    receiptLabel: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 5 },
    receiptValue: { fontSize: 18, color: theme.text },
    receiptDescription: { fontSize: 16, color: theme.text, lineHeight: 24, padding: 15, backgroundColor: theme.isDarkMode ? '#2C2C2E' : '#646363ff', borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginTop: 5 },
    ticketImage: { width: '100%', height: 250, borderRadius: 8, resizeMode: 'contain', alignSelf: 'center', marginTop: 10 },
    adminReply: { alignSelf: 'flex-start', maxWidth: '85%', backgroundColor: theme.isDarkMode ? '#2D2D2F' : '#E4E6EB', padding: 12, borderRadius: 10, marginBottom: 10 },
    userInitialMessage: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: theme.surface, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    replySender: { fontWeight: 'bold', color: theme.text, marginBottom: 4 },
    adminReplyText: { fontSize: 15, color: theme.text },
    userReplyText: { fontSize: 15, color: theme.text },
    replyTimestamp: { fontSize: 10, color: theme.textSecondary, textAlign: 'right', marginTop: 5 },
    noRepliesText: { textAlign: 'center', fontStyle: 'italic', color: theme.textSecondary, paddingVertical: 15 },
    replySection: { backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
    closeTicketButton: { padding: 16, marginVertical: 15, marginHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.isDarkMode ? theme.danger : theme.border, backgroundColor: theme.isDarkMode ? theme.surface : theme.danger, alignItems: 'center' },
    closeTicketButtonText: { fontSize: 15, fontWeight: 'bold', color: theme.isDarkMode ? theme.danger : theme.textOnPrimary },
});