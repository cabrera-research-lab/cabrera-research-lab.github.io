import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requestPasswordReset, signInWithPassword, signUpWithPassword } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(searchParams.get('forgot') === '1' ? 'forgot' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-page">
        <h1>TE∆M</h1>
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
      } else if (mode === 'signin') {
        await signInWithPassword(email, password);
        navigate('/', { replace: true });
      } else {
        const { session } = await signUpWithPassword(email, password, displayName);
        if (session) {
          navigate('/', { replace: true });
        } else {
          setMessage(
            'Account created. If email confirmation is enabled in Supabase, confirm your email before signing in.',
          );
          setMode('signin');
        }
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
      : mode === 'signup'
        ? 'Create an account to submit updates and view team reports.'
        : 'Enter your email and we will send you a link to reset your password.';

  const submitLabel =
    mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link';

  return (
    <div className="auth-page">
      <div className="kicker">TE∆MING SYSTEM</div>
      <h1>TE∆M</h1>
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
        {mode === 'signup' && (
          <>
            <label style={{ marginTop: 12 }}>Display name (optional)</label>
            <input
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How your team sees you"
            />
          </>
        )}
        {mode !== 'forgot' && (
          <>
            <label style={{ marginTop: 12 }}>Password</label>
            <input
              type="password"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
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
          <>
            <button type="button" className="sign-out" onClick={() => switchMode('forgot')}>
              Forgot password?
            </button>
            <br />
            New here?{' '}
            <button type="button" className="sign-out" onClick={() => switchMode('signup')}>
              Create an account
            </button>
          </>
        )}
        {mode === 'signup' && (
          <>
            Already have an account?{' '}
            <button type="button" className="sign-out" onClick={() => switchMode('signin')}>
              Sign in
            </button>
          </>
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
