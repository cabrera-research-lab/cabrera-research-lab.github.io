import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CadenceTabs } from '@/components/CadenceTabs';
import { CharTextarea } from '@/components/CharTextarea';
import { MissionRating } from '@/components/MissionRating';
import { Onboarding } from '@/components/Onboarding';
import { PriorityStep2 } from '@/components/PriorityStep2';
import { TargetsCard } from '@/components/TargetsCard';
import { ActivityFeed, type FeedView } from '@/components/ActivityFeed';
import { AllWeeklyPriorities } from '@/components/AllWeeklyPriorities';
import { useAuth } from '@/context/AuthContext';
import {
  buildUpdatePreview,
  fetchPrioritySet,
  formatTargetsText,
  signOut,
  submitUpdate,
} from '@/lib/api';
import { getCadence } from '@/lib/cadenceConfig';
import { cadenceToPriorityParent, isOrgWideFeedCadence } from '@/lib/periods';
import type { Cadence } from '@/lib/types';

const VALID: Cadence[] = ['daily', 'weekly', 'monthly', 'quarterly'];

function parseCadence(param: string | null): Cadence {
  if (param && VALID.includes(param as Cadence)) return param as Cadence;
  return 'daily';
}

export function HomePage() {
  const { user, profile, team, refresh } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const cadence = parseCadence(searchParams.get('cadence'));
  const def = getCadence(cadence);
  const orgWideFeed = isOrgWideFeedCadence(cadence);
  const canSubmit = Boolean(team?.id);
  const feedTeamId = orgWideFeed ? null : team?.id ?? null;

  const [answers, setAnswers] = useState<string[]>(() => def.questions.map(() => ''));
  const [selfMission, setSelfMission] = useState(0);
  const [targetsText, setTargetsText] = useState(def.targetsEmpty ?? '');
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportKey, setReportKey] = useState(0);
  const [priorityKey, setPriorityKey] = useState(0);
  const [feedView, setFeedView] = useState<FeedView>('current');
  const showInputs = feedView === 'current';

  const displayName = profile?.display_name?.trim() || 'Your Name';
  const teamName = team?.name ?? 'Your Team';

  useEffect(() => {
    const d = getCadence(cadence);
    setAnswers(d.questions.map(() => ''));
    setSelfMission(0);
    setTargetsText(d.targetsEmpty ?? '');
    setStatus('');
  }, [cadence]);

  const loadParentTargets = useCallback(async () => {
    const parent = cadenceToPriorityParent(cadence);
    if (!parent || !team || cadence === 'daily') return;
    const d = getCadence(cadence);
    try {
      const data = await fetchPrioritySet(team.id, parent);
      setTargetsText(
        formatTargetsText(data?.items ?? [], d.targetsEmpty ?? 'No goals yet.'),
      );
    } catch {
      setTargetsText(d.targetsEmpty ?? '');
    }
  }, [cadence, team]);

  useEffect(() => {
    loadParentTargets();
  }, [loadParentTargets, priorityKey]);

  const previewText = useMemo(
    () =>
      buildUpdatePreview({
        cadenceTitle: def.previewTitle,
        name: displayName,
        teamName,
        date: new Date().toLocaleDateString(),
        questions: def.questions,
        answers,
        selfMissionScore: def.showSelfMissionRating ? selfMission : undefined,
      }),
    [def, displayName, teamName, answers, selfMission],
  );

  useEffect(() => {
    setPreview(previewText);
  }, [previewText]);

  function setCadence(c: Cadence) {
    setSearchParams({ cadence: c });
  }

  function setAnswer(i: number, v: string) {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? v : a)));
  }

  async function handleSubmit() {
    if (!user || !team) return;
    setSubmitting(true);
    setStatus('');
    try {
      await submitUpdate({
        teamId: team.id,
        userId: user.id,
        cadence,
        answers: answers.map((a) => a.trim() || '—'),
        selfMissionScore: def.showSelfMissionRating ? selfMission : null,
      });
      setStatus('Update submitted.');
      setReportKey((k) => k + 1);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(preview);
      setStatus('Copied to clipboard.');
    } catch {
      setStatus('Copy failed.');
    }
  }

  async function handleSignOut() {
    await signOut();
    await refresh();
  }

  return (
    <div className="app">
      <div className="kicker">TE∆MING SYSTEM</div>
      <h1>Build experiences people rave about and refer.</h1>
      <div className="mini">
        Daily standup. Weekly learning. Monthly systems. Quarterly roadmap.
      </div>
      <p className="mini">
        Signed in as <strong>{displayName}</strong>
        {team ? (
          <>
            {' '}
            · Ref: <strong>{teamName}</strong>
          </>
        ) : null}
        <button type="button" className="sign-out" onClick={handleSignOut}>
          Sign out
        </button>
      </p>

      {!canSubmit && <Onboarding />}

      <CadenceTabs active={cadence} onChange={setCadence} />

      {cadence === 'daily' && (
        <AllWeeklyPriorities refreshKey={priorityKey} fallbackTeamId={team?.id ?? null} />
      )}

      {showInputs && canSubmit ? (
      <div className="card">
        <section className="form">
          <h2>{def.formTitle}</h2>
          <div className="sub">{def.subtitle}</div>
          {def.targetsLabel && cadence !== 'daily' && (
            <TargetsCard label={def.targetsLabel} text={targetsText} />
          )}
          {def.questions.map((q, i) => (
            <CharTextarea
              key={i}
              index={i}
              question={q}
              value={answers[i] ?? ''}
              onChange={(v) => setAnswer(i, v)}
            />
          ))}
          {def.showSelfMissionRating && (
            <MissionRating score={selfMission} onRate={setSelfMission} />
          )}
        </section>

        <div className="actions">
          <button
            type="button"
            className="btn secondary"
            onClick={handleCopy}
            style={{ maxWidth: 70 }}
            title="Copy preview"
          >
            📋
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : def.submitLabel}
          </button>
        </div>
        {status && <div className="status-msg">{status}</div>}
        <div className="small" style={{ marginTop: 14 }}>
          Submitted Update Preview
        </div>
        <div className="preview">{preview}</div>
      </div>
      ) : showInputs ? (
        <div className="card mini" style={{ marginBottom: 10 }}>
          Create or join a team above to submit {cadence} updates. Daily and weekly activity below
          is visible to everyone.
        </div>
      ) : null}

      <div className="section-title">
        <h2>{orgWideFeed ? 'TE∆M ACTIVITY' : 'TE∆MING REPORT'}</h2>
        <div className="pill">
          {orgWideFeed ? 'all teams · everyone' : 'avg Mission score + response thread'}
        </div>
      </div>
      <ActivityFeed
        cadence={cadence}
        teamId={feedTeamId}
        refreshKey={reportKey}
        orgWide={orgWideFeed}
        view={feedView}
        onViewChange={setFeedView}
      />

      {showInputs && canSubmit && def.showStep2 && (
        <PriorityStep2
          cadence={cadence}
          teamId={team!.id}
          onSaved={() => {
            setPriorityKey((k) => k + 1);
            loadParentTargets();
          }}
        />
      )}

      <div className="rule">
        <strong>Decision rule:</strong> If an action, fix, or roadmap item does not increase the
        probability that people rave and refer, question it.
      </div>
    </div>
  );
}
