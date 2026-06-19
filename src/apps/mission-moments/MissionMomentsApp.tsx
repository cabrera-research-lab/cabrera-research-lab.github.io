import { Navigate, Route, Routes } from 'react-router-dom';
import { MISSION_MOMENTS_BASE } from '@/apps/mission-moments/constants';
import { CohortListPage } from '@/apps/mission-moments/pages/CohortListPage';
import { CohortQcPage } from '@/apps/mission-moments/pages/CohortQcPage';
import '@/apps/mission-moments/styles/mission-moments.css';

export function MissionMomentsApp() {
  return (
    <Routes>
      <Route index element={<CohortListPage />} />
      <Route path=":cohortId" element={<CohortQcPage />} />
      <Route path="*" element={<Navigate to={MISSION_MOMENTS_BASE} replace />} />
    </Routes>
  );
}
