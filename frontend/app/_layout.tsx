import { Stack } from 'expo-router';
import { useEffect, useState, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from '../src/i18n';
import { api } from '../src/api';

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

export default function RootLayout() {
  const [lang, setLangState] = useState<Language>('el');

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
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="receipt/[id]" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </I18nContext.Provider>
  );
}
