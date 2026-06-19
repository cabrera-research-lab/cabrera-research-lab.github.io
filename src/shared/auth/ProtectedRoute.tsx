import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="app mini">Loading…</div>;
  if (!isSupabaseConfigured) return <>{children}</>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
