import { useState } from 'react';
import { createTeam, joinTeamBySlug, updateProfile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export function Onboarding() {
  const { user, profile, refresh } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [teamName, setTeamName] = useState('');
  const [teamSlug, setTeamSlug] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const userId = user.id;

  async function saveName() {
    setError('');
    setBusy(true);
    try {
      await updateProfile(userId, { display_name: displayName.trim() });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    setError('');
    if (!displayName.trim() || !teamName.trim()) {
      setError('Enter your name and team name.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile(userId, { display_name: displayName.trim() });
      await createTeam(teamName.trim(), userId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    setError('');
    if (!displayName.trim() || !teamSlug.trim()) {
      setError('Enter your name and team slug.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile(userId, { display_name: displayName.trim() });
      await joinTeamBySlug(teamSlug.trim(), userId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card onboarding-card">
      <div className="kicker">Welcome</div>
      <h2 style={{ fontSize: 22, margin: '0 0 8px' }}>Set up your profile & team</h2>
      <label>Display name</label>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name"
      />
      <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={saveName} disabled={busy}>
        Save name
      </button>
      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '20px 0' }} />
      <label>Create a new team</label>
      <input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        placeholder="C∆MP, PODC∆ST, Ops..."
      />
      <button type="button" className="btn primary" style={{ marginTop: 8 }} onClick={handleCreate} disabled={busy}>
        Create team
      </button>
      <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '20px 0' }} />
      <label>Or join with team slug</label>
      <input
        value={teamSlug}
        onChange={(e) => setTeamSlug(e.target.value)}
        placeholder="team-slug"
      />
      <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={handleJoin} disabled={busy}>
        Join team
      </button>
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
}
