// screens/DisplayRecoveryCodeScreen.js

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Clipboard,
  ScrollView,
  BackHandler
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { lightTheme } from '../constants/colors';
import { useMessage, useAlert, useAuth } from '../contexts';  
import * as Animatable from 'react-native-animatable';


const Header = React.memo(() => {
  const styles = getStyles(lightTheme);
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Recovery Code</Text>
      <View style={{ width: 26 }} />
    </View>
  );
});

export default function DisplayRecoveryCodeScreen() {
  const navigation = useNavigation();
  const theme = lightTheme;
  const { showMessage } = useMessage();
  const { showAlert } = useAlert();
  const { pendingRecoveryCode, acknowledgeRecoveryCode } = useAuth();
  const styles = getStyles(theme);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: null,
      gestureEnabled: false,
    });
    
    const backHandler = () => {
      showAlert(
        "Important",
        "Please save your recovery code before continuing. This is the only time it will be shown.",
        [{ text: "OK" }]
      );
      return true;
    };

    const hardwareBackHandler = BackHandler.addEventListener('hardwareBackPress', backHandler);

    return () => {
      hardwareBackHandler.remove();
    };
  }, [navigation, showAlert]);


  const handleCopyCode = useCallback(() => {
    if (pendingRecoveryCode) {
        Clipboard.setString(pendingRecoveryCode);
        showMessage('Recovery code copied to clipboard!');
    }
  }, [pendingRecoveryCode, showMessage]);

  const handleContinue = useCallback(() => {
     acknowledgeRecoveryCode();
  }, [acknowledgeRecoveryCode]);

  useEffect(() => {
    if (!pendingRecoveryCode) {
        console.warn("DisplayRecoveryCodeScreen rendered without a pending code. Acknowledging to proceed.");
        acknowledgeRecoveryCode(); 
    }
  }, [pendingRecoveryCode, acknowledgeRecoveryCode]);
  
  return (
    <SafeAreaView style={styles.container}>
      <Header /> 

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animatable.View animation="zoomIn" duration={800} delay={100} style={styles.iconHeader}>
          <Ionicons name="key-outline" size={80} color={theme.warning} />
        </Animatable.View>
        <Animatable.Text animation="fadeInUp" duration={600} delay={200} style={styles.title}>
          Save Your Recovery Code!
        </Animatable.Text>
        
        <Animatable.Text animation="fadeInUp" duration={600} delay={300} style={styles.subtitle}>
          This is a critical code you will need to reset your password if you ever lose access to your email.{' '}
          <Text style={styles.boldText}>
            Write it down and store it in a very safe, private place.
          </Text>
        </Animatable.Text>

        <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.recoveryCodeBox}>
          <Text style={styles.recoveryCodeText}>{pendingRecoveryCode || 'Loading...'}</Text>
          <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={28} color={theme.textOnPrimary} />
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.Text animation="fadeInUp" duration={600} delay={500} style={styles.warningText}>
          <Text style={styles.boldText}>WARNING:</Text>
          {' This code will '}
          <Text style={styles.boldText}>NOT</Text>
          {' be shown again. If you lose it, you will need to contact support for manual assistance.'}
        </Animatable.Text>
        
        <Animatable.View animation="fadeInUp" duration={600} delay={600} style={styles.buttonContainer}>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>I HAVE SAVED MY CODE, CONTINUE</Text>
          </TouchableOpacity>
        </Animatable.View>
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
    headerTitle: { color: theme.text, fontSize: 17, fontWeight: '600' },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    iconHeader: {
      marginBottom: 30,
    },
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 10,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 40,
      textAlign: 'center',
      paddingHorizontal: 10,
    },
    recoveryCodeBox: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 10,
      width: '100%',
      maxWidth: 350,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 30,
      borderWidth: 1,
      borderColor: theme.primary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 5,
    },
    recoveryCodeText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: theme.primary,
      flexShrink: 1,
      marginRight: 10,
      letterSpacing: 1, 
    },
    copyButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      padding: 10,
    },
    warningText: {
      color: theme.danger,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 40,
      paddingHorizontal: 10,
    },

    boldText: {
      fontWeight: 'bold',
    },
    buttonContainer: {
      width: '100%',
      maxWidth: 350,
    },
    continueButton: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    continueButtonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });