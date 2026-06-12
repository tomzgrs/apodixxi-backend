import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../theme';

export type ToastType = 'success' | 'error' | 'info';

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setMounted(false));
  }, [translateY, opacity]);

  const showToast = useCallback(
    (msg: string, t: ToastType = 'info') => {
      if (!msg) return;
      setMessage(msg);
      setType(t);
      setMounted(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      hideTimer.current = setTimeout(hide, 2400);
    },
    [translateY, opacity, hide]
  );

  const config = {
    success: { icon: 'checkmark-circle' as const, color: theme.success },
    error: { icon: 'alert-circle' as const, color: theme.error },
    info: { icon: 'information-circle' as const, color: theme.primary },
  }[type];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { transform: [{ translateY }], opacity, backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons name={config.icon} size={20} color={config.color} />
          <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
            {message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 36,
    left: Spacing.base,
    right: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1,
    zIndex: 9999,
    ...Shadows.md,
  },
  text: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
});
