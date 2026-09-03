import { Navigate, Route, Routes } from 'react-router-dom';
import { SEO_GEO_BASE } from '@/apps/seo-geo/constants';
import { PortfolioPage } from '@/apps/seo-geo/pages/PortfolioPage';
import { PropertyPage } from '@/apps/seo-geo/pages/PropertyPage';
import '@/apps/seo-geo/styles/seo-geo.css';

export function SeoGeoApp() {
  return (
    <Routes>
      <Route index element={<PortfolioPage />} />
      <Route path=":propertyId" element={<PropertyPage />} />
      <Route path="*" element={<Navigate to={SEO_GEO_BASE} replace />} />
    </Routes>
  );
}
