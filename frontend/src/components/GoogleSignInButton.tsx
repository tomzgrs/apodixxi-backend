import React, { useContext } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { I18nContext } from '../../app/_layout';

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '889769499922-mh96og0dig0nohhvgl6htv59qjqv147j.apps.googleusercontent.com';

// iOS native Google Sign-In needs the iOS OAuth client ID (created in Google
// Cloud Console, type "iOS", tied to bundleIdentifier com.apodixxi.app).
// Provided via EAS env var; undefined on Android (where webClientId suffices).
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  offlineAccess: false,
  scopes: ['profile', 'email'],
});

interface GoogleSignInButtonProps {
  onSignIn: (idToken: string, email?: string) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  style?: any;
}

export default function GoogleSignInButton({
  onSignIn,
  isLoading,
  setIsLoading,
  setError,
  style,
}: GoogleSignInButtonProps) {
  const { t } = useContext(I18nContext);
  const handlePress = async () => {
    setError('');
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Always show account picker by signing out first
      try { await GoogleSignin.signOut(); } catch {}
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      const email = response.data?.user?.email || '';
      if (!idToken) throw new Error(t('google_no_id_token'));
      await onSignIn(idToken, email);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // Ο χρήστης ακύρωσε — δεν χρειάζεται μήνυμα
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setError(t('signin_in_progress'));
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError(t('play_services_unavailable'));
      } else {
        setError(error.message || t('google_signin_failed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled, style]}
      onPress={handlePress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={t('signin_with_google')}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.buttonText}>Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
