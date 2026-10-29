import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QuestionReview } from '@/apps/tq-enhancement/components/QuestionReview';
import { TqHeader } from '@/apps/tq-enhancement/components/TqHeader';
import { tqLoginPath } from '@/apps/tq-enhancement/constants';
import {
  deleteAddedVariant,
  isTqReviewer,
  listOwnAdded,
  listOwnFeedback,
  saveAddedVariant,
  saveFeedback,
} from '@/apps/tq-enhancement/lib/api';
import { TQ_FILTERS, TQ_ITEMS } from '@/apps/tq-enhancement/lib/bank';
import {
  EMPTY_WORK,
  type AddedVariant,
  type QuestionWork,
  type VariantNote,
} from '@/apps/tq-enhancement/lib/types';
import { useAuth } from '@/shared/auth/AuthContext';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import '@/apps/tq-enhancement/styles/tq-enhancement.css';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function blankAdded(order: number): AddedVariant {
  const item = TQ_ITEMS.find((entry) => entry.order === order);
  const count = item?.variants[0]?.choices.length ?? 0;
  return {
    id: crypto.randomUUID(),
    stem: '',
    choices: Array.from({ length: count }, () => ''),
    figure: '',
    isGood: null,
    comment: '',
    persisted: false,
  };
}

function hasAddedContent(variant: AddedVariant): boolean {
  return (
    variant.isGood !== null ||
    variant.stem.trim().length > 0 ||
    variant.figure.trim().length > 0 ||
    variant.comment.trim().length > 0 ||
    variant.choices.some((choice) => choice.trim().length > 0)
  );
}

