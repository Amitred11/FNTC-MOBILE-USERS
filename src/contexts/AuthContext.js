//AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { useMessage } from './MessageContext';
import apiConfig from '../config/apiConfig';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAlert } from './AlertContext'; // Assuming you have an AlertContext

WebBrowser.maybeCompleteAuthSession();

const { API_URL } = apiConfig;
console.log('AuthContext: Resolved API_URL:', API_URL);

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
  (error) => {
    return Promise.reject(error);
  }
);

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { showMessage } = useMessage();
  const { showAlert } = useAlert(); // Initialize useAlert

  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authAction, setAuthAction] = useState(null);
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState(null);

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

  const signOut = useCallback(
    async (apiCall = true) => {
      setIsLoading(true);
      if (apiCall) {
        const token = await AsyncStorage.getItem('refreshToken');
        if (token) {
          try {
            await api.post('/auth/logout', { refreshToken: token });
          } catch (err) {
            console.warn('API logout call failed (this is often ok):', err.message);
          }
        }
      }
      await updateAccessToken(null);
      await AsyncStorage.removeItem('refreshToken');
      await updateUserStateAndCache(null); // Clear user state and cache
      setIsLoading(false);
    },
    [updateAccessToken, updateUserStateAndCache]
  );

  const signIn = async (email, password, rememberMe) => {
    console.log('AuthContext: signIn function called.'); // Added Log
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password, rememberMe });
      const {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: backendUser,
      } = response.data;

      await updateAccessToken(newAccessToken);
      await updateUserStateAndCache(backendUser);

      if (newRefreshToken) await AsyncStorage.setItem('refreshToken', newRefreshToken);
      else await AsyncStorage.removeItem('refreshToken');
      showMessage('Login Successful!'); // This is ONLY reached on success
      return true;
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';

      if (error.response) {
        if (error.response.status === 400 || error.response.status === 401 || error.response.status === 403) {
          errorMessage = error.response.data?.message || 'Invalid email or password.';
        } else {
          errorMessage = error.response.data?.message || `Server error: ${error.response.status}.`;
        }
      } else if (error.message === 'Network Error') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }
      console.log('AuthContext: Determined error message:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = useCallback(async (credentials) => {
    try {
      await api.post('/auth/register', credentials);
    } catch (error) {
      console.error('Registration Failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }, []);

  const verifyOtpAndLogin = useCallback(async (email, otp) => {
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: backendUser, recoveryCode } = data;

      await updateAccessToken(newAccessToken);
      await updateUserStateAndCache(backendUser);

      if (newRefreshToken) {
        await AsyncStorage.setItem('refreshToken', newRefreshToken);
      } else {
        await AsyncStorage.removeItem('refreshToken');
      }

      if (recoveryCode) {
        setPendingRecoveryCode(recoveryCode);
      }
      showMessage('OTP Verification Successful!');
    } catch (error) {
      console.error('OTP Verification Failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }, [updateAccessToken, updateUserStateAndCache, showMessage]);

  const acknowledgeRecoveryCode = useCallback(() => {
    setPendingRecoveryCode(null);
  }, []);

  const resendOtp = useCallback(async (email) => {
    try {
      await api.post('/auth/resend-otp', { email });
      showMessage('OTP Resent Successfully!');
    } catch (error) {
      console.error('Resend OTP Failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }, [showMessage]);


  const updateProfile = async (newProfileData) => {
    try {
      const { data: updatedUser } = await api.put('/users/me', newProfileData);
      await updateUserStateAndCache(updatedUser);
      showMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const refreshUser = useCallback(async () => {
    const currentToken = accessToken;
    if (!currentToken) {
      console.warn('RefreshUser called without an accessToken. User might be logged out.');
      return;
    }

    try {
      const { data: userData } = await api.get('/users/me');
      await updateUserStateAndCache(userData);
    } catch (error) {
      console.error('Manual user refresh failed:', error.response?.data?.message || error.message);
      showMessage('Failed to refresh user data. Please try again or log in.');
    }
  }, [accessToken, updateUserStateAndCache, showMessage]);

   const handleBackendGoogleSignIn = useCallback(
    async (googleIdToken) => {
      setIsLoading(true);
      setAuthAction('PENDING_GOOGLE_SIGNIN');
      try {
        const backendResponse = await api.post('/auth/google', { idToken: googleIdToken });
        const {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: backendUser,
          recoveryCode,
        } = backendResponse.data;

        console.log('AuthContext: Backend /auth/google response data:', backendResponse.data); // Keep this log!
        console.log('AuthContext: Extracted recoveryCode from backend response:', recoveryCode); // Keep this log!

        await updateAccessToken(newAccessToken);
        await updateUserStateAndCache(backendUser);

        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        } else {
          await AsyncStorage.removeItem('refreshToken');
        }

        if (recoveryCode) {
          setPendingRecoveryCode(recoveryCode);
          console.log('AuthContext: setPendingRecoveryCode called with:', recoveryCode);
        } else {
          console.log('AuthContext: No recoveryCode found in backend response.');
        }

        showMessage('Google Sign-In Successful!');
      } catch (error) {
        if (error.response?.status === 409) {
          const message = error.response.data.message || 'An account already exists with this email.';
          showAlert(
              'Account Linking Required',
              message,
              [ { text: 'OK' } ]
          );
        } else {
          console.error('Backend Google Sign-In failed:', error.response?.data || error.message);
          showMessage('Google Sign-In failed. Please try again.');
        }
        await signOut(false);
      } finally {
        setIsLoading(false);
        setAuthAction(null);
      }
      },
      [updateAccessToken, signOut, showMessage, showAlert, updateUserStateAndCache, setPendingRecoveryCode]
    );


  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: Constants.expoConfig.extra.androidClientId,
    iosClientId: Constants.expoConfig.extra.iosClientId,
    webClientId: Constants.expoConfig.extra.webClientId,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) handleBackendGoogleSignIn(authentication.idToken);
    } else if (response?.type === 'error') {
      showMessage('Google Sign-In cancelled or failed.');
    }
  }, [response, handleBackendGoogleSignIn, showMessage]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (originalRequest.url === '/auth/login' && error.response?.status === 401) {
          // This ensures the signIn function's catch block directly handles 401 for login
          return Promise.reject(error);
        }
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const storedToken = await AsyncStorage.getItem('refreshToken');
            if (!storedToken) {
              await signOut(false);
              return Promise.reject(new Error('No active session. Please log in again.'));
            }

            const { data: refreshed } = await api.post('/auth/refresh', {
              refreshToken: storedToken,
            });
            await updateAccessToken(refreshed.accessToken);
            originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError.response?.data?.message || refreshError.message);
            await signOut(false);
            return Promise.reject(new Error('Session expired. Please log in again.'));
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [signOut, updateAccessToken]);

  const bootstrap = useCallback(async () => {
    console.log('AuthContext: bootstrap function called.'); // Added Log
    setIsLoading(true);

    const loadingTimeout = setTimeout(() => {
      console.log('AuthContext: Bootstrap setTimeout completed. Setting isLoading to false.'); // Added Log
      setIsLoading(false);
    }, 250);

    let cachedUser = null;

    try {
      const cachedUserJSON = await AsyncStorage.getItem('cachedUser');
      if (cachedUserJSON) {
        cachedUser = JSON.parse(cachedUserJSON);
        setUser(cachedUser);
        console.log('AuthContext: Found and set cached user.'); // Added Log
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        if (cachedUser) {
          showMessage('You are offline. Showing last saved data.');
        } else {
          showMessage('You are offline and no data is available.');
        }
        console.log('AuthContext: Offline scenario handled during bootstrap.'); // Added Log
        return;
      }

      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        await updateUserStateAndCache(null);
        console.log('AuthContext: No refresh token found. User not logged in, completing bootstrap.'); // Added Log
        return;
      }

      console.log('AuthContext: Attempting token refresh during bootstrap.'); // Added Log
      const { data: refreshed } = await api.post('/auth/refresh', {
        refreshToken: storedRefreshToken,
      });
      await updateAccessToken(refreshed.accessToken);
      console.log('AuthContext: Token refreshed. Fetching fresh user data.'); // Added Log

      const { data: freshUserData } = await api.get('/users/me');
      await updateUserStateAndCache(freshUserData);
      console.log('AuthContext: Fresh user data fetched and set.'); // Added Log

    } catch (err) {
      console.error('AuthContext: Bootstrap auth process failed in try-catch:', err.response?.data?.message || err.message); // Added Log
      await signOut(false);
      showMessage('Your session has expired or failed to load. Please log in again.');
    } finally {
      clearTimeout(loadingTimeout);
      console.log('AuthContext: Exiting bootstrap finally block. Setting isLoading to false.'); // Added Log
      setIsLoading(false);
    }
  }, [signOut, updateAccessToken, showMessage, updateUserStateAndCache]);


  useEffect(() => {
    bootstrap();
  }, [bootstrap]);


  const value = useMemo(() => ({
    user,
    accessToken,
    isLoading,
    signIn,
    signOut,
    register,
    verifyOtpAndLogin,
    resendOtp,
    api,
    googleSignIn: promptAsync,
    refreshUser,
    updateProfile,
    authAction,
    setAuthAction: () => {},
    completeAuthAction: () => {},
    pendingRecoveryCode,
    acknowledgeRecoveryCode,
  }), [
    user,
    accessToken,
    isLoading,
    signIn,
    signOut,
    register,
    verifyOtpAndLogin,
    resendOtp,
    promptAsync,
    refreshUser,
    updateProfile,
    authAction,
    pendingRecoveryCode,
    acknowledgeRecoveryCode,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};