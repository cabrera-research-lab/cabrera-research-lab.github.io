import { useCallback, useEffect, useState } from 'react';
import { fetchUpdates, fetchProfileUsernames } from '@/apps/teaming/lib/api';
import { isDailyRatingGateOpen } from '@/apps/teaming/lib/dailyRatingGate';
import { periodStartForCadence } from '@/apps/teaming/lib/periods';
import type { UpdateRow } from '@/apps/teaming/lib/types';

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

export function useDailyRatingGate(refreshKey: number, enabled: boolean) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) {
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const periodStart = periodStartForCadence('daily');
      const rows = latestUpdatePerUser(
        await fetchUpdates(null, 'daily', periodStart),
      );
      const userIds = rows.map((r) => r.user_id);
      const usernameByUserId = await fetchProfileUsernames(userIds);
      const submitted = new Set<string>();
      for (const id of userIds) {
        const u = usernameByUserId[id];
        if (u) submitted.add(u);
      }
      setOpen(isDailyRatingGateOpen(submitted));
    } catch (e) {
      console.error(e);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!enabled || open) return;
    const id = window.setInterval(() => load(), 60_000);
    return () => window.clearInterval(id);
  }, [enabled, open, load]);

  return { open, loading, refresh: load };
}
