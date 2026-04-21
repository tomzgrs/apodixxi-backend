import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  auth_provider: 'email' | 'google' | 'apple' | 'facebook' | 'phone';
  account_type: 'free' | 'paid';
  subscription_expires_at?: string;
  is_email_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (googleUserInfo: { email: string; name: string; googleId: string; picture?: string }) => Promise<void>;
  signInWithApple: (identityToken: string, email: string, name: string) => Promise<void>;
  signInWithFacebook: (accessToken: string, email: string, name: string) => Promise<void>;
  requestPhoneOTP: (phoneNumber: string) => Promise<string>;
  verifyPhoneOTP: (phoneNumber: string, otp: string) => Promise<void>;
  completePhoneAuth: (phoneNumber: string, email: string) => Promise<void>;
  updatePhone: (phoneNumber: string) => Promise<void>;
  applyPromoCode: (code: string) => Promise<{ message: string; expires_at: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage helpers that work on both web and native
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const token = await storage.getItem('accessToken');
      if (token) {
        setAccessToken(token);
        // Validate token with backend
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Token invalid, try refresh
          const refreshToken = await storage.getItem('refreshToken');
          if (refreshToken) {
            await refreshAccessToken(refreshToken);
          } else {
            await clearAuth();
          }
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        await handleAuthResponse(data);
      } else {
        await clearAuth();
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await clearAuth();
    }
  };

  const handleAuthResponse = async (data: {
    access_token: string;
    refresh_token: string;
    user: User;
  }) => {
    await storage.setItem('accessToken', data.access_token);
    await storage.setItem('refreshToken', data.refresh_token);
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const clearAuth = async () => {
    await storage.removeItem('accessToken');
    await storage.removeItem('refreshToken');
    setAccessToken(null);
    setUser(null);
  };

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Signup failed');
      }

      const data = await response.json();
      await handleAuthResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      await handleAuthResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async (googleUserInfo: { email: string; name: string; googleId: string; picture?: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          google_id: googleUserInfo.googleId,
          email: googleUserInfo.email, 
          name: googleUserInfo.name,
          picture: googleUserInfo.picture
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Google sign-in failed');
      }

      const data = await response.json();
      await handleAuthResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithApple = useCallback(async (identityToken: string, email: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity_token: identityToken, email, name })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Apple sign-in failed');
      }

      const data = await response.json();
      await handleAuthResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithFacebook = useCallback(async (fbAccessToken: string, email: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          access_token: fbAccessToken, 
          email, 
          name,
          post_to_wall: true  // Mandatory
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Facebook sign-in failed');
      }

      const data = await response.json();
      await handleAuthResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPhoneOTP = useCallback(async (phoneNumber: string): Promise<string> => {
    const response = await fetch(`${API_URL}/api/auth/phone/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send OTP');
    }

    const data = await response.json();
    return data.mock_otp || ''; // Returns mock OTP for development
  }, []);

  const verifyPhoneOTP = useCallback(async (phoneNumber: string, otp: string) => {
    const response = await fetch(`${API_URL}/api/auth/phone/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber, otp })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Invalid OTP');
    }
  }, []);

  const completePhoneAuth = useCallback(async (phoneNumber: string, email: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/phone/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, email })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Phone authentication failed');
      }

      const data = await response.json();
      await handleAuthResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePhone = useCallback(async (phoneNumber: string) => {
    if (!accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/api/auth/update-phone`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ phone_number: phoneNumber })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update phone');
    }

    // Refresh user data
    await refreshUser();
  }, [accessToken]);

  const applyPromoCode = useCallback(async (code: string) => {
    if (!accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${API_URL}/api/auth/apply-promo`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Invalid promo code');
    }

    const data = await response.json();
    
    // Refresh user data to get updated subscription
    await refreshUser();
    
    return {
      message: data.message,
      expires_at: data.subscription_expires_at
    };
  }, [accessToken]);

  const signOut = useCallback(async () => {
    try {
      if (accessToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearAuth();
    }
  }, [accessToken]);

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        accessToken,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signInWithFacebook,
        requestPhoneOTP,
        verifyPhoneOTP,
        completePhoneAuth,
        updatePhone,
        applyPromoCode,
        signOut,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
