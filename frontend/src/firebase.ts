/**
 * Firebase Configuration for apodixxi
 * Used for Phone Authentication
 */
import { Platform } from 'react-native';

// Firebase Web Config (for web preview)
export const firebaseConfig = {
  apiKey: "AIzaSyB42nuHYzPgP7nQS5d81EQ77HN6p-N3N1c",
  authDomain: "apodixxi-58736.firebaseapp.com",
  projectId: "apodixxi-58736",
  storageBucket: "apodixxi-58736.firebasestorage.app",
  messagingSenderId: "889769499922",
  appId: "1:889769499922:web:5ec8c5547885b62dbc27cb"
};

// Initialize Firebase based on platform
let auth: any = null;
let firebaseApp: any = null;

export const initializeFirebase = async () => {
  if (Platform.OS === 'web') {
    // Web uses the JS SDK
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
    auth = getAuth(firebaseApp);
  } else {
    // Native uses react-native-firebase
    const firebase = await import('@react-native-firebase/app');
    const authModule = await import('@react-native-firebase/auth');
    
    firebaseApp = firebase.default;
    auth = authModule.default();
  }
  
  return { auth, firebaseApp };
};

export const getFirebaseAuth = () => auth;
export const getFirebaseApp = () => firebaseApp;
