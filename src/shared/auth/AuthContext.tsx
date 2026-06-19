import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getProfile, getTeam } from '@/apps/teaming/lib/api';
import { isSupabaseConfigured, supabase } from '@/shared/lib/supabase';
import type { Profile, Team } from '@/apps/teaming/lib/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  team: Team | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const p = await getProfile(userId);
    setProfile(p);
    if (p?.default_team_id) {
      const t = await getTeam(p.default_team_id);
      setTeam(t);
    } else {
      setTeam(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase || !session?.user) return;
    await loadProfile(session.user.id);
  }, [session?.user, loadProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setTeam(null);
      return;
    }
    loadProfile(session.user.id).catch(console.error);
  }, [session?.user?.id, loadProfile]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      team,
      loading,
      refresh,
    }),
    [session, profile, team, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
