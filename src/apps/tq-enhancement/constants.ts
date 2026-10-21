/** Base path for the TQ enhancement applet. */
export const TQ_BASE = '/tq-enhancement';

export function tqPath(suffix = ''): string {
  if (!suffix || suffix === '/') return TQ_BASE;
  return `${TQ_BASE}/${suffix.replace(/^\//, '')}`;
}

export function tqLoginPath(next = TQ_BASE): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
