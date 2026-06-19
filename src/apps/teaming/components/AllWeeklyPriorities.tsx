import { useCallback, useEffect, useState } from 'react';
import { fetchOrgWeeklyPriorities, formatTargetsText } from '@/apps/teaming/lib/api';
import { formatPeriodLabel, periodStartForPriority } from '@/apps/teaming/lib/periods';
import { DeltaText } from '@/apps/teaming/lib/deltaText';
import type { PriorityItemInput } from '@/apps/teaming/lib/types';

interface Props {
  refreshKey?: number;
  fallbackTeamId?: string | null;
}

export function AllWeeklyPriorities({ refreshKey = 0, fallbackTeamId = null }: Props) {
  const [items, setItems] = useState<PriorityItemInput[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchOrgWeeklyPriorities(fallbackTeamId));
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fallbackTeamId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const periodLabel = formatPeriodLabel('weekly', periodStartForPriority('weekly'));
  const hasGoals = items.some((i) => i.goal.trim());

  return (
    <div className="weekly-priorities-board">
      <div className="section-title">
        <h2>THIS WEEK&apos;S PRIORITIES</h2>
        <div className="pill">{periodLabel}</div>
      </div>
      <p className="mini" style={{ margin: '0 0 14px' }}>
        One list for everyone — decided together on the Weekly tab. Use it when you plan what you
        will do today. Team names elsewhere are only a label.
      </p>
      {loading ? (
        <div className="mini">Loading weekly priorities…</div>
      ) : !hasGoals ? (
        <div className="mini">No weekly priorities published yet for {periodLabel}.</div>
      ) : (
        <div className="goal-card targets-highlight">
          <div className="text">
            <DeltaText>{formatTargetsText(items, 'No goals entered yet.')}</DeltaText>
          </div>
        </div>
      )}
    </div>
  );
}
