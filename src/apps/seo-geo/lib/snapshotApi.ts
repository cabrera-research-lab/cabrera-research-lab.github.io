import { requireSupabase } from '@/shared/lib/supabase';
import { PROPERTIES } from '@/apps/seo-geo/lib/properties';
import { parseRawSnapshot } from '@/apps/seo-geo/lib/parseSnapshot';
import { runHealthScore } from '@/apps/seo-geo/lib/healthScore';
import type { HealthResult, ParsedSnapshot, PropertyId, RawSnapshot } from '@/apps/seo-geo/lib/types';

export type SnapshotRow = {
  id: string;
  propertyId: PropertyId;
  fetchedAt: string;
  parsed: ParsedSnapshot;
  health: HealthResult;
  raw: RawSnapshot;
};

type DbRow = {
  id: string;
  property_id: string;
  fetched_at: string;
  payload: unknown;
};

function formatRow(row: DbRow): SnapshotRow | null {
  const parsed = parseRawSnapshot(row.payload, row.property_id as PropertyId);
  if (!parsed) return null;
  return {
    id: row.id,
    propertyId: parsed.propertyId,
    fetchedAt: row.fetched_at,
    parsed,
    health: runHealthScore(parsed),
    raw: row.payload as RawSnapshot,
  };
}

export async function listLatestSnapshots(): Promise<SnapshotRow[]> {
  const client = requireSupabase();
  const rows = await Promise.all(
    PROPERTIES.map(async (property) => {
      const { data, error } = await client
        .from('seo_geo_snapshots')
        .select('id, property_id, fetched_at, payload')
        .eq('property_id', property.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? formatRow(data as DbRow) : null;
    }),
  );
  return rows.filter((row): row is SnapshotRow => row != null);
}

export async function listPropertyHistory(propertyId: PropertyId, limit = 30): Promise<SnapshotRow[]> {
  const { data, error } = await requireSupabase()
    .from('seo_geo_snapshots')
    .select('id, property_id, fetched_at, payload')
    .eq('property_id', propertyId)
    .order('fetched_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as DbRow[])
    .map(formatRow)
    .filter((row): row is SnapshotRow => row != null);
}

export async function refreshProperty(propertyId: PropertyId | 'all'): Promise<void> {
  const { data, error } = await requireSupabase().functions.invoke('seo-geo-collect', {
    body: { propertyId },
  });
  if (error) {
    const missing = /not found|404|failed to send/i.test(error.message);
    throw new Error(
      missing
        ? 'Refresh is not deployed yet. Deploy the seo-geo-collect Edge Function, then try again.'
        : error.message,
    );
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
}

/** Keep the newest snapshot for each local calendar day (one pair of bars per day). */
export function latestSnapshotPerDay(rows: SnapshotRow[]): SnapshotRow[] {
  const byDay = new Map<string, SnapshotRow>();
  for (const row of rows) {
    const when = new Date(row.fetchedAt);
    const key = Number.isNaN(when.getTime())
      ? row.fetchedAt.slice(0, 10)
      : `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
    const existing = byDay.get(key);
    if (!existing || row.fetchedAt > existing.fetchedAt) {
      byDay.set(key, row);
    }
  }
  return [...byDay.values()].sort((a, b) => (a.fetchedAt < b.fetchedAt ? 1 : -1));
}
