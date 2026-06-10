import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// Phone auth removed - Firebase native modules incompatible with New Architecture

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.apodixxi.app';

export { API_URL };

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  auth_provider: 'email' | 'google' | 'apple' | 'facebook' | 'phone';
  account_type: 'free' | 'paid';
  is_premium?: boolean;
  subscription_expires_at?: string;
  is_email_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signInWithGoogle: (idToken: string, email?: string, rememberMe?: boolean) => Promise<void>;
  signInWithApple: (appleUserInfo: { appleId: string; email: string; name: string; identityToken: string }) => Promise<void>;
  signInWithFacebook: (facebookUserInfo: { email: string; name: string; facebookId: string; picture?: string }) => Promise<void>;
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
        // Get device_id to link with user
        const deviceId = await AsyncStorage.getItem('device_id');
        // Validate token with backend and link device
        const url = deviceId 
          ? `${API_URL}/api/auth/me?device_id=${deviceId}`
          : `${API_URL}/api/auth/me`;
        const response = await fetch(url, {
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
    device_id?: string;
    user: User;
  }, rememberMe: boolean = true) => {
    if (rememberMe) {
      await storage.setItem('accessToken', data.access_token);
      await storage.setItem('refreshToken', data.refresh_token);
    }
    await AsyncStorage.setItem('rememberMe', rememberMe ? '1' : '0');
    
    // If server returns a device_id, update local storage to sync with user account
    // This ensures the device sees all user's receipts
    if (data.device_id) {
      await AsyncStorage.setItem('device_id', data.device_id);
      console.log('Device ID synced:', data.device_id);
    }
    
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

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Signup failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          if (response.status >= 500 || responseText.includes('page not found') || responseText.includes('<html')) {
            errorMessage = 'Σφάλμα διακομιστή. Παρακαλώ δοκιμάστε ξανά.';
          } else {
            errorMessage = responseText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      await handleAuthResponse(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    setIsLoading(true);
    try {
      // Get device_id to link with user account
      const device_id = await AsyncStorage.getItem('device_id');
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, device_id })
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          if (response.status >= 500 || responseText.includes('page not found') || responseText.includes('<html')) {
            errorMessage = 'Σφάλμα διακομιστή. Παρακαλώ δοκιμάστε ξανά.';
          } else {
            errorMessage = responseText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      await handleAuthResponse(data, rememberMe);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async (idToken: string, email?: string, rememberMe: boolean = true) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, ...(email ? { email } : {}) })
      });

      if (!response.ok) {
        let errorMessage = `Σφάλμα σύνδεσης (${response.status})`;
        try {
          const responseText = await response.text();
          try {
            const errorData = JSON.parse(responseText);
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (errorData.detail) {
              errorMessage = JSON.stringify(errorData.detail);
            } else if (typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            } else {
              errorMessage = responseText || errorMessage;
            }
          } catch {
            errorMessage = responseText || errorMessage;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await response.json();
      await handleAuthResponse(data, rememberMe);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithApple = useCallback(async (appleUserInfo: { appleId: string; email: string; name: string; identityToken: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apple_id: appleUserInfo.appleId,
          identity_token: appleUserInfo.identityToken, 
          email: appleUserInfo.email, 
          name: appleUserInfo.name 
        })
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

  const signInWithFacebook = useCallback(async (facebookUserInfo: { email: string; name: string; facebookId: string; picture?: string }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          facebook_id: facebookUserInfo.facebookId,
          email: facebookUserInfo.email, 
          name: facebookUserInfo.name,
          picture: facebookUserInfo.picture
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
      // Get device_id to link with user
      const deviceId = await AsyncStorage.getItem('device_id');
      const url = deviceId 
        ? `${API_URL}/api/auth/me?device_id=${deviceId}`
        : `${API_URL}/api/auth/me`;
      const response = await fetch(url, {
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
