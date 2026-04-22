// This file serves as a fallback for web/other platforms
import React from 'react';

interface AppleSignInButtonProps {
  onSignIn: (data: any) => Promise<void>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  style?: any;
}

export default function AppleSignInButton(_props: AppleSignInButtonProps) {
  return null;
}
