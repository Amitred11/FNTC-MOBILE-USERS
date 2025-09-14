// src/navigation/MainStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import Main App Screens
// Home
import HomeScreen from '../screens/dashboard/HomeScreen';
import Profile from '../screens/dashboard/Profile';
import EditProfileScreen from '../screens/dashboard/EditProfileScreen';
// Subscription
import Subscription from '../screens/subscriptions/Subscription';
import MySubscriptionScreen from '../screens/subscriptions/MySubscriptionScreen';
import PaymentVoucherScreen from '../screens/subscriptions/PaymentVoucherScreen';
import MyBills from '../screens/subscriptions/MyBills';
import PayBills from '../screens/subscriptions/PayBills';
// Settings
import Notif from '../screens/dashboard/Notif';
import Settings from '../screens/settings/Settings';
import OurServicesScreen from '../screens/misc/OurServiceScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';
import FeedbackFormScreen from '../screens/settings/FeedbackFormScreen';
import CustomerFeedbackScreen from '../screens/settings/CustomerFeedbackScreen';
import AboutScreen from '../screens/misc/AboutScreen';
// Support
import Support from '../screens/support/Support';
import LiveChatScreen from '../screens/support/LiveChatScreen';
import HowToUseScreen from '../screens/misc/HowToUseScreen';
// Others
import LegalDocumentScreen from '../screens/misc/LegalDocumentScreen';

const Stack = createStackNavigator();

const MainStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
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
  </Stack.Navigator>
);

export default MainStack;