// screens/ChatbotScreen.js
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
  Image,
  FlatList,
  Dimensions,
  Animated
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import { useNetInfo } from '@react-native-community/netinfo';
import * as Animatable from 'react-native-animatable';
import { useFocusEffect } from '@react-navigation/native';

import { useTheme, useAuth, useAlert, useBanner } from '../../contexts';
import { faqData } from '../../data/faqData';
import EventSource from 'react-native-event-source';
import apiConfig from '../../config/apiConfig';

// --- Constants ---
const { CHATBOT_API_ENDPOINT, CONFIG_INTERNAL_API_KEY} = apiConfig;
const HEADER_HEIGHT = Platform.select({ ios: 90, android: 70 });
const RETRY_DELAY_MS = 5000;
const INITIALIZATION_TIMEOUT_MS = 15000;
const SUGGESTED_PROMPTS = [
    { title: "Billing Inquiry", question: "How can I pay my bill?" },
    { title: "Connection Issue", question: "My internet is slow, what should I do?" },
    { title: "Plan Details", question: "What internet plans do you offer?" },
    { title: "Contact Support", question: "How can I speak to a human agent?" },
];

// ====================================================================
// --- CHILD & HELPER COMPONENTS
// ====================================================================

const BotAvatar = ({ theme }) => {
  const styles = getStyles(theme);
  return (
    <View style={styles.avatarShell}>
      <Image source={require('../../assets/images/avatars/bot-avatar.jpg')} style={styles.avatarImage} />
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

const MessageBubble = ({ message, theme, profile, previousMessage, nextMessage }) => {
    const styles = getStyles(theme);
    const isUser = message.isUser;
    const isLastInSequence = !nextMessage || nextMessage.isUser !== isUser;
    const isFirstInSequence = !previousMessage || previousMessage.isUser !== isUser;
    
    const bubbleStyles = [
        styles.messageBubble, 
        isUser ? styles.userBubble : styles.botBubble,
        isFirstInSequence && { marginTop: 12 },
        isLastInSequence ? 
            (isUser ? styles.lastInSequenceUser : styles.lastInSequenceBot) : null
    ];

    const markdownStyles = { 
        body: { fontSize: 15, color: isUser ? theme.textOnPrimary : theme.text }, 
        link: { color: isUser ? '#FFF' : theme.accent, textDecorationLine: 'underline' },
    };
    
    const formattedTime = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

    return (
        <Animatable.View animation="fadeInUp" duration={400}>
            <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
                {!isUser && (
                    <View style={styles.avatarColumn}>{isLastInSequence && <BotAvatar theme={theme} />}</View>
                )}
                <View style={styles.messageContentWrapper}>
                    <View style={bubbleStyles}>
                        <Markdown style={markdownStyles}>{message.text || ' '}</Markdown>
                    </View>
                    {isLastInSequence && formattedTime && (
                        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
                            {formattedTime}
                        </Text>
                    )}
                </View>
                {isUser && (
                    <View style={styles.avatarColumn}>{isLastInSequence && <UserAvatar theme={theme} profile={profile} />}</View>
                )}
            </View>
      </Animatable.View>
    );
};
  
const TypingIndicator = ({ theme }) => {
    const styles = getStyles(theme);
    const dotAnimation = { 0: { opacity: 0.3 }, 1: { opacity: 1 } };
    return (
      <View style={[styles.messageRow, styles.botRow, { marginBottom: 10 }]}>
        <View style={styles.avatarColumn}><BotAvatar theme={theme} /></View>
        <View style={[styles.messageBubble, styles.botBubble, styles.lastInSequenceBot, styles.typingBubble]}>
          <Animatable.View animation={dotAnimation} iterationCount="infinite" direction="alternate" duration={600} style={styles.typingDot} />
          <Animatable.View animation={dotAnimation} iterationCount="infinite" direction="alternate" duration={600} delay={200} style={styles.typingDot} />
          <Animatable.View animation={dotAnimation} iterationCount="infinite" direction="alternate" duration={600} delay={400} style={styles.typingDot} />
        </View>
      </View>
    );
};

const ConnectionStatusBanner = ({ state, countdown }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const slideAnim = useRef(new Animated.Value(-100)).current;

    const isVisible = state.status === 'offline' || state.status === 'failed_retrying';

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : -100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    const getBannerStyle = () => {
        return state.status === 'offline' ? styles.bannerOffline : styles.bannerReconnecting;
    };

    const getMessage = () => {
        if (state.status === 'offline') return "You are offline. Please check your connection.";
        if (state.status === 'failed_retrying') {
            return `Connection failed. Retrying in ${countdown}s...`;
        }
        return '';
    };

    if (!isVisible) return null;

    return (
        <Animated.View style={[styles.statusBanner, getBannerStyle(), { transform: [{ translateY: slideAnim }] }]}>
            <Ionicons name={state.status === 'offline' ? "cloud-offline-outline" : "sync-outline"} size={18} color={theme.textOnPrimary} />
            <Text style={styles.bannerText}>{getMessage()}</Text>
        </Animated.View>
    );
};

const SuggestedPrompts = ({ onPromptSelect }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Animatable.View animationType="fade" duration={600} style={styles.promptsListContainer}>
            <Text style={styles.promptsTitle}>Try asking something like...</Text>
            <View style={styles.promptsContainer}>
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                    <TouchableOpacity key={index} style={styles.promptChip} onPress={() => onPromptSelect(prompt.question)}>
                        <Text style={styles.promptChipText}>{prompt.question}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </Animatable.View>
    );
};

const ChatSeparator = ({ theme }) => {
    const styles = getStyles(theme);
    const today = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    return (
        <View style={styles.chatSeparatorContainer}>
            <View style={styles.chatSeparatorLine} />
            <Text style={styles.chatSeparatorText}>{today}</Text>
            <View style={styles.chatSeparatorLine} />
        </View>
    );
};


// ====================================================================
// --- MAIN CHATBOT SCREEN ---
// ====================================================================
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
    const [countdown, setCountdown] = useState(0);
    const [showPrompts, setShowPrompts] = useState(true);
    const netInfo = useNetInfo();
    const { showAlert } = useAlert();
    const { showBanner } = useBanner();
  
    const retryTimeoutRef = useRef(null);
    const initializationTimeoutRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const backoffDelayRef = useRef(RETRY_DELAY_MS);
    const INITIAL_BACKOFF_MS = 5000;
    const MAX_BACKOFF_MS = 60000;
  
    const isSendActive = !isReplying && inputText.trim() !== '' && chatState.status === 'online';
  
    // MODIFIED: Added effect to scroll to bottom when messages update
    useEffect(() => {
        if (messages.length > 0) {
            const timer = setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100); // Small delay to ensure UI has updated
            return () => clearTimeout(timer);
        }
    }, [messages]);

    const clearAllTimers = useCallback(() => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (initializationTimeoutRef.current) clearTimeout(initializationTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    },[]);
    
    const startCountdown = useCallback((delay) => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      let secondsLeft = Math.ceil(delay / 1000);
      setCountdown(secondsLeft);
      countdownIntervalRef.current = setInterval(() => {
          secondsLeft -= 1;
          setCountdown(secondsLeft);
          if (secondsLeft <= 0) {
              clearInterval(countdownIntervalRef.current);
          }
      }, 1000);
    }, []);
  
    const initializeChat = useCallback(async () => {
      clearAllTimers();
      setChatState({ status: 'connecting', message: 'Connecting to AI...' });
  
      if (netInfo.isConnected === false) {
        setChatState({ status: 'offline', message: 'You appear to be offline.' });
        return;
      }
  
      try {
        const apiHeaders = { 'X-API-Key': CONFIG_INTERNAL_API_KEY };
        const timeoutPromise = new Promise((_, reject) => {
          initializationTimeoutRef.current = setTimeout(() => reject(new Error('AI_TIMEOUT')), INITIALIZATION_TIMEOUT_MS);
        });
        const healthCheckPromise = fetch(`${CHATBOT_API_ENDPOINT}/health`, { headers: apiHeaders });
        const healthResponse = await Promise.race([healthCheckPromise, timeoutPromise]);
        clearTimeout(initializationTimeoutRef.current);
  
        if (!healthResponse.ok) throw new Error(`AI service responded with status ${healthResponse.status}`);
  
        backoffDelayRef.current = INITIAL_BACKOFF_MS; 
        setChatState({ status: 'online', message: 'Online' });
  
        const historyResponse = await fetch(`${CHATBOT_API_ENDPOINT}/history/${profile._id}`, { headers: apiHeaders });
        const historyData = await historyResponse.json();
  
        if (historyData?.length > 0) {
          setMessages(historyData.map((m, index) => ({ id: `hist-${m.id || index}`, text: m.parts[0].text, isUser: m.role === 'user', timestamp: m.timestamp || new Date() })));
        }
      } catch (error) {
        const currentDelay = backoffDelayRef.current;
        const nextDelay = Math.min(currentDelay * 2, MAX_BACKOFF_MS);
        backoffDelayRef.current = nextDelay;
  
        console.warn(`Chat Initialization Failed: ${error.message}. Retrying in ${nextDelay / 1000}s.`);
        
        setChatState({ status: 'failed_retrying', message: `Connection failed.` });
        startCountdown(nextDelay);
        
        retryTimeoutRef.current = setTimeout(initializeChat, nextDelay);
      }
    }, [netInfo.isConnected, profile?._id, clearAllTimers, startCountdown]);
    
    const handleManualRetry = useCallback(() => {
      clearAllTimers();
      setMessages([]);
      setShowPrompts(true);
      backoffDelayRef.current = INITIAL_BACKOFF_MS;
      initializeChat();
    }, [initializeChat, clearAllTimers]);
  
    useEffect(() => {
      if (profile) {
        handleManualRetry();
      } else {
        setChatState({ status: 'disconnected', message: 'Disconnected' });
        setMessages([]);
      }
      return clearAllTimers;
    }, [profile, handleManualRetry, clearAllTimers]);
  
    useFocusEffect(
      useCallback(() => {
        setShowPrompts(true);
      }, [])
    );
  
    useImperativeHandle(ref, () => ({
      refresh: handleManualRetry,
    }));
  
    const sendChatMessage = useCallback((textToSend) => {
      const text = textToSend.trim();
      if (!text || isReplying || chatState.status !== 'online') return;
  
      setShowPrompts(false);

      const newUserMessage = { id: `user-${Date.now()}`, text: text, isUser: true, timestamp: new Date() };
      setMessages((prev) => [...prev, newUserMessage]);
      setIsReplying(true);
      setInputText('');
  
      const historyForApi = [...messages, newUserMessage]
        .filter(m => !m.id.startsWith('initial-'))
        .map((msg) => ({
          role: msg.isUser ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));
  
      const eventSource = new EventSource(`${CHATBOT_API_ENDPOINT}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG_INTERNAL_API_KEY },
        body: JSON.stringify({ history: historyForApi, userId: profile._id }),
      });

      const botResponseId = `bot-${Date.now()}`;
      let fullResponse = '';
      let isFirstChunk = true;
  
      eventSource.addEventListener('message', (event) => {
        if (!event.data) return;
        try {
          const data = JSON.parse(event.data);
          if (data.chunk) {
            fullResponse += data.chunk;
            if (isFirstChunk) {
              isFirstChunk = false;
              setIsReplying(false); 
              setMessages((currentMsgs) => [ ...currentMsgs, { id: botResponseId, text: fullResponse, isUser: false, timestamp: new Date() }]);
            } else {
              setMessages((currentMsgs) => currentMsgs.map((msg) => msg.id === botResponseId ? { ...msg, text: fullResponse } : msg));
            }
          }
        } catch (e) { console.error("Failed to parse SSE message data:", e); }
      });
  
      eventSource.addEventListener('end', () => eventSource.close());
  
      eventSource.addEventListener('error', (error) => {
        console.error('SSE connection error:', error);
        setIsReplying(false);
        if (!isFirstChunk) { 
            setMessages((currentMsgs) => [ ...currentMsgs, { id: `err-${Date.now()}`, text: '[Sorry, the connection was lost.]', isUser: false, timestamp: new Date() }]);
        }
        eventSource.close();
      });
    }, [isReplying, chatState.status, messages, profile?._id]);
    
    const handlePromptSelect = (question) => {
        setShowPrompts(false);
        sendChatMessage(question);
    };

    const handleFaqSelect = (faqItem) => {
        setIsFaqVisible(false);
        const userQuestionMessage = { id: `user-faq-${Date.now()}`, text: faqItem.question, isUser: true, timestamp: new Date() };
        const botAnswerMessage = { id: `bot-faq-${Date.now()}`, text: faqItem.answer, isUser: false, timestamp: new Date() };
        setMessages((prev) => [...prev, userQuestionMessage, botAnswerMessage]);
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
      headers: { 
        'Content-Type': 'application/json', 
        'X-API-Key': CONFIG_INTERNAL_API_KEY 
      },
      body: JSON.stringify({ 
        userId: profile._id, 
        message: { 
          text: selectedMessage.text, 
          role: selectedMessage.isUser ? 'user' : 'model' 
        } 
      }),
    });
    if (!response.ok) {
      throw new Error('Server responded with an error.');
    }
    showBanner('success', 'Message Deleted', 'The message has been removed from your history.');
    handleManualRetry();

  } catch (error) {
    showBanner('error', 'Deletion Failed', 'Could not delete the message.');
  }
};

const handleClearChat = () => {
  setActionSheetVisible(false);

  showAlert('Clear Chat', 'Are you sure you want to delete this entire conversation?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Clear Chat', 
      style: 'destructive',
      onPress: async () => {
        try {
          const response = await fetch(`${CHATBOT_API_ENDPOINT}/history/${profile._id}`, { 
            method: 'DELETE', 
            headers: { 'X-API-Key': CONFIG_INTERNAL_API_KEY } 
          });

          if (!response.ok) {
            throw new Error('Server failed to clear chat.');
          }

          showBanner('success', 'Chat Cleared', 'Your conversation history has been deleted.');

          handleManualRetry();

        } catch (error) { 
          showBanner('error', 'Operation Failed', 'Could not clear the chat history.'); 
        }
      },
    },
  ]);
};
    if (chatState.status === 'initializing' || chatState.status === 'connecting') {
      return (
        <View style={styles.placeholderContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.placeholderText}>{chatState.message}</Text>
        </View>
      );
    }
  
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ConnectionStatusBanner state={chatState} countdown={countdown} />
        
        <Modal
          animationType="fade"
          transparent={true}
          visible={isFaqVisible}
          onRequestClose={() => setIsFaqVisible(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setIsFaqVisible(false)}>
                <Animatable.View animationType="fade" duration={300} style={styles.faqModalContent}>
                    <View style={styles.modalHeader}>
                        <View style={styles.dragHandle} />
                        <Text style={styles.modalTitle}>Frequently Asked Questions</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsFaqVisible(false)}>
                            <Ionicons name="close" size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={faqData}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.faqItem} onPress={() => handleFaqSelect(item)}>
                                <Text style={styles.faqQuestion}>{item.question}</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                </Animatable.View>
            </TouchableOpacity>
        </Modal>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => ( 
            <TouchableOpacity onLongPress={() => handleLongPress(item)} activeOpacity={0.9}>
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
          ListFooterComponent={
            <>
              {isReplying && <TypingIndicator theme={theme} />}
              {messages.length > 1 && showPrompts && <ChatSeparator theme={theme} />}
              {showPrompts && <SuggestedPrompts onPromptSelect={handlePromptSelect} />}
            </>
          }
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        />
  
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={HEADER_HEIGHT}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.utilityButton} onPress={() => setIsFaqVisible(true)}>
              <Ionicons name="add-circle-outline" size={28} color={theme.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder={chatState.status === 'online' ? 'Message...' : 'Connecting...'}
              value={inputText}
              onChangeText={setInputText}
              editable={chatState.status === 'online'}
              placeholderTextColor={theme.textSecondary}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, isSendActive ? styles.sendButtonActive : styles.sendButtonInactive]}
              onPress={() => sendChatMessage(inputText)}
              disabled={!isSendActive}
            >
              <Ionicons name="arrow-up" size={22} color={isSendActive ? theme.textOnPrimary : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
  
        <Modal transparent={true} visible={actionSheetVisible} onRequestClose={() => setActionSheetVisible(false)} animationType="fade">
          <TouchableOpacity style={styles.actionSheetOverlay} onPress={() => setActionSheetVisible(false)}>
            <Animatable.View animation="slideInUp" duration={300} style={styles.actionSheetContainer}>
              <TouchableOpacity style={styles.actionSheetButton} onPress={handleDeleteMessage}>
                <Text style={styles.actionSheetText}>Delete Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionSheetButton} onPress={handleClearChat}>
                <Text style={[styles.actionSheetText, { color: theme.danger }]}>Clear Entire Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionSheetButton, styles.actionSheetCancelButton]} onPress={() => setActionSheetVisible(false)}>
                <Text style={[styles.actionSheetText, { fontWeight: 'bold' }]}>Cancel</Text>
              </TouchableOpacity>
            </Animatable.View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
});

export default ChatbotScreen;

// --- STYLESHEET ---
const getStyles = (theme) => StyleSheet.create({
    scrollContentContainer: { 
      paddingTop: 10, // MODIFIED: Changed from paddingBottom to paddingTop
      paddingHorizontal: 10,
      flexGrow: 1, 
      justifyContent: 'flex-start' // MODIFIED: Changed from flex-end to flex-start
    },
    messageRow: { 
        flexDirection: 'row', 
        marginVertical: 2, 
        alignItems: 'flex-end',
    },
    userRow: { 
        justifyContent: 'flex-end',
    },
    botRow: { 
        justifyContent: 'flex-start',
    },
    avatarColumn: { 
        width: 40, 
        justifyContent: 'flex-end', 
        alignItems: 'center',
    },
    avatarShell: { 
        width: 34, 
        height: 34, 
        borderRadius: 17, 
        backgroundColor: theme.border, 
        overflow: 'hidden', 
        marginBottom: 3,
    },
    avatarImage: { 
        width: '100%', 
        height: '100%',
    },
    avatarInitialsContainer: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center',
    },
    avatarInitialsText: { 
        color: theme.textOnPrimary, 
        fontSize: 14, 
        fontWeight: 'bold',
    },
    messageContentWrapper: {
        maxWidth: '82%',
    },
    messageBubble: { 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        borderRadius: 22,
    },
    userBubble: { 
        backgroundColor: theme.primary, 
        marginLeft: 8,
    },
    botBubble: { 
        backgroundColor: theme.bot, 
        marginRight: 8,
    },
    lastInSequenceUser: { 
        borderBottomRightRadius: 6,
    },
    lastInSequenceBot: { 
        borderBottomLeftRadius: 6,
    },
    timestamp: {
        fontSize: 11,
        color: theme.textSecondary,
        marginTop: 5,

    },
    userTimestamp: {
        textAlign: 'right',
        marginRight: 8,
    },
    botTimestamp: {
        textAlign: 'left',
        marginLeft: 8,
    },
    typingBubble: { 
        width: 80, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-evenly', 
        paddingVertical: 14,
    },
    typingDot: { 
        width: 8, 
        height: 8, 
        borderRadius: 4, 
        backgroundColor: theme.textSecondary,
    },
    inputContainer: { 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        paddingVertical: 8, 
        paddingHorizontal: 12, 
        borderTopWidth: 1, 
        borderTopColor: theme.border, 
        backgroundColor: theme.surface,
    },
    utilityButton: { 
        paddingHorizontal: 6, 
        paddingBottom: 8,
    },
    input: { 
        flex: 1, 
        backgroundColor: theme.ChatInput,
        borderRadius: 22, 
        paddingHorizontal: 15, 
        paddingTop: Platform.OS === 'ios' ? 10 : 8, 
        paddingBottom: Platform.OS === 'ios' ? 10 : 8, 
        fontSize: 15, 
        color: theme.text, 
        maxHeight: 120, 
        marginRight: 8,
        bottom: 4,
    },
    sendButton: { 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        alignItems: 'center', 
        justifyContent: 'center',
    },
    sendButtonActive: { 
        backgroundColor: theme.accent,
    },
    sendButtonInactive: { 
        backgroundColor: theme.disabled,
    },
    placeholderContent: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
        backgroundColor: theme.background,
    },
    placeholderText: { 
        fontSize: 16, 
        color: theme.textSecondary, 
        textAlign: 'center', 
        lineHeight: 22, 
        marginTop: 16,
    },
    actionSheetOverlay: { 
        flex: 1, 
        justifyContent: 'flex-end', 
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    actionSheetContainer: { 
        backgroundColor: theme.surface, 
        borderTopLeftRadius: 20, 
        borderTopRightRadius: 20, 
        paddingTop: 10, 
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    actionSheetButton: { 
        padding: 20, 
        borderBottomWidth: 1, 
        borderBottomColor: theme.border,
    },
    actionSheetCancelButton: { 
        marginTop: 10, 
        borderBottomWidth: 0,
    },
    actionSheetText: { 
        textAlign: 'center', 
        fontSize: 18, 
        color: theme.text,
    },
    modalOverlay: { 
        flex: 1, 
        justifyContent: 'flex-end', 
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    faqModalContent: {
        backgroundColor: theme.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '70%',
    },
    modalHeader: {
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: theme.border,
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.text,
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        backgroundColor: theme.serv,
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    faqItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    faqQuestion: {
        fontSize: 16,
        color: theme.text,
        flex: 1,
        marginRight: 10,
    },
    separator: {
        height: 1,
        backgroundColor: theme.border,
        marginLeft: 20,
    },
    statusBanner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerOffline: { 
        backgroundColor: theme.danger,
    },
    bannerReconnecting: { 
        backgroundColor: theme.warning,
    },
    bannerText: {
        color: theme.textOnPrimary,
        fontWeight: '600',
        marginLeft: 8,
    },
    promptsListContainer: {
        paddingHorizontal: 10,
        marginBottom: 10,
    },
    promptsTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.textSecondary,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 12,
    },
    promptsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    promptChip: {
        backgroundColor: theme.surface,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 14,
        margin: 5,
        borderWidth: 1,
        borderColor: theme.border,
    },
    promptChipText: {
        fontSize: 14,
        color: theme.text,
    },
    chatSeparatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    chatSeparatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.border,
    },
    chatSeparatorText: {
        marginHorizontal: 10,
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
});