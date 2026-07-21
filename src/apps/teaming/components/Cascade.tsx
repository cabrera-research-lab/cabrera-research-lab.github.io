import type { ReactNode } from 'react';

export type CascadeId =
  | 'missionmoments'
  | 'quarterly'
  | 'monthly'
  | 'weekly'
  | 'daily'
  | 'showcase';

export interface CascadeRungDef {
  id: CascadeId;
  title: string;
  meta: string;
  className?: string;
}

export const CASCADE_RUNGS: CascadeRungDef[] = [
  { id: 'missionmoments', title: 'Mission Moments', meta: 'go-live QC', className: 'rung-mm' },
  { id: 'quarterly', title: 'Quarterly Priorities', meta: 'priorities' },
  { id: 'monthly', title: 'Monthly Priorities', meta: 'priorities' },
  { id: 'weekly', title: 'Weekly Priorities', meta: 'priorities' },
  { id: 'daily', title: 'Daily Standup', meta: 'live now' },
  { id: 'showcase', title: 'Weekly Showcase', meta: 'Fridays', className: 'showcase' },
];

interface Props {
  open: Set<CascadeId>;
  /** Panels that have been opened at least once (kept mounted to preserve state). */
  mounted: Set<CascadeId>;
  onToggle: (id: CascadeId) => void;
  metaById?: Partial<Record<CascadeId, string>>;
  children: (id: CascadeId) => ReactNode;
}

export function Cascade({ open, mounted, onToggle, metaById, children }: Props) {
  return (
    <>
      <div className="cascade" id="cascade">
        {CASCADE_RUNGS.map((rung) => {
          const isOn = open.has(rung.id);
          const isMounted = mounted.has(rung.id);
          return (
            <div key={rung.id}>
              <button
                type="button"
                className={`rung${rung.className ? ` ${rung.className}` : ''}${isOn ? ' on' : ''}`}
                data-c={rung.id}
                aria-expanded={isOn}
                onClick={() => onToggle(rung.id)}
              >
                <span className="rung-t">{rung.title}</span>
                <span className="rung-meta">{metaById?.[rung.id] ?? rung.meta}</span>
              </button>
              {isMounted ? (
                <div
                  className="rung-slot"
                  data-c={rung.id}
                  hidden={!isOn}
                  style={isOn ? undefined : { display: 'none' }}
                >
                  {children(rung.id)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="cascade-note">
        Click a level to open it in place. Priorities cascade downward — quarterly into monthly into
        weekly into daily.
      </p>
    </>
  );
}
