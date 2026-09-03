/** Base path for the SEO & GEO health applet. */
export const SEO_GEO_BASE = '/seo-geo';

export function seoGeoPath(suffix = ''): string {
  if (!suffix || suffix === '/') return SEO_GEO_BASE;
  return `${SEO_GEO_BASE}/${suffix.replace(/^\//, '')}`;
}

export function seoGeoLoginPath(next = SEO_GEO_BASE): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
