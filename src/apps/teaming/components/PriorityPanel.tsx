import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsiderationPrompts } from '@/apps/teaming/components/ConsiderationPrompts';
import { Onboarding } from '@/apps/teaming/components/Onboarding';
import { getCadence, isPriorityCadence } from '@/apps/teaming/lib/cadenceConfig';
import { getConsiderationPrompts } from '@/apps/teaming/lib/orgSettings';
import { fetchOrgPriorities, saveOrgPriorities } from '@/apps/teaming/lib/api';
import type { Cadence, PriorityItemInput } from '@/apps/teaming/lib/types';
import { useAuth } from '@/shared/auth/AuthContext';
import { useOrgSettings } from '@/apps/teaming/hooks/useOrgSettings';

type LocalItem = PriorityItemInput & { id: string };

function newId(): string {
  return crypto.randomUUID();
}

function emptyItem(order: number): LocalItem {
  return { id: newId(), sort_order: order, goal: '', owner: '', metric: '', action: '' };
}

function normalizeItems(items: LocalItem[]): LocalItem[] {
  return items.map((item, index) => ({ ...item, sort_order: index }));
}

function toLocalItems(items: PriorityItemInput[]): LocalItem[] {
  return items.map((item, index) => ({
    ...item,
    id: newId(),
    sort_order: index,
  }));
}

function filledCount(items: LocalItem[]): number {
  return items.filter((item) => item.goal.trim()).length;
}

interface Props {
  cadence: Cadence;
  onCountChange?: (count: number) => void;
}

export function PriorityPanel({ cadence, onCountChange }: Props) {
  const { team } = useAuth();
  const { settings } = useOrgSettings();
  const def = getCadence(cadence);
  const canEdit = Boolean(team?.id);
  const priorityCadence = isPriorityCadence(cadence) ? cadence : null;
  const prompts = priorityCadence
    ? settings.prompts[priorityCadence] ?? getConsiderationPrompts(priorityCadence)
    : [];

  const [items, setItems] = useState<LocalItem[]>([emptyItem(0)]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const load = useCallback(async () => {
    if (!priorityCadence) return;
    setLoading(true);
    try {
      const loaded = await fetchOrgPriorities(priorityCadence, team?.id);
      const next = loaded.length ? toLocalItems(loaded) : [emptyItem(0)];
      setItems(next);
      onCountChangeRef.current?.(filledCount(next));
    } finally {
      setLoading(false);
    }
  }, [team?.id, priorityCadence]);

  useEffect(() => {
    load();
  }, [load]);

  async function persist(next: LocalItem[]) {
    if (!priorityCadence || !team) return;
    try {
      await saveOrgPriorities(priorityCadence, normalizeItems(next), team.id);
      onCountChangeRef.current?.(filledCount(next));
      setStatus('Saved.');
      window.setTimeout(() => setStatus(''), 1600);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Save failed');
    }
  }

  function scheduleSave(next: LocalItem[]) {
    if (!canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist(next);
    }, 800);
  }

  function updateItem(index: number, field: 'goal' | 'metric', value: string) {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === index ? { ...it, [field]: value } : it));
      scheduleSave(next);
      return next;
    });
  }

  function addItem() {
    setItems((prev) => {
      const next = normalizeItems([...prev, emptyItem(prev.length)]);
      scheduleSave(next);
      return next;
    });
  }

  function deleteItem(index: number) {
    setItems((prev) => {
      const next = normalizeItems(
        prev.length <= 1 ? [emptyItem(0)] : prev.filter((_, i) => i !== index),
      );
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
      handle.releasePointerCapture(event.pointerId);
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

  return (
    <div className="priority-panel">
      {!canEdit && <Onboarding />}

      <div className="step">
        <div className="step-head">
          <div className="step-sub">{def.subtitle || def.step1Sub}</div>
        </div>

        {loading ? (
          <div className="mini">Loading priorities…</div>
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

            <ConsiderationPrompts prompts={prompts} />
            {status ? <div className="status-msg">{status}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
