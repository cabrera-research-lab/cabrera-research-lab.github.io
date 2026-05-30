import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPassword, signUpWithPassword } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';

type AuthMode = 'signin' | 'signup';

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signin');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'signin') {
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

  return (
    <div className="auth-page">
      <div className="kicker">TE∆MING SYSTEM</div>
      <h1>TE∆M</h1>
      <p className="mini">
        {mode === 'signin'
          ? 'Sign in with your email and password.'
          : 'Create an account to submit updates and view team reports.'}
      </p>
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
        <button type="submit" className="btn primary" style={{ marginTop: 12, width: '100%' }} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}
      </form>
      <p className="mini" style={{ marginTop: 16, textAlign: 'center' }}>
        {mode === 'signin' ? (
          <>
            New here?{' '}
            <button
              type="button"
              className="sign-out"
              onClick={() => {
                setMode('signup');
                setError('');
                setMessage('');
              }}
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="sign-out"
              onClick={() => {
                setMode('signin');
                setError('');
                setMessage('');
              }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
