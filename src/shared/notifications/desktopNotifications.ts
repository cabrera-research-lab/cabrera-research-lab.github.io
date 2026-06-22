const APP_TITLE = 'STSI GO∆TNET';

export interface DesktopNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

function notificationIconUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '';
  return `${base}/favicon.svg`;
}

export function showDesktopNotification(
  payload: DesktopNotificationPayload,
  onNavigate?: (url: string) => void,
): void {
  if (!isDesktopNotificationSupported() || Notification.permission !== 'granted') return;

  const notification = new Notification(payload.title || APP_TITLE, {
    body: payload.body,
    tag: payload.tag,
    icon: notificationIconUrl(),
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    if (payload.url) onNavigate?.(payload.url);
  };
}
