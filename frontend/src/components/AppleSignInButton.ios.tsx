import React, { useState, useEffect, useContext } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { I18nContext } from '../../app/_layout';

interface AppleSignInButtonProps {
  onSignIn: (data: {
    appleId: string;
    email: string;
    name: string;
    identityToken: string;
  }) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  style?: any;
}

export default function AppleSignInButton({
  onSignIn,
  isLoading,
  setIsLoading,
  setError,
  style,
}: AppleSignInButtonProps) {
  const { t } = useContext(I18nContext);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      const available = await AppleAuthentication.isAvailableAsync();
      setIsAvailable(available);
    };
    checkAvailability();
  }, []);

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const appleEmail = credential.email || `${credential.user}@privaterelay.appleid.com`;
      const appleName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : '';

      await onSignIn({
        appleId: credential.user,
        email: appleEmail,
        name: appleName,
        identityToken: credential.identityToken || '',
      });
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      setError(err.message || t('apple_signin_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if Apple Sign-In is not available
  if (!isAvailable) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.socialButton, style, isLoading && styles.buttonDisabled]}
      onPress={handleAppleSignIn}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={t('signin_with_apple')}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <Ionicons name="logo-apple" size={20} color="#fff" />
          <Text style={styles.socialButtonText}>Apple</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 140,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
