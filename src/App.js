// src/App.js
import React, { useEffect, useRef } from 'react';
import 'expo-dev-client';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MessageProvider } from './contexts/MessageContext';
import { AlertProvider } from './contexts/AlertContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { BannerProvider } from './contexts/BannerContext';
// Navigation & Screens
import AppNavigator from './navigation/AppNavigator';
import LoadingScreen from './screens/auth/LoadingScreen';
// Services
import {
  setupNotificationHandler,
  requestNotificationPermissions,
  setupAndroidNotificationChannels,
} from './services/notificationService';
import { registerBackgroundFetchAsync } from './services/backgroundNotificationTask';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';

const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      PaymentSuccess: 'payment-success',
      PaymentFailure: 'payment-failure',
    },
  },
};


const AppContent = () => {
  const { isBootstrapping, isOnline, justCameOnline } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();
   useEffect(() => {
    const initializeNotificationsAndTasks = async () => {
      const permissionsGranted = await requestNotificationPermissions();
      if (!permissionsGranted) {
        console.log('Notification permissions were not granted. Halting setup.');
        return;
      }

      try {
        await registerBackgroundFetchAsync();
        console.log("Background fetch task registered successfully.");
      } catch (error) {
        console.error("Failed to register background fetch task:", error);
      }


      await setupAndroidNotificationChannels();
      setupNotificationHandler();

      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification Received:', notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification Tapped:', response);
      });
    };

    initializeNotificationsAndTasks();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  if (isBootstrapping) {
    return <LoadingScreen />;
  }

  return (
    <View style={{ flex: 1 }}>
      <AppNavigator linking={linking} />
      <OfflineBanner isOnline={isOnline} justCameOnline={justCameOnline} />
    </View>
  );
};


export default function App() {
  return (
    // --- 3. WRAP EVERYTHING WITH SafeAreaProvider ---
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AlertProvider>
            <BannerProvider>
            <MessageProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </SubscriptionProvider>
              </AuthProvider>
            </MessageProvider>
            </BannerProvider>
          </AlertProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}