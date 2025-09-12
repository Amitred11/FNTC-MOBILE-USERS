import { Linking, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * A robust handler for requesting media library (photos) permissions.
 * It handles all platforms and permission states, including permanent denial.
 *
 * @returns {Promise<boolean>} - A promise that resolves to `true` if permission is granted, and `false` otherwise.
 */
export async function requestMediaLibraryPermissions() {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'To select a photo, you need to allow access to your media library in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
  }

  return true;
}

/**
 * A robust handler for requesting camera permissions.
 *
 * @returns {Promise<boolean>} - A promise that resolves to `true` if permission is granted, and `false` otherwise.
 */
export async function requestCameraPermissions() {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'To use the camera, you need to grant permission in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
  }
  return true;
}
