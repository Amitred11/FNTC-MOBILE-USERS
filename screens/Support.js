// screens/SupportScreen.js
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  BackHandler,
  Image,
  SafeAreaView,
  FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTheme, useAuth, useMessage, useAlert } from '../contexts';
import { faqData } from '../data/faqData';
import EventSource from 'react-native-event-source';
import apiConfig from '../config/apiConfig';
import { BottomNavBar } from '../components/BottomNavBar';
import * as Animatable from 'react-native-animatable';
import { requestMediaLibraryPermissions } from '../utils/permissions';
import { Swipeable } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import CustomPicker from '../components/CustomPicker'

// --- Constants ---
const { Config_INTERNAL_API_KEY, CHATBOT_API_ENDPOINT } = apiConfig;
const CHARACTER_NAME = 'FNTC Bot';
const HEADER_HEIGHT = Platform.select({ ios: 90, android: 70 });
const CATEGORY_ITEMS = [
    { label: 'Technical Issue', value: 'technical' },
    { label: 'Billing and Refunds', value: 'billing' },
    { label: 'General Inquiry', value: 'general' },
];
const INITIAL_BOT_MESSAGE = `Hello! I'm ${CHARACTER_NAME}, your virtual assistant.\n\nHow can I help you today?`;
const RETRY_DELAY_MS = 5000;
const MAX_INITIALIZATION_TIME_MS = 25000;
// ====================================================================
// --- CHILD & HELPER COMPONENTS (Unchanged)
// ====================================================================
const BotAvatar = ({ theme, inHeader = false }) => {
  const styles = getStyles(theme);
  return (
    <View style={[styles.avatarShell, inHeader ? styles.avatarHeader : styles.avatarChat]}>
      <Image source={require('../assets/images/bot-avatar.jpg')} style={styles.avatarImage} />
    </View>
  );
};
const UserAvatar = ({ theme, profile }) => {
  const styles = getStyles(theme);
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <View style={styles.avatarShell}>
      {profile?.photoUrl ? (
        <Image source={{ uri: profile.photoUrl }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatarInitialsContainer, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarInitialsText}>{getInitials(profile?.displayName)}</Text>
        </View>
      )}
    </View>
  );
};
const SupportHub = ({ onNavigate }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const SupportCard = ({ icon, title, description, onPress }) => (
    <TouchableOpacity style={styles.supportCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIconContainer}>
        <Ionicons name={icon} size={26} color={theme.primary} />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
    </TouchableOpacity>
  );
  return (
    <ScrollView contentContainerStyle={styles.hubContainer}>
      <Text style={styles.screenTitle}>Support Center</Text>
      <Text style={styles.screenSubtitle}>How can we help you today?</Text>
      <Animatable.View animation="fadeInUp" duration={500} delay={100}>
        <SupportCard
          icon="chatbubbles-outline"
          title="AI Chatbot"
          description="Get instant answers 24/7 from our AI assistant."
          onPress={() => onNavigate('chatbot')}
        />
      </Animatable.View>
      <Animatable.View animation="fadeInUp" duration={500} delay={200}>
        <SupportCard
          icon="headset-outline"
          title="Chat with an Agent"
          description="Connect with a support specialist for live help."
          onPress={() => navigation.navigate('LiveChatScreen')}
        />
      </Animatable.View>
      <Animatable.View animation="fadeInUp" duration={500} delay={300}>
        <SupportCard
          icon="document-text-outline"
          title="My Support Tickets"
          description="View existing tickets or create a new one."
          onPress={() => onNavigate('ticket_list')}
        />
      </Animatable.View>
    </ScrollView>
  );
};

