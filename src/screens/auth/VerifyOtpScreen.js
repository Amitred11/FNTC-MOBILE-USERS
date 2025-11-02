// screens/VerifyOtpScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { lightTheme } from '../../constants/colors';
import { useAuth, useBanner, useAlert } from '../../contexts';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import Clipboard from '@react-native-clipboard/clipboard';

const { width } = Dimensions.get('window');

// --- Sub-components ---

const Header = React.memo(({ onBackPress }) => {
  const theme = lightTheme;
  const styles = getStyles(theme);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={26} color={theme.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Email Verification</Text>
      <View style={{ width: 26 }} />
    </View>
  );
});

const OtpInput = ({ otp, setOtp, length = 6 }) => {
  const theme = lightTheme;
  const styles = getStyles(theme);
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const cursorOpacity = useRef(new Animated.Value(0)).current;

  // Blinking cursor animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    if (isFocused) {
      animation.start();
    } else {
      animation.stop();
      cursorOpacity.setValue(0);
    }
    return () => animation.stop();
  }, [isFocused, cursorOpacity]);
  
  // Auto-focus the input when the screen loads
  useEffect(() => {
    const focusTimeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(focusTimeout);
  }, []);

  const handleTextChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setOtp(numericText.slice(0, length));
  };

  return (
    <View style={styles.otpInputContainer}>
      {/* The actual, invisible TextInput is now layered ON TOP of the boxes */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={otp}
        onChangeText={handleTextChange}
        maxLength={length}
        keyboardType="number-pad"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        caretHidden
      />
      {/* This is now just a visual display, not a pressable element */}
      <View style={styles.otpDisplayContainer}>
        {Array.from({ length }).map((_, index) => {
          const char = otp[index];
          const isCurrentBox = index === otp.length;

          return (
            <Pressable
              key={index}
              style={[
                styles.otpBox,
                isFocused && isCurrentBox && styles.otpBoxFocused,
              ]}
              onPress={() => inputRef.current?.focus()}
            >
              <Text style={styles.otpText}>{char}</Text>
              {isFocused && isCurrentBox && (
                <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};


// --- Main Screen Component ---
export default function VerifyOtpScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params;

  const theme = lightTheme;
  const styles = getStyles(theme);

  const { verifyOtpAndLogin, resendOtp } = useAuth();
  const { showBanner} = useBanner();
  const { showAlert } = useAlert();

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await Clipboard.getString();
        if (text && /^\d{6}$/.test(text)) {
          showAlert('OTP Detected', 'We found a 6-digit code in your clipboard. Would you like to use it?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Use Code', onPress: () => {
                  setOtp(text);
                  Keyboard.dismiss();
              }}
          ]);
        }
      } catch (e) {
        console.warn("Could not read clipboard", e);
      }
    };
    // Check clipboard when the screen comes into focus
    const unsubscribe = navigation.addListener('focus', checkClipboard);
    return unsubscribe;
  }, [navigation, showAlert]);
  
  const handleVerify = async () => {
    if (otp.length !== 6) {
      return showBanner('Please enter the complete 6-digit code.');
    }
    setIsLoading(true);
    try {
      await verifyOtpAndLogin(email, otp);
    } catch (error) {
      showAlert('Verification Failed', error.response?.data?.message || 'An unknown error occurred.');
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      await resendOtp(email);
      showBanner('A new code has been sent!');
      setResendCooldown(60);
    } catch (error) {
      showAlert('Error', error.response?.data?.message || 'Could not resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={() => navigation.goBack()} />
      <View style={styles.content}>
        <View style={styles.mainContent}>
          <Animatable.View animation="fadeInUp" duration={500} delay={100}>
              <Ionicons name="mail-unread-outline" size={80} color={theme.primary} />
          </Animatable.View>

          <Animatable.Text animation="fadeInUp" duration={500} delay={200} style={styles.title}>Check Your Email</Animatable.Text>
          
          <Animatable.Text animation="fadeInUp" duration={500} delay={300} style={styles.subtitle}>
              We've sent a 6-digit verification code to <Text style={styles.boldText}>{email}</Text>. 
              If you don't see it, check your spam or junk folder.
          </Animatable.Text>
          
          <Animatable.View animation="fadeInUp" duration={500} delay={400}>
              <OtpInput otp={otp} setOtp={setOtp} />
          </Animatable.View>
        </View>

        <View style={styles.footer}>
          <Animatable.View animation="fadeInUp" duration={500} delay={500} style={styles.buttonWrapper}>
              <TouchableOpacity style={[styles.button, (isLoading || otp.length !== 6) && styles.buttonDisabled]} onPress={handleVerify} disabled={isLoading || otp.length !== 6}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Account</Text>}
              </TouchableOpacity>
          </Animatable.View>

          <Animatable.View animation="fadeInUp" duration={500} delay={600}>
              <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0} style={styles.resendButton}>
              <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend"}
              </Text>
              </TouchableOpacity>
          </Animatable.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --- Stylesheet (Refactored for better design and interaction) ---

const getStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { 
    padding: 8 
  },
  headerTitle: { 
    color: theme.text, 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  content: { 
    flex: 1, 
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  mainContent: {
    paddingTop: '5%',
    alignItems: 'center',
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: theme.text, 
    textAlign: 'center', 
    marginTop: 32, 
    marginBottom: 16 
  },
  subtitle: { 
    fontSize: 16, 
    color: theme.textSecondary, 
    textAlign: 'center', 
    marginBottom: 48, 
    lineHeight: 24 
  },
  boldText: { 
    fontWeight: '600', 
    color: theme.primary 
  },
  
  otpInputContainer: {
    width: '100%',
    height: 60,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
    color: 'transparent',
    backgroundColor: 'transparent',
    textAlign: 'center',
    fontSize: 20,
  },
  otpDisplayContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    width: (width - 48 - 40) / 6, 
    maxWidth: 50,
    height: 60,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.text,
  },
  otpBoxFocused: {
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  cursor: {
    width: 2.5,
    height: 28,
    backgroundColor: theme.primary,
    position: 'absolute',
  },
  
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  button: { 
    backgroundColor: theme.primary, 
    borderRadius: 16, 
    width: '100%', 
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: theme.disabled,
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonText: { 
    color: theme.textOnPrimary,
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  
  resendButton: {
    marginTop: 24,
    padding: 10,
  },
  resendText: { 
    color: theme.primary, 
    fontSize: 16,
    fontWeight: '600'
  },
  resendTextDisabled: {
    color: theme.textSecondary,
  },
});