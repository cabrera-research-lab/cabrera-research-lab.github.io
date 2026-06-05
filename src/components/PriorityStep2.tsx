import { useCallback, useEffect, useRef, useState } from 'react';
import { getCadence } from '@/lib/cadenceConfig';
import {
  buildPrioritiesPreview,
  fetchOrgWeeklyPriorities,
  fetchPrioritySet,
  saveOrgWeeklyPriorities,
  savePrioritySet,
} from '@/lib/api';
import type { Cadence, PriorityItemInput } from '@/lib/types';
import { renderTeamBrand } from '@/lib/teamBrand';
import { StepBanner } from './StepBanner';

const PRIORITY_TITLES: Record<string, string> = {
  weekly: 'TE∆MING Weekly Priorities',
  monthly: 'TE∆MING Monthly Priorities',
  quarterly: 'TE∆MING Quarterly Priorities',
};

function emptyItem(order: number): PriorityItemInput {
  return { sort_order: order, goal: '', owner: '', metric: '', action: '' };
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
  const [items, setItems] = useState<PriorityItemInput[]>([emptyItem(0)]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        priorityCadence === 'weekly'
          ? { items: await fetchOrgWeeklyPriorities(teamId) }
          : await fetchPrioritySet(teamId, priorityCadence);
      if (data?.items.length) {
        setItems(
          data.items.map((it, i) => ({
            sort_order: i,
            goal: it.goal,
            owner: it.owner,
            metric: it.metric,
            action: it.action,
          })),
        );
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

  async function persist(next: PriorityItemInput[]) {
    try {
      if (priorityCadence === 'weekly') {
        await saveOrgWeeklyPriorities(next, teamId);
      } else {
        await savePrioritySet(teamId, priorityCadence, next);
      }
      onSaved();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Save failed');
    }
  }

  function scheduleSave(next: PriorityItemInput[]) {
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
      const next = [...prev, emptyItem(prev.length)];
      scheduleSave(next);
      return next;
    });
  }

  function deleteItem(index: number) {
    setItems((prev) => {
      const next = prev.length <= 1 ? [emptyItem(0)] : prev.filter((_, i) => i !== index);
      scheduleSave(next);
      return next;
    });
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
      <div className="mini">{renderTeamBrand(def.step2Description)}</div>
      {items.map((item, idx) => (
        <div key={idx} className="goal-card">
          <div className="goal-head">
            <label>
              {kindLabel} Priority {idx + 1}
            </label>
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
      <div className="preview">{preview}</div>
    </div>
  );
}
