import { CADENCES } from '@/apps/teaming/lib/cadenceConfig';
import type { Cadence } from '@/apps/teaming/lib/types';

interface Props {
  active: Cadence;
  onChange: (c: Cadence) => void;
}

export function CadenceTabs({ active, onChange }: Props) {
  return (
    <div className="tabs">
      {CADENCES.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`tab ${active === c.id ? 'active' : ''}`}
          onClick={() => onChange(c.id)}
        >
          {c.tabLabel}
        </button>
      ))}
    </div>
  );
}
