import { requireSupabase } from '@/shared/lib/supabase';
import { windowStartDate } from '@/apps/seo-geo/lib/keywordScore';
import type { PropertyId } from '@/apps/seo-geo/lib/types';
import type { GscConnection, QueryDailyRow, TargetKeyword } from '@/apps/seo-geo/lib/keywordTypes';

type ConnectionDb = {
  property_id: string;
  gsc_site_url: string | null;
  status: GscConnection['status'];
  last_synced_at: string | null;
  last_error: string | null;
  last_row_count: number | null;
};

type TargetDb = {
  id: string;
  property_id: string;
  phrase: string;
  kind: TargetKeyword['kind'];
  active: boolean;
};

type QueryDb = {
  property_id: string;
  date: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
};

function formatConnection(row: ConnectionDb): GscConnection {
  return {
    propertyId: row.property_id,
    gscSiteUrl: row.gsc_site_url,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    lastError: row.last_error,
    lastRowCount: row.last_row_count,
  };
}

export async function listGscConnections(): Promise<GscConnection[]> {
  const { data, error } = await requireSupabase()
    .from('seo_geo_gsc_connections')
    .select('property_id, gsc_site_url, status, last_synced_at, last_error, last_row_count');
  if (error) throw new Error(error.message);
  return ((data ?? []) as ConnectionDb[]).map(formatConnection);
}

export async function getGscConnection(propertyId: PropertyId): Promise<GscConnection | null> {
  const { data, error } = await requireSupabase()
    .from('seo_geo_gsc_connections')
    .select('property_id, gsc_site_url, status, last_synced_at, last_error, last_row_count')
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? formatConnection(data as ConnectionDb) : null;
}

export async function listTargetKeywords(propertyId: PropertyId): Promise<TargetKeyword[]> {
  const { data, error } = await requireSupabase()
    .from('seo_geo_target_keywords')
    .select('id, property_id, phrase, kind, active')
    .eq('property_id', propertyId)
    .order('kind', { ascending: true })
    .order('phrase', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as TargetDb[]).map((row) => ({
    id: row.id,
    propertyId: row.property_id,
    phrase: row.phrase,
    kind: row.kind,
    active: row.active,
  }));
}

export async function listQueryDaily(propertyId: PropertyId, since = windowStartDate()): Promise<QueryDailyRow[]> {
  const { data, error } = await requireSupabase()
    .from('seo_geo_query_daily')
    .select('property_id, date, query, page, clicks, impressions, ctr, position')
    .eq('property_id', propertyId)
    .gte('date', since)
    .order('date', { ascending: false })
    .limit(20000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as QueryDb[]).map((row) => ({
    propertyId: row.property_id,
    date: row.date,
    query: row.query,
    page: row.page,
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  }));
}

export async function refreshKeywords(propertyId: PropertyId = 'stsi-pro'): Promise<'live' | 'stored'> {
  try {
    const { data, error } = await requireSupabase().functions.invoke('seo-geo-collect-gsc', {
      body: { propertyId },
    });
    if (error) {
      if (isEdgeFunctionUnavailable(error)) return 'stored';
      throw new Error(error.message || 'Keyword refresh failed');
    }
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      throw new Error(String(data.error));
    }
    return 'live';
  } catch (err) {
    if (isEdgeFunctionUnavailable(err)) return 'stored';
    throw err;
  }
}

function isEdgeFunctionUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';
  return (
    name === 'FunctionsFetchError' ||
    /Failed to send a request to the Edge Function/i.test(message) ||
    /Edge Function returned a non-2xx status code/i.test(message)
  );
}
