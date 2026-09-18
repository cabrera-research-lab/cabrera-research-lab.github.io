import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsiderationPrompts } from '@/apps/teaming/components/ConsiderationPrompts';
import { FeedViewTabs, type FeedView } from '@/apps/teaming/components/FeedViewTabs';
import { Onboarding } from '@/apps/teaming/components/Onboarding';
import { PeriodNavigator } from '@/apps/teaming/components/PeriodNavigator';
import { getCadence, isPriorityCadence } from '@/apps/teaming/lib/cadenceConfig';
import { getConsiderationPrompts } from '@/apps/teaming/lib/orgSettings';
import {
  carryOrgPriorityForward,
  fetchOrgPriorities,
  listOrgPriorityArchivePeriods,
  saveOrgPriorities,
} from '@/apps/teaming/lib/api';
import {
  carryForwardPeriodStart,
  formatPeriodLabel,
  latestArchivePeriodStart,
  periodNoun,
  periodStartForPriority,
  shiftPeriodStart,
} from '@/apps/teaming/lib/periods';
import { ownerOptions } from '@/apps/teaming/lib/teamRoster';
import type { Cadence, PriorityItemInput } from '@/apps/teaming/lib/types';
import { useAuth } from '@/shared/auth/AuthContext';
import { useOrgSettings } from '@/apps/teaming/hooks/useOrgSettings';
import { requireSupabase } from '@/shared/lib/supabase';

type LocalItem = PriorityItemInput & { id: string };

function newId(): string {
  return crypto.randomUUID();
}

function emptyItem(order: number): LocalItem {
  return {
    id: newId(),
    sort_order: order,
    goal: '',
    owner: '',
    metric: '',
    action: '',
    completed: false,
  };
}

function normalizeItems(items: LocalItem[]): LocalItem[] {
  return items.map((item, index) => ({ ...item, sort_order: index }));
}

function toLocalItems(items: PriorityItemInput[]): LocalItem[] {
  return items.map((item, index) => ({
    ...item,
    id: item.id ?? newId(),
    sort_order: index,
    completed: Boolean(item.completed),
  }));
}

function filledCount(items: LocalItem[]): number {
  return items.filter((item) => item.goal.trim()).length;
}

function goalKey(goal: string): string {
  return goal.trim().toLowerCase();
}

function carriedIdsFromDest(localItems: LocalItem[], destItems: PriorityItemInput[]): Set<string> {
  const destGoals = new Set(destItems.map((item) => goalKey(item.goal)).filter(Boolean));
  return new Set(
    localItems
      .filter((item) => {
        const key = goalKey(item.goal);
        return Boolean(key) && destGoals.has(key);
      })
      .map((item) => item.id),
  );
}

/** Keep local edits for dirty rows; adopt remote for everything else. */
function mergeRemoteItems(local: LocalItem[], remote: LocalItem[], dirtyIds: Set<string>): LocalItem[] {
  const localById = new Map(local.map((item) => [item.id, item]));
  const remoteIds = new Set(remote.map((item) => item.id));
  const merged: LocalItem[] = remote.map((item) =>
    dirtyIds.has(item.id) ? (localById.get(item.id) ?? item) : item,
  );

  for (const item of local) {
    if (!remoteIds.has(item.id) && dirtyIds.has(item.id)) {
      merged.push(item);
    }
  }

  return normalizeItems(merged.length ? merged : [emptyItem(0)]);
}

interface Props {
  cadence: Cadence;
  onCountChange?: (count: number) => void;
}