export function ReviewPage() {
  const { session, loading: authLoading } = useAuth();
  const [work, setWork] = useState<Record<number, QuestionWork>>({});
  const [status, setStatus] = useState<Record<number, SaveState>>({});
  const [filter, setFilter] = useState('all');
  const [reviewer, setReviewer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<Record<string, number>>({});
  const removed = useRef(new Set<string>());

  const userId = session?.user?.id;
  const reviewReady = Boolean(userId) && loadedUserId === userId;

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setWork({});
      setReviewer(false);
      setLoadedUserId(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [feedback, added, isReviewer] = await Promise.all([
        listOwnFeedback(userId),
        listOwnAdded(userId),
        isTqReviewer(userId),
      ]);
      const next: Record<number, QuestionWork> = {};
      const ensure = (order: number) => {
        next[order] ??= { feedback: {}, added: [] };
        return next[order];
      };
      for (const row of feedback) {
        ensure(row.question_order).feedback[row.variant_key] = {
          isGood: row.is_good,
          comment: row.comment ?? '',
        };
      }
      for (const row of added) {
        ensure(row.question_order).added.push({
          id: row.id,
          stem: row.stem ?? '',
          choices: row.choices ?? [],
          figure: row.figure ?? '',
          isGood: row.is_good,
          comment: row.comment ?? '',
          persisted: true,
        });
      }
      setWork(next);
      setReviewer(isReviewer);
      setLoadedUserId(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your copy');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (authLoading) return;
    load().catch(console.error);
  }, [authLoading, load]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of Object.values(pending)) window.clearTimeout(timer);
    };
  }, []);

  const mark = useCallback((order: number, next: SaveState) => {
    setStatus((current) => ({ ...current, [order]: next }));
  }, []);

  const persistFeedback = useCallback(
    async (order: number, variantKey: string, note: VariantNote) => {
      if (!session?.user) return;
      mark(order, 'saving');
      try {
        await saveFeedback(session.user.id, order, variantKey, note);
        mark(order, 'saved');
      } catch (err) {
        mark(order, 'error');
        setError(err instanceof Error ? err.message : 'Could not save');
      }
    },
    [mark, session?.user],
  );

  const persistAdded = useCallback(
    async (order: number, variant: AddedVariant) => {
      if (!session?.user || removed.current.has(variant.id)) return;
      if (!hasAddedContent(variant)) return;
      mark(order, 'saving');
      try {
        await saveAddedVariant(session.user.id, order, variant);
        setWork((current) => {
          const entry = current[order] ?? EMPTY_WORK;
          return {
            ...current,
            [order]: {
              ...entry,
              added: entry.added.map((item) => (item.id === variant.id ? { ...item, persisted: true } : item)),
            },
          };
        });
        mark(order, 'saved');
      } catch (err) {
        mark(order, 'error');
        setError(err instanceof Error ? err.message : 'Could not save');
      }
    },
    [mark, session?.user],
  );

  const schedule = useCallback((key: string, run: () => void, immediate = false) => {
    window.clearTimeout(timers.current[key]);
    if (immediate) {
      run();
      return;
    }
    timers.current[key] = window.setTimeout(run, 600);
  }, []);

  const onFeedback = useCallback(
    (order: number, variantKey: string, note: VariantNote, immediate = false) => {
      setWork((current) => {
        const entry = current[order] ?? { feedback: {}, added: [] };
        return {
          ...current,
          [order]: { ...entry, feedback: { ...entry.feedback, [variantKey]: note } },
        };
      });
      schedule(`${order}:${variantKey}`, () => {
        persistFeedback(order, variantKey, note).catch(console.error);
      }, immediate);
    },
    [persistFeedback, schedule],
  );

  const onAddedChange = useCallback(
    (order: number, variant: AddedVariant, immediate = false) => {
      setWork((current) => {
        const entry = current[order] ?? { feedback: {}, added: [] };
        return {
          ...current,
          [order]: {
            ...entry,
            added: entry.added.map((item) => (item.id === variant.id ? variant : item)),
          },
        };
      });
      schedule(`${order}:added:${variant.id}`, () => {
        persistAdded(order, variant).catch(console.error);
      }, immediate);
    },
    [persistAdded, schedule],
  );

  const onAdd = useCallback((order: number) => {
    const variant = blankAdded(order);
    setWork((current) => {
      const entry = current[order] ?? { feedback: {}, added: [] };
      return { ...current, [order]: { ...entry, added: [...entry.added, variant] } };
    });
  }, []);

  const onRemove = useCallback(
    (order: number, id: string) => {
      const existing = work[order]?.added.find((item) => item.id === id);
      removed.current.add(id);
      setWork((current) => {
        const entry = current[order] ?? EMPTY_WORK;
        return {
          ...current,
          [order]: { ...entry, added: entry.added.filter((item) => item.id !== id) },
        };
      });
      window.clearTimeout(timers.current[`${order}:added:${id}`]);
      if (!existing || !session?.user || (!existing.persisted && !hasAddedContent(existing))) return;
      mark(order, 'saving');
      deleteAddedVariant(session.user.id, id)
        .then(() => mark(order, 'saved'))
        .catch((err: unknown) => {
          mark(order, 'error');
          setError(err instanceof Error ? err.message : 'Could not remove the variant');
        });
    },
    [mark, session?.user, work],
  );

  const visible = useMemo(
    () => TQ_ITEMS.filter((item) => filter === 'all' || item.group === filter),
    [filter],
  );
  const markedCount = Object.values(work).reduce((sum, entry) => {
    const bank = Object.values(entry.feedback).filter((note) => note.isGood !== null).length;
    const added = entry.added.filter((variant) => variant.isGood !== null).length;
    return sum + bank + added;
  }, 0);
  const addedCount = Object.values(work).reduce((sum, entry) => sum + entry.added.length, 0);

  if (!isSupabaseConfigured) {
    return (
      <div className="tq">
        <TqHeader reviewer={false} />
        <p className="tq-banner">Supabase is not configured for this app.</p>
      </div>
    );
  }

  return (
    <div className="tq">
      <TqHeader reviewer={reviewer} />
      {authLoading || (loading && !reviewReady) ? <p className="tq-banner">Loading your copy…</p> : null}
      {!authLoading && !session ? (
        <section className="tq-card">
          <h2>Sign in to review</h2>
          <p>Each team member validates variants on their own copy, comments on each one, and can add more variants.</p>
          <Link className="tq-signin" to={tqLoginPath()}>
            Sign in
          </Link>
        </section>
      ) : null}
      {error ? <p className="tq-banner bad">{error}</p> : null}
      {session && (reviewReady || !loading) ? (
        <>
          <div className="tq-toolbar">
            <div className="tq-filters" role="group" aria-label="Filter questions">
              {TQ_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filter === item.id ? 'on' : ''}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="tq-progress">
              {markedCount} {markedCount === 1 ? 'variant' : 'variants'} marked. {addedCount} added on your copy.
            </p>
            <label className="tq-jump">
              Jump
              <select
                value=""
                onChange={(event) => {
                  const target = document.getElementById(`q${event.target.value}`);
                  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <option value="">Question…</option>
                {visible.map((item) => (
                  <option key={item.order} value={item.order}>
                    {item.order}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {visible.map((item) => (
            <QuestionReview
              key={item.order}
              item={item}
              work={work[item.order] ?? EMPTY_WORK}
              status={status[item.order] ?? 'idle'}
              onFeedback={(variantKey, note, immediate) => onFeedback(item.order, variantKey, note, immediate)}
              onAddedChange={(variant, immediate) => onAddedChange(item.order, variant, immediate)}
              onAdd={() => onAdd(item.order)}
              onRemove={(id) => onRemove(item.order, id)}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
