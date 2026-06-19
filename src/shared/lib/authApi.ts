import { requireSupabase } from '@/shared/lib/supabase';

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string,
) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const { data, error } = await requireSupabase().auth.signUp({
    email: normalized,
    password,
    options: {
      data: {
        display_name: displayName?.trim() || displayNameFromEmail(normalized),
      },
    },
  });
  if (error) throw error;
  return data;
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
