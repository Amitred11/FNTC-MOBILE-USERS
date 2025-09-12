// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';

// Stacks
import AuthStack from './AuthStack';
import MainStack from './MainStack';

// Individual Screens for specific logic
import DisplayRecoveryCodeScreen from '../screens/misc/DisplayRecoveryCodeScreen';

const Stack = createStackNavigator();

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
          <Stack.Screen name="MainStack" component={MainStack} />
        ) : (
          // --- User is not logged in: Show the auth stack ---
          <Stack.Screen name="AuthStack" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;