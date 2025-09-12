import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { useMessage } from './MessageContext';
import apiConfig from '../config/apiConfig';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

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
  (error) => {
    return Promise.reject(error);
  }
);

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { showMessage } = useMessage();
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

    showMessage('Login Successful!');
  };

  const register = useCallback(async (credentials) => {
    try {
      await api.post('/auth/register', credentials);
    } catch (error) {
      throw error;
    }
  }, []);

  const verifyOtpAndLogin = useCallback(async (email, otp) => {
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: backendUser, recoveryCode } = data;

      api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      
      await AsyncStorage.setItem('@auth_token', newAccessToken);
      await AsyncStorage.setItem('@refresh_token', newRefreshToken);
      setUser(backendUser);
      setAccessToken(newAccessToken);
      
      if (recoveryCode) {
        setPendingRecoveryCode(recoveryCode);
      }

    } catch (error) {
      throw error;
    }
  }, []);

  const acknowledgeRecoveryCode = useCallback(() => {
    setPendingRecoveryCode(null);
  }, []);

  const resendOtp = useCallback(async (email) => {
    try {
      await api.post('/auth/resend-otp', { email });
    } catch (error) {
      throw error;
    }
  }, []);


  const updateProfile = async (newProfileData) => {
    try {
      const { data: updatedUser } = await api.put('/users/me', newProfileData);

      await updateUserStateAndCache(updatedUser);
    } catch (error) {
      console.error('Failed to update profile', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const refreshUser = useCallback(async () => {
    const currentToken = api.defaults.headers.common['Authorization'];
    if (!currentToken) return;

    try {
      const { data: userData } = await api.get('/users/me');

      await updateUserStateAndCache(userData);
    } catch (error) {
      console.error('Manual user refresh failed:', error.response?.data?.message || error.message);
    }
  }, [updateUserStateAndCache]);

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
          recoveryCode, // Expect a recoveryCode from the backend for new users
        } = backendResponse.data;

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
      [updateAccessToken, signOut, showMessage, updateUserStateAndCache]
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
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const storedToken = await AsyncStorage.getItem('refreshToken');
            if (!storedToken) throw new Error('No refresh token.');

            const { data: refreshed } = await api.post('/auth/refresh', {
              refreshToken: storedToken,
            });
            await updateAccessToken(refreshed.accessToken);
            originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            await signOut(false);
            return Promise.reject(new Error('Session expired. Please log in again.'));
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [signOut, updateAccessToken]);

  useEffect(() => {
    const bootstrap = async () => {
      setTimeout(() => setIsLoading(false), 250);

      const cachedUserJSON = await AsyncStorage.getItem('cachedUser');
      if (cachedUserJSON) {
        setUser(JSON.parse(cachedUserJSON));
      }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        if (cachedUserJSON) {
          showMessage('You are offline. Showing last saved data.');
        } else {
          showMessage('You are offline and no data is available.');
        }
        setIsLoading(false);
        return;
      }

      try {
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
          await updateUserStateAndCache(null);
          return;
        }

        const { data: refreshed } = await api.post('/auth/refresh', {
          refreshToken: storedRefreshToken,
        });
        await updateAccessToken(refreshed.accessToken);

        const { data: freshUserData } = await api.get('/users/me');
        await updateUserStateAndCache(freshUserData);
      } catch (err) {
        console.warn('Bootstrap auth refresh failed:', err.message);
        await signOut(false);
        showMessage('Your session has expired. Please log in again.');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [signOut, updateAccessToken, showMessage, updateUserStateAndCache]);


  const value = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
