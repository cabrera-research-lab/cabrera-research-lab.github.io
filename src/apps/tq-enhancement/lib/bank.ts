import raw from './bank.json';
import partsDrafts from './parts-drafts.json';
import type { TqItem, TqReviewMode, TqVariant } from '@/apps/tq-enhancement/lib/types';

const RECOMMENDATION_ORDERS = new Set([9, 18, 24, 27, 32, 34]);
const PARTS_DRAFTS = partsDrafts as unknown as Record<string, TqVariant[]>;

function withPartsDrafts(order: number, variants: TqVariant[]): TqVariant[] {
  const extra = PARTS_DRAFTS[String(order)];
  if (!extra?.length) return variants;
  return [...variants.filter((variant) => variant.id === 'original'), ...extra];
}

export function reviewMode(order: number): TqReviewMode {
  if (RECOMMENDATION_ORDERS.has(order)) return 'recommend';
  if (order >= 48 && order <= 71) return 'original';
  return 'variants';
}

export const TQ_ITEMS: TqItem[] = (raw as Omit<TqItem, 'mode'>[])
  .filter((item) => item.order > 6)
  .map((item) => {
    const mode = reviewMode(item.order);
    const bankVariants = mode === 'variants' ? item.variants : item.variants.filter((variant) => variant.id === 'original');
    return {
      ...item,
      mode,
      variants: withPartsDrafts(item.order, bankVariants),
    };
  });

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
