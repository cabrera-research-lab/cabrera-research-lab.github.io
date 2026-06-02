import { useCallback, useEffect, useState } from 'react';
import { getCadence } from '@/lib/cadenceConfig';
import {
  buildPrioritiesPreview,
  fetchOrgWeeklyPriorities,
  fetchPrioritySet,
  saveOrgWeeklyPriorities,
  savePrioritySet,
} from '@/lib/api';
import type { Cadence, PriorityItemInput } from '@/lib/types';

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
  if (!def.showStep2) return null;

  const priorityCadence = cadence as 'weekly' | 'monthly' | 'quarterly';
  const [items, setItems] = useState<PriorityItemInput[]>([emptyItem(0)]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

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

  function updateItem(index: number, field: keyof PriorityItemInput, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem(prev.length)]);
  }

  function clearAll() {
    setItems([emptyItem(0)]);
  }

  async function handleSave() {
    setStatus('');
    try {
      if (priorityCadence === 'weekly') {
        await saveOrgWeeklyPriorities(items, teamId);
      } else {
        await savePrioritySet(teamId, priorityCadence, items);
      }
      setStatus('Priorities saved.');
      onSaved();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Save failed');
    }
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
      <div className="kicker">{def.step2Kicker}</div>
      <h2 style={{ fontSize: 25, margin: '0 0 6px', letterSpacing: '-0.03em' }}>{def.step2Title}</h2>
      <div className="mini">{def.step2Description}</div>
      {items.map((item, idx) => (
        <div key={idx} className="goal-card">
          <label>
            {kindLabel} Priority {idx + 1}
          </label>
          <textarea
            placeholder={`What specific goal matters this ${priorityCadence}?`}
            value={item.goal}
            onChange={(e) => updateItem(idx, 'goal', e.target.value)}
          />
          <div className="goal-grid">
            <div>
              <label>Owner</label>
              <input
                placeholder="Who owns it?"
                value={item.owner}
                onChange={(e) => updateItem(idx, 'owner', e.target.value)}
              />
            </div>
            <div>
              <label>Success Metric</label>
              <input
                placeholder="How will we know it worked?"
                value={item.metric}
                onChange={(e) => updateItem(idx, 'metric', e.target.value)}
              />
            </div>
          </div>
          <label>How to Test</label>
          <input
            placeholder="How will we test this?"
            value={item.action}
            onChange={(e) => updateItem(idx, 'action', e.target.value)}
          />
        </div>
      ))}
      <button type="button" className="btn secondary" onClick={addItem}>
        + Add {kindLabel} Priority
      </button>
      <div className="actions">
        <button type="button" className="btn primary" onClick={handleSave}>
          Save {kindLabel} Priorities
        </button>
        <button type="button" className="btn secondary" onClick={copyPreview}>
          Copy {kindLabel} Priorities
        </button>
      </div>
      <button type="button" className="btn secondary" style={{ marginTop: 8 }} onClick={clearAll}>
        Clear Goals
      </button>
      {status && <div className="status-msg">{status}</div>}
      <div className="preview">{preview}</div>
    </div>
  );
}