// --- CHATBOT SCREEN ---
const ChatbotScreen = forwardRef(({ onRefresh, isRefreshing }, ref) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user: profile } = useAuth();
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [isReplying, setIsReplying] = useState(false);
  const [chatState, setChatState] = useState({ status: 'initializing', message: 'Connecting...' });
  const [inputText, setInputText] = useState('');
  const [isFaqVisible, setIsFaqVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const netInfo = useNetInfo();
  const { showAlert } = useAlert();
  const retryTimeoutRef = useRef(null);
  const initializationTimeoutRef = useRef(null);

  const isSendActive = !isReplying && inputText.trim() !== '';
  
  // The initializeChat function will now be the core of our retry logic
  const initializeChat = useCallback(async () => {
    // Clear any pending retries or timeouts to avoid race conditions
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (initializationTimeoutRef.current) clearTimeout(initializationTimeoutRef.current);

    setChatState({ status: 'connecting', message: 'Connecting to AI...' });
    setMessages([]); // Clear messages on each new initialization attempt

    if (netInfo.isConnected === false) {
      setChatState({ status: 'offline', message: 'You appear to be offline. Retrying...' });
      // Schedule a retry and exit
      retryTimeoutRef.current = setTimeout(initializeChat, 5000); // Retry after 5 seconds
      return;
    }

    try {
      const apiHeaders = { 'X-API-Key': Config_INTERNAL_API_KEY };
      
      const timeoutPromise = new Promise((_, reject) => {
          initializationTimeoutRef.current = setTimeout(() => reject(new Error('AI_TIMEOUT')), 15000); // 15-second timeout
      });

      const healthCheckPromise = fetch(`${CHATBOT_API_ENDPOINT}/health`, { headers: apiHeaders });
      const healthResponse = await Promise.race([healthCheckPromise, timeoutPromise]);
      
      clearTimeout(initializationTimeoutRef.current); // Clear the timeout if fetch succeeds

      if (!healthResponse.ok) {
        throw new Error(`AI service responded with status ${healthResponse.status}`);
      }
      
      // --- SUCCESS ---
      setChatState({ status: 'online', message: 'Online' });

      // Fetch history only on successful connection
      const historyResponse = await fetch(`${CHATBOT_API_ENDPOINT}/history/${profile._id}`, { headers: apiHeaders });
      const historyData = await historyResponse.json();

      if (historyData?.length > 0) {
        setMessages(historyData.map((m, index) => ({ id: `hist-${m.id || index}`, text: m.parts[0].text, isUser: m.role === 'user' })));
      } else {
        setMessages([{ id: `initial-${Date.now()}`, text: INITIAL_BOT_MESSAGE, isUser: false }]);
      }

    } catch (error) {
      // --- FAILURE ---
      let errorMessage = 'Could not connect to AI services. Retrying...';
      if (error.message === 'AI_TIMEOUT') {
        errorMessage = 'Connection timed out. Retrying...';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Retrying...';
      }
      
      console.error('Chat Initialization Error, will retry:', error.message);
      setChatState({ status: 'error', message: errorMessage });
      
      // Schedule the next retry attempt
      retryTimeoutRef.current = setTimeout(initializeChat, 5000); // Retry after 5 seconds
    }
  }, [netInfo.isConnected, profile?._id]);

  // Main effect to start and stop the connection process
  useEffect(() => {
    if (profile) {
      initializeChat();
    } else {
      // If user logs out, clear everything
      setChatState({ status: 'disconnected', message: 'Disconnected' });
      setMessages([]);
    }
    
    // --- Cleanup function ---
    // This is crucial. It runs when the component unmounts (e.g., user navigates away).
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [profile, initializeChat]); // Depend on initializeChat

  useImperativeHandle(ref, () => ({
    refresh: () => {
      initializeChat();
    }
  }));
  const sendChatMessage = (textToSend) => {
    const text = textToSend.trim();
    if (!isSendActive) return;

    const newUserMessage = { id: `user-${Date.now()}`, text: text, isUser: true };
    const historyForApi = [...messages, newUserMessage].map((msg) => ({
      role: msg.isUser ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    setMessages((prev) => [...prev, newUserMessage]);
    setIsReplying(true);
    setInputText('');

    // --- FIX 6: Use `profile._id` when sending the chat message ---
    const eventSource = new EventSource(`${CHATBOT_API_ENDPOINT}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': Config_INTERNAL_API_KEY },
      body: JSON.stringify({ history: historyForApi, userId: profile._id }),
    });
    const botResponseId = `bot-${Date.now()}`;
    let fullResponse = '';
    let isFirstChunk = true;

    eventSource.addEventListener('message', (event) => {
      if (event.data) {
        const data = JSON.parse(event.data);
        if (data.chunk) {
          fullResponse += data.chunk;

          // --- FIX 1: Handle first chunk differently ---
          if (isFirstChunk) {
            isFirstChunk = false;
            // Hide typing indicator and add the new message bubble
            setIsReplying(false);
            setMessages((currentMsgs) => [
              ...currentMsgs,
              { id: botResponseId, text: fullResponse, isUser: false },
            ]);
          } else {
            // Update the existing message bubble
            setMessages((currentMsgs) =>
              currentMsgs.map((msg) =>
                msg.id === botResponseId ? { ...msg, text: fullResponse } : msg
              )
            );
          }
        }
      }
    });

    eventSource.addEventListener('end', () => eventSource.close());

    eventSource.addEventListener('error', (error) => {
      console.error('SSE connection error:', error);
      setIsReplying(false); // Stop typing indicator on error
      setMessages((currentMsgs) => [
        ...currentMsgs,
        { id: `err-${Date.now()}`, text: '[Sorry, the connection was lost.]', isUser: false },
      ]);
      eventSource.close();
    });
  };

  // Handlers for FAQ, long press, delete, and clear are unchanged
  const handleFaqSelect = (faqItem) => {
    setIsFaqVisible(false);
    const userQuestionMessage = {
      id: `user-faq-${Date.now()}`,
      text: faqItem.question,
      isUser: true,
    };
    setMessages((prev) => [...prev, userQuestionMessage]);
    const botAnswerId = `bot-faq-${Date.now()}`;
    const botAnswerMessage = { id: botAnswerId, text: faqItem.answer, isUser: false };
    setMessages((prev) => [...prev, botAnswerMessage]);
  };
  const handleLongPress = (message) => {
    if (message.id.startsWith('initial-') || message.id.startsWith('err-')) return;
    setSelectedMessage(message);
    setActionSheetVisible(true);
  };
  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    setActionSheetVisible(false);
    try {
      const response = await fetch(`${CHATBOT_API_ENDPOINT}/history/message`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': Config_INTERNAL_API_KEY },
        body: JSON.stringify({
          userId: user._id,
          message: { text: selectedMessage.text, role: selectedMessage.isUser ? 'user' : 'model' },
        }),
      });
      if (!response.ok) throw new Error('Server failed to delete message.');
      initializeChat();
    } catch (error) {
      showAlert('Error', 'Could not delete the message.');
    }
  };
  const handleClearChat = async () => {
    setActionSheetVisible(false);
    try {
      await fetch(`${CHATBOT_API_ENDPOINT}/history/${user._id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': Config_INTERNAL_API_KEY },
      });
      initializeChat();
    } catch (error) {
      showAlert('Error', 'Could not clear chat history.');
    }
  };

  if (chatState.status === 'initializing' || chatState.status === 'connecting' || chatState.status === 'error' || chatState.status === 'offline') {
    return (
      <View style={styles.placeholderContent}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.placeholderText}>{chatState.message}</Text> 
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <Modal
        animationType="fade"
        transparent={true}
        visible={isFaqVisible}
        onRequestClose={() => setIsFaqVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setIsFaqVisible(false)}
        >
          <View style={styles.faqModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
              <TouchableOpacity onPress={() => setIsFaqVisible(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {faqData.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.faqItem}
                  onPress={() => handleFaqSelect(item)}
                >
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity onLongPress={() => handleLongPress(item)} activeOpacity={0.8}>
            <MessageBubble
              message={item}
              theme={theme}
              profile={profile}
              previousMessage={messages[index - 1]}
              nextMessage={messages[index + 1]}
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.scrollContentContainer}
        ListFooterComponent={isReplying ? <TypingIndicator theme={theme} /> : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      />
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={HEADER_HEIGHT}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.utilityButton} onPress={() => setIsFaqVisible(true)}>
            <Ionicons name="add-circle-outline" size={28} color={theme.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={'Message...'}
            value={inputText}
            onChangeText={setInputText}
            editable={!isReplying && chatState.status === 'online'}
            placeholderTextColor={theme.textSecondary}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              isSendActive ? styles.sendButtonActive : styles.sendButtonInactive,
            ]}
            onPress={() => sendChatMessage(inputText)}
            disabled={!isSendActive}
          >
            <Ionicons
              name="arrow-up"
              size={22}
              color={isSendActive ? theme.textOnPrimary : theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        transparent={true}
        visible={actionSheetVisible}
        onRequestClose={() => setActionSheetVisible(false)}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          onPress={() => setActionSheetVisible(false)}
        >
          <Animatable.View animation="slideInUp" duration={300} style={styles.actionSheetContainer}>
            <TouchableOpacity style={styles.actionSheetButton} onPress={handleDeleteMessage}>
              <Text style={styles.actionSheetText}>Delete Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetButton} onPress={handleClearChat}>
              <Text style={[styles.actionSheetText, { color: theme.danger }]}>
                Clear Entire Chat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetButton, styles.actionSheetCancelButton]}
              onPress={() => setActionSheetVisible(false)}
            >
              <Text style={[styles.actionSheetText, { fontWeight: 'bold' }]}>Cancel</Text>
            </TouchableOpacity>
          </Animatable.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

// --- FIX 3: PROVIDE CLEAN, FULLY-FORMATTED TICKET COMPONENTS ---
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
      <TouchableOpacity style={styles.ticketItem} onPress={onView} activeOpacity={1}>
        <View>
          <Text style={styles.ticketSubject} numberOfLines={1}>
            {item.subject}
          </Text>
          <Text style={styles.ticketDate}>
            Last updated: {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
        <View
          style={[
            styles.statusTag,
            { backgroundColor: statusColors[item.status] || theme.disabled },
          ]}
        >
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
      if (isInitial) setIsLoading(true);
      else setIsFetchingMore(true);
      try {
        const { data } = await api.get(`/support/tickets?page=${targetPage}&limit=20`);
        setTickets((prev) => (isInitial ? data.data : [...prev, ...data.data]));
        setTotalPages(data.pagination.totalPages);
        if (!isInitial) setPage(targetPage);
      } catch (error) {
        if (isInitial) setTickets([]);
      } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [api, page]
  );
  useEffect(() => {
    if (isFocused) fetchTickets(true);
  }, [isFocused, fetchTickets]);
  useImperativeHandle(ref, () => ({
        refresh: fetchTickets,
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
        text: 'Yes',
        onPress: async () => {
          if (!selectedTicket?._id) return;
          try {
            const { data } = await api.post(`/support/tickets/${selectedTicket._id}/close`);
            setSelectedTicket(data.ticket);
            showMessage('Ticket Closed', 'Ticket has been closed.');
          } catch (err) {
            showAlert('Error', 'Could not close the ticket.');
          }
        },
      },
    ]);
  };
  const handleDeleteUserTicket = (ticketId) => {
    showAlert('Delete Ticket', 'Are you sure you want to delete this ticket?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/support/tickets/${ticketId}`);
            setTickets((prevTickets) => prevTickets.filter((t) => t._id !== ticketId));
            showMessage('Ticket Deleted', 'Ticket has been removed.');
          } catch (err) {
            showAlert('Error', 'Could not delete the ticket.');
          }
        },
      },
    ]);
  };
  return (
    <View style={styles.container}>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isDetailVisible}
        onRequestClose={() => setDetailVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: theme.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
                  <Text style={[styles.receiptValue, { fontWeight: 'bold', color: theme.primary }]}>
                    {selectedTicket.status}
                  </Text>
                </View>
                <View style={styles.receiptSection}>
                  <Text style={styles.receiptLabel}>Your Initial Report</Text>
                  <Text style={styles.receiptDescription}>{selectedTicket.description}</Text>
                </View>
                {selectedTicket.imageData && (
                  <View style={styles.receiptSection}>
                    <Text style={styles.receiptLabel}>Attached Image</Text>
                    <Image source={{ uri: selectedTicket.imageData }} style={styles.ticketImage} />
                  </View>
                )}
                <View style={styles.receiptSection}>
                  <Text style={styles.receiptLabel}>Conversation</Text>
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((msg) => (
                      <View
                        key={msg._id}
                        style={msg.isAdmin ? styles.adminReply : styles.userInitialMessage}
                      >
                        <Text style={styles.replySender}>{msg.senderName}</Text>
                        <Text style={msg.isAdmin ? styles.adminReplyText : styles.userReplyText}>
                          {msg.text}
                        </Text>
                        <Text style={styles.replyTimestamp}>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noRepliesText}>
                      No messages yet. An agent will respond shortly.
                    </Text>
                  )}
                </View>
              </ScrollView>
              {selectedTicket.status !== 'Closed' && (
                <View style={styles.replySection}>
                  <TouchableOpacity style={styles.closeTicketButton} onPress={handleCloseTicket}>
                    <Text style={styles.closeTicketButtonText}>
                      I no longer need help, close ticket
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <Text style={{ textAlign: 'center', padding: 20, color: theme.text }}>
              Could not load ticket details.
            </Text>
          )}
        </KeyboardAvoidingView>
      </Modal>
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 50 }} size="large" color={theme.primary} />
        ) : (
          <FlatList
            data={tickets}
            renderItem={({ item }) => (
              <TicketListItem
                item={item}
                onView={() => handleViewTicket(item._id)}
                onDelete={() => handleDeleteUserTicket(item._id)}
              />
            )}
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
            ListFooterComponent={
              isFetchingMore ? (
                <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} />
              ) : null
            }
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
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

