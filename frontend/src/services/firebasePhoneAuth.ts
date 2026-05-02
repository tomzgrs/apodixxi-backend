/**
 * Firebase Phone Authentication Service
 * Uses Firebase Web SDK (compatible with New Architecture)
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  ConfirmationResult,
  Auth,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
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

// Store confirmation result for OTP verification
interface ConfirmationStore {
  result: ConfirmationResult;
  phoneNumber: string;
  timestamp: number;
}

let confirmationStore: ConfirmationStore | null = null;
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let isInitialized = false;
let recaptchaVerifier: RecaptchaVerifier | null = null;

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
const getConfirmationResult = (): ConfirmationResult | null => {
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
const setConfirmationResult = (result: ConfirmationResult, phoneNumber: string): void => {
  confirmationStore = {
    result,
    phoneNumber,
    timestamp: Date.now()
  };
  console.log('[Firebase] Confirmation result stored for:', phoneNumber);
};

/**
 * Initialize Firebase
 */
export const initializeFirebaseAuth = async (): Promise<void> => {
  if (isInitialized && firebaseAuth) return;
  
  try {
    // Initialize Firebase App
    if (getApps().length === 0) {
      firebaseApp = initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = getApp();
    }
    
    // Get Auth instance
    firebaseAuth = getAuth(firebaseApp);
    
    isInitialized = true;
    console.log('[Firebase] Auth initialized successfully');
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    throw error;
  }
};

/**
 * Create reCAPTCHA verifier for web
 */
const createRecaptchaVerifier = (): RecaptchaVerifier | null => {
  if (Platform.OS !== 'web' || !firebaseAuth) {
    return null;
  }
  
  try {
    // Create invisible reCAPTCHA container if it doesn't exist
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      document.body.appendChild(container);
    }
    
    // Clear existing verifier
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch (e) {
        // Ignore errors when clearing
      }
    }
    
    recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        console.log('[Firebase] reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('[Firebase] reCAPTCHA expired');
      }
    });
    
    return recaptchaVerifier;
  } catch (error) {
    console.error('[Firebase] reCAPTCHA creation error:', error);
    return null;
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
      const verifier = createRecaptchaVerifier();
      if (!verifier) {
        throw new Error('Could not create reCAPTCHA verifier');
      }
      
      const result = await signInWithPhoneNumber(firebaseAuth, formattedPhone, verifier);
      setConfirmationResult(result, formattedPhone);
    } else {
      // Native: For now, throw a friendly error
      // Phone auth on native requires @react-native-firebase which conflicts with new architecture
      throw new Error('Η επαλήθευση τηλεφώνου δεν είναι διαθέσιμη αυτή τη στιγμή. Παρακαλώ χρησιμοποιήστε email ή Google για σύνδεση.');
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
export const getCurrentFirebaseUser = async (): Promise<User | null> => {
  await initializeFirebaseAuth();
  
  if (!firebaseAuth) return null;
  
  return firebaseAuth.currentUser;
};

/**
 * Sign out from Firebase
 */
export const signOutFirebase = async (): Promise<void> => {
  await initializeFirebaseAuth();
  
  if (firebaseAuth) {
    await firebaseSignOut(firebaseAuth);
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
  
  const user = firebaseAuth.currentUser;
  
  if (!user) return null;
  
  return await user.getIdToken();
};
