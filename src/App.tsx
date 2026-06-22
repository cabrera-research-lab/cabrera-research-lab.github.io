import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/shared/auth/AuthContext';
import { AuthPage } from '@/shared/auth/pages/AuthPage';
import { ResetPasswordPage } from '@/shared/auth/pages/ResetPasswordPage';
import { ActivityNotificationListener } from '@/shared/notifications/ActivityNotificationListener';
import { SiteNav } from '@/shared/navigation/SiteNav';
import { missionMomentsRoutes } from '@/apps/mission-moments/routes';
import { teamingRoutes } from '@/apps/teaming/routes';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {missionMomentsRoutes}
      {teamingRoutes}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <AuthProvider>
        <ActivityNotificationListener />
        <SiteNav />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
