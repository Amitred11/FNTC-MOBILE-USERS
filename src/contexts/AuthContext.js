// AuthContext.js (Corrected & Final with Graceful Handling)
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { useMessage } from './MessageContext';
import apiConfig from '../config/apiConfig';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAlert } from './AlertContext';
import { useBanner } from './BannerContext';
import * as Notifications from 'expo-notifications';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const { API_URL } = apiConfig;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { showMessage } = useMessage();
  const { showAlert } = useAlert();
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true); 
  const [isLoading, setIsLoading] = useState(false);
  const [authAction, setAuthAction] = useState(null);
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [justCameOnline, setJustCameOnline] = useState(false);
  const { showBanner } = useBanner();

  const isRefreshingSession = useRef(false);
  let refreshPromise = useRef(null);

  const androidRedirectUri = makeRedirectUri({ scheme: 'com.hellopo123.fibear' });({
    scheme: Constants.expoConfig.scheme, 
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: Constants.expoConfig.extra.webClientId, 
    iosClientId: Constants.expoConfig.extra.iosClientId,
    androidClientId: Constants.expoConfig.extra.androidClientId,
    webClientId: Constants.expoConfig.extra.webClientId,
    redirectUri: androidRedirectUri,
  });

  const updateUserStateAndCache = useCallback(async (newUserData) => {
    setUser(newUserData);
    if (newUserData) {
      await AsyncStorage.setItem('cachedUser', JSON.stringify(newUserData));
    } else {
      await AsyncStorage.removeItem('cachedUser');
    }
  }, []);

  const updateAccessToken = useCallback(async (token) => {
    setAccessToken(token);
    api.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : undefined;
    if (token) {
      await AsyncStorage.setItem('accessToken', token);
    } else {
      await AsyncStorage.removeItem('accessToken');
    }
  }, []);

  const signOut = useCallback(async (options = {}) => {
    const { apiCall = true, reason = null } = options;

    const tokenExists = await AsyncStorage.getItem('accessToken');
    if (tokenExists) {
      try {
        await api.post('/users/push-token', { token: null });
      } catch (err) {
        console.warn('Could not clear push token on server:', err.message);
      }
    }

    if (apiCall) {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          await api.post('/auth/logout', { refreshToken });
        } catch (err) {
          console.warn('API logout call failed:', err.message);
        }
      }
    }

    await updateAccessToken(null);
    await AsyncStorage.removeItem('refreshToken');
    await updateUserStateAndCache(null);
    setAuthAction(null);
    setIsLoading(false);

    if (reason) {
      showAlert("Session Ended", reason);
    }
  }, [updateAccessToken, updateUserStateAndCache, showAlert]);
  
  const _refreshSessionAndUser = useCallback(async (refreshToken) => {
    if (!refreshToken) throw new Error("No refresh token provided.");
    if (isRefreshingSession.current) return refreshPromise.current;

    isRefreshingSession.current = true;
    const promise = (async () => {
      try {
        const { data: refreshed } = await api.post('/auth/refresh', { refreshToken });
        await updateAccessToken(refreshed.accessToken);
        const { data: freshUserData } = await api.get('/users/me');
        await updateUserStateAndCache(freshUserData);
        if (!isOnline) setIsOnline(true); 
        return refreshed.accessToken;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          await signOut({ apiCall: false, reason: "Your session has expired for security reasons. Please log in again." });
        } else {
          setIsOnline(false);
          showBanner('warning', 'Connection Issue', "You appear to be offline.");
        }
        throw error;
      } finally {
        isRefreshingSession.current = false;
        refreshPromise.current = null;
      }
    })();
    refreshPromise.current = promise;
    return promise;
  }, [updateAccessToken, updateUserStateAndCache, signOut, isOnline, showBanner]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const isAuthEndpoint = originalRequest.url.includes('/auth/');
        if (error.response?.status !== 401 || isAuthEndpoint || originalRequest._retry) {
          return Promise.reject(error);
        }
        originalRequest._retry = true;
        const storedToken = await AsyncStorage.getItem('refreshToken');
        if (!storedToken) {
          await signOut({ apiCall: false });
          return Promise.reject(new Error('No refresh token available.'));
        }
        try {
          const newToken = await _refreshSessionAndUser(storedToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [signOut, _refreshSessionAndUser]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !isOnline) {
        setIsOnline(true);
        setJustCameOnline(true);
        refreshUser();
        setTimeout(() => {
          setJustCameOnline(false);
        }, 3000);
      } else if (!state.isConnected) {
        setIsOnline(false);
      }
    });
    return () => unsubscribe();
  }, [isOnline, refreshUser]);

  useEffect(() => {
    const bootstrapApp = async () => {
      setIsBootstrapping(true); // Use the bootstrapping state
      try {
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');

        if (!storedRefreshToken) {
            await signOut({ apiCall: false });
            return;
        }
        const netState = await NetInfo.fetch();
        if (netState.isConnected) {
          try {
            await _refreshSessionAndUser(storedRefreshToken);
            await registerAndSendPushToken();
          } catch (err) {
            console.warn('Session refresh failed during bootstrap:', err.message);
            await signOut({ apiCall: false });
            return; 
         }
        } else {
          const cachedUserJSON = await AsyncStorage.getItem('cachedUser');
          if (cachedUserJSON) setUser(JSON.parse(cachedUserJSON));
          showBanner('info', 'You are offline', 'Showing last available data.');
        }
      } catch (err) {
        await signOut({ apiCall: false });
      } finally {
        setIsBootstrapping(false); 
      }
    };
    bootstrapApp();
  }, []);

  const signIn = useCallback(async (email, password, rememberMe) => {
    setIsLoading(true);
    setAuthAction('PENDING_LOGIN');
    try {
      const response = await api.post('/auth/login', { email, password, rememberMe });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: backendUser } = response.data;
      
      await updateAccessToken(newAccessToken);
      if (newRefreshToken) await AsyncStorage.setItem('refreshToken', newRefreshToken);
      
      await updateUserStateAndCache(backendUser);
      showBanner('success', 'Login Successful!');
      await registerAndSendPushToken(); 
      await new Promise(resolve => setTimeout(resolve, 0));

      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      await signOut({ apiCall: false });
      throw new Error(errorMessage);
    } finally {
        setIsLoading(false); 
        setAuthAction(null);
    }
  }, [updateAccessToken, updateUserStateAndCache, showBanner, signOut, registerAndSendPushToken]);

  const register = useCallback(async (credentials) => {
    setIsLoading(true);
    try {
      await api.post('/auth/register', credentials);
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
      console.error('Registration Failed:', errorMessage);
      showBanner('error', 'Registration Failed', errorMessage);
      return false;
    } finally {
      setIsLoading(false); 
    }
  }, [showBanner]);

  const verifyOtpAndLogin = useCallback(async (email, otp) => {
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: backendUser, recoveryCode } = data;

      await updateAccessToken(newAccessToken);
      if (newRefreshToken) await AsyncStorage.setItem('refreshToken', newRefreshToken);
      if (recoveryCode) setPendingRecoveryCode(recoveryCode);

      showMessage('OTP Verification Successful!');
      await updateUserStateAndCache(backendUser);
      await registerAndSendPushToken();
      await new Promise(resolve => setTimeout(resolve, 0));
    } catch (error) {
      console.error('OTP Verification Failed:', error.response?.data?.message || error.message);
      throw error;
    } finally {
      setIsLoading(false); 
    }
  }, [updateAccessToken, updateUserStateAndCache, showMessage, registerAndSendPushToken]);

  const resendOtp = useCallback(async (email) => {
    try {
      await api.post('/auth/resend-otp', { email });
      showMessage('OTP Resent Successfully!');
    } catch (error) {
      console.error('Resend OTP Failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }, [showMessage]);

  const handleBackendGoogleSignIn = useCallback(async (googleIdToken) => {
    setIsLoading(true);
    setAuthAction('PENDING_GOOGLE_SIGNIN');
    try {
      const backendResponse = await api.post('/auth/google', { idToken: googleIdToken });
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: backendUser, recoveryCode } = backendResponse.data;

      await updateAccessToken(newAccessToken);
      if (newRefreshToken) await AsyncStorage.setItem('refreshToken', newRefreshToken);
      if (recoveryCode) setPendingRecoveryCode(recoveryCode);
      
      showBanner('success', 'Google Sign-In Successful!');
      await updateUserStateAndCache(backendUser);
      await registerAndSendPushToken(); 
      await new Promise(resolve => setTimeout(resolve, 0));
      
      setIsLoading(false);
      setAuthAction(null);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Google Sign-In failed on the server.';
      showAlert("Sign-In Error", errorMessage);
      await signOut({ apiCall: false });
    }
  }, [updateAccessToken, signOut, showAlert, showBanner, updateUserStateAndCache]);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.idToken) {
      handleBackendGoogleSignIn(response.authentication.idToken);
    } else if (response && response.type !== 'success') {
      if (response.type === 'cancel' || response.type === 'dismiss') {
       showBanner('warning', 'Google Sign-In Cancelled');
       console.log('Google Sign-In was cancelled or dismissed by the user.'); 
      } else {
        console.warn('Google Sign-In access blocked or failed for another reason:', response);
        showBanner('error', 'Google Sign-In Failed', 'Access blocked or an unexpected error occurred.');
      }
      setIsLoading(false);
      setAuthAction(null);
    }
  }, [response, handleBackendGoogleSignIn, showBanner]);

  const googleSignIn = useCallback(() => {
    if (isLoading || authAction) return;
    promptAsync();
  }, [isLoading, authAction, promptAsync]);

  const updateProfile = async (newProfileData) => {
    try {
      const { data: updatedUser } = await api.put('/users/me', newProfileData);
      await updateUserStateAndCache(updatedUser);
      showBanner('success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const refreshUser = useCallback(async () => {
    if(isRefreshingSession.current) return;
    try {
        isRefreshingSession.current = true;
        const { data: freshUserData } = await api.get('/users/me');
        await updateUserStateAndCache(freshUserData);
    } catch (error) {
        if (error.response?.status === 401) {
            await signOut({ apiCall: false });
        }
    } finally {
        isRefreshingSession.current = false;
    }
  }, [updateUserStateAndCache, signOut]);

  const completeAuthAction = useCallback(() => setAuthAction(null), []);
  const acknowledgeRecoveryCode = useCallback(() => setPendingRecoveryCode(null), []);

  const registerAndSendPushToken = useCallback(async () => {
    if (!Constants.isDevice) {
        console.log('Push notifications are only available on physical devices.');
        return;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('User did not grant permission for push notifications.');
            return;
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        
        if (token) {
            await api.post('/users/push-token', { token });
            console.log('Push token sent to server successfully.');
        }
    } catch (error) {
        console.error('Failed to register for push notifications:', error);
    }
}, []);

  const value = useMemo(() => ({
    user,
    accessToken,
    isBootstrapping,
    isLoading,
    isOnline,
    justCameOnline,
    signIn,
    signOut,
    register,
    verifyOtpAndLogin,
    resendOtp,
    api,
    googleSignIn,
    refreshUser,
    updateProfile,
    authAction,
    pendingRecoveryCode,
    acknowledgeRecoveryCode,
    setAuthAction,
    completeAuthAction,
  }), [ user, accessToken, isBootstrapping, isLoading, isOnline, justCameOnline, authAction, pendingRecoveryCode, signIn, signOut, register, verifyOtpAndLogin, resendOtp, googleSignIn, refreshUser, completeAuthAction, acknowledgeRecoveryCode]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};