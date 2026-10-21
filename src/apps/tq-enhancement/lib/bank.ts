import raw from './bank.json';
import type { TqItem } from '@/apps/tq-enhancement/lib/types';

export const TQ_ITEMS = (raw as TqItem[]).filter((item) => item.order > 6);

export const TQ_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'D', label: 'D' },
  { id: 'S', label: 'S' },
  { id: 'R', label: 'R' },
  { id: 'P', label: 'P' },
  { id: 'M', label: 'M' },
  { id: 'confidence', label: 'Confidence' },
  { id: 'MO', label: 'Motivation' },
  { id: 'FA', label: 'Facilitation' },
];

export function tqAsset(path: string): string {
  if (!path) return '';
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\//, '')}`;
}

export function verdictLabel(isGood: boolean | null): string {
  if (isGood === true) return 'Good';
  if (isGood === false) return 'Not good';
  return 'Not marked';
}
