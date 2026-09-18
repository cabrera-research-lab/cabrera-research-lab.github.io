import type { PropertyId } from '@/apps/seo-geo/lib/types';

export const KEYWORD_DASHBOARD_PROPERTY_IDS: PropertyId[] = ['stsi-pro'];

export function hasKeywordDashboard(propertyId: PropertyId): boolean {
  return KEYWORD_DASHBOARD_PROPERTY_IDS.includes(propertyId);
}

/** Brand queries for stsi.pro. Generic "systems thinking" stays non-brand. */
export const BRAND_QUERY_RE =
  /\b(stsi|systems thinking standards institute|professional systems thinker|pst(?:-?sa)?)\b/i;

export function isBrandQuery(query: string): boolean {
  return BRAND_QUERY_RE.test(query);
}
