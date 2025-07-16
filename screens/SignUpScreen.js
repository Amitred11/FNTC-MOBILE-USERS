import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Dimensions, ImageBackground,
  TouchableOpacity, Platform, Modal, Keyboard, ScrollView, BackHandler, Alert, ActivityIndicator
} from 'react-native';
import { TextInput, Checkbox, Provider as PaperProvider } from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TERMS_AND_CONDITIONS_TEXT } from '../texts/Terms of Services';
import { PRIVACY_POLICY_TEXT } from '../texts/Privacy Policy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, useMessage } from '../contexts';
import * as WebBrowser from 'expo-web-browser';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.8;
const CARD_HEIGHT_FACTOR = 0.7;
const CARD_HEIGHT = SCREEN_HEIGHT * CARD_HEIGHT_FACTOR;

const PolicyModal = ({ visible, title, content, onClose }) => ( <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}> <View style={styles.policyModalOverlay}><View style={styles.policyModalView}><Text style={styles.policyTitle}>{title}</Text><ScrollView style={styles.policyScrollView}><Text style={styles.policyModalText}>{content}</Text></ScrollView><TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={onClose}><Text style={styles.textStyle}>Close</Text></TouchableOpacity></View></View></Modal> );

export default function SignUpScreen() {
  const { showMessage } = useMessage();
  const route = useRoute();
  const navigation = useNavigation();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const { signIn, register, googleSignIn, isLoading: isAuthLoading, setAuthAction, completeAuthAction } = useAuth();
  const [isLogin, setIsLogin] = useState(route.params?.screen === 'Login' || false);
  const [checked, setChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState(''); // FIX: Changed setemail to setEmail for consistency
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

  useFocusEffect(useCallback(() => { const onBackPress = () => { if (isLogin) { setIsLogin(false); return true; } navigation.goBack(); return true; }; const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress); return () => subscription.remove(); }, [isLogin, navigation]));
  useEffect(() => { Animated.timing(cardAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.exp) }).start(); }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const opacityToValue = isKeyboardVisible ? 0 : 1;
    const translateToValue = isKeyboardVisible ? -42 : 0;
    Animated.parallel([
      Animated.timing(opacity, { toValue: opacityToValue, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: translateToValue, useNativeDriver: true }),
    ]).start();
  }, [isKeyboardVisible]);


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
            // Explicitly clear fields if not remembered
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
      // When switching to SIGN UP, clear all fields
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setChecked(false);
    }
  }, [isLogin]);


  const toggleMode = () => {
    animatedValue.setValue(0);
    setIsLogin(!isLogin);
    Animated.timing(animatedValue, {
      toValue: isLogin ? 1 : 0,
      duration: 500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  };

  const openPolicyModal = (type) => { setPolicyContent({ title: type === 'terms' ? 'Terms and Conditions' : 'Privacy Policy', text: type === 'terms' ? TERMS_AND_CONDITIONS_TEXT : PRIVACY_POLICY_TEXT }); setPolicyModalVisible(true); };

  const handleSignUp = async () => {
    if (!Name.trim() || !email.trim() || !password) {
        return showMessage("PLEASE FILL IN ALL FIELDS.");
    }
    if (password !== confirmPassword) {
        return showMessage("PASSWORDS DO NOT MATCH.");
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return showMessage("Password must be at least 8 characters and include an uppercase letter, a number, and a special character.");
    }
    if (!checked) {
        return showMessage("PLEASE AGREE TO THE TERMS AND CONDITIONS.");
    }

    setIsLoading(true);
    try {
        setAuthAction('PENDING_SIGNUP_MESSAGE');
        // FIX: Used the correct state variable 'Name' instead of undefined 'name'
        await api.post('/auth/register', { displayName: Name, email, password });
        
        // This is good practice: clear form on success
        setName(''); 
        setEmail(''); 
        setPassword(''); 
        setConfirmPassword(''); 
        setChecked(false);
        
        showMessage("Sign-up successful! Please log in to continue.");
        setIsLogin(true); // Switch to login view
        completeAuthAction();
    } catch (error) {
        const errorMsg = error.response?.data?.message || 'An unexpected error occurred.';
        Alert.alert("Sign-Up Failed", errorMsg); // Using Alert for system errors is fine
        completeAuthAction();
    } finally {
        setIsLoading(false);
    }
  };

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            return showMessage("PLEASE ENTER BOTH EMAIL AND PASSWORD.");
        }
        
        setIsLoading(true);
        try {
            setAuthAction('PENDING_LOGIN_MESSAGE');
            // Call the sign-in function from the context
            await signIn(email, password, rememberMe);

            // --- FIX: Logic for saving credentials now happens AFTER a successful signIn ---
            if (rememberMe) {
                // Save the email and password the user just successfully logged in with
                await AsyncStorage.setItem('savedEmail', email);
                await AsyncStorage.setItem('savedPassword', password);
                await AsyncStorage.setItem('rememberCredentials', 'true');
            } else {
                // If they logged in without "Remember Me", clear any previously saved credentials
                await AsyncStorage.removeItem('savedEmail');
                await AsyncStorage.removeItem('savedPassword');
                await AsyncStorage.setItem('rememberCredentials', 'false');
            }

            showMessage("Login Successful!", () => {
                completeAuthAction();
                // Navigation will happen automatically because the user object in AuthContext is now set
            });

        } catch (error) {
              console.log('LOGIN FAILED on SignUpScreen');
            if (error.response) {
                console.error("Error Data:", error.response.data);
            } else {
                console.error('Error Message:', error.message);
              
      }
      const errorMessage = error.response?.data?.message || 'Login failed. The server may be unavailable. Please try again later.';
      showMessage(errorMessage);
      completeAuthAction();
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
        // Disable other actions while Google flow is active
        setIsLoading(true); // You might use isAuthLoading from context here too
        try {
            await googleSignIn(); // Call the Google sign-in flow
        } catch (error) {
            console.error("Google Sign-In initiation failed:", error);
            Alert.alert("Google Sign-In Error", "Could not start Google sign-in process. Please try again.");
        } finally {
            setIsLoading(false); // Re-enable local loading state
        }
    };

  const cardY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, SCREEN_HEIGHT * (1 - CARD_HEIGHT_FACTOR)], });
  const cardStyle = { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, backgroundColor: 'white', borderRadius: 40, zIndex: 1, width: SCREEN_WIDTH, height: CARD_HEIGHT + 200, transform: [{ translateY: cardY }], alignItems: 'center', };
  const inputTheme = { colors: { primary: '#007bff', background: 'white', text: 'black', placeholder: '#868e96', onSurfaceVariant: '#868e96' }, roundness: 25, };

  return (
    <View style={{ flex: 1 }}>
      <Image source={require('../assets/images/logo.png')} style={styles.logos} resizeMode="contain" />
      <ImageBackground source={require('../assets/images/getstarted.jpg')} style={styles.backgroundImage}>
        <View style={styles.blueOverlay} />
        <Animated.View style={[cardStyle, styles.cardShadow]}>
          <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Animated.ScrollView 
            style={[{ width: '100%' }, { transform: [{ translateY }] }]}
            contentContainerStyle={{ alignItems: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
          <Animated.View style={{ opacity: opacity, alignItems: 'center' }}>
          <Text style={styles.headerText}>{isLogin ? 'Welcome Back!' : 'Your journey starts here take the first step'}</Text>
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, !isLogin && styles.activeTab]} onPress={isLogin ? toggleMode : null} disabled={isLoading}><Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Sign Up</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, isLogin && styles.activeTab]} onPress={!isLogin ? toggleMode : null} disabled={isLoading}><Text style={[styles.tabText, isLogin && styles.activeTabText]}>Login</Text></TouchableOpacity>
          </View>
        </Animated.View>
            <Animated.View style={[styles.formContainer, { transform: [{ translateY }] }]}>
              {!isLogin ? (
                <>
                <View style={styles.authFormContainer}>
                  {!isKeyboardVisible && (<Text style={styles.sectionTitle}>Create your account</Text>)}
                  <PaperProvider theme={inputTheme}>
                    <LinearGradient colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']} style={styles.linearGradient}>
                      <TextInput label="Full Name" style={styles.input} mode="outlined" dense value={Name} onChangeText={setName} editable={!isLoading} />
                    </LinearGradient>
                    <LinearGradient colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']} style={styles.linearGradient}>
                      {/* FIX: Using consistent setEmail setter */}
                      <TextInput label="Email" mode="outlined" style={styles.input} dense value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!isLoading}/>
                    </LinearGradient>
                    <LinearGradient colors={['rgba(219, 225, 236, 0.6)', 'rgba(255, 255, 255, 1)']} style={styles.linearGradient}>
                      <TextInput label="Create Password" mode="outlined" secureTextEntry={!showPassword} style={styles.input} dense value={password} onChangeText={setPassword} editable={!isLoading}/>
                      <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#777" /></TouchableOpacity>
                    </LinearGradient>
                    <LinearGradient colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']} style={styles.linearGradient}>
                      <TextInput label="Confirm Password" mode="outlined" secureTextEntry={!showConfirmPassword} style={styles.input} dense value={confirmPassword} onChangeText={setConfirmPassword} editable={!isLoading}/>
                      <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}><Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={24} color="#777" /></TouchableOpacity>
                    </LinearGradient>
                  </PaperProvider>
                  <View style={[styles.checkboxRow, {left: 17}]}>
                      <Checkbox status={checked ? 'checked' : 'unchecked'} onPress={() => setChecked(!checked)} />
                      <View style={{flexDirection: 'row'}} >
                        <Text style={[styles.checkboxText, {left:2}]}>I agree to the  </Text>
                        <TouchableOpacity onPress={() => openPolicyModal('terms')}><Text style={[styles.checkboxText, styles.linkText]}>Terms and Conditions</Text></TouchableOpacity>
                      </View>
                  </View>
                  <TouchableOpacity style={[styles.createButton, isLoading && styles.buttonDisabled]} onPress={handleSignUp} disabled={isLoading}>{isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonLabel}>Create Account</Text>}</TouchableOpacity>
                </View>

                {/* FIX: Replaced complex positioned elements with a clean flexbox layout */}
                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>Or Sign up with</Text>
                  <View style={styles.separatorLine} />
                </View>
                <View style={styles.socialLoginContainer}>
                    <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
                      <Image source={require('../assets/images/Google_2015_logo.svg.png')} style={styles.icon} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={toggleMode} disabled={isLoading}><Text style={styles.toggleToLoginText}>Already have an account? Log In</Text></TouchableOpacity>
                </>
              ) : (
                <>
                <View style={[styles.form, { width: '100%', maxWidth: 350, alignItems: 'center' }]}>
                  <View style={styles.authFormContainer}>
                    {!isKeyboardVisible && (<Text style={styles.loginTitle}>Log In</Text>)}
                    <PaperProvider theme={inputTheme}>
                      <LinearGradient colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']} style={styles.loginLinearGradient}>
                        {/* FIX: Using consistent setEmail setter */}
                        <TextInput label="Email" mode="outlined" style={styles.loginInput} dense value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!isLoading}/>
                      </LinearGradient>
                      <LinearGradient colors={['rgba(219, 225, 236, 0.6)', 'rgba(255, 255, 255, 1)']} style={styles.loginLinearGradient}>
                        <TextInput label="Password" mode="outlined" secureTextEntry={!showPassword} style={styles.loginInput} dense value={password} onChangeText={setPassword} editable={!isLoading}/>
                        <TouchableOpacity style={styles.loginEyeIcon} onPress={() => setShowPassword(!showPassword)}><Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#777" /></TouchableOpacity>
                      </LinearGradient>
                    </PaperProvider>
                    <View style={styles.loginCheckboxRow}>
                      <Checkbox status={rememberMe ? 'checked' : 'unchecked'} onPress={() => setRememberMe(!rememberMe)} />
                      <Text style={styles.loginCheckboxText}>Remember Me</Text>
                    </View>
                    <TouchableOpacity style={[styles.loginCreateButton, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>{isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonLabel}>Log In</Text>}</TouchableOpacity>
                  </View>
                  
                  {/* FIX: Replaced complex positioned elements with a clean flexbox layout */}
                  <View style={styles.separatorContainer}>
                    <View style={styles.separatorLine} />
                    <Text style={styles.separatorText}>Or Sign in with</Text>
                    <View style={styles.separatorLine} />
                  </View>
                  <View style={styles.socialLoginContainer}>
                    <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
                      <Image source={require('../assets/images/Google_2015_logo.svg.png')} style={styles.icon} />
                    </TouchableOpacity>
                  </View>

                </View>
                <View style={styles.footerLinks}><TouchableOpacity onPress={() => openPolicyModal('policy')}><Text style={styles.link}>Privacy Policy</Text></TouchableOpacity><Text style={styles.footerSeparator}>|</Text><TouchableOpacity onPress={() => openPolicyModal('terms')}><Text style={styles.link}>Terms of Service</Text></TouchableOpacity></View>
                </>
              )}
            </Animated.View>
          </Animated.ScrollView>
        </Animated.View>
      </ImageBackground>
      <PolicyModal visible={isPolicyModalVisible} title={policyContent.title} content={policyContent.text} onClose={() => setPolicyModalVisible(false)} />
    </View>
  );
}

