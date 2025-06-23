import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

WebBrowser.maybeCompleteAuthSession();


const googleAuthConfig = {
  // Use a "Web application" Client ID for Expo Go and Web builds.
  // It's the same key for both.
  expoClientId: '973096250612-l88fig5c0kv44avdsrpvrtae19bl44o8.apps.googleusercontent.com',
  webClientId: '973096250612-l88fig5c0kv44avdsrpvrtae19bl44o8.apps.googleusercontent.com',

  // Use an "Android" Client ID for standalone Android builds.
  // This must have your package name and SHA-1 keys configured.
  androidClientId: '973096250612-qiunj2qb2j8cbfr17uhnkfq4gdmv3bsa.apps.googleusercontent.com',
  
  // (Optional) Use an "iOS" Client ID for standalone iOS builds.
  // iosClientId: 'YOUR-IOS-CLIENT-ID.apps.googleusercontent.com',
};


export default function GetStartedScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  // The hook correctly uses the config. `expo-auth-session` automatically
  // selects the right client ID based on the platform (web, Expo Go, standalone).
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleAuthConfig
  );

  // REMOVED: The useEffect that logs the redirect URI is no longer relevant.
  // useEffect(() => { ... });

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success') {
        setIsLoading(true);
        const { id_token } = response.params;
        const credential = GoogleAuthProvider.credential(id_token);
        try {
          await signInWithCredential(auth, credential);
          console.log('Firebase Google Sign-In Success, navigating...');
          navigation.navigate('HomeScreen');
        } catch (error) {
          console.error('Firebase sign-in error:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === 'error' || response?.type === 'cancel') {
        console.log('Google Sign-in cancelled or failed:', response.params?.error);
        setIsLoading(false);
      }
    };

    handleResponse();
  }, [response]);

  const handleGoogleSignIn = () => {
    promptAsync();
  };

  return (
      // ... Your JSX remains exactly the same ...
    <View style={{ flex: 1 }}>
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logos}
        resizeMode="contain"
      />
      <View style={styles.container}>
        <Image
          source={require('../assets/images/getstarted.jpg')}
          style={styles.backgroundImage}
        />
        <View style={styles.blueOverlay} />
        <Animatable.View
          animation="fadeInUp"
          duration={800}
          delay={100}
          style={styles.overlayContainer}
        >
          {isLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#00BBD6" />
              <Text style={styles.loaderText}>Signing In...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>
                {"Welcome to FiBear Network Technologies Corp."}
              </Text>
              <Text style={styles.subtitle}>
                We are committed to keeping you connected. We provide fast, reliable,
                and stable internet service designed to meet your daily needs. Our
                staff is always ready to assist you.
              </Text>

              <TouchableOpacity
                style={styles.signUpBtn}
                onPress={() => navigation.navigate('SignUpScreen')}
              >
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation.navigate('SignUpScreen', { screen: 'Login' })}
              >
                <Text style={styles.loginText}>Log In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.googleBtn}
                disabled={!request}
                onPress={handleGoogleSignIn}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={{ uri: 'https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png' }}
                    style={{ width: 22, height: 22, marginRight: 9 }}
                  />
                  <Text style={styles.googleText}>Sign in with Google</Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.footerLinks}>
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://yourprivacypolicy.url')}
                >
                  Privacy Policy
                </Text>
                <Text style={styles.separator}>|</Text>
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://yourtermsofservice.url')}
                >
                  Terms of Service
                </Text>
              </View>
            </>
          )}
        </Animatable.View>
      </View>
    </View>
  );
}

// ... Your styles remain exactly the same ...
const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
    },
    backgroundImage: {
        flex: 3.6,
        width: '100%',
        height: undefined,
        resizeMode: 'cover',
        zIndex: 1,
    },
    blueOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 65, 176, 0.39)',
        zIndex: 2,
    },
    overlayContainer: {
        flex: 3,
        backgroundColor: 'rgba(255,255,255,0.92)',
        marginTop: -120,
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        padding: 20,
        alignItems: 'center',
        zIndex: 4,
        justifyContent: 'center', // Added to center the loader
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontWeight: '800',
        fontSize: 20,
        textAlign: 'center',
        marginTop: 20,
        alignItems: 'center',
        marginBottom: 30,
        color: '#1A1A1A',
        fontFamily: 'Roboto',
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 25,
        color: '#666',
    },
    signUpBtn: {
        backgroundColor: '#00BBD6',
        paddingVertical: 10,
        paddingHorizontal: 9,
        width: '70%',
        borderRadius: 10,
        marginBottom: 10,
        boxShadow: '0 4px 5px rgba(0, 0, 0, 0.6)',
    },
    signUpText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    loginBtn: {
        borderColor: '#00BBD6',
        borderWidth: 1.5,
        paddingVertical: 10,
        paddingHorizontal: 9,
        width: '70%',
        borderRadius: 10,
        marginBottom: 30,
        boxShadow: '0 4px 5px rgba(0, 0, 0, 0.6)',
    },
    loginText: {
        color: '#00BBD6',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    googleBtn: {
        marginBottom: 10,
    },
    googleText: {
        color: '#555',
        fontSize: 13,
        marginBottom: 4,
    },
    footerLinks: {
        flexDirection: 'row',
        marginTop: 10,
    },
    link: {
        color: '#999',
        fontSize: 12,
        marginHorizontal: 5,
    },
    separator: {
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
});