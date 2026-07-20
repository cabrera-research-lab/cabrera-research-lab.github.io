import { useCallback, useEffect, useRef, useState } from 'react';
import { getCadence } from '@/apps/teaming/lib/cadenceConfig';
import {
  buildPrioritiesPreview,
  fetchOrgPriorities,
  saveOrgPriorities,
} from '@/apps/teaming/lib/api';
import type { Cadence, PriorityItemInput } from '@/apps/teaming/lib/types';
import { renderDeltaText } from '@/apps/teaming/lib/deltaText';
import { StepBanner } from './StepBanner';

const PRIORITY_TITLES: Record<string, string> = {
  weekly: 'TE∆MING Weekly Priorities',
  monthly: 'TE∆MING Monthly Priorities',
  quarterly: 'TE∆MING Quarterly Priorities',
};

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

interface Props {
  cadence: Cadence;
  teamId: string;
  onSaved: () => void;
}

export function PriorityStep2({ cadence, teamId, onSaved }: Props) {
  const def = getCadence(cadence);
  if (!def.showStep2 || !def.step3Label || !def.step3Sub || !def.step2Title || !def.step2Description) {
    return null;
  }

  const priorityCadence = cadence as 'weekly' | 'monthly' | 'quarterly';
  const [items, setItems] = useState<LocalItem[]>([emptyItem(0)]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchOrgPriorities(priorityCadence, teamId);
      if (items.length) {
        setItems(toLocalItems(items));
      } else {
        setItems([emptyItem(0)]);
      }
    } finally {
      setLoading(false);
    }
  }, [teamId, priorityCadence]);

  useEffect(() => {
    load();
  }, [load]);

  async function persist(next: LocalItem[]) {
    try {
      await saveOrgPriorities(priorityCadence, normalizeItems(next), teamId);
      onSaved();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Save failed');
    }
  }

  function scheduleSave(next: LocalItem[]) {
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
      const next = normalizeItems(prev.length <= 1 ? [emptyItem(0)] : prev.filter((_, i) => i !== index));
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

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, index: number) {
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

  function moveItem(index: number, delta: -1 | 1) {
    const toIndex = index + delta;
    if (toIndex < 0 || toIndex >= items.length) return;
    reorderItems(index, toIndex);
  }

  async function copyPreview() {
    const text = buildPrioritiesPreview(PRIORITY_TITLES[priorityCadence], items);
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied to clipboard.');
    } catch {
      setStatus('Copy failed.');
    }
  }

  const preview = buildPrioritiesPreview(PRIORITY_TITLES[priorityCadence], items);
  const kindLabel = priorityCadence.charAt(0).toUpperCase() + priorityCadence.slice(1);

  if (loading) return null;

  return (
    <div className="card">
      <StepBanner label={def.step3Label} sub={def.step3Sub} />
      <h2 style={{ marginTop: 0 }}>{def.step2Title}</h2>
      <div className="mini">{renderDeltaText(def.step2Description)}</div>
      {items.map((item, idx) => (
        <div
          key={item.id}
          ref={(node) => {
            cardRefs.current[item.id] = node;
          }}
          className={[
            'goal-card',
            dragIndex === idx ? 'goal-card--dragging' : '',
            dropIndex === idx && dragIndex !== null && dragIndex !== idx ? 'goal-card--drop-target' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="goal-head">
            <div className="goal-head-start">
              <div className="priority-reorder-controls">
                <div
                  className="priority-drag-handle"
                  role="button"
                  tabIndex={0}
                  aria-label={`Drag ${kindLabel} priority ${idx + 1}`}
                  onPointerDown={(event) => handlePointerDown(event, idx)}
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <span className="priority-drag-grip" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="priority-move-buttons">
                  <button
                    type="button"
                    className="priority-move-btn"
                    aria-label={`Move ${kindLabel} priority ${idx + 1} up`}
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="priority-move-btn"
                    aria-label={`Move ${kindLabel} priority ${idx + 1} down`}
                    disabled={idx === items.length - 1}
                    onClick={() => moveItem(idx, 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
              <label>
                {kindLabel} Priority {idx + 1}
              </label>
            </div>
            <button
              type="button"
              className="delete-priority"
              onClick={() => deleteItem(idx)}
            >
              Delete
            </button>
          </div>
          <textarea
            placeholder={`What specific priority matters this ${priorityCadence}?`}
            value={item.goal}
            onChange={(e) => updateItem(idx, 'goal', e.target.value)}
          />
          <div className="goal-grid">
            <div>
              <label>Success Metric</label>
              <input
                placeholder="How will we know it worked?"
                value={item.metric}
                onChange={(e) => updateItem(idx, 'metric', e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn secondary" onClick={addItem}>
        + Add {kindLabel} Priority
      </button>
      <div className="split-actions">
        <button type="button" className="btn primary" onClick={copyPreview}>
          Copy {kindLabel} Priorities
        </button>
      </div>
      {status && <div className="status-msg">{status}</div>}
      <div className="preview">{renderDeltaText(preview)}</div>
    </div>
  );
}
