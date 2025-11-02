// screens/SupportScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  SafeAreaView,
  Image,
  // Linking and Platform are no longer needed here
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useTheme } from '../../contexts';
import { BottomNavBar } from '../../components/BottomNavBar';
import ChatbotScreen from './ChatbotScreen'; 
import TicketListScreen from './TicketListScreen';
import TicketCreateScreen from './TicketCreateScreen'; 

// --- Constants ---
const CHARACTER_NAME = 'FNTC Bot';

// --- HELPER & HUB COMPONENTS ---
const BotAvatar = ({ theme, inHeader = false }) => {
    const styles = getStyles(theme);
    return (
      <View style={[styles.avatarShell, inHeader ? styles.avatarHeader : {}]}>
        <Image source={require('../../assets/images/avatars/bot-avatar.jpg')} style={styles.avatarImage} />
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
        {/* --- MODIFIED CARD --- */}
        <Animatable.View animation="fadeInUp" duration={500} delay={400}>
            <SupportCard
                icon="mail-outline"
                title="Contact Us"
                description="Email, call, or find us on social media."
                onPress={() => navigation.navigate('ContactScreen')} // Navigate to the new screen
            />
        </Animatable.View>
      </ScrollView>
    );
};

// ========================================================
// --- MAIN PARENT COMPONENT
// ========================================================
export default function SupportScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [mode, setMode] = useState('hub');
  const [refreshing, setRefreshing] = useState(false);
  const contentRef = useRef(null);

  const onRefresh = useCallback(async () => {
    if (contentRef.current?.refresh) {
      setRefreshing(true);
      await contentRef.current.refresh();
      setRefreshing(false);
    }
  }, []);

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
      case 'chatbot': return CHARACTER_NAME;
      case 'ticket_list': return 'My Support Tickets';
      case 'ticket_create': return 'Create New Ticket';
      default: return '';
    }
  };

  const renderContent = () => {
    switch (mode) {
      case 'chatbot':
        return <ChatbotScreen ref={contentRef} isRefreshing={refreshing} onRefresh={onRefresh} />;
      case 'ticket_list':
        return <TicketListScreen ref={contentRef} onCreate={() => setMode('ticket_create')} isRefreshing={refreshing} onRefresh={onRefresh} />;
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
            <TouchableOpacity onPress={() => (mode === 'ticket_create' ? setMode('ticket_list') : setMode('hub'))} style={styles.headerBackIcon}>
              <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            {mode === 'chatbot' ? (
              <View style={styles.chatHeaderContent}>
                <BotAvatar theme={theme} inHeader={true} />
                <View>
                  <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.standardHeaderContent}>
                <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
              </View>
            )}
            <View style={{ width: 40 }} />
          </View>
        )}
        <View style={{ flex: 1 }}>{renderContent()}</View>
        {mode === 'hub' && <BottomNavBar activeScreen="Support" />}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// --- STYLESHEET ---
const getStyles = (theme) => StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    header: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      height: 70,
      justifyContent: 'space-between',
      paddingHorizontal: 15,
      paddingTop: 10,
    },
    headerBackIcon: { padding: 5, marginRight: 10 },
    chatHeaderContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ translateX: -20 }],
    },
    standardHeaderContent: { flex: 1, alignItems: 'center' },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
    hubContainer: { padding: 20, paddingTop: 40, paddingBottom: 120 },
    screenTitle: { color: theme.text, fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
    screenSubtitle: { color: theme.textSecondary, fontSize: 18, lineHeight: 26, marginBottom: 30 },
    supportCard: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: 15,
      padding: 20,
      boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    cardIconContainer: { backgroundColor: `${theme.primary}20`, borderRadius: 14, marginRight: 20, padding: 14 },
    cardTextContainer: { flex: 1 },
    cardTitle: { color: theme.text, fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
    cardDescription: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
    avatarShell: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.border, overflow: 'hidden', marginBottom: 3 },
    avatarHeader: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
    avatarImage: { width: '100%', height: '100%' },
});