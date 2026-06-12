import { useEffect, useState } from 'react';
import { connectivity } from '../services/connectivity';

/** Subscribe to the global online/offline state. */
export function useConnectivity(): boolean {
  const [online, setOnline] = useState<boolean>(connectivity.isOnline());
  useEffect(() => connectivity.subscribe(setOnline), []);
  return online;
}
