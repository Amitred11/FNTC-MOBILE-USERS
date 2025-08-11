// screens/VerifyOtpScreen.js (Final, Robust 6-Box OTP Input)

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { lightTheme } from '../constants/colors';
import { useAuth, useMessage, useAlert } from '../contexts';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import Clipboard from '@react-native-community/clipboard';

// --- Sub-components ---

const Header = React.memo(({ onBackPress }) => {
  const theme = lightTheme;
  const styles = getStyles(theme);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={26} color={theme.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Verify Your Email</Text>
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

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleTextChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setOtp(numericText.slice(0, length));
  };
  
  return (
    <View style={styles.otpInputContainer}>
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
      <Pressable style={styles.otpDisplayContainer} onPress={handlePress}>
        {Array.from({ length }).map((_, index) => {
          const char = otp[index];
          const hasChar = !!char;
          const isCurrentBox = index === otp.length;

          return (
            <View
              key={index}
              style={[
                styles.otpBox,
                isFocused && isCurrentBox && styles.otpBoxFocused,
              ]}
            >
              <Text style={styles.otpText}>{char}</Text>
              {isFocused && isCurrentBox && (
                <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
              )}
            </View>
          );
        })}
      </Pressable>
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
  const { showMessage } = useMessage();
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
    };
    checkClipboard();
  }, []);
  
  const handleVerify = async () => {
    if (otp.length !== 6) {
      return showMessage('Please enter the complete 6-digit code.');
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
      showMessage('A new code has been sent!');
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
        <Animatable.View animation="fadeInUp" duration={500} delay={100}>
            <Ionicons name="mail-unread-outline" size={80} color={theme.primary} style={{alignSelf: 'center'}} />
        </Animatable.View>
        <Animatable.Text animation="fadeInUp" duration={500} delay={200} style={styles.title}>Check Your Email</Animatable.Text>
        <Animatable.Text animation="fadeInUp" duration={500} delay={300} style={styles.subtitle}>
            We've sent a 6-digit verification code to <Text style={styles.boldText}>{email}</Text>.
        </Animatable.Text>
        
        <Animatable.View animation="fadeInUp" duration={500} delay={400}>
            <OtpInput otp={otp} setOtp={setOtp} />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={500} delay={500} style={styles.buttonWrapper}>
            <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Account</Text>}
            </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={500} delay={600}>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0} style={[styles.resendButton, resendCooldown > 0 && { opacity: 0.5 }]}>
            <Text style={styles.resendText}>
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive a code? Resend"}
            </Text>
            </TouchableOpacity>
        </Animatable.View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 5 },
  headerTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginTop: 24, marginBottom: 12 },
  subtitle: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  boldText: { fontWeight: 'bold', color: theme.text },
  
  otpInputContainer: {
    width: '100%',
    height: 60,
    marginBottom: 40,
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 1, // Make it tiny
  },
  otpDisplayContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    width: 48,
    height: 60,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
  },
  otpBoxFocused: {
    borderColor: theme.primary,
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: theme.primary,
    position: 'absolute',
  },
  
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  button: { 
    backgroundColor: theme.primary, 
    padding: 16, 
    borderRadius: 16, 
    width: '100%', 
    alignItems: 'center',
    height: 56,
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  resendButton: {
    marginTop: 24,
    padding: 10,
  },
  resendText: { 
    color: theme.primary, 
    fontSize: 15,
    fontWeight: '600'
  },
});