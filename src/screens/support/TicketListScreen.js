// screens/TicketListScreen.js
import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Image,
  FlatList,
  TextInput 
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Animatable from 'react-native-animatable';

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
        <Ionicons name="trash-outline" size={24} color="#FFF" />
      </TouchableOpacity>
    );
    return (
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity style={styles.ticketItem} onPress={onView} activeOpacity={0.8}>
            <View style={styles.ticketIconContainer}>
                <Ionicons name="ticket" size={24} color={statusColors[item.status] || theme.disabled} />
            </View>
            <View style={{ flex: 1 }}>
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
    const [isImageViewerVisible, setImageViewerVisible] = useState(false);
    const [viewerImageUrl, setViewerImageUrl] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editableSubject, setEditableSubject] = useState('');
    const [editableDescription, setEditableDescription] = useState('');

    const handleOpenImageViewer = (url) => {
        setViewerImageUrl(url);
        setImageViewerVisible(true);
    };
  
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
    }, [isFocused]);
  
    useImperativeHandle(ref, () => ({
      refresh: () => fetchTickets(true),
    }));
  
    const handleLoadMore = () => {
      if (!isFetchingMore && page < totalPages) {
        fetchTickets(false);
      }
    };
  
    const handleViewTicket = async (ticketId) => {
      // --- MODIFIED: Reset editing state when opening a ticket ---
      setIsEditing(false); 
      setSelectedTicket(null);
      setIsLoadingDetail(true);
      setDetailVisible(true);
      try {
        const { data } = await api.get(`/support/tickets/${ticketId}`);
        setSelectedTicket(data);
        // --- NEW: Populate editable fields when data is loaded ---
        setEditableSubject(data.subject);
        setEditableDescription(data.description);
      } catch (error) {
        showAlert('Error', 'Could not load ticket details.');
        setDetailVisible(false);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    // --- NEW: Function to handle saving changes ---
    const handleSaveChanges = async () => {
        if (!editableSubject.trim() || !editableDescription.trim()) {
            showAlert('Missing Info', 'Subject and description cannot be empty.');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                subject: editableSubject,
                description: editableDescription,
            };
            const { data } = await api.put(`/support/tickets/${selectedTicket._id}`, payload);
            
            setSelectedTicket(data.ticket); 
            showMessage('Ticket Updated Successfully');
            setIsEditing(false);
            fetchTickets(true);
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Could not update the ticket.';
            showAlert('Error', errorMsg);
        } finally {
            setIsSaving(false);
        }
    };
  
    const handleCloseTicket = () => {
      showAlert('Close Ticket', 'Are you sure you want to close this ticket? You will not be able to reopen it or add further replies. This action should only be taken if your issue is fully resolved.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close It',
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
  
    const renderMessageItem = (msg, index) => (
        <View key={index} style={msg.isAdmin ? styles.adminReply : styles.userReply}>
            <Text style={styles.replySender}>{msg.senderName}</Text>
            <Text style={msg.isAdmin ? styles.adminReplyText : styles.userReplyText}>{msg.text}</Text>
            <Text style={styles.replyTimestamp}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
    );

    const cancelEditing = () => {
        // Reset fields to original state
        setEditableSubject(selectedTicket.subject);
        setEditableDescription(selectedTicket.description);
        setIsEditing(false);
    };

    return (
      <View style={styles.container}>
        {/* --- IMAGE VIEWER MODAL --- */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={isImageViewerVisible}
            onRequestClose={() => setImageViewerVisible(false)}
        >
            <TouchableOpacity 
                style={styles.imageViewerOverlay} 
                activeOpacity={1} 
                onPress={() => setImageViewerVisible(false)}
            >
                {/* 
                  The Animatable.Image is a direct child of the overlay.
                  The overlay's flexbox styles (justifyContent, alignItems) now correctly center the image.
                */}
                <Animatable.Image
                    animation="zoomIn"
                    duration={400}
                    source={{ uri: viewerImageUrl }}
                    style={styles.imageViewerContent}
                    resizeMode="contain"
                />

                {/* The close button is positioned absolutely on top of everything else */}
                <Animatable.View animation="fadeIn" delay={200} style={styles.imageViewerCloseButtonWrapper}>
                    <TouchableOpacity onPress={() => setImageViewerVisible(false)}>
                        <Ionicons name="close-circle" size={36} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </Animatable.View>
            </TouchableOpacity>
        </Modal>


        {/* --- TICKET DETAILS MODAL --- */}
        <Modal animationType="fade" transparent={true} visible={isDetailVisible} onRequestClose={() => setDetailVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setDetailVisible(false)}>
                <Animatable.View animation="zoomIn" duration={400} style={styles.modalContent}>
                    <TouchableOpacity activeOpacity={1}>
                        <View style={styles.modalHeader}>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                <Ionicons name="ticket" size={26} color={theme.primary} />
                                <Text style={styles.modalTitle}>{isEditing ? 'Edit Ticket' : 'Ticket Details'}</Text>
                            </View>
                            
                            {/* --- MODIFIED: Show Edit/Cancel button --- */}
                            {!isLoadingDetail && selectedTicket && selectedTicket.status === 'Open' && (
                                <TouchableOpacity onPress={isEditing ? cancelEditing : () => setIsEditing(true)}>
                                    <Ionicons name={isEditing ? "close-circle" : "create-outline"} size={28} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {isLoadingDetail ? (
                            <ActivityIndicator style={{ paddingVertical: 80 }} size="large" color={theme.primary} />
                        ) : selectedTicket ? (
                        <View style={styles.modalBody}>
                            <ScrollView contentContainerStyle={styles.modalScrollView}>
                                <View style={styles.detailCard}>
                                    {/* --- MODIFIED: Show TextInput on edit --- */}
                                    {isEditing ? (
                                        <TextInput
                                            style={[styles.editableInput, styles.editableSubject]}
                                            value={editableSubject}
                                            onChangeText={setEditableSubject}
                                            placeholder="Ticket Subject"
                                        />
                                    ) : (
                                        <Text style={styles.ticketDetailSubject}>{selectedTicket.subject}</Text>
                                    )}
                                    <View style={styles.idStatusContainer}>
                                        <Text style={styles.ticketDetailId}>ID: {selectedTicket._id}</Text>
                                        <View style={[styles.statusTag, { backgroundColor: {Open: theme.success, 'In Progress': theme.warning, Resolved: theme.primary, Closed: theme.textSecondary}[selectedTicket.status] || theme.disabled}]}>
                                            <Text style={styles.statusTagText}>{selectedTicket.status}</Text>
                                        </View>
                                    </View>
                                </View>
                                
                                <View style={styles.detailCard}>
                                    <Text style={styles.sectionTitle}>Your Report</Text>
                                    {/* --- MODIFIED: Show TextInput on edit --- */}
                                    {isEditing ? (
                                        <TextInput
                                            style={[styles.editableInput, styles.editableDescription]}
                                            value={editableDescription}
                                            onChangeText={setEditableDescription}
                                            placeholder="Describe your issue in detail..."
                                            multiline
                                        />
                                    ) : (
                                        <Text style={styles.descriptionText}>{selectedTicket.description}</Text>
                                    )}
                                </View>

                                {selectedTicket.imageUrl && (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.sectionTitle}>Attachment</Text>
                                        <TouchableOpacity onPress={() => handleOpenImageViewer(selectedTicket.imageUrl)} activeOpacity={0.8}>
                                            <Image source={{ uri: selectedTicket.imageUrl }} style={styles.ticketImage} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                
                                <View style={styles.detailCard}>
                                    <Text style={styles.sectionTitle}>ADMIN'S MESSAGE</Text>
                                    {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                        selectedTicket.messages.map(renderMessageItem)
                                    ) : (
                                        <Text style={styles.noRepliesText}>No messages yet. An agent will respond shortly.</Text>
                                    )}
                                </View>
                            </ScrollView>

                            {selectedTicket.status !== 'Closed' && (
                            <View style={styles.modalFooter}>
                                {isEditing ? (
                                    <TouchableOpacity style={[styles.saveChangesButton, isSaving && {backgroundColor: theme.disabled}]} onPress={handleSaveChanges} disabled={isSaving}>
                                        {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveChangesButtonText}>Save Changes</Text>}
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.closeTicketButton} onPress={handleCloseTicket}>
                                        <Text style={styles.closeTicketButtonText}>Close My Ticket</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            )}
                        </View>
                        ) : (
                        <Text style={styles.placeholderText}>Could not load ticket details.</Text>
                        )}
                    </TouchableOpacity>
                </Animatable.View>
            </TouchableOpacity>
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
              contentContainerStyle={{ flexGrow: 1, paddingVertical: 8 }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => onRefresh()} colors={[theme.primary]} tintColor={theme.primary} />}
            />
          )}
        </View>

        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity style={styles.button} onPress={onCreate}>
            <Ionicons name="add-circle-outline" size={20} color={theme.textOnPrimary} />
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

    // --- Ticket List Styles ---
    ticketItem: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: theme.surface, 
      marginHorizontal: 16,
      marginVertical: 6,
      padding: 15,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDarkMode ? 0.25 : 0.08,
      shadowRadius: 3.84,
      elevation: 5,
    },
    ticketIconContainer: {
        marginRight: 15,
    },
    ticketSubject: { 
        fontSize: 16, 
        fontWeight: '600', 
        color: theme.text,
        marginBottom: 4,
    },
    ticketDate: { 
        fontSize: 12, 
        color: theme.textSecondary,
    },
    statusTag: { 
        paddingHorizontal: 12, 
        paddingVertical: 5, 
        borderRadius: 15,
        marginLeft: 10,
    },
    statusTagText: { 
        color: '#FFF', 
        fontSize: 11, 
        fontWeight: 'bold',
    },
    deleteAction: { 
        backgroundColor: theme.danger, 
        justifyContent: 'center', 
        alignItems: 'center', 
        width: 80, 
        marginVertical: 6,
        borderRadius: 12,
        marginRight: 16,
    },

    // --- Placeholder Styles ---
    placeholderContent: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
    },
    placeholderTitle: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: theme.text, 
        marginTop: 20, 
        marginBottom: 8,
    },
    placeholderText: { 
        fontSize: 16, 
        color: theme.textSecondary, 
        textAlign: 'center', 
        lineHeight: 22,
    },

    // --- Button Styles ---
    fixedButtonContainer: { 
        paddingHorizontal: 20, 
        paddingBottom: 20,
        paddingTop: 10,
        backgroundColor: theme.surface, 
        borderTopWidth: 1, 
        borderTopColor: theme.border,
    },
    button: { 
        backgroundColor: theme.primary, 
        padding: 16, 
        borderRadius: 12, 
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: { 
        color: theme.textOnPrimary, 
        fontSize: 16, 
        fontWeight: 'bold',
    },
  
    // --- Ticket Detail Modal Styles ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        width: '94%',
        maxHeight: '95%',
        backgroundColor: theme.surface,
        borderRadius: 20,
        overflow: 'hidden',
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16,
        borderBottomWidth: 1, 
        borderBottomColor: theme.border, 
    },
    modalTitle: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: theme.text,
    },
    modalBody: {
        flexShrink: 1,
    },
    modalScrollView: {
        padding: 16,
    },
    detailCard: {
        backgroundColor: theme.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    ticketDetailSubject: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 12,
    },
    idStatusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ticketDetailId: {
        fontSize: 12,
        color: theme.textSecondary,
        fontFamily: 'monospace',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.textSecondary,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    descriptionText: {
        fontSize: 16,
        color: theme.text,
        lineHeight: 24,
    },
    ticketImage: { 
        width: '100%', 
        height: 200, 
        borderRadius: 12, 
        resizeMode: 'cover', 
        alignSelf: 'center', 
    },
    adminReply: { 
        alignSelf: 'flex-start', 
        maxWidth: '90%', 
        backgroundColor: theme.bot, 
        paddingHorizontal: 14, 
        paddingVertical: 10,
        borderRadius: 16, 
        marginBottom: 10,
    },
    userReply: {
        alignSelf: 'flex-end',
        maxWidth: '90%',
        backgroundColor: theme.primary,
        paddingHorizontal: 14, 
        paddingVertical: 10,
        borderRadius: 16,
        marginBottom: 10,
    },
    replySender: { 
        fontWeight: 'bold', 
        color: theme.text, 
        marginBottom: 4, 
        fontSize: 13,
    },
    adminReplyText: { 
        fontSize: 15, 
        color: theme.text,
        lineHeight: 22,
    },
    userReplyText: { 
        fontSize: 15, 
        color: theme.textOnPrimary,
        lineHeight: 22,
    },
    replyTimestamp: { 
        fontSize: 10, 
        color: theme.isDarkMode ? theme.textSecondary : 'rgba(255,255,255,0.7)',
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    noRepliesText: { 
        textAlign: 'center', 
        fontStyle: 'italic', 
        color: theme.textSecondary, 
        paddingVertical: 10,
    },
    modalFooter: { 
        borderTopColor: theme.border, 
        borderTopWidth: 1, 
        padding: 16,
        backgroundColor: theme.surface,
    },
    closeTicketButton: { 
        padding: 14, 
        borderRadius: 12, 
        backgroundColor: theme.danger,
        alignItems: 'center',
    },
    closeTicketButtonText: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: theme.textOnPrimary,
    },

    // --- Image Viewer Modal Styles (CORRECTED) ---
    imageViewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerContent: {
        width: '90%',
        height: '75%',
        borderRadius: 12,
    },
    imageViewerCloseButtonWrapper: {
        position: 'absolute',
        top: 30,
        right: 20,
    },
// --- NEW STYLES for editable inputs ---
    editableInput: {
        fontSize: 16,
        color: theme.text,
        backgroundColor: theme.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    editableSubject: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    editableDescription: {
        minHeight: 120,
        textAlignVertical: 'top',
        lineHeight: 24,
    },
    saveChangesButton: {
        padding: 14, 
        borderRadius: 12, 
        backgroundColor: theme.success, // Use a different color for save
        alignItems: 'center',
    },
    saveChangesButtonText: {
        fontSize: 16, 
        fontWeight: 'bold', 
        color: theme.textOnPrimary,
    },
});