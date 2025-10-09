// services/notificationService.js

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const dndEnabled = await AsyncStorage.getItem('dnd_enabled');
      if (dndEnabled === 'true') {
        return {
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: true,
        };
      }

      const currentRoute = { name: 'PlaceholderScreen', params: {} }; 
      const notifData = notification.request.content.data;

      if (notifData?.type === 'support' &&
          currentRoute.name === 'SupportTicketDetail' &&
          currentRoute.params?.ticketId === notifData.ticketId) {
            console.log('Suppressing notification sound: User is viewing the relevant content.');
            return {
              shouldShowAlert: true,
              shouldPlaySound: false,
              shouldSetBadge: true,
            };
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
  console.log('Notification suppression handler set up.');
};

export async function setupAndroidNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'notification.mp3', 
    });
    console.log('Android notification channel "default" set up with custom sound.');
  }
}