const TicketCreateScreen = ({ onFinish }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { api } = useAuth();
  const { showMessage } = useMessage();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState(null);
  const { showAlert } = useAlert();
  const [category, setCategory] = useState('technical');
  const handleCategoryChange = useCallback((value) => {
        setCategory(value);
    }, []); 

  const handleImagePick = async () => {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return;
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
      const asset = pickerResult.assets[0];
      const imageDataUri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
      setImage({ uri: asset.uri, base64: imageDataUri });
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      showAlert('Missing Info', 'Please provide a subject and description.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { subject: subject, description: description, category: category };
      if (image) {
        payload.imageData = image.base64;
      }
      await api.post('/support/tickets', payload);
      showMessage('Ticket Submitted', 'Your ticket has been created successfully.');
      onFinish();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Could not submit ticket.';
      showAlert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CORRECTED LAYOUT ---
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.flexContainer} // Makes the scroll view take up available space
        contentContainerStyle={styles.formContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.formLabel}>Category</Text>
        <View style={[styles.formInput, {paddingVertical: 1, height: 55,}]}>
            <CustomPicker
                selectedValue={category}
                onValueChange={handleCategoryChange} // Use the stable callback
                label="Select Category"
                items={CATEGORY_ITEMS} // Use the stable array
            />
        </View>
        <Text style={styles.formLabel}>Subject</Text>
        <TextInput
          style={styles.formInput}
          placeholder="e.g., No Internet Connection"
          value={subject}
          onChangeText={setSubject}
          editable={!isSubmitting}
          placeholderTextColor={theme.textSecondary}
        />
        <Text style={styles.formLabel}>Describe Your Issue</Text>
        <TextInput
          style={[styles.formInput, styles.formInputMulti]}
          placeholder="Please provide as much detail as possible..."
          value={description}
          onChangeText={setDescription}
          multiline
          editable={!isSubmitting}
          placeholderTextColor={theme.textSecondary}
        />
        <Text style={styles.formLabel}>Attach an Image (Optional)</Text>
        <View style={styles.imagePickerContainer}>
          {image ? (
            <View>
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)}>
                <Ionicons name="close-circle" size={28} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.attachButton} onPress={handleImagePick}>
              <Ionicons name="attach" size={22} color={theme.primary} />
              <Text style={styles.attachButtonText}>Add Screenshot or Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={HEADER_HEIGHT}
      >
        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Submit Ticket</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const MessageBubble = ({ message, theme, profile, previousMessage, nextMessage }) => {
  const styles = getStyles(theme);
  const isUser = message.isUser;
  const isLastInSequence = !nextMessage || nextMessage.isUser !== isUser;
  const isFirstInSequence = !previousMessage || previousMessage.isUser !== isUser;
  const bubbleStyles = [styles.messageBubble, isUser ? styles.userBubble : styles.botBubble];
  if (isLastInSequence)
    bubbleStyles.push(isUser ? styles.lastInSequenceUser : styles.lastInSequenceBot);
  if (isFirstInSequence) bubbleStyles.push(styles.firstInSequence);
  const markdownStyles = {
    body: { fontSize: 16, color: isUser ? theme.textOnPrimary : theme.text },
    link: { color: theme.accent },
  };
  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
      {!isUser && (
        <View style={styles.avatarColumn}>{isLastInSequence && <BotAvatar theme={theme} />}</View>
      )}
      <View style={bubbleStyles}>
        <Markdown style={markdownStyles}>{message.text || ' '}</Markdown>
      </View>
      {isUser && (
        <View style={styles.avatarColumn}>
          {isLastInSequence && <UserAvatar theme={theme} profile={profile} />}
        </View>
      )}
    </View>
  );
};
const TypingIndicator = ({ theme }) => {
  const styles = getStyles(theme);
  const dotAnimation = { 0: { opacity: 0.3 }, 1: { opacity: 1 } };
  return (
    <View style={[styles.messageRow, styles.botRow, { marginBottom: 10 }]}>
      <View style={styles.avatarColumn}>
        <BotAvatar theme={theme} />
      </View>
      <View
        style={[
          styles.messageBubble,
          styles.botBubble,
          styles.lastInSequenceBot,
          styles.typingBubble,
        ]}
      >
        <Animatable.View
          animation={dotAnimation}
          iterationCount="infinite"
          direction="alternate"
          duration={600}
          style={styles.typingDot}
        />
        <Animatable.View
          animation={dotAnimation}
          iterationCount="infinite"
          direction="alternate"
          duration={600}
          delay={200}
          style={styles.typingDot}
        />
        <Animatable.View
          animation={dotAnimation}
          iterationCount="infinite"
          direction="alternate"
          duration={600}
          delay={400}
          style={styles.typingDot}
        />
      </View>
    </View>
  );
};

