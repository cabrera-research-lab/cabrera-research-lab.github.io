import { useCallback, useEffect, useState } from 'react';
import { fetchUpdates } from '@/lib/api';
import { periodStartForCadence } from '@/lib/periods';
import type { Cadence } from '@/lib/types';

export function useUserSubmitted(
  userId: string | undefined,
  teamId: string | undefined,
  cadence: Cadence,
  refreshKey: number,
  enabled: boolean,
) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled || !userId || !teamId) {
      setSubmitted(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const periodStart = periodStartForCadence(cadence);
      const rows = await fetchUpdates(teamId, cadence, periodStart);
      setSubmitted(rows.some((r) => r.user_id === userId));
    } catch (e) {
      console.error(e);
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }, [enabled, userId, teamId, cadence]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return { submitted, loading, refresh: load };
}
