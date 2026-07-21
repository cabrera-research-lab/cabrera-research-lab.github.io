import { useState } from 'react';
import { useOrgSettings } from '@/apps/teaming/hooks/useOrgSettings';
import type { PriorityCadence } from '@/apps/teaming/lib/types';
import type { OrgPrompts } from '@/apps/teaming/lib/orgSettings';

const PROMPT_GROUPS: { id: PriorityCadence; title: string }[] = [
  { id: 'quarterly', title: 'Quarterly Priorities' },
  { id: 'monthly', title: 'Monthly Priorities' },
  { id: 'weekly', title: 'Weekly Priorities' },
];

export function SettingsPanel() {
  const { settings, updateStatement, updatePrompts } = useOrgSettings();
  const [mission, setMission] = useState(settings.statement.mission);
  const [vision, setVision] = useState(settings.statement.vision);
  const [prompts, setPrompts] = useState<OrgPrompts>(settings.prompts);
  const [status, setStatus] = useState('');

  function handleSaveStatement() {
    updateStatement({
      mission: mission.trim() || settings.statement.mission,
      vision: vision.trim() || settings.statement.vision,
    });
    setStatus('Saved. Live on TE∆MING.');
    window.setTimeout(() => setStatus(''), 2200);
  }

  function setPrompt(cadence: PriorityCadence, index: number, value: string) {
    setPrompts((prev) => {
      const next = { ...prev, [cadence]: [...prev[cadence]] };
      next[cadence][index] = value;
      updatePrompts(next);
      return next;
    });
  }

  function addPrompt(cadence: PriorityCadence) {
    setPrompts((prev) => {
      const next = { ...prev, [cadence]: [...prev[cadence], ''] };
      updatePrompts(next);
      return next;
    });
  }

  function removePrompt(cadence: PriorityCadence, index: number) {
    setPrompts((prev) => {
      const list = prev[cadence].filter((_, i) => i !== index);
      const next = { ...prev, [cadence]: list.length ? list : [''] };
      updatePrompts(next);
      return next;
    });
  }

  return (
    <section className="view on" id="view-settings">
      <div className="eyebrow">
        <span className="tick" />
        Settings
      </div>
      <h1 className="hero-h" style={{ maxWidth: '16ch' }}>
        Tune the <span className="accent">words</span> your team sees.
      </h1>
      <p className="settings-lead">
        Edit the vision &amp; mission statement and the reflection prompts. Changes show up across
        TE∆MING.
      </p>

      <div className="step">
        <div className="step-head">
          <div>
            <div className="step-title">Vision &amp; Mission</div>
            <div className="step-sub">Shown at the top of TE∆MING.</div>
          </div>
        </div>
        <div className="card">
          <label className="da-l">Mission — headline</label>
          <textarea
            className="da-in"
            style={{ minHeight: 54 }}
            value={mission}
            onChange={(e) => setMission(e.target.value)}
          />
          <label className="da-l" style={{ marginTop: 12 }}>
            Vision
          </label>
          <textarea
            className="da-in"
            style={{ minHeight: 54 }}
            value={vision}
            onChange={(e) => setVision(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn primary sm" onClick={handleSaveStatement}>
              Save statement
            </button>
          </div>
          {status ? <div className="status-msg">{status}</div> : null}
        </div>
      </div>

      <div className="step">
        <div className="step-head">
          <div>
            <div className="step-title">Reflection prompts</div>
            <div className="step-sub">The &quot;for team consideration&quot; prompts on each horizon.</div>
          </div>
        </div>
        <div className="card">
          {PROMPT_GROUPS.map((group) => (
            <div key={group.id} className="set-group">
              <h3>{group.title}</h3>
              <div className="gsub">Tooltip prompts for team consideration.</div>
              {prompts[group.id].map((prompt, i) => (
                <div key={i} className="set-row">
                  <input
                    className="da-in"
                    value={prompt}
                    aria-label={`${group.title} prompt ${i + 1}`}
                    onChange={(e) => setPrompt(group.id, i, e.target.value)}
                  />
                  <button
                    type="button"
                    className="prio-del"
                    title="Remove prompt"
                    aria-label="Remove prompt"
                    onClick={() => removePrompt(group.id, i)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="set-add" onClick={() => addPrompt(group.id)}>
                + Add prompt
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
