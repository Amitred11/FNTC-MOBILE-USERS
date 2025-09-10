// screens/AboutScreen.js (Cleaned & Platform-Agnostic)

import React, { useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';

// --- Constants for Content ---
const COMPANY_NAME = 'FiBear Network Technologies Corp.';
const VERSION = '2.0.1';
const CEO_NAME = 'Prince Scoth E. Donato';
const MISSION_POINTS = [
  "Continue to improve our services by seeking new ways, means and technology that will adapt to the changing needs of the clients.",
  "Create and cultivate long-term business relationships with clients and business partners.",
  "Provide the best customer service possible.",
  "Expand the company’s network by offering technology that is better than the existing competitors at a more affordable price."
];
const VISION_POINTS = [
  "Become the leading affordable ICT service provider in the country.",
  "Become the one-stop shop of all Information and Technology needs of clients.",
  "Gain the confidence and trust of our clients and business partners in this businessfield.",
  "Employ, Train and Produce talents that will work collaboratively and productively with the company towards mutual growth and development."
];

// --- Sub-Components (Memoized for Performance) ---
const BulletPoint = React.memo(({ text }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.bulletPoint}>
      <Ionicons name="shield-checkmark-outline" size={20} color={theme.success} style={styles.bulletIcon} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
});

const CeoCard = React.memo(() => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.ceoCard}>
        <Ionicons name="person-circle-outline" size={40} color={theme.primary} style={styles.ceoIcon} />
        <View style={styles.ceoTextContainer}>
            <Text style={styles.ceoQuote}>
                "During the pandemic lockdowns, President & CEO <Text style={styles.ceoName}>{CEO_NAME}</Text> realized the growing demand for reliable and affordable internet, especially in areas where supply was scarce."
            </Text>
        </View>
    </View>
  );
});

const HeroHeader = React.memo(({ onBackPress }) => {
    const styles = getStyles(useTheme().theme);
    return (
        <ImageBackground 
            source={require('../../assets/images/network.jpg')}
            style={styles.heroBanner}
        >
            <View style={styles.heroOverlay} />
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                <Ionicons name="arrow-back" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.heroContent}>
                <Animatable.Image
                    animation="zoomIn"
                    duration={800}
                    source={require('../../assets/images/logo.png')}
                    style={styles.logo}
                />
                <Animatable.Text
                    animation="fadeIn"
                    duration={600}
                    delay={200}
                    style={styles.mainTitle}
                >
                    {COMPANY_NAME}
                </Animatable.Text>
            </View>
        </ImageBackground>
    );
});

// --- Main Screen Component ---
export default function AboutScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme(); 
  const styles = getStyles(theme); 

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <HeroHeader onBackPress={handleGoBack} />

            <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.card}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="information-circle-outline" size={28} color={theme.primary} />
                    <Text style={styles.sectionTitle}>About Us</Text>
                </View>
                <Text style={styles.paragraph}>
                    {COMPANY_NAME} (FNTC) is an IT Company formally established on June 06, 2022 by a group of fifteen talented and skilled entrepreneurs...
                </Text>
                <CeoCard />
                <Text style={styles.paragraph}>
                    Having seen this as a business opportunity, he tapped 14 of his friends who are expert in various fields in IT and they formed a company that will become {COMPANY_NAME}...
                </Text>
            </Animatable.View>

            <Animatable.View animation="fadeInUp" duration={600} delay={300} style={styles.card}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="rocket-outline" size={28} color={theme.primary} />
                    <Text style={styles.sectionTitle}>Our Mission</Text>
                </View>
                <Text style={styles.subParagraph}>
                    To provide the most affordable and quality Information, Communication and Technological Services all over the country.
                </Text>
                {MISSION_POINTS.map(point => <BulletPoint key={point} text={point} />)}
            </Animatable.View>

            <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.card}>
                 <View style={styles.sectionHeader}>
                    <Ionicons name="eye-outline" size={28} color={theme.primary} />
                    <Text style={styles.sectionTitle}>Our Vision</Text>
                </View>
                <Text style={styles.subParagraph}>
                    To achieve 100% customer satisfaction by delivering quality services at an affordable rate...
                </Text>
                {VISION_POINTS.map(point => <BulletPoint key={point} text={point} />)}
            </Animatable.View>

             <Text style={styles.footerText}>{COMPANY_NAME} © {new Date().getFullYear()}. Version {VERSION}</Text>
        </ScrollView>
    </SafeAreaView>
  );
}

// --- Stylesheet ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 50 },
    
    heroBanner: { 
        height: 280, // Slightly taller for better effect
        justifyContent: 'center', 
        alignItems: 'center',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(20, 20, 40, 0.6)', // A slightly bluish dark overlay
    },
    backButton: {
        position: 'absolute',
        top: 30, // Adjusted for typical status bar height
        left: 15,
        padding: 10, // Larger touch area
        zIndex: 10,
    },
    heroContent: {
        alignItems: 'center',
        paddingTop: 40,
    },
    logo: {
        width: 100, // Resized for better proportion
        height: 100,
        resizeMode: 'contain',
        marginBottom: 15,
        left: 110,
        bottom: 60
    },
    mainTitle: { 
        fontSize: 24, // Slightly larger
        fontWeight: 'bold', 
        color: '#FFF', 
        textAlign: 'center',
        textShadowColor: 'rgba(67, 137, 241, 0.8)',
        textShadowOffset: {width: 2, height: 7},
        textShadowRadius: 10,
        bottom: 60
    },

    card: {
        backgroundColor: theme.surface,
        borderRadius: 20, 
        marginHorizontal: 15,
        marginTop: -50, 
        marginBottom: 65,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.border,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    sectionTitle: { 
        fontSize: 22, 
        fontWeight: '700',
        color: theme.text,
        marginLeft: 12,
    },
    paragraph: { 
        fontSize: 16, 
        color: theme.textSecondary, 
        lineHeight: 26, 
        marginBottom: 15,
        textAlign: 'justify'
    },
    subParagraph: { 
        fontSize: 16, 
        color: theme.textSecondary, 
        lineHeight: 26, 
        marginBottom: 20, 
        fontStyle: 'italic' 
    },
    bulletPoint: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        marginBottom: 12, 
        paddingLeft: 5 
    },
    bulletIcon: {
        marginRight: 12,
        marginTop: 3,
    },
    bulletText: { 
        flex: 1, 
        fontSize: 16, 
        color: theme.text, 
        lineHeight: 26 
    },
    ceoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.background,
        borderRadius: 12,
        padding: 20,
        marginVertical: 20,
        borderLeftWidth: 5,
        borderLeftColor: theme.primary,
        elevation: 2, // Add subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    ceoIcon: {
        marginRight: 15,
    },
    ceoTextContainer: {
        flex: 1,
    },
    ceoName: {
        fontWeight: 'bold',
        color: theme.text, 
    },
    ceoQuote: {
        fontSize: 16,
        color: theme.textSecondary,
        fontStyle: 'italic',
        lineHeight: 24,
    },
    footerText: {
        textAlign: 'center',
        color: theme.textSecondary,
        fontSize: 12,
        paddingBottom: 20,
    }
  });
