// screens/SignUpScreen.js

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  ImageBackground,
  TouchableOpacity,
  Platform,
  Modal,
  Keyboard,
  ScrollView,
  BackHandler,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { TextInput, Checkbox, Provider as PaperProvider } from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Easing } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, useMessage, useAlert } from '../../contexts/index.js';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.8;
const CARD_HEIGHT_FACTOR = 0.7;
const CARD_HEIGHT = SCREEN_HEIGHT * CARD_HEIGHT_FACTOR;

const PolicyModal = ({ visible, title, content, onClose }) => (
  <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
    <View style={styles.policyModalOverlay}>
      <View style={styles.policyModalView}>
        <Text style={styles.policyTitle}>{title}</Text>
        <ScrollView style={styles.policyScrollView}>
          <Text style={styles.policyModalText}>{content}</Text>
        </ScrollView>
        <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={onClose}>
          <Text style={styles.textStyle}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function SignUpScreen() {
  const { showMessage: originalShowMessage } = useMessage();
  const { showAlert } = useAlert();
  const route = useRoute();
  const navigation = useNavigation();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const {
    signIn,
    register,
    googleSignIn,
    isLoading: isAuthLoading,
    setAuthAction,
    completeAuthAction,
  } = useAuth();
  const [isLogin, setIsLogin] = useState(route.params?.screen === 'Login' || false);
  const [checked, setChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [Name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPolicyModalVisible, setPolicyModalVisible] = useState(false);
  const [policyContent, setPolicyContent] = useState({ title: '', text: '' });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);

  const showMessage = useCallback((msg, callback) => {
    console.log('>>> showMessage called with:', msg);
    originalShowMessage(msg, callback);
  }, [originalShowMessage]);


  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (isLogin) {
          setIsLogin(false);
          return true;
        }
        navigation.goBack();
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [isLogin, navigation])
  );
  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.exp),
    }).start();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () =>
      setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () =>
      setIsKeyboardVisible(false)
    );
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [setIsKeyboardVisible]);

  useEffect(() => {
    const opacityToValue = isKeyboardVisible ? 0 : 1;
    const translateToValue = isKeyboardVisible ? -42 : 0;
    Animated.parallel([
      Animated.timing(opacity, { toValue: opacityToValue, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: translateToValue, useNativeDriver: true }),
    ]).start();
  }, [isKeyboardVisible, opacity, translateY]);

  useEffect(() => {
    if (isLogin) {
      const loadCredentials = async () => {
        try {
          const shouldRemember = await AsyncStorage.getItem('rememberCredentials');
          if (shouldRemember === 'true') {
            const savedEmail = await AsyncStorage.getItem('savedEmail');
            const savedPassword = await AsyncStorage.getItem('savedPassword');
            setEmail(savedEmail || '');
            setPassword(savedPassword || '');
            setRememberMe(true);
          } else {
            setEmail('');
            setPassword('');
            setRememberMe(false);
          }
        } catch (error) {
          console.error('Failed to load credentials from storage', error);
        }
      };
      loadCredentials();
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setChecked(false);
    }
  }, [isLogin]);

  const toggleMode = useCallback(() => {
    animatedValue.setValue(0);
    setIsLogin(prevIsLogin => !prevIsLogin);
    Animated.timing(animatedValue, {
      toValue: !isLogin ? 1 : 0,
      duration: 500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [animatedValue, isLogin]);


  const openPolicyModal = useCallback(async (type) => {
    if (isPolicyLoading) return;

    setIsPolicyLoading(true);

    try {
      let rawTextModule;
      let title = '';

      if (type === 'terms') {
        rawTextModule = await import('../../data/TermsOfServices.js');
        title = 'Terms and Conditions';
      } else {
        rawTextModule = await import('../../data/PrivacyPolicy.js');
        title = 'Privacy Policy';
      }

      const formattedDate = new Date().toLocaleDateString();

      const processedText = rawTextModule.default.replace('{{LAST_UPDATED}}', formattedDate);

      setPolicyContent({ title, text: processedText });
      setPolicyModalVisible(true);
    } catch (error) {
      console.error('Failed to load policy text:', error);
      showAlert('Error', 'Could not load the document. Please try again.');
    } finally {
      setIsPolicyLoading(false);
    }
  }, [isPolicyLoading, showAlert]);


  const handleSignUp = async () => {
    setIsLoading(true);

    console.log('--- handleSignUp triggered (Attempt) ---');
    console.log('Name:', Name, 'Email:', email, 'Password length:', password.length, 'Confirm Password length:', confirmPassword.length);
    console.log('Validation checks: !Name.trim()=', !Name.trim(), ' !email.trim()=', !email.trim(), ' !password=', !password);


    if (!Name.trim() || !email.trim() || !password) {
      console.log('!!! VALIDATION FAILED: MISSING FIELDS !!!');
      setIsLoading(false);
      return showMessage('PLEASE FILL IN ALL FIELDS.');
    } else {
        console.log('Client-side basic fields validation PASSED.');
    }

    if (password !== confirmPassword) {
      console.log('!!! VALIDATION FAILED: PASSWORDS DO NOT MATCH !!!');
      setIsLoading(false);
      return showMessage('PASSWORDS DO NOT MATCH.');
    }
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    if (!passwordRegex.test(password)) {
      console.log('!!! VALIDATION FAILED: PASSWORD COMPLEXITY !!!');
      setIsLoading(false);
      return showMessage(
        'Password must be at least 8 characters and include an uppercase letter, a number, and a special character.'
      );
    }
    if (!checked) {
      console.log('!!! VALIDATION FAILED: TERMS NOT AGREED !!!');
      setIsLoading(false);
      return showMessage('PLEASE AGREE TO THE TERMS AND CONDITIONS.');
    }

     setAuthAction('PENDING_SIGNUP_MESSAGE');

    try {
        await register({ displayName: Name, email, password });
            
            // On success, show a message and navigate to the VerifyOtpScreen
            showMessage('Registration successful! Please verify your email.');
            navigation.navigate('VerifyOtp', { email }); // Pass the email to the next screen

        } catch (error) {
            console.error('Sign-up API call failed:', error.response?.data?.message || error.message);
            const errorMsg = error.response?.data?.message || 'An unexpected error occurred.';
            showAlert('Sign-Up Failed', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

  const handleLogin = async () => {
    setIsLoading(true);

    if (!email.trim() || !password) {
      console.log('!!! VALIDATION FAILED: LOGIN MISSING FIELDS !!!');
      setIsLoading(false);
      return showMessage('PLEASE ENTER BOTH EMAIL AND PASSWORD.');
    }

    try {
      setAuthAction('PENDING_LOGIN_MESSAGE');
      await signIn(email, password, rememberMe);

      if (rememberMe) {
        await AsyncStorage.setItem('savedEmail', email);
        await AsyncStorage.setItem('savedPassword', password);
        await AsyncStorage.setItem('rememberCredentials', 'true');
      } else {
        await AsyncStorage.removeItem('savedEmail');
        await AsyncStorage.removeItem('savedPassword');
        await AsyncStorage.setItem('rememberCredentials', 'false');
      }

      showMessage('Login Successful!', () => {
        completeAuthAction();
      });
    } catch (error) {
      console.log('LOGIN FAILED on SignUpScreen');
      if (error.response) {
        console.error('Error Data:', error.response.data);
      } else {
        console.error('Error Message:', error.message);
      }
      const errorMessage =
        error.response?.data?.message ||
        'Login failed. The server may be unavailable. Please try again later.';
      showMessage(errorMessage);
      completeAuthAction();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await googleSignIn();
    } catch (error) {
      console.error('Google Sign-In initiation failed:', error);
      Alert.alert(
        'Google Sign-In Error',
        'Could not start Google sign-in process. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const cardY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, SCREEN_HEIGHT * (1 - CARD_HEIGHT_FACTOR)],
  });
  const cardStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 40,
    zIndex: 1,
    width: SCREEN_WIDTH,
    height: CARD_HEIGHT + 200,
    transform: [{ translateY: cardY }],
    alignItems: 'center',
  };
  const inputTheme = {
    colors: {
      primary: '#007bff',
      background: 'white',
      text: 'black',
      placeholder: '#868e96',
      onSurfaceVariant: '#868e96',
    },
    roundness: 25,
  };

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={require('../../assets/images/logos/logo.png')}
        style={styles.logos}
        resizeMode="contain"
      />
      <ImageBackground
        source={require('../../assets/images/backgrounds/getstarted.jpg')}
        style={styles.backgroundImage}
      >
        <View style={styles.blueOverlay} />
        <Animated.View style={[cardStyle, styles.cardShadow]}>
          <Image
            source={require('../../assets/images/logos/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Animated.ScrollView
            style={[{ width: '100%' }, { transform: [{ translateY }] }]}
            contentContainerStyle={{ alignItems: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: opacity, alignItems: 'center' }}>
              <Text style={styles.headerText}>
                {isLogin ? 'Welcome Back!' : 'Your journey starts here take the first step'}
              </Text>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, !isLogin && styles.activeTab]}
                  onPress={isLogin ? toggleMode : null}
                  disabled={isLoading}
                >
                  <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, isLogin && styles.activeTab]}
                  onPress={!isLogin ? toggleMode : null}
                  disabled={isLoading}
                >
                  <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Login</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
            <Animated.View style={[styles.formContainer, { transform: [{ translateY }] }]}>
              {!isLogin ? (
                <>
                  <View style={styles.authFormContainer}>
                    {!isKeyboardVisible && (
                      <Text style={styles.sectionTitle}>Create your account</Text>
                    )}
                    <PaperProvider theme={inputTheme}>
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']}
                        style={styles.linearGradient}
                      >
                        <TextInput
                          label="Full Name"
                          style={styles.input}
                          mode="outlined"
                          dense
                          value={Name}
                          onChangeText={setName}
                          editable={!isLoading}
                        />
                      </LinearGradient>
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']}
                        style={styles.linearGradient}
                      >
                        <TextInput
                          label="Email"
                          mode="outlined"
                          style={styles.input}
                          dense
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          editable={!isLoading}
                        />
                      </LinearGradient>
                      <LinearGradient
                        colors={['rgba(219, 225, 236, 0.6)', 'rgba(255, 255, 255, 1)']}
                        style={styles.linearGradient}
                      >
                        <TextInput
                          label="Create Password"
                          mode="outlined"
                          secureTextEntry={!showPassword}
                          style={styles.input}
                          dense
                          value={password}
                          onChangeText={setPassword}
                          editable={!isLoading}
                        />
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Ionicons
                            name={showPassword ? 'eye' : 'eye-off'}
                            size={24}
                            color="#777"
                          />
                        </TouchableOpacity>
                      </LinearGradient>
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']}
                        style={styles.linearGradient}
                      >
                        <TextInput
                          label="Confirm Password"
                          mode="outlined"
                          secureTextEntry={!showConfirmPassword}
                          style={styles.input}
                          dense
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          editable={!isLoading}
                        />
                        <TouchableOpacity
                          style={styles.eyeIcon}
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <Ionicons
                            name={showConfirmPassword ? 'eye' : 'eye-off'}
                            size={24}
                            color="#777"
                          />
                        </TouchableOpacity>
                      </LinearGradient>
                    </PaperProvider>
                    <View style={[styles.checkboxRow, { left: 17 }]}>
                      <Checkbox
                        status={checked ? 'checked' : 'unchecked'}
                        onPress={() => setChecked(!checked)}
                        disabled={isLoading}
                      />
                      <View style={{ flexDirection: 'row' }}>
                        <Text style={[styles.checkboxText, { left: 2 }]}>I agree to the </Text>
                        <TouchableOpacity onPress={() => openPolicyModal('terms')}>
                          <Text style={[styles.checkboxText, styles.linkText]}>
                            Terms and Conditions
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.createButton, isLoading && styles.buttonDisabled]}
                      onPress={handleSignUp}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.createButtonLabel}>Create Account</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.separatorContainer}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>Or Sign up with</Text>
                    <View style={styles.separatorLine} />
                  </View>
                  <View style={styles.socialLoginContainer}>
                    <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn} disabled={isLoading}>
                      <Image
                        source={require('../../assets/images/logos/Google_2015_logo.svg.png')}
                        style={styles.icon}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={toggleMode} disabled={isLoading}>
                    <Text style={styles.toggleToLoginText}>Already have an account? Log In</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View
                    style={[styles.form, { width: '100%', maxWidth: 350, alignItems: 'center' }]}
                  >
                    <View style={styles.authFormContainer}>
                      {!isKeyboardVisible && <Text style={styles.loginTitle}>Log In</Text>}
                      <PaperProvider theme={inputTheme}>
                        <LinearGradient
                          colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']}
                          style={styles.loginLinearGradient}
                        >
                          <TextInput
                            label="Email"
                            mode="outlined"
                            style={styles.loginInput}
                            dense
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isLoading}
                          />
                        </LinearGradient>
                        <LinearGradient
                          colors={['rgba(219, 225, 236, 0.6)', 'rgba(255, 255, 255, 1)']}
                          style={styles.loginLinearGradient}
                        >
                          <TextInput
                            label="Password"
                            mode="outlined"
                            secureTextEntry={!showPassword}
                            style={styles.loginInput}
                            dense
                            value={password}
                            onChangeText={setPassword}
                            editable={!isLoading}
                          />
                          <TouchableOpacity
                            style={styles.loginEyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                          >
                            <Ionicons
                              name={showPassword ? 'eye' : 'eye-off'}
                              size={24}
                              color="#777"
                            />
                          </TouchableOpacity>
                        </LinearGradient>
                      </PaperProvider>
                      <View style={styles.loginCheckboxRow}>
                        <Checkbox
                          status={rememberMe ? 'checked' : 'unchecked'}
                          onPress={() => setRememberMe(!rememberMe)}
                          disabled={isLoading}
                        />
                        <Text style={styles.loginCheckboxText}>Remember Me</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('ForgotPassword')}
                            style={styles.forgotPasswordLink}
                            disabled={isLoading}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={[styles.loginCreateButton, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.createButtonLabel}>Log In</Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    <View style={styles.separatorContainer}>
                      <View style={styles.separatorLine} />
                      <Text style={styles.separatorText}>Or Sign in with</Text>
                      <View style={styles.separatorLine} />
                    </View>
                    <View style={styles.socialLoginContainer}>
                      <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn} disabled={isLoading}>
                        <Image
                          source={require('../../assets/images/logos/Google_2015_logo.svg.png')}
                          style={styles.icon}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={() => openPolicyModal('privacy')} disabled={isLoading}>
                      <Text style={styles.link}>Privacy Policy</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerSeparator}>|</Text>
                    <TouchableOpacity onPress={() => openPolicyModal('terms')} disabled={isLoading}>
                      <Text style={styles.link}>Terms of Service</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Animated.View>
          </Animated.ScrollView>
        </Animated.View>
      </ImageBackground>
      <PolicyModal
        visible={isPolicyModalVisible}
        title={policyContent.title}
        content={policyContent.text}
        onClose={() => setPolicyModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    height: IMAGE_HEIGHT,
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 0,
  },
  blueOverlay: {
    backgroundColor: 'rgba(0, 65, 176, 0.39)',
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  logos: {
    height: 30,
    left: 25,
    position: 'absolute',
    resizeMode: 'contain',
    top: 60,
    transform: [{ translateY: -20 }],
    width: 60,
    zIndex: 4,
  },
  logo: { height: 30, marginBottom: 15, width: 70 },
  headerText: { fontSize: 17, fontWeight: 'bold', marginHorizontal: 25, textAlign: 'center' },
  tabContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(198, 205, 218, 1)',
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    overflow: 'hidden',
    width: '80%',
  },
  tab: { alignItems: 'center', flex: 1, paddingVertical: 9 },
  activeTab: { backgroundColor: 'rgba(33, 57, 97, 1)' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  tabText: { color: '#333', fontSize: 10 },
  cardShadow: {
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  formContainer: { alignItems: 'center', paddingVertical: 10, width: '100%' },
  authFormContainer: { alignItems: 'center', maxWidth: 350, paddingHorizontal: 20, width: '100%' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 15,
    right: 62,
    textAlign: 'center',
  },
  loginTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 20,
    right: 112,
    textAlign: 'center',
  },
  input: { backgroundColor: 'transparent', bottom: 2, fontSize: 13, height: 30, width: 280 },
  loginInput: { backgroundColor: 'transparent', fontSize: 13, height: 30, top: -3, width: 280 },
  linearGradient: {
    borderRadius: 20,
    height: 30,
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
  },
  loginLinearGradient: {
    borderRadius: 20,
    height: 35,
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
  },
  checkboxRow: {
    alignItems: 'center',
    flexDirection: 'row',
    left: 17,
    marginTop: 10,
    maxWidth: 350,
    width: '100%',
  },
  checkboxLabelContainer: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap' },
  checkboxText: { color: '#444', fontSize: 10, lineHeight: 12 },
  linkText: { color: '#007bff', textDecorationLine: 'underline' },
  createButton: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#00BBD6',
    width: '60%',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    top: 15,
    marginBottom: 15,
  },
  loginCreateButton: {
    alignItems: 'center',
    backgroundColor: '#00BBD6',
    borderRadius: 20,
    elevation: 3,
    height: 46,
    justifyContent: 'center',
    marginTop: 16,
    width: '60%',
  },
  createButtonLabel: { color: 'white', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },

  separatorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 15,
    width: '80%',
  },
  separatorLine: {
    backgroundColor: '#ccc',
    flex: 1,
    height: 1,
  },
  separatorText: {
    color: '#666',
    fontSize: 12,
    marginHorizontal: 10,
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
  },
  socialButton: {
    alignItems: 'center',
    borderColor: '#e0e0e0',
    borderRadius: 50,
    borderWidth: 1,
    justifyContent: 'center',
    padding: 10,
  },
  icon: { height: 24, width: 24 },
  eyeIcon: { position: 'absolute', right: 20, top: '50%', transform: [{ translateY: -12 }] },
  loginEyeIcon: { position: 'absolute', right: 20, top: '50%', transform: [{ translateY: -12 }] },
  toggleToLoginText: {
    color: '#00BBD6',
    fontSize: 12,
    marginTop: 15,
    textDecorationLine: 'underline',
  },
  form: { alignItems: 'center', maxWidth: 350, width: '100%' },
  footerLinks: { alignItems: 'center', bottom: 10, flexDirection: 'row', marginTop: 10 },
  link: { color: '#999', fontSize: 12, marginHorizontal: 5 },
  footerSeparator: { color: '#999', fontSize: 12 },
  loginCheckboxRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 10,
    width: '100%',
    justifyContent: 'space-between',
  },
  loginCheckboxText: { color: '#444', fontSize: 10, right: 35 },
  forgotPasswordLink: {
      paddingVertical: 5,
      paddingHorizontal: 5,
  },
  forgotPasswordText: {
      color: '#007bff',
      fontSize: 10,
      textDecorationLine: 'underline',
  },
  policyModalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  policyModalView: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 5,
    height: '80%',
    margin: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: '90%',
  },
  policyTitle: { color: '#333', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  policyScrollView: { marginVertical: 10, width: '100%' },
  policyModalText: { color: '#333', fontSize: 14, lineHeight: 22 },
  button: { borderRadius: 15, elevation: 2, padding: 10, top: 10, width: 100 },
  buttonClose: { backgroundColor: 'red' },
  textStyle: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
  buttonDisabled: { backgroundColor: '#a3dbe1' },
});