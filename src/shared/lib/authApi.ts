import { requireSupabase } from '@/shared/lib/supabase';

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function getSession() {
  const { data } = await requireSupabase().auth.getSession();
  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  const { error } = await requireSupabase().auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) throw error;
}

export function getAppUrl(path: string): string {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${base}${normalizedPath}`;
}

export async function requestPasswordReset(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  const { error } = await requireSupabase().auth.resetPasswordForEmail(normalized, {
    redirectTo: getAppUrl('/reset-password'),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
