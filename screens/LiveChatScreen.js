// screens/LiveChatScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  BackHandler,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EventSource from 'react-native-event-source';
import { useAuth, useTheme, useAlert } from '../contexts';

// --- SECTION 1: REUSABLE UI COMPONENTS ---

const ChatHeader = React.memo(({ onBackPress, status, theme }) => {
  const styles = getStyles(theme);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={26} color={theme.primary} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <View style={styles.avatarContainer}>
            <Ionicons name="headset" size={24} color={theme.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Live Support</Text>
          <View style={styles.status}>
            <View style={[ styles.statusIndicator, { backgroundColor: status === 'online' ? theme.success : theme.danger }]}/>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
      </View>
      <View style={{ width: 44 }} />
    </View>
  );
});

const MessageBubble = React.memo(({ message, isUser, showSenderDetails, theme }) => {
  const styles = getStyles(theme);

  if (message.senderId === 'system') {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>{message.text}</Text>
      </View>
    );
  }

  const Bubble = (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.agentBubble]}>
      <Text style={isUser ? styles.userMessageText : styles.agentMessageText}>{message.text}</Text>
    </View>
  );

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.agentRow]}>
      {!isUser && showSenderDetails && (
        <View style={[styles.avatarContainer, styles.messageAvatar]}>
            <Ionicons name="headset" size={20} color={theme.primary} />
        </View>
      )}
      <View style={[styles.messageContent, !isUser && !showSenderDetails && styles.indented]}>
        {!isUser && showSenderDetails && (
          <Text style={styles.senderName}>{message.senderName || 'Support Agent'}</Text>
        )}
        {Bubble}
        <Text style={isUser ? styles.userTimestamp : styles.agentTimestamp}>{timestamp}</Text>
      </View>
    </View>
  );
});

const MessageInput = React.memo(({ value, onChangeText, onSend, isSending, theme }) => {
    const styles = getStyles(theme);
    const canSend = value.trim() !== '' && !isSending;
    return (
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder="Type your message..."
                placeholderTextColor={theme.textSecondary}
                multiline
              />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.disabledButton]}
            onPress={onSend}
            disabled={!canSend}
          >
            {isSending ? (
                <ActivityIndicator size="small" color={theme.textOnPrimary} />
            ) : (
                <Ionicons name="send" size={20} color={theme.textOnPrimary} />
            )}
          </TouchableOpacity>
        </View>
    );
});


// --- SECTION 2: MAIN LIVE CHAT SCREEN ---