// ========================================================
// --- MAIN PARENT COMPONENT (Unchanged)
// ========================================================
export default function SupportScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [mode, setMode] = useState('hub');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, [mode]);
  useEffect(() => {
    const handleBackPress = () => {
      if (mode === 'ticket_create') {
        setMode('ticket_list');
        return true;
      }
      if (mode !== 'hub') {
        setMode('hub');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [mode, navigation]);
  const getHeaderTitle = () => {
    switch (mode) {
      case 'ticket_list':
      case 'ticket_create':
        return 'Support Tickets';
      default:
        return '';
    }
  };
  const renderContent = () => {
    switch (mode) {
      case 'chatbot':
        return <ChatbotScreen isRefreshing={refreshing} onRefresh={onRefresh} />;
      case 'ticket_list':
        return (
          <TicketListScreen
            onCreate={() => setMode('ticket_create')}
            isRefreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      case 'ticket_create':
        return <TicketCreateScreen onFinish={() => setMode('ticket_list')} />;
      default:
        return <SupportHub onNavigate={setMode} />;
    }
  };
  return (
 <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
        {mode !== 'hub' && (
            <View style={styles.header}>
            <TouchableOpacity
                onPress={() => {
                if (mode === 'ticket_create') setMode('ticket_list');
                else setMode('hub');
                }}
                style={styles.headerBackIcon}
            >
                <Ionicons name="arrow-back" size={26} color={theme.textBe} />
            </TouchableOpacity>
            {mode === 'chatbot' ? (
                <View style={styles.chatHeaderContent}>
                <BotAvatar theme={theme} inHeader={true} />
                <View>
                    <Text style={styles.headerTitle}>{CHARACTER_NAME}</Text>
                </View>
                </View>
            ) : (
                <View style={styles.standardHeaderContent}>
                <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
                </View>
            )}
            <View style={{ width: 26 }} />
            </View>
        )}
        <View style={{ flex: 1 }}>{renderContent()}</View>
        {mode === 'hub' && <BottomNavBar activeScreen="Support" />}
        </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// --- STYLESHEET (Unchanged) ---
const getStyles = (theme) =>
  StyleSheet.create({
    actionSheetButton: { borderBottomColor: theme.border, borderBottomWidth: 1, padding: 20 },
    actionSheetCancelButton: { borderBottomWidth: 0, marginTop: 10 },
    actionSheetContainer: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
      paddingTop: 10,
    },
    actionSheetOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'flex-end' },
    actionSheetText: { color: theme.text, fontSize: 18, textAlign: 'center' },
    adminCommentSection: {
      backgroundColor: theme.isDarkMode ? theme.primary + '20' : '#E0F7FA',
      borderRadius: 8,
      padding: 15,
    },
    adminReply: {
      alignSelf: 'flex-start',
      backgroundColor: theme.isDarkMode ? '#2D2D2F' : '#E4E6EB',
      borderRadius: 10,
      marginBottom: 10,
      maxWidth: '85%',
      padding: 12,
    },
    adminReplyText: { color: theme.text, fontSize: 15 },
    attachButton: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 10,
      borderStyle: 'dashed',
      borderWidth: 1,
      flexDirection: 'row',
      padding: 15,
    },
    attachButton: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 10,
      borderStyle: 'dashed',
      borderWidth: 1,
      flexDirection: 'row',
      padding: 15,
    },
    attachButtonText: { color: theme.primary, fontSize: 16, fontWeight: '500', marginLeft: 10 },
    attachButtonText: { color: theme.primary, fontSize: 16, fontWeight: '500', marginLeft: 10 },
    avatarChat: {},
    avatarColumn: { alignItems: 'center', justifyContent: 'flex-end', width: 40 },
    avatarHeader: { borderRadius: 22, height: 44, marginRight: 12, width: 44 },
    avatarImage: { height: '100%', width: '100%' },
    avatarInitialsContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    avatarInitialsText: { color: theme.textOnPrimary, fontSize: 14, fontWeight: 'bold' },
    avatarShell: {
      backgroundColor: theme.border,
      borderRadius: 16,
      height: 32,
      marginBottom: 3,
      overflow: 'hidden',
      width: 32,
    },
    botBubble: { backgroundColor: theme.bot, marginRight: 8 },
    botRow: { justifyContent: 'flex-start' },
    button: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 10, padding: 16 },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    cardDescription: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
    cardIconContainer: {
      backgroundColor: `${theme.primary}20`,
      borderRadius: 14,
      marginRight: 20,
      padding: 14,
    },
    cardTextContainer: { flex: 1 },
    cardTitle: { color: theme.text, fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
    chatHeaderContent: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    closeTicketButton: {
      alignItems: 'center',
      backgroundColor: theme.isDarkMode ? theme.surface : theme.danger,
      borderColor: theme.isDarkMode ? theme.danger : theme.border,
      borderRadius: 12,
      borderWidth: 1,
      marginHorizontal: 20,
      marginVertical: 15,
      padding: 16,
    },
    closeTicketButtonText: {
      color: theme.isDarkMode ? theme.danger : theme.textOnPrimary,
      fontSize: 15,
      fontWeight: 'bold',
    },
    container: { backgroundColor: theme.background, flex: 1 },
    deleteAction: {
      alignItems: 'center',
      backgroundColor: theme.danger,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      width: 100,
    },
    deleteActionText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    faqItem: { borderBottomColor: theme.border, borderBottomWidth: 1, paddingVertical: 15 },
    faqModalContent: {
      backgroundColor: theme.surface,
      borderRadius: 15,
      elevation: 10,
      maxHeight: '80%',
      padding: 20,
      width: '90%',
    },
    faqQuestion: { color: theme.accent, fontSize: 16, fontWeight: '600' },
    firstInSequence: { marginTop: 12 },
    fixedButtonContainer: {
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    flexContainer: { bottom: 0 },
    formContentContainer: { padding: 20 },
    formInput: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      color: theme.text,
      fontSize: 16,
      paddingHorizontal: 15,
      paddingVertical: 12,
    },
    formInputMulti: { minHeight: 150, paddingTop: 12, textAlignVertical: 'top' },
    formLabel: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
      marginTop: 15,
    },
    header: {
      alignItems: 'center',
      backgroundColor: 'lightblue',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      height: HEADER_HEIGHT,
      justifyContent: 'space-between',
      paddingHorizontal: 15,
    },
    headerBackIcon: { paddingRight: 10 },
    headerTitle: { color: theme.textBe, fontSize: 18, fontWeight: '600' },
    hubContainer: { padding: 20, paddingTop: Platform.OS === 'ios' ? 20 : 40 },
    imagePickerContainer: {
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: 8,
      marginTop: 10,
      padding: 10,
    },
    imagePickerContainer: {
      alignItems: 'center',
      backgroundColor: theme.background,
      borderRadius: 8,
      marginTop: 10,
      padding: 10,
    },
    imagePreview: { borderRadius: 10, height: 150, marginBottom: 10, width: 150 },
    input: {
      backgroundColor: theme.bot,
      borderRadius: 22,
      bottom: 5,
      color: theme.text,
      flex: 1,
      fontSize: 16,
      marginRight: 8,
      maxHeight: 120,
      paddingBottom: Platform.OS === 'ios' ? 10 : 8,
      paddingHorizontal: 19,
      paddingTop: Platform.OS === 'ios' ? 10 : 8,
    },
    inputContainer: {
      alignItems: 'flex-end',
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    lastInSequenceBot: { borderBottomLeftRadius: 6 },
    lastInSequenceUser: { borderBottomRightRadius: 6 },
    messageBubble: {
      borderRadius: 22,
      maxWidth: '82%',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    messageRow: { alignItems: 'flex-end', flexDirection: 'row', marginVertical: 2 },
    modalHeader: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
      paddingBottom: 10,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    modalOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      flex: 1,
      justifyContent: 'center',
    },
    modalScrollView: { paddingVertical: 10 },
    modalTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
    noRepliesText: {
      color: theme.textSecondary,
      fontStyle: 'italic',
      paddingVertical: 15,
      textAlign: 'center',
    },
    placeholderContent: {
      alignItems: 'center',
      backgroundColor: theme.background,
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    placeholderText: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 22,
      textAlign: 'center',
    },
    placeholderTitle: {
      color: theme.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 8,
      marginTop: 20,
    },
    receiptDescription: {
      backgroundColor: theme.isDarkMode ? '#2C2C2E' : '#f5f5f5',
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.textBe,
      fontSize: 16,
      lineHeight: 24,
      marginTop: 5,
      padding: 15,
    },
    receiptLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 5 },
    receiptSection: { marginBottom: 25, paddingHorizontal: 20 },
    receiptValue: { color: theme.text, fontSize: 18 },
    removeImageButton: {
      backgroundColor: theme.surface,
      borderRadius: 15,
      position: 'absolute',
      right: -10,
      top: -10,
    },
    removeImageButton: {
      backgroundColor: theme.surface,
      borderRadius: 15,
      position: 'absolute',
      right: -10,
      top: -10,
    },
    replySection: {
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    replySender: { color: theme.text, fontWeight: 'bold', marginBottom: 4 },
    replyTimestamp: { color: theme.textSecondary, fontSize: 10, marginTop: 5, textAlign: 'right' },
    screenSubtitle: { color: theme.textSecondary, fontSize: 18, lineHeight: 26, marginBottom: 30 },
    screenTitle: { color: theme.text, fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
    scrollContentContainer: { paddingBottom: 10, paddingHorizontal: 10, paddingTop: 10 },
    sendButton: {
      alignItems: 'center',
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      marginBottom: Platform.OS === 'android' ? 2 : 0,
      width: 44,
    },
    sendButtonActive: { backgroundColor: theme.accent },
    sendButtonInactive: { backgroundColor: theme.bot },
    standardHeaderContent: { alignItems: 'center', flex: 1 },
    statusTag: { borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5 },
    statusTagText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    supportCard: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.6)',
      marginBottom: 15,
      padding: 20,
    },
    ticketDate: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
    ticketImage: {
      alignSelf: 'center',
      borderRadius: 8,
      height: 250,
      marginTop: 10,
      resizeMode: 'contain',
      width: '100%',
    },
    ticketItem: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 15,
    },
    ticketSubject: { color: theme.text, fontSize: 16, fontWeight: '600', maxWidth: '80%' },
    typingBubble: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 14,
      width: 70,
    },
    typingDot: { backgroundColor: theme.textSecondary, borderRadius: 4, height: 8, width: 8 },
    userBubble: { backgroundColor: theme.primary, marginLeft: 8 },
    userInitialMessage: {
      alignSelf: 'flex-end',
      backgroundColor: theme.surface,
      borderRadius: 10,
      marginBottom: 10,
      maxWidth: '85%',
      padding: 12,
    },
    userReplyText: { color: theme.text, fontSize: 15 },
    userRow: { justifyContent: 'flex-end' },
    utilityButton: { paddingBottom: 8, paddingHorizontal: 6 },
  });
