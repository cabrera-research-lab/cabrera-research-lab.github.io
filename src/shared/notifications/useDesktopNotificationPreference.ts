import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPermission,
  isDesktopNotificationSupported,
  requestNotificationPermission,
} from '@/shared/notifications/desktopNotifications';

const STORAGE_KEY = 'goatnet.desktopNotifications';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeEnabled(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Ignore private browsing / storage errors.
  }
}

export function useDesktopNotificationPreference() {
  const supported = isDesktopNotificationSupported();
  const [enabled, setEnabledState] = useState(readEnabled);
  const [permission, setPermission] = useState(getNotificationPermission);

  useEffect(() => {
    if (!supported) return;

    function syncPermission() {
      setPermission(getNotificationPermission());
    }

    syncPermission();
    document.addEventListener('visibilitychange', syncPermission);
    return () => document.removeEventListener('visibilitychange', syncPermission);
  }, [supported]);

  const setEnabled = useCallback(async (value: boolean): Promise<boolean> => {
    if (!supported) return false;

    if (value) {
      const nextPermission = await requestNotificationPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        writeEnabled(false);
        setEnabledState(false);
        return false;
      }
    }

    writeEnabled(value);
    setEnabledState(value);
    return true;
  }, [supported]);

  return { supported, enabled, permission, setEnabled };
}