export default function LiveChatScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user, api, accessToken } = useAuth();
  const flatListRef = useRef();
  const { showAlert } = useAlert();

  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('offline');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!chatId || !accessToken) return;
    const baseURL = api.defaults.baseURL;
    const eventSource = new EventSource(`${baseURL}/support/live-chat/${chatId}/listen`, { headers: { Authorization: `Bearer ${accessToken}` } });
    eventSource.addEventListener('open', () => setServerStatus('online'));
    eventSource.addEventListener('message', (event) => setMessages(JSON.parse(event.data).messages || []));
    eventSource.addEventListener('error', (error) => { console.error('SSE Error:', error); setServerStatus('offline'); });
    return () => { eventSource.close(); setServerStatus('offline'); };
  }, [chatId, accessToken, api.defaults.baseURL]);

  const initializeAndLoadChat = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/support/live-chat/session');
      setChatId(data.chatId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Chat Connection Error:', error.response?.data || error.message);
      showAlert('Connection Failed', 'Could not connect to the chat service.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setIsLoading(false);
    }
  }, [api, navigation, showAlert]);

  useFocusEffect(
    useCallback(() => {
      initializeAndLoadChat();
      const backAction = () => { navigation.goBack(); return true; };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [initializeAndLoadChat, navigation])
  );

  const onSendMessage = async () => {
    const text = inputText.trim();
    if (!text || !chatId || isSending) return;
    setIsSending(true);
    setInputText('');
    const tempId = `pending_${Date.now()}`;
    const pendingMessage = {
      _id: tempId, text, senderId: user._id, senderName: user?.displayName, timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, pendingMessage]);
    try {
      await api.post(`/support/live-chat/${chatId}/message`, { text });
    } catch (error) {
      console.error('Send Error:', error);
      showAlert('Send Failed', 'Your message could not be sent. Please check your connection.');
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = (messageToDelete) => {
    if (messageToDelete.senderId !== user?._id) return;
    showAlert('Delete Message', 'Are you sure you want to permanently delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const messageId = messageToDelete._id;
          if (!chatId || !messageId || messageId.startsWith('pending_')) return;
          setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
          try {
            await api.delete(`/support/live-chat/delete/${chatId}/${messageId}`);
          } catch (err) {
            console.error('Delete Error:', err);
            showAlert('Delete Failed', 'Could not delete the message. It has been restored.');
            setMessages((prev) => [...prev, messageToDelete].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
          }
      }},
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ChatHeader onBackPress={() => navigation.goBack()} status="connecting" theme={theme}/>
        <View style={styles.placeholderContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.placeholderText}>Connecting to support...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader onBackPress={() => navigation.goBack()} status={serverStatus} theme={theme}/>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id?.toString() || item.timestamp.toString()}
          renderItem={({ item, index }) => {
            const prevMessage = messages[index - 1];
            // Show sender details if it's the first message or if the sender is different from the previous one.
            const showSenderDetails = !prevMessage || prevMessage.senderId !== item.senderId;
            return (
                <TouchableOpacity onLongPress={() => handleDeleteMessage(item)} delayLongPress={500} activeOpacity={0.8}>
                    <MessageBubble message={item} isUser={item.senderId === user?._id} showSenderDetails={showSenderDetails} theme={theme} />
                </TouchableOpacity>
            )
          }}
          contentContainerStyle={styles.scrollContentContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.placeholderContent}>
              <Ionicons name="chatbubbles-outline" size={60} color={theme.textSecondary} />
              <Text style={styles.placeholderText}>This is the start of your conversation. Say hello!</Text>
            </View>
          }
        />
        <MessageInput
            value={inputText}
            onChangeText={setInputText}
            onSend={onSendMessage}
            isSending={isSending}
            theme={theme}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- SECTION 3: STYLESHEET ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    
    // --- Header ---
    header: {
      alignItems: 'center', backgroundColor: theme.surface, borderBottomColor: theme.border,
      borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between',
      paddingHorizontal: 10, paddingVertical: 8,
    },
    backButton: { padding: 8, width: 44, alignItems: 'center' },
    headerCenter: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: `${theme.primary}20`,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerTitle: { color: theme.text, fontSize: 17, fontWeight: 'bold' },
    status: { alignItems: 'center', flexDirection: 'row', marginTop: 2 },
    statusIndicator: { borderRadius: 5, height: 10, width: 10, marginRight: 6 },
    statusText: { color: theme.textSecondary, fontSize: 13, textTransform: 'capitalize' },
    
    // --- Message List ---
    scrollContentContainer: {
      flexGrow: 1, justifyContent: 'flex-end',
      paddingTop: 10, paddingHorizontal: 15,
    },
    placeholderContent: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
    placeholderText: {
      color: theme.textSecondary, fontSize: 15, marginTop: 15,
      textAlign: 'center', lineHeight: 22,
    },

    // --- Message Bubbles ---
    messageRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-start' },
    userRow: { justifyContent: 'flex-end' },
    agentRow: { justifyContent: 'flex-start' },
    messageAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
    messageContent: { maxWidth: '80%' },
    indented: { marginLeft: 44 },
    senderName: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 5, marginLeft: 4 },
    messageBubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
    userBubble: { backgroundColor: theme.primary },
    agentBubble: { backgroundColor: theme.surface },
    userMessageText: { color: theme.textOnPrimary, fontSize: 16, lineHeight: 22 },
    agentMessageText: { color: theme.text, fontSize: 16, lineHeight: 22 },
    agentTimestamp: { color: theme.textSecondary, fontSize: 11, marginTop: 4, marginLeft: 4 },
    userTimestamp: { color: theme.textSecondary, fontSize: 11, marginTop: 4, alignSelf: 'flex-end', marginRight: 4 },
    systemMessageContainer: { alignSelf: 'center', marginVertical: 15, },
    systemMessageText: { color: theme.textSecondary, fontSize: 12, fontWeight: '500' },
    
    // --- Input Area ---
    inputContainer: {
      alignItems: 'flex-end', backgroundColor: theme.surface,
      borderTopColor: theme.border, borderTopWidth: 1,
      flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10,
    },
    inputWrapper: {
        flex: 1, backgroundColor: theme.background,
        borderRadius: 22, marginRight: 10,
    },
    input: {
      color: theme.text, fontSize: 16, maxHeight: 120,
      paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
      minHeight: 44,
    },
    sendButton: {
      alignItems: 'center', backgroundColor: theme.primary,
      borderRadius: 22, height: 44, justifyContent: 'center', width: 44,
    },
    disabledButton: { backgroundColor: theme.disabled },
  });