import { Navigate, Route } from 'react-router-dom';
import { MISSION_MOMENTS_BASE } from '@/apps/mission-moments/constants';
import { MissionMomentsApp } from '@/apps/mission-moments/MissionMomentsApp';

export const missionMomentsRoutes = (
  <>
    <Route path={`${MISSION_MOMENTS_BASE}/*`} element={<MissionMomentsApp />} />
    <Route path="/b2b-qc/*" element={<Navigate to={MISSION_MOMENTS_BASE} replace />} />
  </>
);
