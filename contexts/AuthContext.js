import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { useMessage } from './MessageContext';
import apiConfig from '../config/apiConfig';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants'; // Important for client IDs

WebBrowser.maybeCompleteAuthSession();

const { API_URL } = apiConfig;

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const { showMessage } = useMessage();
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authAction, setAuthAction] = useState(null);

    // --- Core Action/State Update Functions (declared first) ---
    const updateAccessToken = useCallback(async (token) => {
        setAccessToken(token);
        api.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : undefined;
        if (token) {
            await AsyncStorage.setItem('accessToken', token);
        } else {
            await AsyncStorage.removeItem('accessToken');
        }
    }, []);

    const completeAuthAction = useCallback(() => {
        setAuthAction(null);
    }, []);

    const signOut = useCallback(async (apiCall = true) => {
        setIsLoading(true);
        if (apiCall) {
            const token = await AsyncStorage.getItem('refreshToken');
            if (token) {
                try {
                    await api.post('/auth/logout', { refreshToken: token });
                } catch (err) {
                    console.warn("API logout call failed:", err.message);
                }
            }
        }
        await updateAccessToken(null);
        await AsyncStorage.multiRemove(['refreshToken', 'cachedUser', 'accessToken']);
        setUser(null);
        setIsLoading(false);
    }, [updateAccessToken]);

    const refreshUser = useCallback(async () => {
        const currentToken = api.defaults.headers.common['Authorization'];
        if (!currentToken) return;

        try {
            const { data: userData } = await api.get('/users/me');
            setUser(userData);
            await AsyncStorage.setItem('cachedUser', JSON.stringify(userData));
        } catch (error) {
            console.error("Manual user refresh failed:", error.response?.data?.message || error.message);
        }
    }, [api]);

    // --- Primary Authentication Functions (depend on core functions) ---
    const signIn = async (email, password, rememberMe) => {
        try {
            const response = await api.post('/auth/login', { email, password, rememberMe });
            const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: backendUser } = response.data;
            
            await updateAccessToken(newAccessToken);
            setUser(backendUser);
            await AsyncStorage.setItem('cachedUser', JSON.stringify(backendUser));

            if (newRefreshToken) {
                await AsyncStorage.setItem('refreshToken', newRefreshToken);
            } else {
                await AsyncStorage.removeItem('refreshToken');
            }
            
            showMessage("Login Successful!");
        } catch (error) { 
            const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials and connection.';
            showMessage(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const register = async (displayName, email, password) => {
        try {
            const { data } = await api.post('/auth/register', { displayName, email, password });
            return data.message; 
        } catch (error) {
            throw error;
        }
    };

    // --- Google Sign-In Specific Handler (depends on core functions) ---
    const handleBackendGoogleSignIn = useCallback(async (googleIdToken) => {
        setIsLoading(true);
        setAuthAction('PENDING_GOOGLE_SIGNIN');
        try {
            const backendResponse = await api.post('/auth/google', { idToken: googleIdToken });
            const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: backendUser } = backendResponse.data;

            await updateAccessToken(newAccessToken);
            setUser(backendUser);
            await AsyncStorage.setItem('cachedUser', JSON.stringify(backendUser));
            // --- FIX: Corrected typo in removeItem key ---
            if (newRefreshToken) await AsyncStorage.setItem('refreshToken', newRefreshToken);
            else await AsyncStorage.removeItem('refreshToken'); 
            
            showMessage("Google Sign-In Successful!");
        } catch (error) {
            console.error("Backend Google Sign-In failed:", error.response?.data || error.message);
            showMessage("Google Sign-In failed. Please try again.");
            await signOut(false);
        } finally {
            setIsLoading(false);
            setAuthAction(null);
        }
    }, [api, updateAccessToken, signOut, showMessage, setAuthAction]);

    // --- Google Sign-In Hooks (depend on `handleBackendGoogleSignIn`) ---
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: Constants.expoConfig.extra.androidClientId,
        iosClientId: Constants.expoConfig.extra.iosClientId,
        webClientId: Constants.expoConfig.extra.webClientId,
        useProxy: true, 
    });

    // --- Effects (depend on functions declared above) ---
    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.idToken) {
                handleBackendGoogleSignIn(authentication.idToken);
            } else {
                console.error("Google sign-in response did not contain an ID token.");
                showMessage("Google Sign-In failed. Please try again.");
            }
        } else if (response?.type === 'error') {
            console.error("Google sign-in error:", response.error);
            showMessage("Google Sign-In cancelled or failed. Please try again.");
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
                        if (!storedToken) {
                            await signOut(false);
                            return Promise.reject(new Error("Session expired. Please log in again."));
                        }
                        const { data: refreshed } = await api.post('/auth/refresh', { refreshToken: storedToken });
                        await updateAccessToken(refreshed.accessToken);
                        originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
                        return api(originalRequest);
                    } catch (refreshError) {
                        await signOut(false);
                        return Promise.reject(new Error("Session expired. Please log in again."));
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => api.interceptors.response.eject(interceptor);
    }, [signOut, updateAccessToken]);

    useEffect(() => {
        const bootstrap = async () => {
            setIsLoading(true);
            try {
                const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
                if (!storedRefreshToken) {
                    throw new Error("No refresh token found.");
                }
                const { data: refreshed } = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
                await updateAccessToken(refreshed.accessToken);
                await refreshUser();
            } catch (err) {
                 const netState = await NetInfo.fetch();
                if (!netState.isConnected) {
                    const cachedUser = await AsyncStorage.getItem('cachedUser');
                    if (cachedUser) setUser(JSON.parse(cachedUser));
                    showMessage("You are offline. Showing cached data.");
                } else {
                    await signOut(false);
                }
            } finally {
                setIsLoading(false);
            }
        };
        bootstrap();
    }, [signOut, updateAccessToken, refreshUser, showMessage]);

    const updateProfile = async (newProfileData) => {
        const { photoData, ...textUpdates } = newProfileData;
        try {
            if (Object.keys(textUpdates).length > 0) {
                await api.put('/users/me', { profile: textUpdates });
            }
            if (photoData && photoData.base64) {
                const photoKey = `@profile_photo_${user.id}`;
                await AsyncStorage.setItem(photoKey, photoData.base64);

                updateLocalUserPhoto(photoData.base64);
            }

            await refreshUser();
        } catch (error) {
            console.error("Failed to update profile", error.response?.data?.message);
            await refreshUser();
            throw error;
        }
    };
    
    const updateLocalUserPhoto = (photoUri) => {
        setUser(currentUser => {
            if (!currentUser) return null;
            const updatedUser = { ...currentUser, photoUrl: photoUri };
            AsyncStorage.setItem('cachedUser', JSON.stringify(updatedUser)).catch(err => {
                console.error("Failed to update user cache with new photo", err);
            });
            return updatedUser;
        });
    };

    const updateLocalPushToken = (newToken) => {
        setUser(currentUser => {
            if (!currentUser) return null;
            const updatedUser = { ...currentUser, pushToken: newToken };
            AsyncStorage.setItem('cachedUser', JSON.stringify(updatedUser)).catch(err => {
                console.error("Failed to update push token in cache", err);
            });
            return updatedUser;
        });
    };

    useEffect(() => {
        const bootstrap = async () => {
            setIsLoading(true);
            let finalUser = null;
            try {
                const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
                if (!storedRefreshToken) {
                    throw new Error("No refresh token found.");
                }
                const { data: refreshed } = await api.post('/auth/refresh', { refreshToken: storedRefreshToken });
                await updateAccessToken(refreshed.accessToken);
                
                // Get user data from API
                const { data: userData } = await api.get('/users/me');
                finalUser = userData;
                await AsyncStorage.setItem('cachedUser', JSON.stringify(userData));

            } catch (err) {
                const netState = await NetInfo.fetch();
                if (!netState.isConnected) {
                    const cachedUser = await AsyncStorage.getItem('cachedUser');
                    if (cachedUser) {
                        finalUser = JSON.parse(cachedUser);
                        showMessage("You are offline. Showing cached data.");
                    }
                } else {
                    await signOut(false);
                }
            } finally {
                if (finalUser) {
                    try {
                        const photoKey = `@profile_photo_${finalUser._id}`;
                        const localPhotoUri = await AsyncStorage.getItem(photoKey);
                        if (localPhotoUri) {
                            finalUser.photoUrl = localPhotoUri;
                        }
                    } catch (photoError) {
                        console.error("Could not load local profile photo:", photoError);
                    }
                }
                setUser(finalUser);
                setIsLoading(false);
            }
        };
        bootstrap();
    }, [signOut, updateAccessToken, showMessage]);

    const value = {
        user,
        accessToken,
        isLoading,
        signIn,
        signOut,
        register,
        api,
        googleSignIn: promptAsync,
        refreshUser,
        updateProfile,
        updateLocalPushToken,
        authAction,
        setAuthAction,
        completeAuthAction,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};