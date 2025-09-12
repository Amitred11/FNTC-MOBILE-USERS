import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "FNTC",
  slug: "fibear",
  scheme: "fibear",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./src/assets/logo.jpg",
  userInterfaceStyle: "light",
  splash: {
    image: "./src/assets/logo.jpg",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.user12312312312.fibear",
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "The app needs access to your photos so you can select a proof of payment or update your profile picture.",
      NSCameraUsageDescription:
        "The app needs access to your camera to capture images for proof of payment or for your profile picture.",
      NSMicrophoneUsageDescription:
        "The app needs access to your microphone for video recording (if you also capture video)."
    }
  },
  android: {
    package: "com.user12312312312.fibear",
    googleServicesFile: "./google-services.json",
    newArchEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./src/assets/logo.jpg",
      backgroundColor: "#ffffff"
    },
    permissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO"
    ]
  },
  web: {
    favicon: "./src/assets/logo.jpg"
  },
  extra: {
    eas: {
      projectId: "ca00445b-0508-46c4-bb74-05e2977fa248"
    },
    webClientId: process.env.WEB_CLIENT_ID,
    iosClientId: process.env.IOS_CLIENT_ID,
    androidClientId: process.env.ANDROID_CLIENT_ID,
    API_URL: process.env.API_URL,
    Config_INTERNAL_API_KEY: process.env.CONFIG_INTERNAL_API_KEY,
    CHATBOT_API_ENDPOINT: process.env.CHATBOT_API_ENDPOINT
  },
  plugins: [
    [
      "expo-image-picker",
      {
        photosPermission:
          "The app needs access to your photos so you can select a proof of payment or update your profile picture."
      }
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "The app needs access to your camera to capture images for proof of payment or for your profile picture."
      }
    ]
  ]
});
