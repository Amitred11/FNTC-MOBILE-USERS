import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "FNTC",
  slug: "fibear",
  scheme: "com.hellopo123.fibear",
  version: "1.0.0",
  owner: "hellopo123", 
  orientation: "portrait",
  icon: "./src/assets/logo.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./src/assets/logo.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  android: {
    package: "com.hellopo123.fibear",
    newArchEnabled: true,
    adaptiveIcon: {
      foregroundImage: "./src/assets/logo.png",
      backgroundColor: "#ffffff"
    },
    permissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION"
    ]
  },
  web: {
    favicon: "./src/assets/logo.png"
  },
  extra: {
    eas: {
      projectId: "00ca380e-9fb0-4308-be0b-818a73b0a3c6"
    },
    webClientId: process.env.WEB_CLIENT_ID,
    iosClientId: process.env.IOS_CLIENT_ID,
    androidClientId: process.env.ANDROID_CLIENT_ID,
    API_URL: process.env.API_URL,
    CONFIG_INTERNAL_API_KEY: process.env.CONFIG_INTERNAL_API_KEY,
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
    ],
    [
      "expo-notifications",
      {
        "sounds": ["./src/assets/sounds/notification.mp3"]
      }
    ]
  ]
});
