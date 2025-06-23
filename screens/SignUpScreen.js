import { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import {
  TextInput,
  Checkbox,
  Provider as PaperProvider,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { auth } from '../config/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"; // Import for Google
import { updateProfile } from 'firebase/auth'; // Import updateProfile for setting display name
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage


const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.8;
const CARD_HEIGHT_FACTOR = 0.7;
const CARD_HEIGHT = SCREEN_HEIGHT * CARD_HEIGHT_FACTOR;

export default function SignUpScreen() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const route = useRoute();
  const [isLogin, setIsLogin] = useState(route.params?.screen === 'Login' || false); // Default to Sign Up
  const animatedValue = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setemail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [Name, setName] = useState('');
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false); // State for modal visibility
  const [modalMessage, setModalMessage] = useState(''); // State for the modal message
  const opacity = useRef(new Animated.Value(1)).current;
  const [rememberMe, setRememberMe] = useState(false); // State for whether to remember

  const translateY = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
          Animated.timing(opacity, { // Fade out surrounding text
          toValue: 0,
          duration: 200, // Adjust duration for the fade-out speed
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        Animated.timing(opacity, { // Fade in surrounding text
          toValue: 1,
          duration: 200, // Adjust duration for the fade-in speed
          useNativeDriver: true,
        }).start();
      }
    );

    // Animation triggers based on keyboard visibility
    Animated.spring(translateY, {
      toValue: isKeyboardVisible ? -100 : 0, // Adjust -150 to fine-tune the upward shift
      useNativeDriver: true,
    }).start();


    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, [isKeyboardVisible, translateY, opacity]);



  useEffect(() => {
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.exp),
    }).start();
  }, []);

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

  useEffect(() => {
    // Load saved credentials on component mount
    loadSavedCredentials();
  }, [isLogin]); // Run only when isLogin changes

    const loadSavedCredentials = async () => {
        if (!isLogin) return; // Only load if on the login screen
        try {
            const storedEmail = await AsyncStorage.getItem('userEmail');
            const storedPassword = await AsyncStorage.getItem('userPassword');
            const storedRememberMe = await AsyncStorage.getItem('rememberMe');

            if (storedEmail !== null && storedPassword !== null && storedRememberMe === 'true') {
                setemail(storedEmail);
                setPassword(storedPassword);
                setRememberMe(true); // Ensure this is set correctly
            } else {
              setRememberMe(false); // Or if it's false, make sure you're clearing the values
            }

        } catch (error) {
            console.error('Error loading credentials:', error);
            setModalMessage('Failed to load saved login details.');
            setModalVisible(true);
        }
    };

  const handleSignUp = async () => {
    if (!Name && !email && !password && !confirmPassword) {
      setModalMessage("PLEASE FILL IN ALL FIELDS.");
      setModalVisible(true); // Show the modal
      return;
    }
    if (!Name || !email || !password || !confirmPassword) {
      setModalMessage("PLEASE FILL IN THE REST.");
      setModalVisible(true); // Show the modal
      return;
    }
    if (password !== confirmPassword) {
      setModalMessage("PASSWORDS DO NOT MATCH.");
      setModalVisible(true);
      return;
    }

    if (!checked) {
      setModalMessage("PLEASE AGREE TO THE TERMS AND CONDITIONS.");
      setModalVisible(true);
      return;
    }

    try {
      // Use Firebase Authentication to create a new user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Optionally, update user profile with the name
      await updateProfile(userCredential.user, {
        displayName: Name,
      });
      console.log("User created successfully:", userCredential.user);
      setModalMessage("Sign-up successful!");
      setModalVisible(true);
      // Clear form fields
      setName('');
      setemail('');
      setPassword('');
      setConfirmPassword('');
      setChecked(false);
    } catch (error) {
      console.error("Sign-up error:", error.message);
      setModalMessage(`Sign-up failed: ${error.message}`); // Display the error message from Firebase
      setModalVisible(true);
    }
  };

  const handleLogin = async () => {
    if (!email && !password) {
      setModalMessage("PLEASE ENTER BOTH EMAIL AND PASSWORD.");
      setModalVisible(true);
      return;
    }
    if (!email) {
      setModalMessage("PLEASE ENTER YOUR EMAIL.");
      setModalVisible(true);
      return;
    }
    if (!password) {
      setModalMessage("PLEASE ENTER YOUR PASSWORD.");
      setModalVisible(true);
      return;
    }

    try {
      // Use Firebase Authentication to sign in the user
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful!");
      setModalMessage("Login Successful!");
      setModalVisible(true);

      if (rememberMe) {
          await saveCredentials(email, password);
      } else {
          await clearCredentials();
      }

      // Clear form fields after successful login (optional, since the loadSavedCredentials will pre-populate)
      //setemail('');
      //setPassword('');

    } catch (error) {
      console.error("Login error:", error.message);
      setModalMessage(`Login failed: ${error.message}`); // Display the error message from Firebase
      setModalVisible(true);
    }
  };


    const saveCredentials = async (userEmail, userPassword) => {
        try {
            await AsyncStorage.setItem('userEmail', userEmail);
            await AsyncStorage.setItem('userPassword', userPassword);
            await AsyncStorage.setItem('rememberMe', 'true');
        } catch (error) {
            console.error('Error saving credentials:', error);
            setModalMessage('Failed to save login details.');
            setModalVisible(true);
        }
    };

    const clearCredentials = async () => {
        try {
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('userPassword');
            await AsyncStorage.removeItem('rememberMe');
        } catch (error) {
            console.error('Error clearing credentials:', error);
            setModalMessage('Failed to clear login details.');
            setModalVisible(true);
        }
    };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      // The signed-in user info.
      const user = result.user;
      console.log("Google sign-in successful:", user);
      setModalMessage("Google Sign-in Successful!");
      setModalVisible(true);
      // You can also navigate to your home screen or perform any other actions
    } catch (error) {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.customData.email;
      // The AuthCredential type that was used.
      const credential = GoogleAuthProvider.credentialFromError(error);
      console.error("Google sign-in error:", errorMessage);
      setModalMessage(`Google Sign-in failed: ${errorMessage}`);
      setModalVisible(true);
    }
  };

  const cardY = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, SCREEN_HEIGHT * (1 - CARD_HEIGHT_FACTOR)],
  });

  const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: 'rgba(0, 65, 176, 0.39)',
    zIndex: 0,
  };

  const cardStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 40, // Rounded corners
    shadowColor: '#000', // Shadow for the card
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: Platform.OS === 'android' ? 5 : 0, // For Android shadow
    zIndex: 1,
    width: SCREEN_WIDTH,
    height: CARD_HEIGHT + 200,
    transform: [{ translateY: cardY }],
    alignItems: 'center', // Center content horizontally
  };

  const inputTheme = {
    colors: {
      primary: '#007bff', // Example: Change the outline color
      background: 'white',
    },
    roundness: 25, // Make the input circular
  };

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logos}
        resizeMode="contain"
      />
      <ImageBackground
        source={require('../assets/images/getstarted.jpg')}
        style={styles.backgroundImage}
      >
        <View style={overlayStyle} />
        <Animated.View style={cardStyle}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Animated.View style={{ opacity }}>
          <Text style={{ fontSize: 17, textAlign: 'center', fontWeight: 'bold', marginRight: 25, marginLeft: 25 }}>
            {isLogin ? 'Welcome Back!' : 'Your journey starts here take the first step'}
          </Text>

        <View style={[styles.tabContainer, !isLogin ? styles.tabContainerSignUp : styles.tabContainerLogin]}>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.activeTab]}
            onPress={isLogin ? toggleMode : null}
          >
            <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.activeTab]}
            onPress={!isLogin ? toggleMode : null}
          >
            <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Login</Text>
          </TouchableOpacity>
        </View>
          </Animated.View>

          <Animated.View style={[styles.formContainer, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
            {!isLogin ? (
              <>
              <Animated.View style={[styles.formaContainer, { transform: [{ translateY }] }]}>
                <Text style={styles.sectionTitle}>Create your account</Text>

                <PaperProvider>

                  <LinearGradient
                    colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.linearGradient]}
                  >
                    <TextInput
                      label="Full Name"
                      style={[styles.input]}
                      mode="outlined"
                      dense
                      value={Name}
                      onChangeText={setName}
                      theme={inputTheme}
                    />
                  </LinearGradient>

                  <LinearGradient
                    colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.linearGradient}
                  >
                    <TextInput
                      label="Email"
                      mode="outlined"
                      style={styles.input}
                      dense
                      value={email}
                      onChangeText={setemail}
                      keyboardType="default"
                      autoCapitalize="none"
                      theme={inputTheme}
                    />
                  </LinearGradient>
                  <LinearGradient
                    colors={['rgba(219, 225, 236, 0.6)', 'rgba(255, 255, 255, 1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.linearGradient}>
                    <TextInput
                      label="Create Password"
                      mode="outlined"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      dense
                      value={password}
                      onChangeText={setPassword}
                      theme={inputTheme}
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                      <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#777" />
                    </TouchableOpacity>
                  </LinearGradient>
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.linearGradient}>
                    <TextInput
                      label="Confirm Password"
                      mode="outlined"
                      secureTextEntry={!showConfirmPassword}
                      style={styles.input}
                      dense
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      theme={inputTheme}
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7}>
                      <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={24} color="#777" />
                    </TouchableOpacity>
                  </LinearGradient>
                </PaperProvider>



                <View style={styles.checkboxRow}>
                  <Checkbox
                    status={checked ? 'checked' : 'unchecked'}
                    onPress={() => setChecked(!checked)}
                  />
                  <Text style={styles.checkboxText}>I agree to the Terms and Conditions</Text>
                </View>

                <TouchableOpacity
                  style={styles.createButton}
                  contentStyle={styles.buttonContent}
                  onPress={handleSignUp}
                >
                  <Text style={styles.createButtonLabel}>Create Account </Text>
                </TouchableOpacity>
                </Animated.View>


                <View style={styles.separator} /><Text style={styles.orText}>Or Login with</Text><View style={styles.separatorL} />
                <View style={styles.socialRow}>
                    <TouchableOpacity onPress={handleGoogleSignIn}>
                        <Image source={require('../assets/images/Google_2015_logo.svg.png')} style={styles.icon} />
                    </TouchableOpacity>

                    <TouchableOpacity>
                        <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/512px-Facebook_Logo_%282019%29.png' }} style={styles.icon} />
                    </TouchableOpacity>

                    {/*  Apple Sign-In Placeholder - Implement this based on your needs */}
                    <Image source={require('../assets/images/Apple_logo_black.svg.png')} style={styles.icon} />
                </View>

                <TouchableOpacity onPress={() => setIsLogin(true)} activeOpacity={0.7}>
                  <Text style={styles.loginLinkText}>Already have an account?  Log In</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.form, { width: '100%', maxWidth: 350, alignItems: 'center' }]}>
                <Animated.View style={[styles.formaContainer, { transform: [{ translateY }] }]}>
                  <Text style={styles.loginTitle}>Log In</Text>

                  <PaperProvider>
                    {/* First and Last Name in a row */}

                    <LinearGradient
                      colors={['rgba(255, 255, 255, 1)', 'rgba(219, 225, 236, 1)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.LlinearGradient]}
                    >
                      <TextInput
                        label="Email"
                        mode="outlined"
                        style={styles.Logininput}
                        dense
                        value={email}
                        onChangeText={setemail}
                        keyboardType="default"
                        autoCapitalize="none"
                        theme={styles.inputTheme}
                      />
                    </LinearGradient>
                    <LinearGradient
                      colors={['rgba(219, 225, 236, 0.6)', 'rgba(255, 255, 255, 1)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.LlinearGradient]}
                    >
                      <TextInput
                        label="Password"
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        style={styles.Logininput}
                        dense
                        value={password}
                        onChangeText={setPassword}
                        theme={styles.inputTheme}
                      />
                    </LinearGradient>
                    <TouchableOpacity style={styles.LogineyeIcon} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                      <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#777" />
                    </TouchableOpacity>
                  </PaperProvider>

                  <View style={styles.LogincheckboxRow}>
                    <Checkbox
                      status={rememberMe ? 'checked' : 'unchecked'}  // Use rememberMe state
                      onPress={() => setRememberMe(!rememberMe)}  // Toggle rememberMe
                    />
                    <Text style={styles.LogincheckboxText}>Remember Me!</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.LogincreateButton}
                    contentStyle={styles.LbuttonContent}
                    onPress={handleLogin}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13, textAlign: 'center', paddingVertical: 2, }}> Log In </Text>
                  </TouchableOpacity>
                  </Animated.View>
                  <View style={styles.Loginseparator} /><Text style={styles.LorText}>Sign in with</Text><View style={styles.Lseparator} />
                  <View style={styles.LoginsocialRow}>
                    <TouchableOpacity onPress={handleGoogleSignIn}>
                        <Image source={require('../assets/images/Google_2015_logo.svg.png')} style={styles.icon} />
                    </TouchableOpacity>

                    <TouchableOpacity>
                        <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_%282019%29.png/512px-Facebook_Logo_%282019%29.png' }} style={styles.icon} />
                    </TouchableOpacity>
                    <Image source={require('../assets/images/Apple_logo_black.svg.png')} style={styles.icon} />
                  </View>
                </View>
                <View>
                  <View style={styles.footerLinks}>
                    <Text
                      style={styles.link}
                      onPress={() => Linking.openURL('https://yourprivacypolicy.url')}
                    >
                      Privacy Policy
                    </Text>
                    <Text style={styles.Fseparator}>|</Text>
                    <Text
                      style={styles.link}
                      onPress={() => Linking.openURL('https://yourtermsofservice.url')}
                    >
                      Terms of Service
                    </Text>
                  </View>
                </View>
              </>

            )}

          </Animated.View>
        </Animated.View>
      </ImageBackground>

      <Modal
        animationType="fade" // Or fade, none
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: '120',
              justifyContent: 'flex-start',
              paddingBottom: 12,
              borderBottomWidth: 2,
              borderBottomColor: '#007bff',
              bottom: 13,
              marginTop: 13,
            }}>
              <Image source={require('../assets/images/logo.png')} style={{ width: 85, height: 30, transform: [{ scale: 1 }], left: 17 }} />
            </View>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={() => {
                setModalVisible(false);
                if (modalMessage === "Sign-up successful!") {
                  // The user has successfully signed up, so they're likely still on the signup screen.
                  // The user should navigate back to the login screen
                   setIsLogin(true); // Switch to the login form
                }
                if (modalMessage === "Login Successful!") {
                  navigation.navigate('Home');
                }
              }}
            >
              <Text style={styles.textStyle}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: IMAGE_HEIGHT,
    resizeMode: 'cover',
    zIndex: 0,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    zIndex: 3,
  },
  logo: {
    width: 70,
    height: 30,
    marginBottom: 20,
  },
  sectionTitle: {
    marginTop: -12,
    fontSize: 16,
    fontWeight: 900,
    marginBottom: 10,
    textAlign: 'center',
    borderRadius: 10,
    right: 62,
    bottom: 15,
  },
  loginTitle: {
    marginTop: -50,
    fontSize: 16,
    marginBottom: 20,
    fontWeight: 900,
    borderRadius: 10,
    right: 112,
    bottom: -5,
  },
  input: {
    width: 280,
    marginBottom: 7,
    fontSize: 13,
    height: 30,
    paddingHorizontal: 11,
    zIndex: 10,
    backgroundColor: 'transparent', // Set input background to white to prevent color overflow
    borderRadius: 20, // Match the gradient border radius for a clean look
  },
  Logininput: {
    width: 280,
    marginBottom: 7,
    fontSize: 13,
    height: 30,
    paddingHorizontal: 11,
    zIndex: 10,
    backgroundColor: 'transparent', // Set input background to white to prevent color overflow
    borderRadius: 20, // Match the gradient border radius for a clean look
  },
  LogincheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    top: 80,
    right: 20,
  },
  LogincheckboxText: {
    flex: 1,
    color: '#444',
    fontSize: 10,
  },
  buttonContent: {
    height: 35,
  },
  LbuttonContent: {
    height: 48,
  },
  LogincreateButton: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#00BBD6',
    width: '60%',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 5px 10px rgba(0, 0, 0, 0.4)',
    height: 46,
    top: 80,
  },
  LogineyeIcon: {
    position: 'absolute',
    right: 20,
    top: 46,
    zIndex: 10,
  },
  createButton: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: '#00BBD6',
    width: '60%',
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 5px 10px rgba(0, 0, 0, 0.4)',
    top: 155,
  },
  createButtonLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  orText: {
    textAlign: 'center',
    marginVertical: 95,
    fontSize: 12,
    color: '#666',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 10,
    bottom: 49,
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 20,
    marginLeft: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 28,
    width: '80%',
    backgroundColor: 'rgba(198, 205, 218, 1)',
    borderRadius: 30,
    overflow: 'hidden',
    alignContent: 'center'
  },
    tabContainerSignUp: {
      left: 30, //Apply the left margin here when !isLogin
  },

  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: 'rgba(198, 205, 218, 1)'
  },
  activeTab: {
    backgroundColor: 'rgba(33, 57, 97, 1)',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  tabText: {
    fontSize: 10,
    color: '#333',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    zIndex: 2,
  },
    formaContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    zIndex: 2,
    bottom: 32,
  },
  form: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 20,
    top: 2,
    zIndex: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    top: 155,
    right: 20,
  },
  checkboxText: {
    flex: 1,
    color: '#444',
    fontSize: 10,
  },
  separator: {
    width: '30%',
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 20,
    right: 87,
    top: 124,
  },
  separatorL: {
    width: '30%',
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: -10,
    left: 87,
    bottom: 93,
  },
  Loginseparator: {
    width: '30%',
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: 20,
    right: 81,
    top: 107,
  },
  LorText: {
    textAlign: 'center',
    marginVertical: 75,
    top: 1,
    fontSize: 12,
    color: '#666',
  },
  LoginsocialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    bottom: 30,
  },
  Lseparator: {
    width: '30%',
    height: 1,
    backgroundColor: '#ccc',
    marginVertical: -10,
    left: 79,
    bottom: 71,
  },
  loginLinkText: {
    color: '#00BBD6',
    fontSize: 12,
    bottom: 35,
    textDecorationLine: 'underline',
  },
  inputTheme: {
    roundness: 25,
    colors: {
      primary: '#007bff',
      background: 'white',
      
    },
  },
  linearGradient: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 20,
    height: 30,
    top: 2,
    justifyContent: 'center', // Center the input inside the gradient
    alignItems: 'center',
  },
  LlinearGradient: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 20,
    height: 30,
    top: 2,
    justifyContent: 'center', // Center the input inside the gradient
    alignItems: 'center',
    top: 2,
  },
  container: {
    flex: 1,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    marginTop: 10,
    bottom: 10
  },
  link: {
    color: '#999',
    fontSize: 12,
    marginHorizontal: 5,
  },
  Fseparator: {
    color: '#999',
    fontSize: 12,
  },
  logos: {
    position: 'absolute',
    top: 60,
    left: 25,
    width: 60,
    height: 30,
    zIndex: 4,
    resizeMode: 'contain',
    transform: [{ translateY: -20 }],
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    backgroundColor: "rgb(2, 214, 252)",
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 15,
    padding: 10,
    elevation: 2,
    width: 100,
    top: 10,
  },
  buttonOpen: {
    backgroundColor: "red",
  },
  buttonClose: {
    backgroundColor: "red",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 14,
    color: "black", // Changed from blue to white for contrast
  }
});