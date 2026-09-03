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
