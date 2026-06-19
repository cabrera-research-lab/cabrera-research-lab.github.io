import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updatePassword } from '@/shared/lib/authApi';
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { renderDeltaText } from '@/apps/teaming/lib/deltaText';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-page">
        <h1>{renderDeltaText('TE∆M')}</h1>
        <p className="auth-error">
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env</code> (see{' '}
          <code>.env.example</code>).
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="auth-page">
        <p className="mini">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-page">
        <div className="kicker">{renderDeltaText('TE∆MING SYSTEM')}</div>
        <h1>{renderDeltaText('TE∆M')}</h1>
        <p className="auth-error">This reset link is invalid or has expired.</p>
        <p className="mini" style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/login?forgot=1">Request a new reset link</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="kicker">{renderDeltaText('TE∆MING SYSTEM')}</div>
      <h1>{renderDeltaText('TE∆M')}</h1>
      <p className="mini">Choose a new password for your account.</p>
      <form onSubmit={handleSubmit} className="card" style={{ marginTop: 20 }}>
        <label>New password</label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          minLength={6}
        />
        <label style={{ marginTop: 12 }}>Confirm password</label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter your password"
          minLength={6}
        />
        <button type="submit" className="btn primary" style={{ marginTop: 12, width: '100%' }} disabled={busy}>
          {busy ? 'Please wait…' : 'Update password'}
        </button>
        {error && <p className="auth-error">{error}</p>}
      </form>
    </div>
  );
}
