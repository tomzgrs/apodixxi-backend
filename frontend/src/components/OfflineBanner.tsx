import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { connectivity } from '../services/connectivity';
import { useConnectivity } from '../hooks/useConnectivity';

const PROBE_INTERVAL_MS = 8000;

export function OfflineBanner(): React.ReactElement | null {
  const online = useConnectivity();

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

  useEffect(() => {
    if (online) return;
    const id = setInterval(() => {
      connectivity.probe();
    }, PROBE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [online]);

  return null;
}
