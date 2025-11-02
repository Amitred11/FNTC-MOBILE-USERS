// services/backgroundNotificationTask.js (Corrected)

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; 
import { API_URL, CONFIG_INTERNAL_API_KEY } from '../config/apiConfig';
import { scheduleLocalNotification } from './notificationService';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'X-Internal-Api-Key': CONFIG_INTERNAL_API_KEY,
  },
});

const BACKGROUND_FETCH_TASK = 'background-notification-fetch';
const LAST_CHECKED_TIMESTAMP_KEY = 'last_notification_check_timestamp';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const now = new Date();
  console.log(`[${now.toISOString()}] Background fetch task running...`);

  try {
    const lastCheckedTimestamp = await AsyncStorage.getItem(LAST_CHECKED_TIMESTAMP_KEY);

    const endpoint = lastCheckedTimestamp
      ? `/admin/notifications?since=${lastCheckedTimestamp}`
      : '/admin/notifications';

    const { data: response } = await api.get(endpoint);
    const newNotifications = response.data || [];

    if (newNotifications && newNotifications.length > 0) {
      console.log(`[Background Fetch] Found ${newNotifications.length} new notifications.`);

      for (const notification of newNotifications) {
        await scheduleLocalNotification({
          title: notification.title,
          body: notification.message,
          data: { link: notification.link || null },
        });
      }
    } else {
      console.log('[Background Fetch] No new notifications found.');
    }

    await AsyncStorage.setItem(LAST_CHECKED_TIMESTAMP_KEY, now.toISOString());

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch task failed:', error.response?.data || error.message);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetchAsync() {
  console.log('Registering background fetch task...');
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 15 * 60, 
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundFetchAsync() {
  console.log('Unregistering background fetch task...');
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}