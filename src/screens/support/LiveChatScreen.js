// screens/LiveChatScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, ActivityIndicator, SafeAreaView, BackHandler, Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EventSource from 'react-native-event-source';
import { useAuth, useTheme, useAlert, useBanner } from '../../contexts';

// --- SECTION 1: REUSABLE UI COMPONENTS ---

const ChatHeader = React.memo(({ onBackPress, theme }) => {
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
        <View style={styles.separatorLine} />
        <Text style={styles.systemMessageText}>{message.text}</Text>
        <View style={styles.separatorLine} />
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

const TypingIndicator = ({ theme }) => {
    const styles = getStyles(theme);
    return (
        <View style={[styles.messageRow, styles.agentRow]}>
            <View style={[styles.avatarContainer, styles.messageAvatar]}>
                <Ionicons name="headset" size={20} color={theme.primary} />
            </View>
            <View style={styles.messageContent}>
                <View style={[styles.messageBubble, styles.agentBubble, styles.typingBubble]}>
                    <ActivityIndicator size="small" color={theme.text} />
                </View>
            </View>
        </View>
    );
};


// --- SECTION 2: MAIN LIVE CHAT SCREEN ---

export default function LiveChatScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user, api, accessToken } = useAuth();
  const flatListRef = useRef();
  const { showAlert } = useAlert();
  const { showBanner } = useBanner();

  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  const eventSourceRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null); 


  const fetchLatestMessages = useCallback(async () => {
    if (!chatId) return;
    try {
        const { data } = await api.get(`/support/live-chat/${chatId}`);
        setMessages(data.messages || []);
    } catch (error) {
        console.error('Polling error:', error);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }
  }, [api, chatId]);

  useEffect(() => {
    if (!chatId || !accessToken) return;

    if (eventSourceRef.current) eventSourceRef.current.close();
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    const baseURL = api.defaults.baseURL;
    const es = new EventSource(`${baseURL}/support/live-chat/${chatId}/listen`, { headers: { Authorization: `Bearer ${accessToken}` } });
    eventSourceRef.current = es;

    const connectionTimeout = setTimeout(() => {
        console.warn('SSE connection timed out. Falling back to polling.');
        es.close();
        fetchLatestMessages(); 
        pollingIntervalRef.current = setInterval(fetchLatestMessages, 4000);
    }, 8000);

    es.addEventListener('open', () => {
        clearTimeout(connectionTimeout);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        console.log('SSE connection successful.');
    });

    es.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        if (data.messages) setMessages(data.messages);
        if (typeof data.isAdminTyping === 'boolean') {
            setIsAgentTyping(data.isAdminTyping);
        }
    });

    es.addEventListener('error', () => {
        clearTimeout(connectionTimeout);
        es.close();
    });

    return () => {
        clearTimeout(connectionTimeout);
        if (eventSourceRef.current) eventSourceRef.current.close();
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [chatId, accessToken, api, fetchLatestMessages]);

  useEffect(() => {
    if (!chatId) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (inputText.trim() === '') return;
    typingTimeoutRef.current = setTimeout(() => {
      api.post(`/support/live-chat/${chatId}/typing`).catch(err => console.log("Failed to send typing event"));
    }, 500);
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [inputText, chatId, api]);

  const initializeAndLoadChat = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/support/live-chat/session');
      setChatId(data._id);
      setMessages(data.messages || []);
    } catch (error) {
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
      const { data: finalMessage } = await api.post(`/support/live-chat/${chatId}/message`, { text });
      setMessages((prev) => prev.map(msg => msg._id === tempId ? finalMessage : msg));
      
      if (pollingIntervalRef.current) {
        setTimeout(fetchLatestMessages, 300);
      }
    } catch (error) {
      showBanner('error', 'Send Failed', 'Your message could not be sent. Please try again.');
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
          
          const originalMessages = messages;
          setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
          
          try {
            await api.delete(`/support/live-chat/delete/${chatId}/${messageId}`);
            showBanner('success', 'Message removed! It’s no longer visible.')
          } catch (err) {
            console.error('Delete Error:', err);
            showBanner('error', 'Delete Failed', 'Could not delete the message. It has been restored.');
            setMessages(originalMessages);
          }
      }},
    ]);
  };
  const hasAgentReplied = messages.some(msg => msg.isAdmin === true);
  const displayedMessages = hasAgentReplied ? messages.filter(msg => msg.senderId !== 'system') : messages;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ChatHeader onBackPress={() => navigation.goBack()} theme={theme}/>
        <View style={styles.placeholderContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.placeholderText}>Connecting to support...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader onBackPress={() => navigation.goBack()} theme={theme}/>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="undefined"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={displayedMessages}
          keyExtractor={(item) => item._id?.toString()}
          renderItem={({ item, index }) => {
            const prevMessage = displayedMessages[index - 1];
            const showSenderDetails = !prevMessage || prevMessage.senderId !== item.senderId;
            return (
                <TouchableOpacity activeOpacity={0.8} onLongPress={() => handleDeleteMessage(item)}>
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
        ListFooterComponent={isAgentTyping ? <TypingIndicator theme={theme} /> : null}
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

// Stylesheet remains unchanged...
const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
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
    scrollContentContainer: {
      flexGrow: 1, justifyContent: 'flex-end',
      paddingTop: 10, paddingHorizontal: 15,
    },
    placeholderContent: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
    placeholderText: {
      color: theme.textSecondary, fontSize: 15, marginTop: 15,
      textAlign: 'center', lineHeight: 22,
    },
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
    systemMessageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      marginVertical: 15,
      paddingHorizontal: 10,
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    systemMessageText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '500',
      marginHorizontal: 10,
    },
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
      paddingHorizontal: 15, paddingVertical: 8,
      minHeight: 44,
    },
    sendButton: {
      alignItems: 'center', backgroundColor: theme.primary,
      borderRadius: 22, height: 44, justifyContent: 'center', width: 44,
    },
    disabledButton: { backgroundColor: theme.disabled },
    typingBubble: {
        width: 60,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
  });