// src/App.js
import React, { useEffect, useRef } from 'react';
import 'expo-dev-client';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MessageProvider } from './contexts/MessageContext';
import { AlertProvider } from './contexts/AlertContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Navigation
import AppNavigator from './navigation/AppNavigator';

// Screens
import LoadingScreen from './screens/auth/LoadingScreen';

// Services
import {
  setupNotificationHandler,
  setupAndroidNotificationChannels,
} from './services/notificationService';
import ErrorBoundary from './components/ErrorBoundary';

const linking = {
  // ✅ This uses your app's scheme ('fibear://' in production, 'exp://...' in dev)
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      // ✅ This maps the URL path to the screen name in your navigator
      PaymentSuccess: 'payment-success',
      PaymentFailure: 'payment-failure',
    },
  },
};


const AppContent = () => {
  const { isLoading } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();


  useEffect(() => {
    setupNotificationHandler();
    setupAndroidNotificationChannels();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification Received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification Tapped:', response);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);


  if (isLoading) {
    return <LoadingScreen />;
  }

 return <AppNavigator linking={linking} />;
};


export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AlertProvider>
          <MessageProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </SubscriptionProvider>
            </AuthProvider>
          </MessageProvider>
        </AlertProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}