// STYLES (Cleaned and with new additions for the fixes)
const styles = StyleSheet.create({
  backgroundImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: IMAGE_HEIGHT, zIndex: 0 },
  blueOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 65, 176, 0.39)' },
  logos: { position: 'absolute', top: 60, left: 25, width: 60, height: 30, zIndex: 4, resizeMode: 'contain', transform: [{ translateY: -20 }] },
  logo: { width: 70, height: 30, marginBottom: 15 },
  headerText: { fontSize: 17, textAlign: 'center', fontWeight: 'bold', marginHorizontal: 25 },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 16, width: '80%', backgroundColor: 'rgba(198, 205, 218, 1)', borderRadius: 30, overflow: 'hidden', alignSelf: 'center' },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  activeTab: { backgroundColor: 'rgba(33, 57, 97, 1)' },
  activeTabText: { fontWeight: 'bold', color: '#fff' },
  tabText: { fontSize: 10, color: '#333' },
  cardShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 10 },
  formContainer: { width: '100%', alignItems: 'center', paddingVertical: 10 },
  authFormContainer: { width: '100%', alignItems: 'center', maxWidth: 350, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 15, textAlign: 'center', right: 62 },
  loginTitle: { fontSize: 16, marginBottom: 20, fontWeight: '900', textAlign: 'center', right: 112 },
  input: { width: 280, fontSize: 13, height: 30, backgroundColor: 'transparent', bottom: 2 },
  loginInput: { width: 280, fontSize: 13, height: 30, backgroundColor: 'transparent', top: -3 },
  linearGradient: { width: '100%', marginBottom: 12, borderRadius: 20, height: 30, justifyContent: 'center' },
  loginLinearGradient: { width: '100%', marginBottom: 12, borderRadius: 20, height: 35, justifyContent: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, left: 17, width: '100%', maxWidth: 350 },
  checkboxLabelContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  checkboxText: { color: '#444', fontSize: 10, lineHeight: 12 },
  linkText: { color: '#007bff', textDecorationLine: 'underline' },
  createButton: { marginTop: 12, borderRadius: 20, backgroundColor: '#00BBD6', width: '60%', height: 46, alignItems: 'center', justifyContent: 'center', elevation: 3, top: 15, marginBottom: 15 /* Added margin */ },
  loginCreateButton: { marginTop: 16, borderRadius: 20, backgroundColor: '#00BBD6', width: '60%', alignItems: 'center', justifyContent: 'center', height: 46, elevation: 3 },
  createButtonLabel: { fontSize: 13, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  
  // --- FIX: New, robust styles for social login section ---
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginVertical: 15,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  separatorText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 12,
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  socialButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: { width: 24, height: 24 }, // Cleaned up icon style

  eyeIcon: { position: 'absolute', right: 20, top: '50%', transform: [{translateY: -12}] },
  loginEyeIcon: { position: 'absolute', right: 20, top: '50%', transform: [{translateY: -12}] },
  toggleToLoginText: { color: '#00BBD6', fontSize: 12, textDecorationLine: 'underline', marginTop: 15 },
  form: { width: '100%', maxWidth: 350, alignItems: 'center' },
  footerLinks: { flexDirection: 'row', marginTop: 10, alignItems: 'center', bottom: 10 },
  link: { color: '#999', fontSize: 12, marginHorizontal: 5 },
  footerSeparator: { color: '#999', fontSize: 12 },
  loginCheckboxRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingLeft: 10, marginBottom: 10 },
  loginCheckboxText: { color: '#444', fontSize: 10, marginLeft: 6 },
  
  policyModalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  policyModalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, height: '80%', width: '90%' },
  policyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  policyScrollView: { width: '100%', marginVertical: 10 },
  policyModalText: { fontSize: 14, color: '#333', lineHeight: 22 },
  button: { borderRadius: 15, padding: 10, elevation: 2, width: 100, top: 10 },
  buttonClose: { backgroundColor: "red" },
  textStyle: { color: "white", fontWeight: "bold", textAlign: "center" },
  buttonDisabled: { backgroundColor: '#a3dbe1' },
});