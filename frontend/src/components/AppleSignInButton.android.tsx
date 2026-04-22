import React from 'react';
import { View } from 'react-native';

// Apple Sign-In is not available on Android
// This component renders nothing on Android platform

interface AppleSignInButtonProps {
  onSignIn: (data: any) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  style?: any;
}

export default function AppleSignInButton(_props: AppleSignInButtonProps) {
  // Return null - Apple Sign-In is iOS only
  return null;
}
