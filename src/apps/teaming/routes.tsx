import { Route } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { HomePage } from '@/apps/teaming/pages/HomePage';

export const teamingRoutes = (
  <Route
    path="/"
    element={
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    }
  />
);
