import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cascade, type CascadeId, CASCADE_RUNGS } from '@/apps/teaming/components/Cascade';
import { CadencePanel } from '@/apps/teaming/components/CadencePanel';
import { MissionMomentsPanel } from '@/apps/teaming/components/MissionMomentsPanel';
import { MissionVisionHero } from '@/apps/teaming/components/MissionVisionHero';
import { SettingsPanel } from '@/apps/teaming/components/SettingsPanel';
import { ShowcasePanel } from '@/apps/teaming/components/ShowcasePanel';
import { fetchOrgPriorities } from '@/apps/teaming/lib/api';
import { renderDeltaText } from '@/apps/teaming/lib/deltaText';
import type { Cadence, PriorityCadence } from '@/apps/teaming/lib/types';
import { useAuth } from '@/shared/auth/AuthContext';
import '@/apps/teaming/styles/cascade.css';

const VALID_IDS = new Set(CASCADE_RUNGS.map((r) => r.id));
const PRIORITY_IDS: PriorityCadence[] = ['quarterly', 'monthly', 'weekly'];

function parseInitialOpen(params: URLSearchParams): Set<CascadeId> {
  const openParam = params.get('open');
  if (openParam) {
    const ids = openParam
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is CascadeId => VALID_IDS.has(s as CascadeId));
    if (ids.length) return new Set(ids);
  }
  const cadence = params.get('cadence');
  if (cadence && VALID_IDS.has(cadence as CascadeId)) {
    return new Set([cadence as CascadeId]);
  }
  return new Set<CascadeId>(['daily']);
}

function writeOpenParam(
  ids: Set<CascadeId>,
  searchParams: URLSearchParams,
  setSearchParams: ReturnType<typeof useSearchParams>[1],
) {
  const ordered = CASCADE_RUNGS.map((r) => r.id).filter((id) => ids.has(id));
  const next = new URLSearchParams();
  if (searchParams.get('view') === 'settings') next.set('view', 'settings');
  if (ordered.length === 0) {
    setSearchParams(next);
    return;
  }
  const primary = ordered.find((id) =>
    (['daily', 'weekly', 'monthly', 'quarterly'] as Cadence[]).includes(id as Cadence),
  );
  next.set('open', ordered.join(','));
  if (primary) next.set('cadence', primary);
  setSearchParams(next);
}

function countLabel(n: number): string {
  return n === 1 ? '1 priority' : `${n} priorities`;
}

export function HomePage() {
  const { team } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'settings' ? 'settings' : 'teaming';
  const initial = useMemo(() => parseInitialOpen(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<Set<CascadeId>>(initial);
  const [mounted, setMounted] = useState<Set<CascadeId>>(() => new Set(initial));
  const [counts, setCounts] = useState<Partial<Record<PriorityCadence, number>>>({});

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const entries = await Promise.all(
        PRIORITY_IDS.map(async (id) => {
          const items = await fetchOrgPriorities(id, team?.id);
          return [id, items.filter((i) => i.goal.trim()).length] as const;
        }),
      );
      if (!cancelled) setCounts(Object.fromEntries(entries));
    }
    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [team?.id]);

  const toggle = useCallback(
    (id: CascadeId) => {
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else {
          next.add(id);
          setMounted((m) => new Set(m).add(id));
        }
        writeOpenParam(next, searchParams, setSearchParams);
        return next;
      });
    },
    [searchParams, setSearchParams],
  );

  const metaById = useMemo(() => {
    const meta: Partial<Record<CascadeId, string>> = {};
    for (const id of PRIORITY_IDS) {
      if (counts[id] != null) meta[id] = countLabel(counts[id]!);
    }
    return meta;
  }, [counts]);

  const onPriorityCountChange = useCallback((id: PriorityCadence, count: number) => {
    setCounts((prev) => ({ ...prev, [id]: count }));
  }, []);

  return (
    <div className="app">
      {view === 'settings' ? (
        <SettingsPanel />
      ) : (
        <section className="view on" id="view-teaming">
          <div className="eyebrow">
            <span className="tick" />
            {renderDeltaText('TE∆MING SYSTEM')}
          </div>
          <MissionVisionHero />

          <Cascade open={open} mounted={mounted} onToggle={toggle} metaById={metaById}>
            {(id) => {
              if (id === 'missionmoments') return <MissionMomentsPanel />;
              if (id === 'showcase') return <ShowcasePanel />;
              return (
                <CadencePanel
                  cadence={id}
                  onPriorityCountChange={
                    PRIORITY_IDS.includes(id as PriorityCadence)
                      ? (count) => onPriorityCountChange(id as PriorityCadence, count)
                      : undefined
                  }
                />
              );
            }}
          </Cascade>
        </section>
      )}

      <div className="foot">
        <div className="copyright">
          © 2026 GO
          <svg className="d brand-delta" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 3 L22 21 L2 21 Z" />
          </svg>
          TWORKS
        </div>
      </div>
    </div>
  );
}
