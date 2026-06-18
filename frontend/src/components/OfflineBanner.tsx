import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { connectivity } from '../services/connectivity';
import { useConnectivity } from '../hooks/useConnectivity';
import { I18nContext } from '../../app/_layout';

const OFFLINE_BG = '#dc2626';
const ONLINE_BG = '#16a34a';
const PROBE_INTERVAL_MS = 8000;
const RESTORED_VISIBLE_MS = 2500;

/**
 * Global, always-mounted offline indicator. Slides in when connectivity is
 * lost, offers a manual retry, and briefly confirms when the connection is
 * restored. Also drives recovery: it probes the backend on an interval while
 * offline and whenever the app returns to the foreground.
 */
export function OfflineBanner(): React.ReactElement {
  const online = useConnectivity();
  const insets = useSafeAreaInsets();
  const { t } = useContext(I18nContext);
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(false);
  const translateY = useRef(new Animated.Value(-120)).current;

  // Establish initial state and re-check when the app is foregrounded.
  // Delay the first probe by 3 s: on Android the network stack is not ready
  // immediately at app launch, so an instant probe gives a false "offline"
  // result and shows the red banner unnecessarily.
  useEffect(() => {
    const initialTimer = setTimeout(() => connectivity.probe(), 3000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') connectivity.probe();
    });
    return () => {
      clearTimeout(initialTimer);
      sub.remove();
    };
  }, []);

  // While offline, poll for recovery.
  useEffect(() => {
    if (online) return;
    const id = setInterval(() => {
      connectivity.probe();
    }, PROBE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [online]);

  // Briefly show a "back online" confirmation after recovering.
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowRestored(false);
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setShowRestored(true);
      const id = setTimeout(() => setShowRestored(false), RESTORED_VISIBLE_MS);
      return () => clearTimeout(id);
    }
  }, [online]);

  const visible = !online || showRestored;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -120,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const offline = !online;

  return (
    <Animated.View
      testID="offline-banner"
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: offline ? OFFLINE_BG : ONLINE_BG,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons
        name={offline ? 'cloud-offline-outline' : 'cloud-done-outline'}
        size={16}
        color="#fff"
      />
      <Text style={styles.text} numberOfLines={1}>
        {offline ? t('offline_banner') : t('back_online')}
      </Text>
      {offline && (
        <TouchableOpacity
          testID="offline-retry"
          style={styles.retryBtn}
          onPress={() => connectivity.probe()}
          activeOpacity={0.7}
        >
          <Text style={styles.retryText}>{t('retry')}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
