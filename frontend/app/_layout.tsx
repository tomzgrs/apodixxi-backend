import { Stack } from 'expo-router';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from '../src/i18n';
import { api } from '../src/api';
import { ThemeProvider, useTheme } from '../src/ThemeContext';

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

function AppContent() {
  const [lang, setLangState] = useState<Language>('el');
  const { isDark } = useTheme();

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('language');
      if (saved === 'en' || saved === 'el') setLangState(saved);
      await api.registerDevice(saved || 'el');
    })();
  }, []);

  const setLang = async (l: Language) => {
    setLangState(l);
    await AsyncStorage.setItem('language', l);
    await api.registerDevice(l);
  };

  const t = (key: TranslationKey) => translations[lang][key] || key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="receipt/[id]" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="scanner" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="webview-import" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </I18nContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
