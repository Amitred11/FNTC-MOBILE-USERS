import React, { useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import * as Notifications from 'expo-notifications';

// --- Screen Imports ---
import SplashScreen2 from './screens/SplashScreen2';
import GetStartedScreen from './screens/GetStartedScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import Subscription from './screens/Subscription';
import Profile from './screens/Profile';
import Support from './screens/Support';
import MyBills from './screens/MyBills';
import Settings from './screens/Settings';
import MySubscriptionScreen from './screens/MySubscriptionScreen';
import PayBills from './screens/PayBills';
import EditProfileScreen from './screens/EditProfileScreen';
// Corrected to use the actual component name we created
import Notif from './screens/Notif'; 
import CustomerFeedbackScreen from './screens/CustomerFeedbackScreen';
import ChangePassword from './screens/ChangePasswordScreen';
import { ThemeProvider } from './contexts/ThemeContext';


// This must be set so that notifications are shown when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true, // It's common to set the badge count
  }),
});

const Stack = createStackNavigator();

// --- THE SINGLE ROOT APP COMPONENT ---
export default function App() {
  // A navigationRef allows us to access navigation methods from outside a screen component
  const navigationRef = useNavigationContainerRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('--- Notification Received While App is Open ---');
      console.log(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    // (works when the app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('--- Notification Tapped ---');
      const data = response.notification.request.content.data;
      
      // Check if the navigation container is ready and if the notification has screen data
      if (navigationRef.isReady() && data?.screen) {
        console.log(`Navigating to screen: ${data.screen}`);
        // Use the ref to navigate to the specified screen
        navigationRef.navigate(data.screen, data.params || {});
      }
    });

    // Clean up the listeners when the component unmounts
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []); // The empty dependency array ensures this effect runs only once

  return (
    <ThemeProvider>
    <SubscriptionProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash2">
          <Stack.Screen name="Splash2" component={SplashScreen2} />
          <Stack.Screen name="GetStarted" component={GetStartedScreen} />
          <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Subscription" component={Subscription} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="Profile" component={Profile} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="Support" component={Support} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="MyBills" component={MyBills} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="Settings" component={Settings} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="MySubscriptionScreen" component={MySubscriptionScreen} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="PayBills" component={PayBills} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="Notif" component={Notif} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="CustomerFeedbackScreen" component={CustomerFeedbackScreen} options={{ unmountOnBlur: true }} />
          <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ unmountOnBlur: true }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SubscriptionProvider>
    </ThemeProvider>
  );
}