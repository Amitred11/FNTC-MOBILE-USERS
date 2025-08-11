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
import LoadingScreen from './screens/LoadingScreen';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from './contexts/LanguageContext';
import {
  setupNotificationHandler,
  setupAndroidNotificationChannels,
} from './services/notificationService';

// Import all your screens
import SplashScreen2 from './screens/SplashScreen2';
import GetStartedScreen from './screens/GetStartedScreen';
import AboutScreen from './screens/AboutScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import Profile from './screens/Profile';
import EditProfileScreen from './screens/EditProfileScreen';
import Subscription from './screens/Subscription';
import PaymentVoucherScreen from './screens/PaymentVoucherScreen';
import MyBills from './screens/MyBills';
import PayBills from './screens/PayBills';
import Notif from './screens/Notif';
import Settings from './screens/Settings';
import OurServicesScreen from './screens/OurServiceScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import Support from './screens/Support';
import CustomerFeedbackScreen from './screens/CustomerFeedbackScreen';
import LiveChatScreen from './screens/LiveChatScreen';
import LegalDocumentScreen from './screens/LegalDocumentScreen';
import MySubscriptionScreen from './screens/MySubscriptionScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SupportHelpScreen from './screens/SupportHelpScreen';
import DisplayRecoveryCodeScreen from './screens/DisplayRecoveryCodeScreen'; 
import VerifyOtpScreen from './screens/VerifyOtpScreen';
import HowToUseScreen from './screens/HowToUseScreen';

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
  }, []); // Empty dependency array means this runs once on mount

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
