// App.js
import React, { useEffect, useRef } from 'react';
import 'expo-dev-client';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MessageProvider } from './contexts/MessageContext';
import { AlertProvider } from './contexts/AlertContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoadingScreen from './screens/auth/LoadingScreen';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from './contexts/LanguageContext';
import {
  setupNotificationHandler,
  setupAndroidNotificationChannels,
} from './services/notificationService';

// Import all your screens
import SplashScreen2 from './screens/auth/SplashScreen2';
import GetStartedScreen from './screens/auth/GetStartedScreen';
import AboutScreen from './screens/dashboard/AboutScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import HomeScreen from './screens/dashboard/HomeScreen';

import Profile from './screens/dashboard/Profile';
import EditProfileScreen from './screens/dashboard/EditProfileScreen';

import Subscription from './screens/subscriptions/Subscription';
import PaymentVoucherScreen from './screens/subscriptions/PaymentVoucherScreen';
import MyBills from './screens/subscriptions/MyBills';
import PayBills from './screens/subscriptions/PayBills';

import Notif from './screens/dashboard/Notif';
import Settings from './screens/settings/Settings';
import OurServicesScreen from './screens/dashboard/OurServiceScreen';
import ChangePasswordScreen from './screens/settings/ChangePasswordScreen';

import Support from './screens/support/Support';
import FeedbackFormScreen from './screens/settings/FeedbackFormScreen';
import CustomerFeedbackScreen from './screens/settings/CustomerFeedbackScreen';
import LiveChatScreen from './screens/support/LiveChatScreen';
import LegalDocumentScreen from './screens/settings/LegalDocumentScreen';
import MySubscriptionScreen from './screens/subscriptions/MySubscriptionScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import SupportHelpScreen from './screens/auth/SupportHelpScreen';
import DisplayRecoveryCodeScreen from './screens/auth/DisplayRecoveryCodeScreen'; 
import VerifyOtpScreen from './screens/auth/VerifyOtpScreen';
import HowToUseScreen from './screens/support/HowToUseScreen';

const Stack = createStackNavigator();

// AppNavigator is now simpler. It only cares about which stack to show.
const AppNavigator = () => {
  const { user, authAction, pendingRecoveryCode } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {pendingRecoveryCode ? (
            // --- Highest priority: Show recovery code screen if pending ---
            <Stack.Screen name="DisplayRecoveryCode" component={DisplayRecoveryCodeScreen} />
        ) : user && !authAction ? (
          // --- User is logged in: Show the main app stack ---
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
            <Stack.Screen name="Subscription" component={Subscription} />
            <Stack.Screen name="MyBills" component={MyBills} />
            <Stack.Screen name="PayBills" component={PayBills} />
            <Stack.Screen name="PaymentVoucherScreen" component={PaymentVoucherScreen} />
            <Stack.Screen name="Notif" component={Notif} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
            <Stack.Screen name="Support" component={Support} />
            <Stack.Screen name="OurServicesScreen" component={OurServicesScreen} />
            <Stack.Screen name="FeedbackFormScreen" component={FeedbackFormScreen} />
            <Stack.Screen name="CustomerFeedbackScreen" component={CustomerFeedbackScreen} />
            <Stack.Screen name="LiveChatScreen" component={LiveChatScreen} />
            <Stack.Screen name="MySubscriptionScreen" component={MySubscriptionScreen} />
            <Stack.Screen name="HowToUseScreen" component={HowToUseScreen} />
          </>
        ) : (
          // --- User is not logged in: Show the auth stack ---
          <>
            <Stack.Screen name="SplashScreen2" component={SplashScreen2} />
            <Stack.Screen name="GetStarted" component={GetStartedScreen} />
            <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
            <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /> 
            <Stack.Screen name="SupportHelp" component={SupportHelpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AppContent = () => {
  const { isLoading, user, api } = useAuth();

  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    setupNotificationHandler();

    setupAndroidNotificationChannels();

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification Received (Foreground):', notification);
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

  return <AppNavigator />;
};


export default function App() {
  return (
    <LanguageProvider>
    <ThemeProvider>
      <AlertProvider>
        <MessageProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <AppContent />
            </SubscriptionProvider>
          </AuthProvider>
        </MessageProvider>
      </AlertProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
}
