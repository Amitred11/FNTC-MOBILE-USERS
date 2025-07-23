// screens/DisplayRecoveryCodeScreen.js

import React, { useCallback, useEffect } from 'react'; // Added useEffect
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
import { useNavigation, CommonActions } from '@react-navigation/native'; // Removed useRoute
import { useTheme, useMessage, useAlert, useAuth } from '../contexts';  
import * as Animatable from 'react-native-animatable';


const Header = React.memo(() => { // Removed onBackPress from props as it's not used
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.header}>
      {/* The back button here doesn't do anything, which is fine for this screen */}
      <TouchableOpacity style={styles.backButton}>
        <Ionicons name="arrow-back" size={26} color={theme.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Recovery Code</Text>
      <View style={{ width: 26 }} />
    </View>
  );
});

export default function DisplayRecoveryCodeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { showMessage } = useMessage();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);

  // --- FIX #1: Get the code ONLY from the AuthContext ---
  const { pendingRecoveryCode, acknowledgeRecoveryCode } = useAuth();
  // --- REMOVED: const { recoveryCode } = route.params; ---

  // Prevent going back to SignUp via hardware back button directly
  useEffect(() => {
    navigation.setOptions({
      headerLeft: null, // Hide back button in the navigator header if it exists
      gestureEnabled: false, // Disable swipe back
    });
    
    const backHandler = () => {
      showAlert(
        "Important",
        "Please save your recovery code before continuing. This is the only time it will be shown.",
        [{ text: "OK" }]
      );
      return true; // Prevent default back action
    };

    const hardwareBackHandler = BackHandler.addEventListener('hardwareBackPress', backHandler);

    return () => {
      hardwareBackHandler.remove(); // Clean up hardware back button listener
    };
  }, [navigation, showAlert]);


  const handleCopyCode = useCallback(() => {
    // --- FIX #2: Use the `pendingRecoveryCode` variable ---
    if (pendingRecoveryCode) {
        Clipboard.setString(pendingRecoveryCode);
        showMessage('Recovery code copied to clipboard!');
    }
  }, [pendingRecoveryCode, showMessage]);

  const handleContinue = useCallback(() => {
     acknowledgeRecoveryCode();
  }, [acknowledgeRecoveryCode]);

  useEffect(() => {
    // This is a good safety check in case the screen is rendered in an unexpected state
    if (!pendingRecoveryCode) {
        console.warn("DisplayRecoveryCodeScreen rendered without a pending code. Acknowledging to proceed.");
        acknowledgeRecoveryCode(); 
    }
  }, [pendingRecoveryCode, acknowledgeRecoveryCode]);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* You can remove the Header component if your StackNavigator already has `headerShown: false` */}
      <Header /> 

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animatable.View animation="zoomIn" duration={800} delay={100} style={styles.iconHeader}>
          <Ionicons name="key-outline" size={80} color={theme.warning} />
        </Animatable.View>
        <Animatable.Text animation="fadeInUp" duration={600} delay={200} style={styles.title}>
          Save Your Recovery Code!
        </Animatable.Text>
        <Animatable.Text animation="fadeInUp" duration={600} delay={300} style={styles.subtitle}>
          This is a critical code you will need to reset your password if you ever lose access to your email.
          **Write it down and store it in a very safe, private place.**
        </Animatable.Text>

        <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.recoveryCodeBox}>
          {/* --- FIX #3: Display the `pendingRecoveryCode` variable --- */}
          <Text style={styles.recoveryCodeText}>{pendingRecoveryCode || 'Loading...'}</Text>
          <TouchableOpacity onPress={handleCopyCode} style={styles.copyButton}>
            <Ionicons name="copy-outline" size={28} color={theme.textOnPrimary} />
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.Text animation="fadeInUp" duration={600} delay={500} style={styles.warningText}>
          **WARNING:** This code will **NOT** be shown again. If you lose it, you will need to contact support for manual assistance.
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

// Styles function remains the same
const getStyles = (theme) =>
  StyleSheet.create({
    // ... all your styles
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
      padding: 20,
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
      fontSize: 20,
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
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 40,
      paddingHorizontal: 10,
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