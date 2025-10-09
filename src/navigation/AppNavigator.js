// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Text } from 'react-native';
import LoadingScreen from '../screens/auth/LoadingScreen';

// Stacks
import AuthStack from './AuthStack';
import MainStack from './MainStack';

// Individual Screens for specific logic
import DisplayRecoveryCodeScreen from '../screens/auth/DisplayRecoveryCodeScreen';
import PaymentSuccessScreen from '../screens/payment/PaymentSuccessScreen';
import PaymentFailureScreen from '../screens/payment/PaymentFailureScreen';

const Stack = createStackNavigator();

export default function AppNavigator({ linking }) {
  const { theme } = useTheme();
  const { user, authAction, pendingRecoveryCode } = useAuth();

  const navigationTheme = {
    dark: theme.isDarkMode,
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      notification: theme.error,
    },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    light: { fontFamily: 'System', fontWeight: '300' },
    thin: { fontFamily: 'System', fontWeight: '100' },
    bold: { fontFamily: 'System', fontWeight: '700' }, // 👈 fixes HeaderTitle
  },
  };

  return (
    <NavigationContainer theme={navigationTheme} linking={linking} fallback={<LoadingScreen />}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {pendingRecoveryCode ? (
          <Stack.Screen name="DisplayRecoveryCode" component={DisplayRecoveryCodeScreen} />
        ) : user && !authAction ? (
          <Stack.Screen name="MainStack" component={MainStack} />
        ) : (
          <Stack.Screen name="AuthStack" component={AuthStack} />
        )}
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
        <Stack.Screen name="PaymentFailure" component={PaymentFailureScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}