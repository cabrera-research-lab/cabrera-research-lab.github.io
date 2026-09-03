import { Route } from 'react-router-dom';
import { SEO_GEO_BASE } from '@/apps/seo-geo/constants';
import { SeoGeoApp } from '@/apps/seo-geo/SeoGeoApp';

export const seoGeoRoutes = (
  <Route path={`${SEO_GEO_BASE}/*`} element={<SeoGeoApp />} />
);
