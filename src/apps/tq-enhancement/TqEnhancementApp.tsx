import { Navigate, Route, Routes } from 'react-router-dom';
import { TQ_BASE } from '@/apps/tq-enhancement/constants';
import { CopiesPage } from '@/apps/tq-enhancement/pages/CopiesPage';
import { ReviewPage } from '@/apps/tq-enhancement/pages/ReviewPage';
import '@/apps/tq-enhancement/styles/tq-enhancement.css';

export function TqEnhancementApp() {
  return (
    <Routes>
      <Route index element={<ReviewPage />} />
      <Route path="copies" element={<CopiesPage />} />
      <Route path="*" element={<Navigate to={TQ_BASE} replace />} />
    </Routes>
  );
}
