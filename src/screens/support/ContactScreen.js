// screens/support/ContactScreen.js
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { SvgXml } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts'; // Adjust path if needed

// --- Configuration ---
const CONTACT_EMAIL = 'fntc@gmail.com';
const CONTACT_PHONE = '+639154283220';
const FACEBOOK_URL = 'https://www.facebook.com/fntc.kasiglahanvillage2023';

// --- DYNAMIC SVG Illustration ---
// This function generates an SVG string with a theme-aware color.
const getContactIllustrationSvg = (color) => `
<svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 80 C40 120, 160 120, 140 80" stroke="${color}" stroke-opacity="0.7" stroke-width="2" fill="none" />
    <circle cx="100" cy="70" r="40" fill="${color}" fill-opacity="0.1" />
    <path d="M80 60 L120 80 M120 60 L80 80" stroke="${color}" stroke-opacity="0.7" stroke-width="2" />
</svg>
`;

// --- Helper Component ---
const ContactOptionCard = ({ icon, title, subtitle, onPress, delay }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  // Define card gradient colors based on the theme
  const cardGradientColors = theme.isDarkMode
    ? ['rgba(50, 50, 50, 0.6)', 'rgba(30, 30, 30, 0.5)'] // Dark, translucent glass
    : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)']; // Light, frosted glass

  return (
    <Animatable.View animation="fadeInUp" duration={600} delay={delay}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={cardGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardIconContainer}>
            <Ionicons name={icon} size={28} color={theme.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );
};

// --- Main Component ---
export default function ContactScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  // Make the SVG theme-aware by passing in the theme's text color
  const contactIllustrationSvg = getContactIllustrationSvg(theme.text);

  const handleLinkPress = async (url, fallbackMessage) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', fallbackMessage || `Unable to open this URL: ${url}`);
    }
  };

  // Define background gradient colors based on the theme
  const backgroundGradient = theme.isDarkMode
    ? [theme.background, theme.surface]
    : [theme.surface, theme.background];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={backgroundGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* --- Header --- */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackIcon}>
              <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Animatable.Text animation="fadeInDown" style={styles.headerTitle}>
              Contact Us
            </Animatable.Text>
            <View style={{ width: 40 }} />
          </View>

          {/* --- Content --- */}
          <View style={styles.contentContainer}>
            <Animatable.View animation="zoomIn" duration={500} style={styles.illustrationContainer}>
              <SvgXml xml={contactIllustrationSvg} width="100%" height="100%" />
            </Animatable.View>

            <Animatable.Text animation="fadeInUp" duration={500} delay={100} style={styles.pageTitle}>
              Get in Touch
            </Animatable.Text>
            <Animatable.Text animation="fadeInUp" duration={500} delay={200} style={styles.pageSubtitle}>
              Choose a contact method below. We're happy to help!
            </Animatable.Text>

            <View>
              <ContactOptionCard
                icon="mail-outline"
                title="Email Us"
                subtitle={CONTACT_EMAIL}
                delay={400}
                onPress={() => handleLinkPress(`mailto:${CONTACT_EMAIL}`, 'Could not open email app.')}
              />
              <ContactOptionCard
                icon="call-outline"
                title="Call Us"
                subtitle={CONTACT_PHONE}
                delay={500}
                onPress={() => handleLinkPress(`tel:${CONTACT_PHONE}`, 'Could not open phone app.')}
              />
              <ContactOptionCard
                icon="logo-facebook"
                title="Find us on Facebook"
                subtitle="Visit our page"
                delay={600}
                onPress={() => handleLinkPress(FACEBOOK_URL, 'Could not open Facebook.')}
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// --- Stylesheet ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 15,
      height: 60,
    },
    headerBackIcon: {
      padding: 10,
      borderRadius: 20,
      backgroundColor: theme.isDarkMode ? `${theme.primary}20` : `${theme.primary}15`,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: theme.text },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 25,
      paddingTop: 10,
    },
    illustrationContainer: {
      height: 150,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    pageTitle: {
      fontSize: 34,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    pageSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 40,
      lineHeight: 24,
    },
    card: {
      borderRadius: 20,
      marginBottom: 18,
      boxShadow: '0 4px 5px rgba(0,0,0,0.2)',
      backgroundColor: 'transparent',
    },
    cardGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      // Border color adapts to the theme for the best glass effect
      borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)',
    },
    cardIconContainer: {
      backgroundColor: `${theme.primary}30`,
      borderRadius: 16,
      padding: 14,
      marginRight: 18,
    },
    cardTextContainer: { flex: 1 },
    cardTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 5,
    },
    cardSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
  });