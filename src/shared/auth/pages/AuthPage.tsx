import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requestPasswordReset, signInWithPassword } from '@/shared/lib/authApi';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { renderDeltaText } from '@/apps/teaming/lib/deltaText';

type AuthMode = 'signin' | 'forgot';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(searchParams.get('forgot') === '1' ? 'forgot' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
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

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setMessage('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email);
        setMessage('Check your email for a link to reset your password.');
      } else {
        await signInWithPassword(email, password);
        const next = searchParams.get('next');
        const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
        navigate(safeNext, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  const subtitle =
    mode === 'signin'
      ? 'Sign in with your email and password.'
      : 'Enter your email and we will send you a link to reset your password.';

  const submitLabel = mode === 'signin' ? 'Sign in' : 'Send reset link';

  return (
    <div className="auth-page">
      <div className="kicker">{renderDeltaText('TE∆MING SYSTEM')}</div>
      <h1>{renderDeltaText('TE∆M')}</h1>
      <p className="mini">{subtitle}</p>
      <form onSubmit={handleSubmit} className="card" style={{ marginTop: 20 }}>
        <label>Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
        {mode !== 'forgot' && (
          <>
            <label style={{ marginTop: 12 }}>Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
          </>
        )}
        <button type="submit" className="btn primary" style={{ marginTop: 12, width: '100%' }} disabled={busy}>
          {busy ? 'Please wait…' : submitLabel}
        </button>
        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}
      </form>
      <p className="mini" style={{ marginTop: 16, textAlign: 'center' }}>
        {mode === 'signin' && (
          <button type="button" className="sign-out" onClick={() => switchMode('forgot')}>
            Forgot password?
          </button>
        )}
        {mode === 'forgot' && (
          <>
            Remember your password?{' '}
            <button type="button" className="sign-out" onClick={() => switchMode('signin')}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
