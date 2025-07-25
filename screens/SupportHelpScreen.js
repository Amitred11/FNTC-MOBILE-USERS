// screens/SupportHelpScreen.js

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { lightTheme } from '../constants/colors';
import * as Animatable from 'react-native-animatable';

const CONTACT_INFO = {
  phone: '+63 945 220 3371',
  email: 'rparreno@fibearnetwork.com',
  facebook: 'https://www.facebook.com/FiBearNetworkTechnologiesCorpMontalban',
};

// --- Sub-components ---

const Header = React.memo(({ onBackPress }) => {
  const theme = lightTheme;
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

const HelpOptionRow = React.memo(({ icon, title, description, onPress, isLast = false }) => {
  const theme = lightTheme;
  const styles = getStyles(theme);

  return (
    <>
      <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color={theme.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionDescription} numberOfLines={1}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
});

// --- Main Screen Component ---

export default function SupportHelpScreen() {
  const navigation = useNavigation();
  const theme = lightTheme;
  const styles = getStyles(theme);

  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const handlePhoneCall = useCallback(() => {
    Linking.openURL(`tel:${CONTACT_INFO.phone}`).catch(err =>
      console.error('Failed to open phone dialer.', err)
    );
  }, []);

  const handleEmailCompose = useCallback(() => {
    Linking.openURL(`mailto:${CONTACT_INFO.email}?subject=Help with My Account`).catch(err =>
      console.error('Failed to open email client.', err)
    );
  }, []);

  const handleFacebookPage = useCallback(() => {
    Linking.openURL(CONTACT_INFO.facebook).catch(err =>
      console.error('Failed to open Facebook.', err)
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={handleGoBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Ionicons name="headset-outline" size={50} color={theme.primary} />
          </View>
          <Text style={styles.mainTitle}>Need Assistance?</Text>
          <Text style={styles.mainSubtitle}>
            If you've lost your recovery code or need help, our team is here to assist you.
          </Text>
        </View>
        
        <Animatable.View animation="fadeInUp" duration={600} delay={300} style={styles.optionsContainer}>
            <HelpOptionRow
              icon="call"
              title="Call Us"
              description={CONTACT_INFO.phone}
              onPress={handlePhoneCall}
            />
            <HelpOptionRow
              icon="mail"
              title="Email Us"
              description="Tap to send an email"
              onPress={handleEmailCompose}
            />
            <HelpOptionRow
              icon="logo-facebook"
              title="Message on Facebook"
              description="Connect on our official page"
              onPress={handleFacebookPage}
              isLast
            />
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: theme.background, // Match background for seamless look
    },
    backButton: { padding: 5 },
    headerTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    // Hero Section
    heroSection: {
      alignItems: 'center',
      paddingTop: 20,
      paddingBottom: 30,
    },
    heroIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.border,
    },
    mainTitle: {
      color: theme.text,
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'center',
    },
    mainSubtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      maxWidth: '95%',
    },
    // Options List
    optionsContainer: {
        backgroundColor: theme.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden', // Ensures inner items clip to the border radius
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 18,
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
    },
    iconContainer: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: `${theme.primary}1A`, // Subtle background color
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    textContainer: {
      flex: 1,
      marginRight: 10,
    },
    optionTitle: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '600',
      marginBottom: 4,
    },
    optionDescription: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginLeft: 78, // Aligns with the start of the text (icon width + margins)
    },
  });