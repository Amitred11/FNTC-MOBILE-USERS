// src/navigation/AuthStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import Auth Screens
import SplashScreen2 from '../screens/auth/SplashScreen2';
import GetStartedScreen from '../screens/auth/GetStartedScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import VerifyOtpScreen from '../screens/misc/VerifyOtpScreen';
import ForgotPasswordScreen from '../screens/misc/ForgotPasswordScreen';
import SupportHelpScreen from '../screens/misc/SupportHelpScreen';

const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SplashScreen2" component={SplashScreen2} />
    <Stack.Screen name="GetStarted" component={GetStartedScreen} />
    <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
    <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="SupportHelp" component={SupportHelpScreen} />
  </Stack.Navigator>
);

export default AuthStack;