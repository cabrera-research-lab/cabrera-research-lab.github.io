import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TqHeader } from '@/apps/tq-enhancement/components/TqHeader';
import { TQ_BASE, tqLoginPath } from '@/apps/tq-enhancement/constants';
import { isTqReviewer, listAllAdded, listAllFeedback, listTqResponseNames } from '@/apps/tq-enhancement/lib/api';
import { TQ_ITEMS, verdictLabel } from '@/apps/tq-enhancement/lib/bank';
import type { AddedVariantRow, FeedbackRow, TqMemberName, TqVariant } from '@/apps/tq-enhancement/lib/types';
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';

function memberLabel(member: TqMemberName | undefined, userId: string): string {
  const name = member?.display_name?.trim();
  if (name) return name;
  const email = member?.email?.trim();
  if (email) return email.split('@')[0] || email;
  return `Member ${userId.slice(0, 8)}`;
}

function tally(rows: { is_good: boolean | null }[]): string {
  const good = rows.filter((row) => row.is_good === true).length;
  const bad = rows.filter((row) => row.is_good === false).length;
  return `Good ${good} · Not good ${bad}`;
}

export function CopiesPage() {
  const { session, loading: authLoading } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [added, setAdded] = useState<AddedVariantRow[]>([]);
  const [names, setNames] = useState<TqMemberName[]>([]);
  const [reviewer, setReviewer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user || !isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const isReviewer = await isTqReviewer(session.user.id);
      setReviewer(isReviewer);
      if (!isReviewer) {
        setFeedback([]);
        setAdded([]);
        setNames([]);
        return;
      }
      const [feedbackRows, addedRows, members] = await Promise.all([
        listAllFeedback(),
        listAllAdded(),
        listTqResponseNames(),
      ]);
      setFeedback(feedbackRows);
      setAdded(addedRows);
      setNames(members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load copies');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    load().catch(console.error);
  }, [authLoading, load]);

  const nameById = useMemo(() => new Map(names.map((member) => [member.user_id, member])), [names]);

  const questions = useMemo(() => {
    const feedbackByQuestion = new Map<number, FeedbackRow[]>();
    for (const row of feedback) {
      const list = feedbackByQuestion.get(row.question_order) ?? [];
      list.push(row);
      feedbackByQuestion.set(row.question_order, list);
    }
    const addedByQuestion = new Map<number, AddedVariantRow[]>();
    for (const row of added) {
      const list = addedByQuestion.get(row.question_order) ?? [];
      list.push(row);
      addedByQuestion.set(row.question_order, list);
    }
    return TQ_ITEMS.filter(
      (item) => feedbackByQuestion.has(item.order) || addedByQuestion.has(item.order),
    ).map((item) => ({
      item,
      feedback: feedbackByQuestion.get(item.order) ?? [],
      added: addedByQuestion.get(item.order) ?? [],
    }));
  }, [added, feedback]);

  const memberCount = new Set([...feedback.map((row) => row.user_id), ...added.map((row) => row.user_id)]).size;

  return (
    <div className="tq">
      <TqHeader reviewer={reviewer} />
      {authLoading || loading ? <p className="tq-banner">Loading copies…</p> : null}
      {!authLoading && !session ? (
        <section className="tq-card">
          <h2>Sign in</h2>
          <Link className="tq-signin" to={tqLoginPath(`${TQ_BASE}/copies`)}>
            Sign in
          </Link>
        </section>
      ) : null}
      {error ? <p className="tq-banner bad">{error}</p> : null}
      {session && !loading && !reviewer ? (
        <section className="tq-card">
          <h2>Your copy only</h2>
          <p>Each member validates and comments on their own copy. The combined copies are visible to the reviewer account.</p>
          <Link className="tq-signin" to={TQ_BASE}>
            Back to your copy
          </Link>
        </section>
      ) : null}
      {reviewer && !loading ? (
        <>
          <div className="tq-toolbar">
            <p className="tq-progress">
              {memberCount} {memberCount === 1 ? 'member has' : 'members have'} saved something across {questions.length}{' '}
              {questions.length === 1 ? 'question' : 'questions'}.
            </p>
            <button type="button" onClick={() => load().catch(console.error)}>
              Refresh
            </button>
          </div>
          {questions.length === 0 ? <p className="tq-banner">No copies have been saved yet.</p> : null}
          {questions.map(({ item, feedback: notes, added: extras }) => (
            <section key={item.order} className="tq-item" id={`copy-q${item.order}`}>
              <header className="tq-item-head">
                <div>
                  <h2>Question {item.order}</h2>
                  <p className="tq-meta">{item.variants[0]?.stem}</p>
                </div>
              </header>
              {item.variants.map((variant) => (
                <VariantNotes
                  key={variant.id}
                  variant={variant}
                  notes={notes.filter((row) => row.variant_key === variant.id)}
                  nameById={nameById}
                />
              ))}
              {extras.map((row) => {
                const member = nameById.get(row.user_id);
                return (
                  <article key={row.id} className="tq-card">
                    <h3>Added variant · {memberLabel(member, row.user_id)}</h3>
                    {member?.email ? <p className="tq-meta">{member.email}</p> : null}
                    <p className="tq-current">{verdictLabel(row.is_good)}</p>
                    <p className="tq-stem">{row.stem || 'No stem yet'}</p>
                    {row.figure ? <p className="tq-figure-note">{row.figure}</p> : null}
                    {row.choices && row.choices.some((choice) => choice.trim()) ? (
                      <ol className="tq-choices">
                        {row.choices.map((choice, index) => (
                          <li key={`${row.id}-${index}`}>
                            <span className="tq-letter">{String.fromCharCode(97 + index)}</span>
                            <span>{choice}</span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                    {row.comment ? <p className="tq-stem">{row.comment}</p> : <p className="tq-empty">No comment</p>}
                  </article>
                );
              })}
            </section>
          ))}
        </>
      ) : null}
    </div>
  );
}

function VariantNotes({
  variant,
  notes,
  nameById,
}: {
  variant: TqVariant;
  notes: FeedbackRow[];
  nameById: Map<string, TqMemberName>;
}) {
  if (notes.length === 0) return null;
  return (
    <div className="tq-copy-variant">
      <header className="tq-item-head">
        <h3>{variant.label}</h3>
        <p className="tq-current">{tally(notes)}</p>
      </header>
      <div className="tq-copies">
        {notes.map((row) => {
          const member = nameById.get(row.user_id);
          return (
            <article key={`${row.user_id}-${row.variant_key}`} className="tq-card">
              <h3>{memberLabel(member, row.user_id)}</h3>
              {member?.email ? <p className="tq-meta">{member.email}</p> : null}
              <p className="tq-current">{verdictLabel(row.is_good)}</p>
              {row.comment ? <p className="tq-stem">{row.comment}</p> : <p className="tq-empty">No comment</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
