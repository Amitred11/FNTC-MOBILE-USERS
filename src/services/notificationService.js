// services/notificationService.js (Corrected)

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANDROID_CHANNEL_ID = 'default_channel';

export const setupNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const dndEnabled = await AsyncStorage.getItem('dnd_enabled');
      if (dndEnabled === 'true') {
        return { shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: true };
      }

      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
  console.log('Notification foreground handler set up.');
};

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Failed to get push notification permission!');
    return false;
  }
  return true;
}

export async function setupAndroidNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.deleteNotificationChannelAsync(ANDROID_CHANNEL_ID).catch(() => {});

    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'notification.mp3', 
    });
    console.log('Android notification channel "default_channel" set up with custom sound.');
  }
}

export async function scheduleLocalNotification({ title, body, data }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: Platform.OS === 'ios' ? 'notification.mp3' : undefined,
    },
    trigger: null,
  });
   console.log('Local notification scheduled:', title);
}