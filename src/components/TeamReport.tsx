import { useCallback, useEffect, useState } from 'react';
import { getCadence } from '@/lib/cadenceConfig';
import {
  addComment,
  fetchCommentsForUpdates,
  fetchRatingsForUpdates,
  fetchUpdates,
  rateUpdate,
} from '@/lib/api';
import { formatPeriodLabel } from '@/lib/periods';
import { requireSupabase } from '@/lib/supabase';
import type { Cadence, UpdateComment, UpdateRating, UpdateRow } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { CommentThread } from './CommentThread';
import { RatingStars } from './RatingStars';

interface Props {
  cadence: Cadence;
  teamId: string | null;
  refreshKey: number;
  orgWide?: boolean;
  periodStart?: string;
  archive?: boolean;
}

function avgRatings(ratings: UpdateRating[]): number {
  if (!ratings.length) return 0;
  return ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
}

export function TeamReport({
  cadence,
  teamId,
  refreshKey,
  orgWide = false,
  periodStart,
  archive = false,
}: Props) {
  const { user } = useAuth();
  const def = getCadence(cadence);
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [ratingsMap, setRatingsMap] = useState<Record<string, UpdateRating[]>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, UpdateComment[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchUpdates(teamId, cadence, periodStart);
      setUpdates(rows);
      const ids = rows.map((r) => r.id);
      const [ratings, comments] = await Promise.all([
        fetchRatingsForUpdates(ids),
        fetchCommentsForUpdates(ids),
      ]);
      setRatingsMap(ratings);
      setCommentsMap(comments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [teamId, cadence, periodStart]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const sb = requireSupabase();
    const channelName = teamId ? `team-${teamId}-${cadence}` : `feed-${cadence}`;
    const updatesFilter = teamId ? { filter: `team_id=eq.${teamId}` } : {};
    const channel = sb
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'updates', ...updatesFilter },
        () => load(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'update_comments' }, () =>
        load(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'update_ratings' }, () =>
        load(),
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [teamId, cadence, load]);

  async function handleRate(updateId: string, stars: number) {
    if (!user) return;
    await rateUpdate(updateId, user.id, stars);
    await load();
  }

  async function handleComment(updateId: string, body: string) {
    if (!user) return;
    await addComment(updateId, user.id, body);
    await load();
  }

  if (loading && !updates.length) {
    return <div className="mini">{orgWide ? 'Loading activity…' : 'Loading team report…'}</div>;
  }

  if (!updates.length) {
    const periodLabel = periodStart ? formatPeriodLabel(cadence, periodStart) : '';
    return (
      <div className="mini">
        {archive
          ? `No archived activity for ${periodLabel}.`
          : orgWide
            ? `No activity yet for ${periodLabel}.`
            : `No updates yet for ${periodLabel}. Be the first to submit.`}
      </div>
    );
  }

  const showDailyExtras = cadence === 'daily';

  return (
    <>
      {updates.map((r) => {
        const ratings = ratingsMap[r.id] ?? [];
        const comments = commentsMap[r.id] ?? [];
        const name = r.profiles?.display_name ?? 'Member';
        const teamName = r.teams?.name ?? '';
        const date = new Date(r.created_at).toLocaleDateString();
        const answers = Array.isArray(r.answers) ? r.answers : [];

        return (
          <div key={r.id} className="report">
            <div className="report-top">
              <div>
                <div className="name">{name}</div>
                <div className="meta">
                  {teamName} · {date}
                </div>
              </div>
              <div className="badge">{r.cadence.toUpperCase()}</div>
            </div>
            {answers.map((text, i) => (
              <div key={i} className="part">
                <div className="small">{def.reportLabels[i] ?? 'Update'}</div>
                <div className="text">{text || '—'}</div>
              </div>
            ))}
            {r.self_mission_score != null && r.self_mission_score > 0 && (
              <div className="part">
                <div className="small">Self Mission Rating</div>
                <div className="text">{r.self_mission_score} / 5 Ms</div>
              </div>
            )}
            {showDailyExtras && (
              <>
                <div className="rating-line">
                  <RatingStars
                    average={avgRatings(ratings)}
                    onRate={archive ? undefined : (s) => handleRate(r.id, s)}
                    readOnly={archive}
                  />
                </div>
                <CommentThread
                  comments={comments}
                  onSend={archive ? undefined : (body) => handleComment(r.id, body)}
                  readOnly={archive}
                />
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
