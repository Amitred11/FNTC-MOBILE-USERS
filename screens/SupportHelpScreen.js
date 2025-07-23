// screens/SupportHelpScreen.js

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking, // For opening external links
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts';
import * as Animatable from 'react-native-animatable';

const CONTACT_INFO = {
  phone: '+63 9XX XXX XXXX', // Replace with actual phone number
  email: 'support@fibearnetwork.com', // Replace with actual support email
  facebook: 'https://facebook.com/FiBearNetwork', // Replace with actual FB page
};

const Header = React.memo(({ onBackPress }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={26} color={theme.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Get Help</Text>
      <View style={{ width: 26 }} />
    </View>
  );
});

const HelpOptionCard = React.memo(({ icon, title, description, onPress, animDelay }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <Animatable.View animation="fadeInUp" duration={500} delay={animDelay} style={styles.card}>
      <TouchableOpacity style={styles.cardContent} onPress={onPress}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={30} color={theme.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
      </TouchableOpacity>
    </Animatable.View>
  );
});

export default function SupportHelpScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handlePhoneCall = useCallback(() => {
    Linking.openURL(`tel:${CONTACT_INFO.phone}`);
  }, []);

  const handleEmailCompose = useCallback(() => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}?subject=Help with Recovery Code`);
  }, []);

  const handleFacebookPage = useCallback(() => {
    Linking.openURL(CONTACT_INFO.facebook);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={handleGoBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Ionicons name="headset-outline" size={80} color={theme.primary} style={styles.mainIcon} />
        <Text style={styles.mainTitle}>Need Assistance?</Text>
        <Text style={styles.mainSubtitle}>
          If you've lost your recovery code or need help with account access, our team is here to assist you.
        </Text>

        <HelpOptionCard
          icon="call-outline"
          title="Call Us"
          description={`Speak directly with our support team: ${CONTACT_INFO.phone}`}
          onPress={handlePhoneCall}
          animDelay={300}
        />
        <HelpOptionCard
          icon="mail-outline"
          title="Email Us"
          description={`Send us a detailed email: ${CONTACT_INFO.email}`}
          onPress={handleEmailCompose}
          animDelay={400}
        />
        <HelpOptionCard
          icon="logo-facebook"
          title="Message Us on Facebook"
          description="Connect with us on our official Facebook page."
          onPress={handleFacebookPage}
          animDelay={500}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: { padding: 5 },
    headerTitle: { color: theme.text, fontSize: 17, fontWeight: '600' },
    scrollContent: {
      padding: 20,
      alignItems: 'center',
    },
    mainIcon: {
      marginTop: 20,
      marginBottom: 15,
    },
    mainTitle: {
      color: theme.text,
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'center',
    },
    mainSubtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 40,
      textAlign: 'center',
      paddingHorizontal: 10,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      marginBottom: 15,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
    },
    iconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: `${theme.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    textContainer: {
      flex: 1,
      marginRight: 10,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    cardDescription: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
  });