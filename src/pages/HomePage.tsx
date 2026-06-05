import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CadenceTabs } from '@/components/CadenceTabs';
import { CharTextarea } from '@/components/CharTextarea';
import { DailyTeamRating } from '@/components/DailyTeamRating';
import { Onboarding } from '@/components/Onboarding';
import { PriorityStep2 } from '@/components/PriorityStep2';
import { StepBanner } from '@/components/StepBanner';
import { TargetsCard } from '@/components/TargetsCard';
import { ActivityFeed, type FeedView } from '@/components/ActivityFeed';
import { useAuth } from '@/context/AuthContext';
import { useDailyRatingGate } from '@/hooks/useDailyRatingGate';
import {
  buildUpdatePreview,
  fetchOrgWeeklyPriorities,
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
  const [targetsText, setTargetsText] = useState(def.targetsEmpty ?? '');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportKey, setReportKey] = useState(0);
  const [priorityKey, setPriorityKey] = useState(0);
  const [feedView, setFeedView] = useState<FeedView>('current');
  const showInputs = feedView === 'current';

  const displayName = profile?.display_name?.trim() || 'Your Name';

  useEffect(() => {
    const d = getCadence(cadence);
    setAnswers(d.questions.map(() => ''));
    setTargetsText(d.targetsEmpty ?? '');
    setStatus('');
  }, [cadence]);

  const loadParentTargets = useCallback(async () => {
    const parent = cadenceToPriorityParent(cadence);
    if (!parent || !team) return;
    const d = getCadence(cadence);
    try {
      const items =
        parent === 'weekly'
          ? await fetchOrgWeeklyPriorities(team.id)
          : (await fetchPrioritySet(team.id, parent))?.items ?? [];
      setTargetsText(formatTargetsText(items, d.targetsEmpty ?? 'No goals yet.'));
    } catch {
      setTargetsText(d.targetsEmpty ?? '');
    }
  }, [cadence, team]);

  useEffect(() => {
    loadParentTargets();
  }, [loadParentTargets, priorityKey]);

  const copyText = useMemo(
    () =>
      buildUpdatePreview({
        cadenceTitle: def.previewTitle,
        name: displayName,
        date: new Date().toLocaleDateString(),
        questions: def.questions,
        answers,
      }),
    [def, displayName, answers],
  );

  const dailyRatingGate = useDailyRatingGate(
    reportKey,
    cadence === 'daily' && showInputs,
  );

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
        selfMissionScore: null,
      });
      setStatus('Submitted to report.');
      setReportKey((k) => k + 1);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setStatus('Copied update.');
    } catch {
      setStatus('Copy failed.');
    }
  }

  async function handleSignOut() {
    await signOut();
    await refresh();
  }

  const reportPill = orgWideFeed ? 'all teams · everyone' : 'cross-team discussion';

  return (
    <div className="app">
      <div className="kicker">TE∆MING SYSTEM</div>
      <h1>Build experiences people rave about and refer.</h1>
      <div className="mini">
        Communication. Weekly priorities. Monthly systems. Quarterly roadmap.
      </div>
      <p className="mini">
        Signed in as <strong>{displayName}</strong>
        {team ? (
          <>
            {' '}
            · Team: <strong>{team.name}</strong>
          </>
        ) : null}
        <button type="button" className="sign-out" onClick={handleSignOut}>
          Sign out
        </button>
      </p>

      {!canSubmit && <Onboarding />}

      <CadenceTabs active={cadence} onChange={setCadence} />

      {showInputs && canSubmit ? (
        <div className="card">
          <section className="form">
            <StepBanner label={def.step1Label} sub={def.step1Sub} />
            <h2>{def.formTitle}</h2>
            <div className="sub">{def.subtitle}</div>
            {def.targetsLabel && (
              <TargetsCard
                label={def.targetsLabel}
                text={targetsText}
                empty={def.targetsEmpty}
              />
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
          </section>

          <div className="actions">
            <button
              type="button"
              className="btn secondary"
              onClick={handleCopy}
              title="Copy update"
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
        </div>
      ) : showInputs ? (
        <div className="card mini" style={{ marginBottom: 10 }}>
          Create or join a team above to submit {cadence} updates. Daily and weekly activity below
          is visible to everyone.
        </div>
      ) : null}

      <StepBanner label={def.step2Label} sub={def.step2Sub} />
      <div className="section-title">
        <h2>{orgWideFeed ? 'TE∆M ACTIVITY' : 'TE∆MING REPORT'}</h2>
        <div className="pill">{reportPill}</div>
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

      {cadence === 'daily' && def.step3Label && def.step3Sub && showInputs && (
        <div className="card">
          <StepBanner label={def.step3Label} sub={def.step3Sub} />
          {dailyRatingGate.loading && !dailyRatingGate.open ? (
            <div className="mini">Checking standup status…</div>
          ) : dailyRatingGate.open ? (
            <DailyTeamRating
              teamId={feedTeamId}
              refreshKey={reportKey}
              orgWide={orgWideFeed}
            />
          ) : (
            <div className="mini">
              {dailyRatingGate.pending.length > 0 && (
                <>
                  {' '}
                  Still waiting on:{' '}
                  <strong>{dailyRatingGate.pending.map((u) => `${u}`).join(', ')}</strong>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
