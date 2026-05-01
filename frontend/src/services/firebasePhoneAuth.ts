/**
 * Firebase Phone Authentication Service
 * Handles SMS OTP verification using Firebase Auth
 */
import { Platform } from 'react-native';

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB42nuHYzPgP7nQS5d81EQ77HN6p-N3N1c",
  authDomain: "apodixxi-58736.firebaseapp.com",
  projectId: "apodixxi-58736",
  storageBucket: "apodixxi-58736.firebasestorage.app",
  messagingSenderId: "889769499922",
  appId: "1:889769499922:web:5ec8c5547885b62dbc27cb"
};

// Store confirmation result for OTP verification - using a more robust storage mechanism
interface ConfirmationStore {
  result: any;
  phoneNumber: string;
  timestamp: number;
}

let confirmationStore: ConfirmationStore | null = null;
let firebaseAuth: any = null;
let isInitialized = false;

// Timeout for OTP confirmation (5 minutes = 300000ms)
const OTP_TIMEOUT = 300000;

/**
 * Check if stored confirmation is still valid
 */
const isConfirmationValid = (): boolean => {
  if (!confirmationStore) return false;
  const now = Date.now();
  const elapsed = now - confirmationStore.timestamp;
  return elapsed < OTP_TIMEOUT;
};

/**
 * Get stored confirmation result
 */
const getConfirmationResult = (): any => {
  if (!confirmationStore) {
    console.log('[Firebase] No confirmation result stored');
    return null;
  }
  
  if (!isConfirmationValid()) {
    console.log('[Firebase] Confirmation result expired');
    confirmationStore = null;
    return null;
  }
  
  console.log('[Firebase] Confirmation result is valid, phone:', confirmationStore.phoneNumber);
  return confirmationStore.result;
};

/**
 * Store confirmation result
 */
const setConfirmationResult = (result: any, phoneNumber: string): void => {
  confirmationStore = {
    result,
    phoneNumber,
    timestamp: Date.now()
  };
  console.log('[Firebase] Confirmation result stored for:', phoneNumber);
};

/**
 * Initialize Firebase based on platform
 */
export const initializeFirebaseAuth = async (): Promise<void> => {
  if (isInitialized) return;
  
  try {
    if (Platform.OS === 'web') {
      // Web uses modular Firebase SDK
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      
      let app;
      if (getApps().length === 0) {
        app = initializeApp(FIREBASE_CONFIG);
      } else {
        app = getApp();
      }
      firebaseAuth = getAuth(app);
    } else {
      // Native uses @react-native-firebase
      const authModule = await import('@react-native-firebase/auth');
      firebaseAuth = authModule.default();
    }
    
    isInitialized = true;
    console.log('[Firebase] Auth initialized successfully');
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    throw error;
  }
};

/**
 * Send OTP to phone number
 * @param phoneNumber - Phone number with country code (e.g., +30...)
 * @returns Promise that resolves when OTP is sent
 */
export const sendPhoneOTP = async (phoneNumber: string): Promise<void> => {
  await initializeFirebaseAuth();
  
  if (!firebaseAuth) {
    throw new Error('Firebase Auth not initialized');
  }
  
  // Format phone number if needed
  let formattedPhone = phoneNumber;
  if (!formattedPhone.startsWith('+')) {
    // Assume Greek number if no country code
    if (formattedPhone.startsWith('69')) {
      formattedPhone = '+30' + formattedPhone;
    } else if (formattedPhone.startsWith('30')) {
      formattedPhone = '+' + formattedPhone;
    } else {
      formattedPhone = '+30' + formattedPhone;
    }
  }
  
  console.log('[Firebase] Sending OTP to:', formattedPhone);
  
  try {
    if (Platform.OS === 'web') {
      // Web: Use reCAPTCHA verifier
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      
      // Create invisible reCAPTCHA
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        const div = document.createElement('div');
        div.id = 'recaptcha-container';
        document.body.appendChild(div);
      }
      
      const recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('[Firebase] reCAPTCHA solved');
        }
      });
      
      const result = await signInWithPhoneNumber(firebaseAuth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(result, formattedPhone);
    } else {
      // Native: Direct phone auth
      const result = await firebaseAuth.signInWithPhoneNumber(formattedPhone);
      setConfirmationResult(result, formattedPhone);
    }
    
    console.log('[Firebase] OTP sent successfully');
  } catch (error: any) {
    console.error('[Firebase] Send OTP error:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Μη έγκυρος αριθμός τηλεφώνου');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Πολλές προσπάθειες. Δοκιμάστε αργότερα.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('Ξεπεράστηκε το όριο SMS. Δοκιμάστε αργότερα.');
    }
    
    throw error;
  }
};

/**
 * Verify OTP code
 * @param otp - 6-digit OTP code
 * @returns Firebase user credential
 */
export const verifyPhoneOTP = async (otp: string): Promise<{ uid: string; phoneNumber: string }> => {
  const confirmationResult = getConfirmationResult();
  
  if (!confirmationResult) {
    console.log('[Firebase] No valid confirmation result found');
    throw new Error('Η συνεδρία έληξε. Παρακαλώ ξαναστείλτε τον κωδικό OTP.');
  }
  
  console.log('[Firebase] Verifying OTP...');
  
  try {
    const result = await confirmationResult.confirm(otp);
    const user = result.user;
    
    console.log('[Firebase] OTP verified successfully');
    
    // Clear the stored confirmation after successful verification
    confirmationStore = null;
    
    return {
      uid: user.uid,
      phoneNumber: user.phoneNumber || ''
    };
  } catch (error: any) {
    console.error('[Firebase] Verify OTP error:', error);
    
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Μη έγκυρος κωδικός OTP');
    } else if (error.code === 'auth/code-expired' || error.code === 'auth/session-expired') {
      // Clear expired confirmation
      confirmationStore = null;
      throw new Error('Η συνεδρία έληξε. Παρακαλώ ξαναστείλτε τον κωδικό OTP.');
    }
    
    throw error;
  }
};

/**
 * Get current Firebase user
 */
export const getCurrentFirebaseUser = async (): Promise<any> => {
  await initializeFirebaseAuth();
  
  if (!firebaseAuth) return null;
  
  if (Platform.OS === 'web') {
    return firebaseAuth.currentUser;
  } else {
    return firebaseAuth.currentUser;
  }
};

/**
 * Sign out from Firebase
 */
export const signOutFirebase = async (): Promise<void> => {
  await initializeFirebaseAuth();
  
  if (firebaseAuth) {
    await firebaseAuth.signOut();
  }
  
  // Clear stored confirmation
  confirmationStore = null;
};

/**
 * Get Firebase ID token for backend verification
 */
export const getFirebaseIdToken = async (): Promise<string | null> => {
  await initializeFirebaseAuth();
  
  if (!firebaseAuth) return null;
  
  const user = Platform.OS === 'web' 
    ? firebaseAuth.currentUser 
    : firebaseAuth.currentUser;
  
  if (!user) return null;
  
  return await user.getIdToken();
};
