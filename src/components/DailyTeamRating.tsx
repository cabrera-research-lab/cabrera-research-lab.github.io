import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchUpdates, rateOwnDailyMission } from '@/lib/api';
import { periodStartForCadence } from '@/lib/periods';
import type { UpdateRow } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { DeltaText } from '@/lib/deltaText';
import { RatingStars } from './RatingStars';

interface Props {
  teamId: string | null;
  refreshKey: number;
  orgWide?: boolean;
  /** When false, stars are visible but not selectable (gate not open). */
  ratingEnabled?: boolean;
}

function latestUpdatePerUser(rows: UpdateRow[]): UpdateRow[] {
  const seen = new Set<string>();
  const result: UpdateRow[] = [];
  for (const row of rows) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    result.push(row);
  }
  return result;
}

export function DailyTeamRating({
  teamId,
  refreshKey,
  orgWide = false,
  ratingEnabled = true,
}: Props) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const periodStart = periodStartForCadence('daily');
      const rows = await fetchUpdates(orgWide ? null : teamId, 'daily', periodStart);
      setUpdates(latestUpdatePerUser(rows));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [teamId, orgWide]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleRate(update: UpdateRow, stars: number) {
    if (!user || update.user_id !== user.id) return;
    await rateOwnDailyMission(update.id, user.id, stars);
    await load();
  }

  const { rows, collectiveAvg } = useMemo(() => {
    let total = 0;
    let count = 0;
    const mapped = updates.map((update) => {
      const score = update.self_mission_score ?? 0;
      if (score > 0) {
        total += score;
        count++;
      }
      return {
        update,
        name: update.profiles?.display_name ?? 'Member',
        score,
        canEdit: ratingEnabled && Boolean(user && update.user_id === user.id),
      };
    });
    return {
      rows: mapped,
      collectiveAvg: count ? (total / count).toFixed(1) : '—',
    };
  }, [updates, user, ratingEnabled]);

  if (loading && !updates.length) {
    return <div className="mini">Loading team ratings…</div>;
  }

  if (!updates.length) {
    return (
      <div className="mini empty">
        No daily updates yet — ratings appear after standup submissions.
      </div>
    );
  }

  return (
    <div className={`daily-rating-card${ratingEnabled ? '' : ' daily-rating-locked'}`}>
      {rows.map(({ update, name, score, canEdit }) => (
        <div key={update.id} className="daily-rating-row">
          <span className="daily-rating-name">
            <DeltaText>{name}</DeltaText>
          </span>
          <RatingStars
            average={score}
            readOnly={!canEdit}
            onRate={canEdit ? (stars) => handleRate(update, stars) : undefined}
          />
        </div>
      ))}
      <div className="daily-rating-row">
        <span className="daily-rating-name">Collective Average</span>
        <span className="daily-rating-average">{collectiveAvg} / 5</span>
      </div>
    </div>
  );
}
