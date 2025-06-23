import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, TextInput, View, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, TouchableOpacity, Modal, BackHandler, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { faqData } from './faqData';
import { useNavigation } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTheme } from '../contexts/ThemeContext'; // <-- Import useTheme
import { auth, database } from '../config/firebaseConfig';
import { ref, set, push, serverTimestamp } from 'firebase/database';

// --- Configuration ---
const API_ENDPOINT = 'https://fntc-chat-backend.onrender.com';
const CHARACTER_NAME = 'FNTC Bot';

// --- MAIN SUPPORT SCREEN COMPONENT ---
export default function SupportScreen() {
  const navigation = useNavigation();
  const scrollViewRef = useRef();
  const netInfo = useNetInfo();
  const currentUser = auth.currentUser;
  const { theme } = useTheme(); // <-- Get theme from context
  const styles = getStyles(theme); // <-- Get theme-specific styles
  const markdownStyles = getMarkdownStyles(theme); // <-- Get theme-specific markdown styles

  // --- State Management (unchanged) ---
  const [supportMode, setSupportMode] = useState('hub');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isFaqVisible, setIsFaqVisible] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // --- Smart Back Button Handler ---
  useEffect(() => {
    const handleBackPress = () => {
      if (isFaqVisible) { setIsFaqVisible(false); return true; }
      if (supportMode !== 'hub') { setSupportMode('hub'); return true; }
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [supportMode, navigation, isFaqVisible]);

  // --- Initial Messages for AI Chatbot ---
  useEffect(() => {
    // This effect now only runs when the mode changes to 'chatbot'
    if (supportMode === 'chatbot') {
      // It resets the messages array to the initial state every time
      const initialAiText = `Hello! I'm ${CHARACTER_NAME}, your virtual assistant.\n\nI can help with common questions about your account, services, or troubleshooting.`;
      const initialMessage = { id: `initial-${Date.now()}`, text: initialAiText, isUser: false, timestamp: Date.now() };
      setMessages([initialMessage]);
    }
  }, [supportMode]);

  // --- AI Chatbot Functions ---
  const sendAiMessage = async (messageText) => {
    const text = messageText.trim();
    if (text === '' || isLoading) return; // Removed currentUser check

    const userMessage = { id: `user-${Date.now()}`, text, isUser: true };
    // Optimistically update local state ONLY
    setMessages(prev => [...prev, userMessage]);

    setInputText('');
    setIsLoading(true);

    if (!netInfo.isConnected) {
      const errorMsg = { id: `err-${Date.now()}`, text: "You're offline. Please reconnect to chat.", isUser: false };
      setMessages(prev => [...prev, errorMsg]);
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINT}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }),
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const botResponse = { id: `bot-${Date.now()}`, text: data.reply, isUser: false };
      // Add bot response to local state ONLY
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error("Chat API error:", error);
      const errorMsg = { id: `err-${Date.now()}`, text: "Sorry, I'm having connection issues. Please try again.", isUser: false };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FIX: This function now works because sendAiMessage is fixed ---
  const handleFaqSelect = (faqItem) => {
    setIsFaqVisible(false);
    sendAiMessage(faqItem.question);
  };
  
  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
        Alert.alert("Missing Information", "Please fill out both the subject and description.");
        return;
    }
    if (!currentUser) {
        Alert.alert("Authentication Error", "You must be logged in to submit a ticket.");
        return;
    }

    setIsSubmittingTicket(true);
    
    try {
        // Create a reference to the user's tickets node
        const userTicketsRef = ref(database, `support_tickets/${currentUser.uid}`);
        const newTicketRef = push(userTicketsRef); // Use push to get a unique ticket ID

        const ticketData = {
            ticketId: newTicketRef.key,
            userId: currentUser.uid,
            subject: ticketSubject,
            description: ticketDescription,
            status: 'Open',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Set the data at the new unique ticket location
        await set(newTicketRef, ticketData);
        
        Alert.alert("Ticket Submitted", "Your support ticket has been created successfully.",
            [{ text: "OK", onPress: () => { setSupportMode('hub'); setTicketDescription(''); setTicketSubject('');} }]
        );
    } catch (error) {
        console.error("Firebase ticket submission error:", error);
        Alert.alert("Submission Failed", "Could not submit your ticket. Please try again.");
    } finally {
        setIsSubmittingTicket(false);
    }
  };

  // --- RENDER FUNCTIONS (Now theme-aware) ---
  const renderSupportHub = () => (
    <View style={styles.hubContainer}>
      <View style={styles.hubHeader}>
         <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.headerBackIcon}>
            <Ionicons name="arrow-back" size={26} color={theme.textOnPrimary} />
         </TouchableOpacity>
        <Text style={styles.hubTitle}>Support Center</Text>
      </View>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <Text style={styles.hubSubtitle}>How can we help you today?</Text>
        <TouchableOpacity style={styles.supportCard} onPress={() => setSupportMode('chatbot')}>
          <Ionicons name="chatbubbles-outline" size={32} color={theme.primary} />
          <View style={styles.cardTextContainer}><Text style={styles.cardTitle}>AI Chatbot</Text><Text style={styles.cardDescription}>Get instant answers 24/7 from our automated assistant.</Text></View>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.supportCard} onPress={() => setSupportMode('agent_chat')}>
          <Ionicons name="headset-outline" size={32} color={theme.primary} />
          <View style={styles.cardTextContainer}><Text style={styles.cardTitle}>Chat with an Agent</Text><Text style={styles.cardDescription}>Connect with one of our support specialists for live help.</Text></View>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.supportCard} onPress={() => setSupportMode('ticket')}>
          <Ionicons name="document-text-outline" size={32} color={theme.primary} />
          <View style={styles.cardTextContainer}><Text style={styles.cardTitle}>Create a Support Ticket</Text><Text style={styles.cardDescription}>Submit a formal request for technical or billing issues.</Text></View>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderChatbot = () => (
    <View style={styles.container}>
      <Modal animationType="fade" transparent={true} visible={isFaqVisible} onRequestClose={() => setIsFaqVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setIsFaqVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Frequently Asked Questions</Text><TouchableOpacity onPress={() => setIsFaqVisible(false)}><Ionicons name="close-circle" size={28} color={theme.textSecondary} /></TouchableOpacity></View>
            <ScrollView>{faqData.map(item => (<TouchableOpacity key={item.id} style={styles.faqItem} onPress={() => handleFaqSelect(item)}><Text style={styles.faqQuestion}>{item.question}</Text></TouchableOpacity>))}</ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSupportMode('hub')} style={styles.headerBackIcon}><Ionicons name="arrow-back" size={24} color={theme.textSecondary} /></TouchableOpacity>
        <View style={styles.headerTitleContainer}><Text style={styles.headerTitle}>{CHARACTER_NAME}</Text><View style={styles.status}><View style={[styles.statusIndicator, { backgroundColor: netInfo.isConnected ? theme.success : theme.danger }]} /><Text style={styles.statusText}>{netInfo.isConnected ? 'Online' : 'Offline'}</Text></View></View>
      </View>
      <ScrollView ref={scrollViewRef} style={styles.messageContainer} contentContainerStyle={styles.scrollContentContainer} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
        {messages.map(message => (<MessageBubble key={message.id} message={message} name={CHARACTER_NAME} theme={theme} />))}
        {isLoading && <TypingIndicator name={CHARACTER_NAME} theme={theme} />}
      </ScrollView>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.faqButton} onPress={() => setIsFaqVisible(true)}><Ionicons name="help-circle-outline" size={28} color={theme.textSecondary} /></TouchableOpacity>
          <TextInput style={styles.input} placeholder="Type a message..." value={inputText} onChangeText={setInputText} editable={!isLoading} placeholderTextColor={theme.textSecondary} multiline />
          <TouchableOpacity style={styles.sendButton} onPress={() => sendAiMessage(inputText)} disabled={isLoading || inputText.trim() === ''}><Ionicons name="arrow-up-circle" size={36} color={isLoading || inputText.trim() === '' ? theme.disabled : theme.accent} /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  const renderComingSoon = () => (
    <View style={styles.container}>
      <View style={[styles.header, {paddingVertical: 46, borderColor: 'grey', borderBottomWidth: 0.2}]}>
         <TouchableOpacity onPress={() => setSupportMode('hub')} style={styles.headerBackIcon}><Ionicons name="arrow-back" size={26} color={theme.textSecondary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Live Agent Chat</Text>
      </View>
      <View style={styles.placeholderContent}><Ionicons name="construct-outline" size={80} color={theme.textSecondary} style={{opacity: 0.5}} /><Text style={styles.placeholderTitle}>Coming Soon!</Text><Text style={styles.placeholderText}>The live agent chat feature is currently under development. Please use the AI Chatbot or create a support ticket.</Text></View>
    </View>
  );

  const renderTicketForm = () => (
    <View style={styles.container}>
        <View style={[styles.header, {paddingVertical: 46, borderColor: 'grey', borderBottomWidth: 0.2}]}>
            <TouchableOpacity onPress={() => setSupportMode('hub')} style={styles.headerBackIcon}><Ionicons name="arrow-back" size={26} color={theme.textSecondary} /></TouchableOpacity>
            <Text style={styles.headerTitle}>Create Support Ticket</Text>
        </View>
        <ScrollView contentContainerStyle={{padding: 20}}>
            <Text style={styles.formLabel}>Subject</Text>
            <TextInput style={styles.formInput} placeholder="e.g., No Internet Connection" placeholderTextColor={theme.textSecondary} value={ticketSubject} onChangeText={setTicketSubject} editable={!isSubmittingTicket} />
            <Text style={styles.formLabel}>Describe Your Issue</Text>
            <TextInput style={[styles.formInput, styles.formInputMulti]} placeholder="Please provide as much detail as possible..." placeholderTextColor={theme.textSecondary} value={ticketDescription} onChangeText={setTicketDescription} multiline numberOfLines={6} editable={!isSubmittingTicket} />
            <TouchableOpacity style={[styles.submitButton, isSubmittingTicket && styles.buttonDisabled]} onPress={handleSubmitTicket} disabled={isSubmittingTicket}>{isSubmittingTicket ? (<ActivityIndicator color="#FFFFFF" />) : (<Text style={styles.submitButtonText}>Submit Ticket</Text>)}</TouchableOpacity>
        </ScrollView>
    </View>
  );

  const MessageBubble = ({ message, name, theme }) => {
    const styles = getStyles(theme);
    const markdownStyles = getMarkdownStyles(theme);
    return (
        <View style={[styles.messageBubbleWrapper, message.isUser ? styles.userBubbleWrapper : styles.botBubbleWrapper]}>
            {!message.isUser && <Text style={styles.botName}>{name}</Text>}
            {message.isUser ? (<LinearGradient colors={['#6A82FF', '#C166FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.messageBubble, styles.userBubble]}><Text style={styles.messageText}>{message.text}</Text></LinearGradient>) 
            : (<View style={[styles.messageBubble, styles.botBubble]}><Markdown style={markdownStyles}>{message.text}</Markdown></View>)}
        </View>
    );
  };
  
  const TypingIndicator = ({ name, theme }) => {
      const styles = getStyles(theme);
      return (
        <View style={styles.typingIndicatorContainer}><ActivityIndicator size="small" color={theme.primary} /><Text style={styles.typingText}>{name} is typing...</Text></View>
      );
  };

  switch (supportMode) {
    case 'chatbot': return renderChatbot();
    case 'agent_chat': return renderComingSoon();
    case 'ticket': return renderTicketForm();
    case 'hub':
    default: return renderSupportHub();
  }
}

// --- STYLESHEETS (Now Theme-Aware) ---
const getMarkdownStyles = (theme) => StyleSheet.create({
  body: { fontSize: 16, color: theme.text },
  strong: { fontWeight: 'bold', color: theme.text },
});

const getStyles = (theme) => StyleSheet.create({
  // Shared
  container: { flex: 1, backgroundColor: theme.background },
  headerBackIcon: { position: 'absolute', left: 15, padding: 5, zIndex: 10, bottom: 20 },
  // Hub Styles
  hubContainer: { flex: 1, backgroundColor: theme.background, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  hubHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, bottom: 13, paddingVertical: 35, justifyContent: 'center', },
  hubTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textOnPrimary, top: 12 },
  hubSubtitle: { fontSize: 16, color: theme.textSecondary, marginBottom: 20, textAlign: 'center' },
  supportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, padding: 20, borderRadius: 12, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: theme.isDarkMode ? 0 : 0.20, shadowRadius: 1.41, elevation: 2,},
  cardTextContainer: { flex: 1, marginLeft: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 4 },
  cardDescription: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
  // Placeholder Styles
  placeholderContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  placeholderTitle: { marginTop: 20, fontSize: 22, fontWeight: 'bold', color: theme.text },
  placeholderText: { marginTop: 10, fontSize: 16, color: theme.textSecondary, textAlign: 'center' },
  // Ticket Form Styles
  formLabel: { fontSize: 16, fontWeight: '500', color: theme.text, marginBottom: 8, marginTop: 15 },
  formInput: { backgroundColor: theme.isDarkMode ? theme.background : '#F1F1F1', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, fontSize: 16, color: theme.text, borderWidth: 1, borderColor: theme.border, },
  formInputMulti: { minHeight: 150, textAlignVertical: 'top', paddingTop: 12 },
  submitButton: { backgroundColor: theme.accent, paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  submitButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { backgroundColor: theme.disabled },
  // Chatbot Styles
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, bottom: 13, paddingVertical: 35, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: theme.border },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, top: 24 },
  status: { flexDirection: 'row', alignItems: 'center', marginTop: 5, top: 24 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, color: theme.textSecondary },
  messageContainer: { flex: 1 },
  scrollContentContainer: { paddingTop: 20, paddingBottom: 10, paddingHorizontal: 15 },
  messageBubbleWrapper: { marginBottom: 15, maxWidth: '85%' },
  userBubbleWrapper: { alignSelf: 'flex-end' },
  botBubbleWrapper: { alignSelf: 'flex-start' },
  messageBubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  userBubble: { borderTopRightRadius: 5 },
  botBubble: { backgroundColor: theme.surface, borderTopLeftRadius: 5, borderWidth: 1, borderColor: theme.border },
  messageText: { fontSize: 16, lineHeight: 22, color: '#FFFFFF' },
  botName: { fontSize: 12, color: theme.textSecondary, marginBottom: 4, marginLeft: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border },
  faqButton: { padding: 5, marginRight: 5 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.background, borderRadius: 20, fontSize: 16, marginRight: 10, color: theme.text },
  sendButton: { justifyContent: 'center', alignItems: 'center' },
  typingIndicatorContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, alignSelf: 'flex-start', marginLeft: 10, marginBottom: 15 },
  typingText: { color: theme.textSecondary, marginLeft: 8, fontSize: 14, fontStyle: 'italic' },
  // FAQ Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { width: '90%', maxHeight: '80%', borderRadius: 15, padding: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, backgroundColor: theme.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text },
  faqItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
  faqQuestion: { fontSize: 16, fontWeight: '600', color: theme.accent },
});