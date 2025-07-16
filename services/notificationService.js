import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking} from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// --- NEW: EXPORTED FUNCTION ---
// This function sets up how notifications behave when the app is in the foreground.
// It should be called once when the app starts.
export const setupNotificationHandler = () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
    console.log('Notification handler set up.');
};

// --- NEW: EXPORTED FUNCTION ---
// This function is required for Android 8.0+ to create a "channel" for notifications.
// It should also be called once when the app starts.
export async function setupAndroidNotificationChannels() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
        console.log('Android notification channel "default" set up.');
    }
}


/**
 * Registers the device for push notifications and sends the Expo push token to the backend.
 * @param {object} api - The axios instance configured for your backend API.
 * @returns {string | null} The Expo push token if successful, otherwise null.
 */

export async function registerForPushNotificationsAsync(api) {
    if (!api) throw new Error("API client is not provided to notification service.");

    // Check if running on a physical device
    if (!Device.isDevice) {
        const message = "Push notifications are not supported on simulators. Please use a physical device.";
        console.warn(message);
        throw new Error(message);
    }

    // 1. Request permissions first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowTimeSensitive: true, 
          },
        });
        finalStatus = status;
    }

    // If permissions are not granted, alert the user and guide them to settings
    if (finalStatus !== 'granted') {
        Alert.alert(
            'Permission Required',
            'To enable notifications, you need to grant permission in your device settings.',
            [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() }
            ]
        );
        throw new Error('Push notification permission was not granted.');
    }

    // 2. Android Specific: Create Notification Channels (required for Android 8.0+)
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
        console.log('Android notification channel "default" set up.');
    }

    // 3. Get the Expo push token
    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
            throw new Error('Could not find Expo project ID. Please ensure it is set in your app.json under extra.eas.projectId.');
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData.data;

        if (token) {
            console.log('Obtained Expo Push Token:', token);
            // 4. Send the token to your backend using the provided API instance
            await api.post('/users/push-token', { token });
            console.log('Push token successfully sent to backend.');
            return token;
        } else {
            throw new Error('Failed to get push token.');
        }
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error('Error getting or saving push token:', errorMessage);
        throw new Error('Could not register for push notifications. Please try again.');
    }
}

/**
 * Unregisters the device for push notifications by notifying the backend to remove the token.
 * @param {object} api - The axios instance configured for your backend API.
 */
export async function unregisterForPushNotificationsAsync(api) {
    if (!api) throw new Error("API client is not provided to notification service.");
    try {
        // Send null token to backend to indicate unregistration
        await api.post('/users/push-token', { token: null });
        console.log('Push token removed from backend.');
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        console.error('Failed to remove push token from backend:', errorMessage);
        throw new Error('Could not disable notifications.');
    }
}