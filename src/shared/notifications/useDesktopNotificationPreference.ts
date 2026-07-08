import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPermission,
  isDesktopNotificationSupported,
  requestNotificationPermission,
} from '@/shared/notifications/desktopNotifications';

const STORAGE_KEY = 'goatnet.desktopNotifications';

type EnabledListener = (enabled: boolean) => void;
const enabledListeners = new Set<EnabledListener>();

function notifyEnabledListeners(enabled: boolean): void {
  for (const listener of enabledListeners) listener(enabled);
}

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

    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setEnabledState(readEnabled());
    }

    function onEnabledChange(enabled: boolean) {
      setEnabledState(enabled);
    }

    syncPermission();
    enabledListeners.add(onEnabledChange);
    document.addEventListener('visibilitychange', syncPermission);
    window.addEventListener('storage', onStorage);
    return () => {
      enabledListeners.delete(onEnabledChange);
      document.removeEventListener('visibilitychange', syncPermission);
      window.removeEventListener('storage', onStorage);
    };
  }, [supported]);

  const setEnabled = useCallback(async (value: boolean): Promise<boolean> => {
    if (!supported) return false;

    if (value) {
      const nextPermission = await requestNotificationPermission();
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        writeEnabled(false);
        setEnabledState(false);
        notifyEnabledListeners(false);
        return false;
      }
    }

    writeEnabled(value);
    setEnabledState(value);
    notifyEnabledListeners(value);
    return true;
  }, [supported]);

  return { supported, enabled, permission, setEnabled };
}
