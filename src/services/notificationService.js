// services/notificationService.js

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../contexts'; // Assuming you can import this

/**
 * Sets up a handler to intelligently suppress notifications based on in-app context.
 * "Suppress" means to mute the sound, but still allow the notification to be displayed.
 */
export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Check for in-app Do Not Disturb setting
      const dndEnabled = await AsyncStorage.getItem('dnd_enabled');
      if (dndEnabled === 'true') {
        return {
          shouldShowAlert: true, // Still show in the notification tray
          shouldPlaySound: false, // But do not make a sound
          shouldSetBadge: true,
        };
      }

      // Avoid redundant alerts by checking the current screen
      // This is a placeholder for a more robust navigation state check.
      // const currentRoute = getCurrentRoute();
      const currentRoute = { name: 'PlaceholderScreen', params: {} }; // Placeholder
      const notifData = notification.request.content.data;

      // Example: Suppress sound if user is already viewing the specific support ticket
      if (notifData?.type === 'support_reply' &&
          currentRoute.name === 'SupportTicketDetail' &&
          currentRoute.params?.ticketId === notifData.ticketId) {
            console.log('Suppressing notification sound: User is viewing the relevant content.');
            return {
              shouldShowAlert: true,
              shouldPlaySound: false,
              shouldSetBadge: true,
            };
      }

      // Default behavior: show alert and play sound
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
  console.log('Notification suppression handler set up.');
};

/**
 * Ensures the default Android notification channel is configured.
 * This does not manage tokens, only presentation channels.
 */
export async function setupAndroidNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      // By default, `bypassDnd` is false, which respects the system's DND setting.
    });
    console.log('Android notification channel "default" set up.');
  }
}

