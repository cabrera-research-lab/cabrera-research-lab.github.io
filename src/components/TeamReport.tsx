import { useCallback, useEffect, useState } from 'react';
import { getCadence } from '@/lib/cadenceConfig';
import { DeltaText } from '@/lib/deltaText';
import {
  addComment,
  fetchCommentsForUpdates,
  fetchUpdates,
} from '@/lib/api';
import { formatPeriodLabel } from '@/lib/periods';
import { requireSupabase } from '@/lib/supabase';
import type { Cadence, UpdateComment, UpdateRow } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { CommentThread } from './CommentThread';

interface Props {
  cadence: Cadence;
  teamId: string | null;
  refreshKey: number;
  orgWide?: boolean;
  periodStart?: string;
  archive?: boolean;
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
  const showThreads = def.showResponseThreads !== false;
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, UpdateComment[]>>({});
  const [loading, setLoading] = useState(true);
  const canComment = showThreads && Boolean(user && !archive);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchUpdates(teamId, cadence, periodStart);
      setUpdates(rows);
      if (showThreads) {
        const ids = rows.map((r) => r.id);
        setCommentsMap(await fetchCommentsForUpdates(ids));
      } else {
        setCommentsMap({});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [teamId, cadence, periodStart, showThreads]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const sb = requireSupabase();
    const channelName = teamId ? `team-${teamId}-${cadence}` : `feed-${cadence}`;
    const updatesFilter = teamId ? { filter: `team_id=eq.${teamId}` } : {};
    let channel = sb.channel(channelName).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'updates', ...updatesFilter },
      () => load(),
    );
    if (showThreads) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'update_comments' },
        () => load(),
      );
    }
    channel.subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [teamId, cadence, load, showThreads]);

  async function handleComment(updateId: string, body: string) {
    if (!user) throw new Error('Sign in to reply.');
    await addComment(updateId, body);
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

  if (def.groupReportByQuestion) {
    const lastQuestionIndex = def.questions.length - 1;

    return (
      <>
        {def.questions.map((question, qIdx) => (
          <div key={qIdx} className="question-report">
            <div className="question-title">
              {qIdx + 1}. {question}
            </div>
            <div className="small">{def.reportLabels[qIdx] ?? 'Update'}</div>
            {updates.map((r) => {
              const comments = commentsMap[r.id] ?? [];
              const name = r.profiles?.display_name ?? 'Member';
              const teamName = r.teams?.name ?? '';
              const date = new Date(r.created_at).toLocaleDateString();
              const answers = Array.isArray(r.answers) ? r.answers : [];
              const text = answers[qIdx] ?? '—';

              return (
                <div key={r.id} className="answer-card">
                  <div>
                    <span className="answer-name">
                      <DeltaText>{name}</DeltaText>
                    </span>
                    <span className="meta">
                      {orgWide && teamName ? (
                        <>
                          {' · '}
                          <DeltaText>{teamName}</DeltaText>
                        </>
                      ) : null}
                      {' · '}
                      {date}
                    </span>
                  </div>
                  <div className="text">
                    <DeltaText>{text || '—'}</DeltaText>
                  </div>
                  {showThreads && qIdx === lastQuestionIndex && (
                    <CommentThread
                      comments={comments}
                      onSend={canComment ? (body) => handleComment(r.id, body) : undefined}
                      readOnly={archive}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {updates.map((r) => {
        const comments = commentsMap[r.id] ?? [];
        const name = r.profiles?.display_name ?? 'Member';
        const teamName = r.teams?.name ?? '';
        const date = new Date(r.created_at).toLocaleDateString();
        const answers = Array.isArray(r.answers) ? r.answers : [];

        return (
          <div key={r.id} className="report">
            <div className="report-top">
              <div>
                <div className="name">
                  <DeltaText>{name}</DeltaText>
                </div>
                <div className="meta">
                  {teamName ? (
                    <>
                      <DeltaText>{teamName}</DeltaText>
                      {' · '}
                    </>
                  ) : null}
                  {date}
                </div>
              </div>
              <div className="badge">{r.cadence.toUpperCase()}</div>
            </div>
            {answers.map((text, i) => (
              <div key={i} className="part">
                <div className="small">{def.reportLabels[i] ?? 'Update'}</div>
                <div className="text">
                  <DeltaText>{text || '—'}</DeltaText>
                </div>
              </div>
            ))}
            {showThreads && (
              <CommentThread
                comments={comments}
                onSend={canComment ? (body) => handleComment(r.id, body) : undefined}
                readOnly={archive}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
