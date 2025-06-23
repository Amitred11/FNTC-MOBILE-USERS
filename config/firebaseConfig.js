import { initializeApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBFttAnDnUb0RG_DXEpbhh5ifrZ-Mnyz-4",
  authDomain: "fibear-20101.firebaseapp.com",
  projectId: "fibear-20101",
  storageBucket: "fibear-20101.appspot.com",
  messagingSenderId: "973096250612",
  appId: "1:973096250612:web:bcaca4ed258e03f4ec02a1",
  measurementId: "G-ZBBJ4Z3SKE",
  databaseURL: "https://fibear-20101-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage for session persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const database = getDatabase(app);
const storage = getStorage(app);

export { app, auth, database, storage };
