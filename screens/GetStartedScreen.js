// screens/GetStartedScreen.js
import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, SafeAreaView, Platform
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { lightTheme } from '../constants/colors';
import { TERMS_AND_CONDITIONS_TEXT } from '../texts/Terms of Services';
import { PRIVACY_POLICY_TEXT } from '../texts/Privacy Policy';

// --- The modal now gets the theme passed as a prop ---
const PolicyModal = ({ visible, title, content, onClose, theme }) => {
    const styles = getStyles(theme);
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.policyModalOverlay}>
                <View style={styles.policyModalView}>
                    <Text style={styles.policyTitle}>{title}</Text>
                    <ScrollView style={styles.policyScrollView} contentContainerStyle={{ paddingBottom: 20 }}>
                        <Text style={styles.policyModalText}>{content}</Text>
                    </ScrollView>
                    <TouchableOpacity style={styles.policyCloseButton} onPress={onClose}>
                        <Text style={styles.policyCloseButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function GetStartedScreen() {
  const navigation = useNavigation();
  const theme = lightTheme; 
  const styles = getStyles(theme);

  const [isLoading] = useState(false);
  const [isPolicyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyContent, setPolicyContent] = useState({ title: '', text: '' });

  const openPolicyModal = (type) => {
      switch (type) {
          case 'terms':
              setPolicyContent({ title: 'Terms and Conditions', text: TERMS_AND_CONDITIONS_TEXT });
              break;
          case 'privacy':
              setPolicyContent({ title: 'Privacy Policy', text: PRIVACY_POLICY_TEXT });
              break;
          default:
              return;
      }
      setPolicyModalVisible(true);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.mainContent}>
        <Image source={require('../assets/images/getstarted.jpg')} style={styles.backgroundImage} />
        <View style={styles.blueOverlay} />
        
        <Animatable.View animation="fadeInUp" duration={800} delay={100} style={styles.overlayContainer}>
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <>
              <Text style={styles.title}>{"Welcome to FiBear Network Technologies Corp."}</Text>
              <Text style={styles.subtitle}>
                We are committed to keeping you connected. We provide fast, reliable, and stable internet service designed to meet your daily needs.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('SignUpScreen')}>
                <Text style={styles.primaryButtonText}>Sign Up</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('SignUpScreen', { screen: 'Login' })}>
                <Text style={styles.secondaryButtonText}>Log In</Text>
              </TouchableOpacity>
              <View style={styles.footerLinks}>
                 {/* --- FIX: Corrected the function call to be more explicit --- */}
                <TouchableOpacity onPress={() => openPolicyModal('privacy')}><Text style={styles.link}>Privacy Policy</Text></TouchableOpacity>
                <Text style={styles.separator}>|</Text>
                <TouchableOpacity onPress={() => openPolicyModal('terms')}><Text style={styles.link}>Terms of Service</Text></TouchableOpacity>
              </View>
            </>
          )}
        </Animatable.View>
      </View>
      <PolicyModal 
        visible={isPolicyModalVisible} 
        title={policyContent.title} 
        content={policyContent.text} 
        onClose={() => setPolicyModalVisible(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// --- OPTIMIZATION: Styles are now a function that uses the theme object ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    logo: { position: 'absolute', top: Platform.OS === 'android' ? 20 : 60, left: 25, width: 90, height: 35, zIndex: 10 },
    mainContent: { flex: 1 },
    backgroundImage: { position: 'absolute', width: '100%', height: '70%', top: 0, resizeMode: 'cover' },
    blueOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '70%', backgroundColor: 'rgba(0, 65, 176, 0.39)' },
    overlayContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '55%', backgroundColor: theme.surface,
        borderTopLeftRadius: 50, borderTopRightRadius: 50,
        padding: 30, alignItems: 'center', justifyContent: 'center'
    },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontWeight: '800', fontSize: 19, textAlign: 'center', marginBottom: 15, color: theme.text },
    subtitle: { fontSize: 12, textAlign: 'center', marginBottom: 30, color: theme.textSecondary, lineHeight: 22 },
    
    baseButton: {
        paddingVertical: 14, paddingHorizontal: 9, width: '80%', borderRadius: 12, marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    primaryButton: {
        backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 9, width: '70%', borderRadius: 10, marginBottom: 10, boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.6)',
    },
    secondaryButton: {
        borderColor: theme.primary, borderColor: '#00BBD6', borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 9, width: '70%', borderRadius: 10, marginBottom: 30, backgroundColor: theme.surface, boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.6)',
    },
    primaryButtonText: { color: theme.textOnPrimary, fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
    secondaryButtonText: { color: theme.primary, fontWeight: 'bold', textAlign: 'center', fontSize: 16 },

    footerLinks: { flexDirection: 'row', marginTop: 20 },
    link: { color: theme.textSecondary, fontSize: 12, marginHorizontal: 8 },
    separator: { color: theme.textSecondary, fontSize: 12 },
    
    // --- Modal Styles ---
    policyModalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    policyModalView: { backgroundColor: theme.surface, borderRadius: 20, padding: 25, alignItems: 'center', height: '80%', width: '90%' },
    policyTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, color: theme.text },
    policyScrollView: { width: '100%', marginVertical: 10 },
    policyModalText: { fontSize: 14, color: theme.text, lineHeight: 22 },
    policyCloseButton: { backgroundColor: theme.danger, borderRadius: 10, paddingVertical: 12, elevation: 2, width: '100%', marginTop: 15 },
    policyCloseButtonText: { color: theme.textOnPrimary, fontWeight: "bold", textAlign: "center", fontSize: 16 },
});