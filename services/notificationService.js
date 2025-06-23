import { database, auth } from '../config/firebaseConfig';
import { ref, push, set, get, update, remove, serverTimestamp } from 'firebase/database';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// --- REGISTRATION & PERMISSIONS LOGIC ---

/**
 * Registers the device for push notifications and saves the token to the user's profile.
 * @returns {string | null} The Expo Push Token or null if it failed.
 */
export async function registerForPushNotificationsAsync() {
  let token;

  // Set up a notification channel for Android (required)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If not granted, ask for permission
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification! Please check your device settings.');
    return null;
  }

  // Get the Expo Push Token
try {
  // WHEN USING app.json, YOU DON'T NEED TO PASS THE PROJECT ID MANUALLY
  token = (await Notifications.getExpoPushTokenAsync()).data; 
  console.log("Expo Push Token:", token);
} catch(e) {
  console.error("Failed to get Expo Push Token.", e);
  return null;
}

  // Save the token to the current user's profile in Firebase
  const currentUser = auth.currentUser;
  if (currentUser && token) {
    const userProfileRef = ref(database, `users/${currentUser.uid}/pushToken`);
    await set(userProfileRef, token);
  }

  return token;
}

/**
 * Removes the push token from the user's profile in Firebase.
 */
export async function unregisterForPushNotificationsAsync() {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const userProfileRef = ref(database, `users/${currentUser.uid}/pushToken`);
    await remove(userProfileRef);
    console.log("Push token removed from Firebase.");
  }
}

// --- SENDING LOGIC ---

/**
 * Sends a push notification using Expo's Push API.
 */
async function sendPushNotification(expoPushToken, title, body, data) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data, // Optional data, e.g., { screen: 'MyBills' }
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

/**
 * Creates a notification in the DB AND sends a push notification if a token exists.
 */
export const createUserNotification = async (uid, { title, message, type, data = {} }) => {
  try {
    // 1. Save notification to Firebase DB (for the in-app list)
    const notificationsRef = ref(database, `notifications/${uid}`);
    await push(notificationsRef, { title, message, type, read: false, timestamp: serverTimestamp() });

    // 2. Send a real push notification
const userProfileRef = ref(database, `users/${uid}/pushToken`);
const snapshot = await get(userProfileRef);

if (snapshot.exists()) {
  // If the token EXISTS, this block runs.
  const pushToken = snapshot.val();
  await sendPushNotification(pushToken, title, message, data);
} else {
  // If the token DOES NOT EXIST, this block runs.
  console.log(`User ${uid} does not have a push token. Skipping push notification.`);
}
  } catch (error) {
    console.error("Error creating user notification:", error);
  }
};

/**
 * Creates a broadcast notification for ALL users.
 */
export const createBroadcastNotification = async ({ title, message, type, data = {} }) => {
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);

        if (snapshot.exists()) {
            const users = snapshot.val();
            const promises = Object.keys(users).map(uid =>
                createUserNotification(uid, { title, message, type, data })
            );
            await Promise.all(promises);
            console.log(`Broadcast notification sent to ${Object.keys(users).length} users.`);
        }
    } catch (error) {
        console.error("Error creating broadcast notification:", error);
    }
};