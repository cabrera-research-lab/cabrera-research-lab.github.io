import { PROPERTY_IDS } from '@/apps/seo-geo/lib/properties';
import type { PropertyId } from '@/apps/seo-geo/lib/types';

export const KEYWORD_DASHBOARD_PROPERTY_IDS: PropertyId[] = [...PROPERTY_IDS];

export function hasKeywordDashboard(propertyId: PropertyId): boolean {
  return KEYWORD_DASHBOARD_PROPERTY_IDS.includes(propertyId);
}

/**
 * Brand queries per property. Generic topic phrases such as "systems thinking"
 * stay non-brand unless the property name itself is that phrase.
 */
const BRAND_QUERY_RE: Record<PropertyId, RegExp> = {
  practice:
    /\b(stsi(?:\.tools)?|systems thinking standards institute|practice\.stsi(?:\.pro)?|professional systems thinker|pst(?:-?sa)?)\b/i,
  'stsi-pro':
    /\b(stsi|systems thinking standards institute|professional systems thinker|pst(?:-?sa)?)\b/i,
  camp: /\b(stsi|systems thinking standards institute|c∆mp|camp\.stsi(?:\.pro)?)\b/i,
  jost: /\b(jost(?:\.science)?|journal of systems thinking)\b/i,
  cabreralab: /\b(cabrera(?:lab)?(?:\.science)?|cabrera research lab)\b/i,
  evidence: /\b(cabrera(?:lab)?(?:\.science)?|cabrera research lab|evidence\.cabreralab)\b/i,
};

export function isBrandQuery(query: string, propertyId: PropertyId): boolean {
  return BRAND_QUERY_RE[propertyId].test(query);
}
