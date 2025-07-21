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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import EventSource from 'react-native-event-source';
import { useAuth, useTheme, useAlert } from '../contexts';


// --- Reusable Message Bubble Component ---
const MessageBubble = ({ message, isUser, theme }) => {
  const styles = getStyles(theme);
  if (message.senderId === 'system') {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>{message.text}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.agentRow]}>
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.agentBubble]}>
        <Text style={isUser ? styles.userMessageText : styles.agentMessageText}>
          {message.text}
        </Text>
        <View style={styles.timestampWrapper}>
          <Text style={isUser ? styles.userTimestamp : styles.agentTimestamp}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    </View>
  );
};

// --- Main Live Chat Screen ---
export default function LiveChatScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user, api, accessToken } = useAuth(); // `user` object is available here
  const flatListRef = useRef();
  const { showAlert } = useAlert();

  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('offline');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Effect for SSE connection (unchanged, correct)
  useEffect(() => {
    if (!chatId || !accessToken) return;
    const baseURL = api.defaults.baseURL;
    const eventSource = new EventSource(`${baseURL}/support/live-chat/${chatId}/listen`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    eventSource.addEventListener('open', () => setServerStatus('online'));
    eventSource.addEventListener('message', (event) =>
      setMessages(JSON.parse(event.data).messages || [])
    );
    eventSource.addEventListener('error', (error) => {
      console.error('SSE Error:', error);
      setServerStatus('offline');
    });
    return () => {
      eventSource.close();
      setServerStatus('offline');
    };
  }, [chatId, accessToken, api.defaults.baseURL]);

  // Main function to connect and load history (unchanged, correct)
  const initializeAndLoadChat = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: sessionResponse } = await api.post('/support/live-chat/session');
      setChatId(sessionResponse.chatId);
      setMessages(sessionResponse.messages || []);
    } catch (error) {
      console.error('Connect to Chat Error:', error.response?.data || error.message);
      showAlert('Connection Failed', 'Could not connect to the chat service.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [api, navigation, showAlert]);

  // Re-initialize the chat every time the screen is focused (unchanged, correct)
  useFocusEffect(
    useCallback(() => {
      initializeAndLoadChat();
      const backAction = () => {
        navigation.goBack();
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [initializeAndLoadChat, navigation])
  );

  const onSendMessage = async () => {
    const text = inputText.trim();
    if (text === '' || !chatId || isSending) return;

    setIsSending(true);
    setInputText('');

    const tempId = `pending_${Date.now()}`;
    // --- FIX: Use `user?.displayName` instead of the non-existent `profile?.displayName` ---
    const pendingMessage = {
      _id: tempId,
      text,
      senderId: user._id,
      senderName: user?.displayName, // Changed `profile` to `user`
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, pendingMessage]);

    try {
      await api.post(`/support/live-chat/${chatId}/message`, { text });
    } catch (error) {
      console.error('Failed to send message:', error);
      showAlert('Send Failed', 'Your message could not be sent. Please check your connection.');
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  // handleDeleteMessage is unchanged and correct
  const handleDeleteMessage = (messageToDelete) => {
    if (messageToDelete.senderId !== user?._id) return;
    showAlert('Delete Message', 'Are you sure you want to permanently delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const messageId = messageToDelete._id;
          if (!chatId || !messageId || messageId.startsWith('pending_')) return;
          setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
          try {
            await api.delete(`/support/live-chat/delete/${chatId}/${messageId}`);
          } catch (err) {
            console.error('Failed to delete message on server:', err);
            showAlert('Delete Failed', 'Could not delete the message. It has been restored.');
            setMessages((prev) =>
              [...prev, messageToDelete].sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
              )
            );
          }
        },
      },
    ]);
  };

  // The rest of the component's render logic is unchanged and correct.
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Support</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.placeholderContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.placeholderText}>Connecting and loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Live Support</Text>
          <View style={styles.status}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: serverStatus === 'online' ? theme.success : theme.danger },
              ]}
            />
            <Text style={styles.statusText}>{serverStatus}</Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id?.toString() || item.timestamp.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onLongPress={() => handleDeleteMessage(item)}
              delayLongPress={500}
              activeOpacity={0.7}
            >
              <MessageBubble message={item} isUser={item.senderId === user?._id} theme={theme} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.scrollContentContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.placeholderContent}>
              <Ionicons name="chatbubbles-outline" size={60} color={theme.textSecondary} />
              <Text style={styles.placeholderText}>No messages yet. Say hello!</Text>
            </View>
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor={theme.textSecondary}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && { backgroundColor: theme.disabled },
            ]}
            onPress={onSendMessage}
            disabled={!inputText.trim() || isSending}
          >
            <Ionicons name="send" size={20} color={theme.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles are unchanged
const getStyles = (theme) =>
  StyleSheet.create({
    agentBubble: {
      backgroundColor: theme.surface,
      borderBottomLeftRadius: 5,
      borderColor: theme.border,
      borderWidth: 1,
    },
    agentMessageText: { color: theme.text, fontSize: 16, lineHeight: 22 },
    agentRow: { justifyContent: 'flex-start' },
    agentTimestamp: { color: theme.textSecondary, fontSize: 11 },
    container: { backgroundColor: theme.background, flex: 1 },
    header: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: { color: theme.text, fontSize: 17, fontWeight: '600' },
    input: {
      backgroundColor: theme.background,
      borderRadius: 22,
      color: theme.text,
      flex: 1,
      fontSize: 16,
      marginRight: 10,
      maxHeight: 120,
      minHeight: 44,
      paddingHorizontal: 20,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    inputContainer: {
      alignItems: 'flex-end',
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    messageBubble: {
      borderRadius: 20,
      maxWidth: '80%',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    messageRow: { flexDirection: 'row', marginVertical: 4 },
    placeholderContent: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
    placeholderText: {
      color: theme.textSecondary,
      fontSize: 16,
      marginTop: 15,
      textAlign: 'center',
    },
    scrollContentContainer: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      paddingBottom: 10,
      paddingHorizontal: 15,
    },
    sendButton: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      marginBottom: Platform.OS === 'android' ? 4 : 0,
      width: 44,
    },
    status: { alignItems: 'center', flexDirection: 'row', marginTop: 2 },
    statusIndicator: { borderRadius: 4, height: 8, marginRight: 6, width: 8 },
    statusText: { color: theme.textSecondary, fontSize: 12, textTransform: 'capitalize' },
    systemMessageContainer: {
      alignSelf: 'center',
      backgroundColor: theme.isDarkMode ? '#2c2c2e' : '#e5e5ea',
      borderRadius: 15,
      marginVertical: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    systemMessageText: { color: theme.textSecondary, fontSize: 12, fontStyle: 'italic' },
    timestampWrapper: { alignSelf: 'flex-end', marginTop: 5 },
    userBubble: { backgroundColor: theme.primary, borderBottomRightRadius: 5 },
    userMessageText: { color: theme.textOnPrimary, fontSize: 16, lineHeight: 22 },
    userRow: { justifyContent: 'flex-end' },
    userTimestamp: { color: theme.textOnPrimary, fontSize: 11, opacity: 0.7 },
  });