export function PriorityPanel({ cadence, onCountChange }: Props) {
  const { team } = useAuth();
  const { settings } = useOrgSettings();
  const def = getCadence(cadence);
  const priorityCadence = isPriorityCadence(cadence) ? cadence : null;
  const prompts = priorityCadence
    ? settings.prompts[priorityCadence] ?? getConsiderationPrompts(priorityCadence)
    : [];

  const [view, setView] = useState<FeedView>('current');
  const [archivePeriod, setArchivePeriod] = useState(() =>
    priorityCadence ? latestArchivePeriodStart(priorityCadence) : '',
  );
  const [archivePeriods, setArchivePeriods] = useState<string[]>([]);
  const [items, setItems] = useState<LocalItem[]>([emptyItem(0)]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [carriedIds, setCarriedIds] = useState<Set<string>>(new Set());
  const [carryingId, setCarryingId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const destItemsRef = useRef<PriorityItemInput[]>([]);
  const dirtyIdsRef = useRef<Set<string>>(new Set());
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const savingRef = useRef(false);
  const pendingRemoteReloadRef = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  const currentPeriod = priorityCadence ? periodStartForPriority(priorityCadence) : '';
  const latestArchive = priorityCadence ? latestArchivePeriodStart(priorityCadence) : '';
  const activePeriod = view === 'archive' ? archivePeriod : currentPeriod;
  const canEdit = Boolean(team?.id) && view === 'current';
  const canCarry = Boolean(team?.id && priorityCadence);
  const hasGoals = items.some((item) => item.goal.trim());
  const destPeriod =
    priorityCadence && activePeriod
      ? carryForwardPeriodStart(priorityCadence, activePeriod)
      : '';
  const destIsCurrent = Boolean(destPeriod && destPeriod === currentPeriod);
  const carryNoun = priorityCadence ? periodNoun(priorityCadence) : 'week';
  const carryLabel = destIsCurrent
    ? `Carry forward to this ${carryNoun}`
    : `Carry forward to next ${carryNoun}`;

  const refreshArchivePeriods = useCallback(async () => {
    if (!priorityCadence) return [] as string[];
    try {
      const periods = await listOrgPriorityArchivePeriods(priorityCadence);
      setArchivePeriods(periods);
      return periods;
    } catch {
      setArchivePeriods([]);
      return [] as string[];
    }
  }, [priorityCadence]);

  useEffect(() => {
    if (!priorityCadence) return;
    setView('current');
    setArchivePeriod(latestArchivePeriodStart(priorityCadence));
    void refreshArchivePeriods();
  }, [priorityCadence, refreshArchivePeriods]);

  async function handleViewChange(next: FeedView) {
    if (next === 'archive') {
      const periods = await refreshArchivePeriods();
      const preferred = periods[0] ?? latestArchivePeriodStart(priorityCadence!);
      setArchivePeriod(preferred);
    }
    setView(next);
  }

  const clearPendingEdits = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    dirtyIdsRef.current.clear();
    deletedIdsRef.current.clear();
    pendingRemoteReloadRef.current = false;
  }, []);

  const applyRemote = useCallback((remote: LocalItem[]): LocalItem[] => {
    const dirtyIds = dirtyIdsRef.current;
    const next =
      dirtyIds.size > 0
        ? mergeRemoteItems(itemsRef.current, remote, dirtyIds)
        : remote.length
          ? remote
          : [emptyItem(0)];
    setItems(next);
    if (viewRef.current === 'current') {
      onCountChangeRef.current?.(filledCount(next));
    }
    return next;
  }, []);

  const syncCarried = useCallback((localItems: LocalItem[], destItems?: PriorityItemInput[]) => {
    if (destItems) destItemsRef.current = destItems;
    setCarriedIds(carriedIdsFromDest(localItems, destItemsRef.current));
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean; merge?: boolean; periodStart?: string }) => {
      if (!priorityCadence) return;
      if (!opts?.silent) setLoading(true);
      try {
        const periodStart = opts?.periodStart ?? activePeriod;
        const destStart = destPeriod && destPeriod !== periodStart ? destPeriod : '';
        const [loaded, destLoaded] = await Promise.all([
          fetchOrgPriorities(priorityCadence, team?.id, periodStart),
          destStart
            ? fetchOrgPriorities(priorityCadence, team?.id, destStart)
            : Promise.resolve([] as PriorityItemInput[]),
        ]);
        const remote = loaded.length ? toLocalItems(loaded) : [];
        if (opts?.merge && viewRef.current === 'current') {
          const next = applyRemote(remote);
          syncCarried(next, destStart ? destLoaded : undefined);
        } else {
          const next =
            remote.length > 0
              ? remote
              : viewRef.current === 'current'
                ? [emptyItem(0)]
                : [];
          setItems(next);
          syncCarried(next, destStart ? destLoaded : undefined);
          if (viewRef.current === 'current') {
            onCountChangeRef.current?.(filledCount(next));
          }
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [team?.id, priorityCadence, activePeriod, destPeriod, applyRemote, syncCarried],
  );

  useEffect(() => {
    clearPendingEdits();
    setCarryingId(null);
    void load();
  }, [load, clearPendingEdits]);

  useEffect(() => {
    if (!priorityCadence || view !== 'current') return;

    function onRemoteChange() {
      if (savingRef.current || saveTimer.current) {
        pendingRemoteReloadRef.current = true;
        return;
      }
      void load({ silent: true, merge: true, periodStart: currentPeriod });
    }

    const sb = requireSupabase();
    const channel = sb
      .channel(`org-priorities-${priorityCadence}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'priority_sets',
          filter: `cadence=eq.${priorityCadence}`,
        },
        onRemoteChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'priority_items' },
        onRemoteChange,
      );
    channel.subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [priorityCadence, view, load, currentPeriod]);

  async function persist(next: LocalItem[]) {
    if (!priorityCadence || !team || viewRef.current !== 'current') return;
    const dirtyIds = dirtyIdsRef.current;
    const deleteIds = [...deletedIdsRef.current];
    const normalized = normalizeItems(next);
    const toUpsert = normalized.filter((item) => dirtyIds.has(item.id));
    if (!toUpsert.length && !deleteIds.length) return;

    savingRef.current = true;
    try {
      await saveOrgPriorities(priorityCadence, toUpsert, team.id, deleteIds, currentPeriod);
      for (const item of toUpsert) dirtyIds.delete(item.id);
      deletedIdsRef.current.clear();
      onCountChangeRef.current?.(filledCount(normalized));
      void refreshArchivePeriods();
      setStatus('Saved.');
      window.setTimeout(() => setStatus(''), 1600);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Save failed');
    } finally {
      savingRef.current = false;
      if (pendingRemoteReloadRef.current) {
        pendingRemoteReloadRef.current = false;
        void load({ silent: true, merge: true, periodStart: currentPeriod });
      }
    }
  }

  function scheduleSave(next: LocalItem[]) {
    if (!canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void persist(next);
    }, 800);
  }

  function updateItem(index: number, field: 'goal' | 'metric' | 'owner', value: string) {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === index ? { ...it, [field]: value } : it));
      dirtyIdsRef.current.add(next[index].id);
      scheduleSave(next);
      if (field === 'goal') syncCarried(next);
      return next;
    });
  }

  function markCarried(id: string) {
    setCarriedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  async function carryForward(index: number) {
    if (!priorityCadence || !team || !canCarry) return;
    const item = items[index];
    if (!item?.goal.trim() || carryingId) return;
    setCarryingId(item.id);
    try {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        await persist(itemsRef.current);
      }
      const result = await carryOrgPriorityForward(
        priorityCadence,
        activePeriod,
        item,
        team.id,
      );
      markCarried(item.id);
      try {
        const destItems = await fetchOrgPriorities(
          priorityCadence,
          team.id,
          result.periodStart,
        );
        const next = carriedIdsFromDest(itemsRef.current, destItems);
        next.add(item.id);
        destItemsRef.current = destItems;
        setCarriedIds(next);
      } catch {
        // Keep the optimistic mark if the destination list cannot be reloaded.
      }
      const label = formatPeriodLabel(priorityCadence, result.periodStart);
      if (result.alreadyPresent) {
        setStatus(`Already on ${label}.`);
      } else {
        setStatus(
          destIsCurrent
            ? `Carried forward to this ${carryNoun}.`
            : `Carried forward to next ${carryNoun}.`,
        );
      }
      window.setTimeout(() => setStatus(''), 2200);
      void refreshArchivePeriods();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Carry forward failed');
    } finally {
      setCarryingId(null);
    }
  }

  function toggleCompleted(index: number) {
    if (!canEdit) return;
    setItems((prev) => {
      const next = prev.map((it, i) =>
        i === index ? { ...it, completed: !it.completed } : it,
      );
      dirtyIdsRef.current.add(next[index].id);
      scheduleSave(next);
      return next;
    });
  }

  function addItem() {
    setItems((prev) => {
      const added = emptyItem(prev.length);
      dirtyIdsRef.current.add(added.id);
      const next = normalizeItems([...prev, added]);
      scheduleSave(next);
      return next;
    });
  }

  function deleteItem(index: number) {
    setItems((prev) => {
      const removed = prev[index];
      if (removed) deletedIdsRef.current.add(removed.id);
      dirtyIdsRef.current.delete(removed?.id ?? '');
      const next = normalizeItems(
        prev.length <= 1 ? [emptyItem(0)] : prev.filter((_, i) => i !== index),
      );
      if (prev.length <= 1) {
        dirtyIdsRef.current.add(next[0].id);
      } else {
        for (const item of next) dirtyIdsRef.current.add(item.id);
      }
      scheduleSave(next);
      return next;
    });
  }

  function reorderItems(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const normalized = normalizeItems(next);
      for (const item of normalized) dirtyIdsRef.current.add(item.id);
      scheduleSave(normalized);
      return normalized;
    });
  }

  function getDropIndex(clientY: number, fromIndex: number): number {
    let index = fromIndex;
    for (let idx = 0; idx < items.length; idx += 1) {
      const node = cardRefs.current[items[idx].id];
      if (!node) continue;
      const { top, height } = node.getBoundingClientRect();
      if (clientY >= top + height / 2) index = idx;
    }
    return index;
  }

  function clearDragState() {
    setDragIndex(null);
    setDropIndex(null);
    document.body.classList.remove('is-reordering-priorities');
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>, index: number) {
    if (!canEdit) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    setDragIndex(index);
    setDropIndex(index);
    document.body.classList.add('is-reordering-priorities');

    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      moveEvent.preventDefault();
      setDropIndex(getDropIndex(moveEvent.clientY, index));
    };

    const onEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== event.pointerId) return;
      endEvent.preventDefault();
      handle.releasePointerCapture(endEvent.pointerId);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('pointercancel', onEnd);
      const toIndex = getDropIndex(endEvent.clientY, index);
      clearDragState();
      reorderItems(index, toIndex);
    };

    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('pointercancel', onEnd);
  }

  if (!priorityCadence) return null;

  const archiveCadence = priorityCadence;
  const archiveLabel = formatPeriodLabel(archiveCadence, archivePeriod || latestArchive);
  const archiveIndex = archivePeriods.indexOf(archivePeriod);
  const canGoNext =
    archiveIndex > 0 || (archiveIndex === -1 && archivePeriod < latestArchive);

  function goArchivePrev() {
    if (archiveIndex >= 0 && archiveIndex < archivePeriods.length - 1) {
      setArchivePeriod(archivePeriods[archiveIndex + 1]);
      return;
    }
    setArchivePeriod((p) => shiftPeriodStart(archiveCadence, p || latestArchive, -1));
  }

  function goArchiveNext() {
    if (archiveIndex > 0) {
      setArchivePeriod(archivePeriods[archiveIndex - 1]);
      return;
    }
    setArchivePeriod((p) => shiftPeriodStart(archiveCadence, p || latestArchive, 1));
  }

  return (
    <div className="priority-panel">
      {!team?.id && <Onboarding />}

      <FeedViewTabs
        active={view}
        currentLabel={formatPeriodLabel(priorityCadence, currentPeriod)}
        onChange={(next) => {
          void handleViewChange(next);
        }}
      />
      {view === 'archive' && (
        <PeriodNavigator
          label={archiveLabel}
          onPrev={goArchivePrev}
          onNext={goArchiveNext}
          canNext={canGoNext}
        />
      )}

      <div className="step">
        <div className="step-head">
          <div className="step-sub">
            {view === 'archive'
              ? archivePeriods.length || hasGoals
                ? `Archived priorities for ${archiveLabel}.`
                : `No archived ${priorityCadence} priorities yet. Past periods appear here after a new ${priorityCadence === 'weekly' ? 'week' : priorityCadence === 'monthly' ? 'month' : 'quarter'} starts.`
              : def.subtitle || def.step1Sub}
          </div>
        </div>

        {loading ? (
          <div className="mini">Loading priorities…</div>
        ) : view === 'archive' && !hasGoals ? (
          <div className="mini">No archived priorities for {archiveLabel}.</div>
        ) : (
          <div className="card">
            {items.map((item, idx) => (
              <div
                key={item.id}
                ref={(node) => {
                  cardRefs.current[item.id] = node;
                }}
                className={[
                  'prio-node',
                  item.completed ? 'is-complete' : '',
                  carriedIds.has(item.id) ? 'is-carried' : '',
                  dragIndex === idx ? 'dragging' : '',
                  dropIndex === idx && dragIndex !== null && dragIndex !== idx
                    ? 'drop-target'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="prio-row">
                  <span
                    className="prio-grip"
                    role="button"
                    tabIndex={canEdit ? 0 : -1}
                    aria-label={`Drag priority ${idx + 1}`}
                    onPointerDown={(event) => handlePointerDown(event, idx)}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    ⠿
                  </span>
                  <label className="prio-check">
                    <input
                      type="checkbox"
                      checked={Boolean(item.completed)}
                      disabled={!canEdit}
                      aria-label={
                        item.completed
                          ? `Mark priority ${idx + 1} incomplete`
                          : `Mark priority ${idx + 1} complete`
                      }
                      onChange={() => toggleCompleted(idx)}
                    />
                  </label>
                  <span className="prio-num">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="prio-fields">
                    <input
                      className="f-in prio-text"
                      placeholder="Priority"
                      aria-label={`Priority ${idx + 1}`}
                      value={item.goal}
                      disabled={!canEdit}
                      onChange={(e) => updateItem(idx, 'goal', e.target.value)}
                    />
                    <div className="prio-meta">
                      <div className="metric-wrap">
                        <span className="mlabel">Driver</span>
                        <select
                          className="f-in f-owner"
                          aria-label={`Driver for priority ${idx + 1}`}
                          value={item.owner}
                          disabled={!canEdit}
                          onChange={(e) => updateItem(idx, 'owner', e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {ownerOptions(item.owner).map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="metric-wrap">
                        <span className="mlabel">Success metric</span>
                        <input
                          className="f-in f-metric"
                          placeholder="How we'll know it worked"
                          aria-label="Success metric"
                          value={item.metric}
                          disabled={!canEdit}
                          onChange={(e) => updateItem(idx, 'metric', e.target.value)}
                        />
                      </div>
                    </div>
                    {canCarry && item.goal.trim() ? (
                      carriedIds.has(item.id) ? (
                        <span className="prio-carry is-done">
                          {destIsCurrent
                            ? `Carried forward to this ${carryNoun}`
                            : `Carried forward to next ${carryNoun}`}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="prio-carry"
                          disabled={carryingId === item.id}
                          title={carryLabel}
                          onClick={() => {
                            void carryForward(idx);
                          }}
                        >
                          {carryingId === item.id ? 'Carrying…' : carryLabel}
                        </button>
                      )
                    ) : null}
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      className="prio-del"
                      title="Remove"
                      aria-label={`Remove priority ${idx + 1}`}
                      onClick={() => deleteItem(idx)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            {canEdit ? (
              <button type="button" className="add-prio" onClick={addItem}>
                + Add priority
              </button>
            ) : null}

            {view === 'current' ? <ConsiderationPrompts prompts={prompts} /> : null}
            {status ? <div className="status-msg">{status}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
