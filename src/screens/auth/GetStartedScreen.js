// screens/GetStartedScreen.js (Corrected to always use Light Theme)

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
// --- CHANGE 1: Import lightTheme directly, remove useTheme ---
import { lightTheme } from '../../constants/colors.js';
import TermsOfServiceText from '../../data/TermsOfServices.js';
import PrivacyPolicyText from '../../data/PrivacyPolicy.js';

// --- Constants ---
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COMPANY_NAME = 'FiBear Network Technologies Corp.';
const SUBTITLE_TEXT = 'We are committed to keeping you connected. We provide fast, reliable, and stable internet service designed to meet your daily needs.';


// --- Sub-Components (Memoized for Performance) ---
const PolicyModal = React.memo(({ visible, title, content, onClose }) => {
  // --- CHANGE 2: Use the imported lightTheme object directly ---
  const styles = getStyles(lightTheme);

  // Replace placeholder at render time
  const formattedContent = useMemo(() => {
    const formattedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return content.replace('{{LAST_UPDATED}}', formattedDate);
  }, [content]);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.policyModalOverlay}>
        <Animatable.View animation="fadeInUp" duration={400} style={styles.policyModalView}>
          <Text style={styles.policyTitle}>{title}</Text>
          <ScrollView style={styles.policyScrollView} contentContainerStyle={{ paddingBottom: 20 }}>
            <Text style={styles.policyModalText}>{formattedContent}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.policyCloseButton} onPress={onClose}>
            <Text style={styles.policyCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </Animatable.View>
      </SafeAreaView>
    </Modal>
  );
});


// --- Main Screen Component ---
export default function GetStartedScreen() {
  const navigation = useNavigation();
  // --- CHANGE 3: Use the imported lightTheme object directly ---
  const styles = getStyles(lightTheme);

  const [isPolicyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyContent, setPolicyContent] = useState({ title: '', text: '' });

  const openPolicyModal = useCallback((type) => {
    if (type === 'terms') {
      setPolicyContent({ title: 'Terms and Conditions', text: TermsOfServiceText });
    } else if (type === 'privacy') {
      setPolicyContent({ title: 'Privacy Policy', text: PrivacyPolicyText });
    }
    setPolicyModalVisible(true);
  }, []);
  
  const navigateToSignUp = useCallback(() => navigation.navigate('SignUpScreen'), [navigation]);
  const navigateToLogin = useCallback(() => navigation.navigate('SignUpScreen', { screen: 'Login' }), [navigation]);
  const closePolicyModal = useCallback(() => setPolicyModalVisible(false), []);

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../../assets/images/logos/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.mainContent}>
        <Image source={require('../../assets/images/backgrounds/getstarted.jpg')} style={styles.backgroundImage} />
        <View style={styles.blueOverlay} />

        <Animatable.View
          animation="fadeInUp"
          duration={800}
          delay={100}
          style={styles.overlayContainer}
        >
            <Text style={styles.title}>{COMPANY_NAME}</Text>
            <Text style={styles.subtitle}>{SUBTITLE_TEXT}</Text>
            
            <TouchableOpacity style={styles.primaryButton} onPress={navigateToSignUp}>
                <Text style={styles.primaryButtonText}>Sign Up</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={navigateToLogin}>
                <Text style={styles.secondaryButtonText}>Log In</Text>
            </TouchableOpacity>
            
            <View style={styles.footerLinks}>
                <TouchableOpacity onPress={() => openPolicyModal('privacy')}>
                    <Text style={styles.link}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.separator}>|</Text>
                <TouchableOpacity onPress={() => openPolicyModal('terms')}>
                    <Text style={styles.link}>Terms of Service</Text>
                </TouchableOpacity>
            </View>
        </Animatable.View>
      </View>
      <PolicyModal
        visible={isPolicyModalVisible}
        title={policyContent.title}
        content={policyContent.text}
        onClose={closePolicyModal}
      />
    </SafeAreaView>
  );
}

// --- OPTIMIZATION: Styles are now a function that uses the theme object ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: '#fff', flex: 1 },
    logo: {
      height: 35,
      left: 25,
      position: 'absolute',
      top: Platform.OS === 'android' ? 20 : 60,
      width: 90,
      zIndex: 10,
    },
    mainContent: { flex: 1 },
    backgroundImage: {
      height: '70%',
      position: 'absolute',
      resizeMode: 'cover',
      top: 0,
      width: '100%',
    },
    blueOverlay: {
      backgroundColor: 'rgba(0, 65, 176, 0.39)',
      height: '70%',
      left: 0,
      position: 'absolute',
      top: 0,
      width: '100%',
    },
    overlayContainer: {
      alignItems: 'center',
      // Explicitly set surface color from the light theme
      backgroundColor: lightTheme.surface, 
      borderTopLeftRadius: 50,
      borderTopRightRadius: 50,
      bottom: 0,
      height: '55%',
      justifyContent: 'center',
      left: 0,
      padding: 30,
      position: 'absolute',
      right: 0,
    },
    loaderContainer: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    title: {
      color: theme.text,
      fontSize: 19,
      fontWeight: '800',
      marginBottom: 15,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 22,
      marginBottom: 30,
      textAlign: 'center',
    },

    baseButton: {
      borderRadius: 12,
      elevation: 4,
      marginBottom: 15,
      paddingHorizontal: 9,
      paddingVertical: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      width: '80%',
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.6)',
      marginBottom: 10,
      paddingHorizontal: 9,
      paddingVertical: 10,
      width: '70%',
    },
    secondaryButton: {
      backgroundColor: theme.surface,
      borderColor: theme.primary,
      // borderColor: '#00BBD6', // This was a duplicate, removed
      borderRadius: 10,
      borderWidth: 1.5,
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.6)',
      marginBottom: 30,
      paddingHorizontal: 9,
      paddingVertical: 10,
      width: '70%',
    },
    primaryButtonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    secondaryButtonText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
    },

    footerLinks: { flexDirection: 'row', marginTop: 20 },
    link: { color: theme.textSecondary, fontSize: 12, marginHorizontal: 8 },
    separator: { color: theme.textSecondary, fontSize: 12 },

    // --- Modal Styles ---
    policyModalOverlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      flex: 1,
      justifyContent: 'center',
    },
    policyModalView: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 20,
      height: '80%',
      padding: 25,
      width: '90%',
    },
    policyTitle: { color: theme.text, fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
    policyScrollView: { marginVertical: 10, width: '100%' },
    policyModalText: { color: theme.text, fontSize: 14, lineHeight: 22 },
    policyCloseButton: {
      backgroundColor: theme.danger,
      borderRadius: 10,
      elevation: 2,
      marginTop: 15,
      paddingVertical: 12,
      width: '100%',
    },
    policyCloseButtonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  });