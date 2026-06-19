import { Navigate, Route, Routes } from 'react-router-dom';
import { CohortListPage } from '@/pages/missionMoments/CohortListPage';
import { CohortQcPage } from '@/pages/missionMoments/CohortQcPage';

export function B2BQcAppletPage() {
  return (
    <Routes>
      <Route index element={<CohortListPage />} />
      <Route path=":cohortId" element={<CohortQcPage />} />
      <Route path="*" element={<Navigate to="/b2b-qc" replace />} />
    </Routes>
  );
}
