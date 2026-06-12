import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from '../src/i18n';
import { api } from '../src/api';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import * as Updates from 'expo-updates';
import mobileAds from 'react-native-google-mobile-ads';
import { AuthProvider, useAuth } from '../src/AuthContext';
import { initSentry, Sentry } from '../src/sentry';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

// Initialize crash reporting as early as possible (no-op in dev / without DSN).
initSentry();

type I18nContextType = {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
};

export const I18nContext = createContext<I18nContextType>({
  lang: 'el',
  setLang: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

// Protected Route component
function useProtectedRoute(user: any, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      // Redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to main app
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading]);
}

function NavigationContent() {
  const { user, isLoading } = useAuth();
  const { isDark } = useTheme();
  
  useProtectedRoute(user, isLoading);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="category-products" options={{ headerShown: false }} />
        <Stack.Screen name="receipt/[id]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="scanner" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="webview-import" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </>
  );
}

function AppContent() {
  const [lang, setLangState] = useState<Language>('el');
  const { isDark } = useTheme();
  const { user } = useAuth();

  // Initialize AdMob SDK once at startup
    useEffect(() => {
      mobileAds().initialize().catch(() => {});
    }, []);

    // Check for OTA updates on startup (silent — never blocks the app)
    useEffect(() => {
      if (__DEV__) return;
      (async () => {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
          }
        } catch (_) {
          // Silently ignore — app continues normally
        }
      })();
    }, []);

    useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('language');
      if (saved === 'en' || saved === 'el') setLangState(saved);
      // Register device only if user is logged in
      if (user) {
        await api.registerDevice(saved || 'el');
      }
    })();
  }, [user]);

  const setLang = async (l: Language) => {
    setLangState(l);
    await AsyncStorage.setItem('language', l);
    if (user) {
      await api.registerDevice(l);
    }
  };

  const t = (key: TranslationKey) => translations[lang][key] || key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      <NavigationContent />
    </I18nContext.Provider>
  );
}

function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
