import { useCallback, useEffect, useMemo, useState } from 'react';
import { RatingStars } from '@/apps/teaming/components/RatingStars';
import { AnswerBody } from '@/apps/teaming/components/AnswerBody';
import { Onboarding } from '@/apps/teaming/components/Onboarding';
import { fetchUpdates, submitUpdate } from '@/apps/teaming/lib/api';
import { weeklyPeriodStart } from '@/apps/teaming/lib/periods';
import type { UpdateRow } from '@/apps/teaming/lib/types';
import { useAuth } from '@/shared/auth/AuthContext';
import { requireSupabase } from '@/shared/lib/supabase';

/** Weekly updates with this marker are mission-alignment ratings, not showcase demos. */
export const MISSION_RATING_MARKER = '__mission_rating__';

function isMissionRating(row: UpdateRow): boolean {
  return (row.answers[0] ?? '') === MISSION_RATING_MARKER;
}

function isShowcaseEntry(row: UpdateRow): boolean {
  if (isMissionRating(row)) return false;
  return Boolean((row.answers[0] ?? '').trim() || (row.answers[1] ?? '').trim());
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export function ShowcasePanel() {
  const { user, team } = useAuth();
  const canSubmit = Boolean(user && team?.id);
  const [show, setShow] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<UpdateRow[]>([]);
  const [ratings, setRatings] = useState<UpdateRow[]>([]);
  const [missionStars, setMissionStars] = useState(0);
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(() => weeklyPeriodStart(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchUpdates(null, 'weekly', weekStart);
      setEntries(rows.filter(isShowcaseEntry));
      const ratingRows = rows.filter(isMissionRating);
      setRatings(ratingRows);
      const mine = ratingRows.find((r) => r.user_id === user?.id);
      const score = Number(mine?.answers[1] ?? 0);
      setMissionStars(Number.isFinite(score) ? Math.max(0, Math.min(5, score)) : 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [weekStart, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sb = requireSupabase();
    const channel = sb
      .channel('showcase-weekly')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'updates' }, () => load())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [load]);

  const teamAvg = useMemo(() => {
    const latest = new Map<string, number>();
    for (const r of ratings) {
      if (latest.has(r.user_id)) continue;
      const n = Number(r.answers[1]);
      if (Number.isFinite(n) && n > 0) latest.set(r.user_id, n);
    }
    const scores = [...latest.values()];
    if (!scores.length) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, [ratings]);

  const raterCount = useMemo(() => {
    const users = new Set(ratings.map((r) => r.user_id));
    return users.size;
  }, [ratings]);

  async function handleAdd() {
    if (!user || !team) return;
    const s = show.trim();
    const n = notes.trim();
    if (!s && !n) return;
    setSubmitting(true);
    setStatus('');
    try {
      await submitUpdate({
        teamId: team.id,
        userId: user.id,
        cadence: 'weekly',
        answers: [s || '—', n || '—'],
        selfMissionScore: null,
      });
      setShow('');
      setNotes('');
      setStatus('Added to the showcase.');
      window.setTimeout(() => setStatus(''), 2200);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Could not add');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMissionRate(stars: number) {
    if (!user || !team) return;
    setMissionStars(stars);
    try {
      await submitUpdate({
        teamId: team.id,
        userId: user.id,
        cadence: 'weekly',
        answers: [MISSION_RATING_MARKER, String(stars)],
        selfMissionScore: null,
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="showcase-panel">
      {!canSubmit && <Onboarding />}

      <div className="step">
        <div className="step-head">
          <div className="step-sub">Show anything from the week. Add notes for the team.</div>
        </div>
        <div className="card">
          <div className="q" style={{ marginTop: 2 }}>
            What do you want to show?
          </div>
          <textarea
            value={show}
            onChange={(e) => setShow(e.target.value)}
            placeholder="A demo, a win, a rough draft, a lesson — anything worth putting in front of the team."
            disabled={!canSubmit}
          />
          <div className="q">Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Context, links, what you'd like feedback on…"
            style={{ minHeight: 70 }}
            disabled={!canSubmit}
          />
          <div className="actions">
            <button type="button" className="btn secondary" title="Attach" disabled>
              ＋
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleAdd}
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Adding…' : 'Add to showcase'}
            </button>
          </div>
          {status ? <div className="status-msg">{status}</div> : null}
        </div>
      </div>

      <div className="step">
        <div className="step-head">
          <div>
            <div className="step-title">Mission Rating</div>
            <div className="step-sub">
              Rate the week&apos;s alignment to the Mission. Happens Fridays at showcase.
            </div>
          </div>
        </div>
        <div className="card">
          <div className="sc-rate-row">
            <span className="entry-name">This week&apos;s Mission alignment</span>
            <RatingStars
              average={missionStars}
              onRate={canSubmit ? handleMissionRate : undefined}
              readOnly={!canSubmit}
            />
          </div>
          <div className="sc-rate-row">
            <span className="sc-rate-avg">team avg</span>
            <span className="sc-rate-avg">
              {teamAvg > 0 ? `${teamAvg.toFixed(1)} / 5` : '—'}
            </span>
          </div>
          <div className="mmmmm-note">
            {raterCount} rater{raterCount === 1 ? '' : 's'} · rated every Friday
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>This week&apos;s Showcase</h2>
        <div className="pill">all teams · everyone</div>
      </div>

      {loading && <div className="mini">Loading showcase…</div>}
      {!loading && entries.length === 0 && (
        <div className="card mini">No showcase entries yet this week.</div>
      )}

      {entries.map((e) => (
        <div key={e.id} className="entry" style={{ borderColor: 'var(--delta)' }}>
          <div className="entry-top">
            <span className="entry-name">{e.profiles?.display_name ?? 'Member'}</span>
            <span className="entry-when">{formatWhen(e.created_at)}</span>
          </div>
          {(e.answers[0] ?? '').trim() && (e.answers[0] ?? '') !== '—' ? (
            <div className="field">
              <div className="field-l">Showing</div>
              <div className="field-t">
                <AnswerBody text={e.answers[0]} />
              </div>
            </div>
          ) : null}
          {(e.answers[1] ?? '').trim() && (e.answers[1] ?? '') !== '—' ? (
            <div className="field">
              <div className="field-l">Notes</div>
              <div className="field-t">
                <AnswerBody text={e.answers[1]} />
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
