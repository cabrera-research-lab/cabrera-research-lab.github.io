import { useEffect, useMemo, useState } from 'react';
import { CharTextarea } from '@/apps/teaming/components/CharTextarea';
import { DailyTeamRating } from '@/apps/teaming/components/DailyTeamRating';
import { Onboarding } from '@/apps/teaming/components/Onboarding';
import { PriorityPanel } from '@/apps/teaming/components/PriorityPanel';
import { StepBanner } from '@/apps/teaming/components/StepBanner';
import { ActivityFeed, type FeedView } from '@/apps/teaming/components/ActivityFeed';
import { useAuth } from '@/shared/auth/AuthContext';
import { renderDeltaText } from '@/apps/teaming/lib/deltaText';
import { useUserSubmitted } from '@/apps/teaming/hooks/useUserSubmitted';
import { buildUpdatePreview, submitUpdate } from '@/apps/teaming/lib/api';
import { getCadence } from '@/apps/teaming/lib/cadenceConfig';
import { isOrgWideFeedCadence } from '@/apps/teaming/lib/periods';
import type { Cadence } from '@/apps/teaming/lib/types';

interface Props {
  cadence: Cadence;
  onPriorityCountChange?: (count: number) => void;
}

export function CadencePanel({ cadence, onPriorityCountChange }: Props) {
  const def = getCadence(cadence);

  if (def.panelMode === 'priorities') {
    return <PriorityPanel cadence={cadence} onCountChange={onPriorityCountChange} />;
  }

  return <StandupPanel cadence={cadence} />;
}

function StandupPanel({ cadence }: { cadence: Cadence }) {
  const { user, profile, team } = useAuth();
  const def = getCadence(cadence);
  const orgWideFeed = isOrgWideFeedCadence(cadence);
  const canSubmit = Boolean(team?.id);
  const feedTeamId = orgWideFeed ? null : team?.id ?? null;

  const [answers, setAnswers] = useState<string[]>(() => def.questions.map(() => ''));
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportKey, setReportKey] = useState(0);
  const [feedView, setFeedView] = useState<FeedView>('current');
  const [step1Expanded, setStep1Expanded] = useState(true);
  const [submittedLocal, setSubmittedLocal] = useState(false);
  const showInputs = feedView === 'current';

  const displayName = profile?.display_name?.trim() || 'Your Name';

  useEffect(() => {
    const d = getCadence(cadence);
    setAnswers(d.questions.map(() => ''));
    setStatus('');
    setStep1Expanded(true);
    setSubmittedLocal(false);
  }, [cadence]);

  const copyText = useMemo(
    () =>
      buildUpdatePreview({
        cadenceTitle: def.previewTitle,
        name: displayName,
        date: new Date().toLocaleDateString(),
        questionsIntro: def.questionsIntro,
        questions: def.questions,
        answers,
      }),
    [def, displayName, answers],
  );

  const userSubmitted = useUserSubmitted(
    user?.id,
    team?.id,
    cadence,
    reportKey,
    showInputs && canSubmit,
  );

  useEffect(() => {
    if (!userSubmitted.loading && userSubmitted.submitted) {
      setStep1Expanded(false);
      setSubmittedLocal(true);
    }
  }, [userSubmitted.loading, userSubmitted.submitted]);

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
      setStatus('');
      setStep1Expanded(false);
      setSubmittedLocal(true);
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

  const reportPill = orgWideFeed ? 'all teams · everyone' : 'cross-team discussion';
  const done = (userSubmitted.submitted || submittedLocal) && !step1Expanded;
  const showStep1Form =
    !userSubmitted.loading && (step1Expanded || !userSubmitted.submitted);

  return (
    <div className="cadence-panel">
      {!canSubmit && <Onboarding />}

      {showInputs && canSubmit ? (
        <div className="step">
          <div className="step-head">
            <div className="step-sub">
              {done ? 'Submitted — you can edit your report anytime.' : def.step1Sub}
            </div>
          </div>
          <div className="card">
            {done ? (
              <div className="done-banner">
                <div className="done-l">
                  <span className="done-check">✓</span>
                  Your daily update is in the report
                </div>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setStep1Expanded(true)}
                >
                  Edit
                </button>
              </div>
            ) : null}

            {showStep1Form && (
              <>
                <section className="form" id="daily-form">
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
                    ⧉
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
              </>
            )}
          </div>
        </div>
      ) : showInputs ? (
        <div className="card mini" style={{ marginBottom: 10 }}>
          Create or join a team above to submit {cadence} updates.
        </div>
      ) : null}

      <div className="section-title">
        <h2>{renderDeltaText(orgWideFeed ? 'TE∆M ACTIVITY' : 'TE∆MING REPORT')}</h2>
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

      {cadence === 'daily' && def.step3Label && def.step3Sub && showInputs && (
        <div className="card">
          <StepBanner label={def.step3Label} sub={def.step3Sub} />
          <DailyTeamRating
            teamId={feedTeamId}
            refreshKey={reportKey}
            orgWide={orgWideFeed}
          />
        </div>
      )}
    </div>
  );
}
