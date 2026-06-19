import {
  BELTS,
  DEFAULT_COHORT,
  DEFAULT_FINAL_CHECK,
  PROMISED_PRODUCTS,
  runQc,
  type Belt,
  type CohortForm,
  type FinalCheck,
  type PromisedProduct,
} from './b2bQcApplet';
import {
  buildCohortActivityDiff,
  buildActivityDisplaySummary,
  sanitizeActivityChanges,
  summarizeActivityChanges,
  type CohortActivityChange,
  type CohortSnapshot,
} from './cohortActivity';
import { requireSupabase } from './supabase';

export type CohortPayload = {
  cohort: CohortForm;
  qc: FinalCheck;
};

export type CohortSummary = {
  id: string;
  name: string;
  company: string;
  startDate: string;
  qcScore: number | null;
  qcStatus: string | null;
  updated_at: string;
};

export type CohortActivityEntry = {
  id: string;
  cohortId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated';
  summary: string;
  changes: CohortActivityChange[];
  snapshotBefore: CohortSnapshot | null;
  snapshotAfter: CohortSnapshot | null;
  createdAt: string;
};

type CohortActivityRow = {
  id: string;
  cohort_id: string;
  user_id: string;
  action: 'created' | 'updated';
  summary: string;
  changes: unknown;
  snapshot_before: unknown;
  snapshot_after: unknown;
  created_at: string;
};

type CohortRow = {
  id: string;
  name: string;
  company: string;
  start_date: string | null;
  cohort: unknown;
  qc: unknown;
  qc_score: number | null;
  qc_status: string | null;
  updated_at: string;
};

function isBelt(value: unknown): value is Belt {
  return typeof value === 'string' && (BELTS as readonly string[]).includes(value);
}

function isPromisedProduct(value: unknown): value is PromisedProduct {
  return typeof value === 'string' && (PROMISED_PRODUCTS as readonly string[]).includes(value);
}

export function parseCohortForm(raw: unknown): CohortForm {
  const source = raw && typeof raw === 'object' ? (raw as Partial<CohortForm>) : {};
  return {
    ...DEFAULT_COHORT,
    ...source,
    startBelt: isBelt(source.startBelt) ? source.startBelt : DEFAULT_COHORT.startBelt,
    finishBelt: isBelt(source.finishBelt) ? source.finishBelt : DEFAULT_COHORT.finishBelt,
    products: Array.isArray(source.products)
      ? source.products.filter(isPromisedProduct)
      : [...DEFAULT_COHORT.products],
  };
}

export function parseCohortQc(raw: unknown): FinalCheck {
  const source = raw && typeof raw === 'object' ? (raw as Partial<FinalCheck>) : {};
  return {
    ...DEFAULT_FINAL_CHECK,
    ...source,
  };
}

/** @deprecated Legacy blob `{ form, finalCheck }` inside old setup column */
export function parseLegacySetupPayload(raw: unknown): CohortPayload {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    cohort: parseCohortForm(source.form),
    qc: parseCohortQc(source.finalCheck),
  };
}

export function parseCohortPayload(cohortRaw: unknown, qcRaw: unknown): CohortPayload {
  return {
    cohort: parseCohortForm(cohortRaw),
    qc: parseCohortQc(qcRaw),
  };
}

function formatCohortSummary(row: CohortRow): CohortSummary {
  const cohort = parseCohortForm(row.cohort);
  const updated = new Date(row.updated_at);
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    startDate: row.start_date ?? cohort.startDate,
    qcScore: row.qc_score,
    qcStatus: row.qc_status,
    updated_at: Number.isNaN(updated.getTime()) ? row.updated_at : updated.toLocaleDateString(),
  };
}

export function buildCohortName(form: CohortForm): string {
  const company = form.company.trim();
  if (!company) return 'Untitled cohort';
  if (form.startDate) return `${company} · ${form.startDate}`;
  return company;
}

async function fetchDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {};
  const { data } = await requireSupabase()
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);
  const map: Record<string, string> = {};
  for (const p of data ?? []) map[p.user_id] = p.display_name;
  return map;
}

function parseActivityChanges(raw: unknown): CohortActivityChange[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is CohortActivityChange =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as CohortActivityChange).label === 'string',
  );
}

async function recordCohortActivity(
  cohortId: string,
  userId: string,
  action: 'created' | 'updated',
  summary: string,
  changes: CohortActivityChange[],
  snapshotBefore: CohortSnapshot | null,
  snapshotAfter: CohortSnapshot,
): Promise<void> {
  const { error } = await requireSupabase().from('mission_moments_cohort_activity').insert({
    cohort_id: cohortId,
    user_id: userId,
    action,
    summary,
    changes,
    snapshot_before: snapshotBefore,
    snapshot_after: snapshotAfter,
  });
  if (error) throw new Error(error.message);
}

function parseActivitySnapshot(raw: unknown): CohortSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  if (!source.cohort && !source.qc) return null;
  return {
    cohort: parseCohortForm(source.cohort),
    qc: parseCohortQc(source.qc),
  };
}

export async function listCohortActivity(cohortId: string): Promise<CohortActivityEntry[]> {
  const { data, error } = await requireSupabase()
    .from('mission_moments_cohort_activity')
    .select(
      'id, cohort_id, user_id, action, summary, changes, snapshot_before, snapshot_after, created_at',
    )
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as CohortActivityRow[];
  const names = await fetchDisplayNames([...new Set(rows.map((r) => r.user_id))]);

  return rows.map((row) => {
    const created = new Date(row.created_at);
    const rawChanges = parseActivityChanges(row.changes);
    const changes = sanitizeActivityChanges(rawChanges);
    return {
      id: row.id,
      cohortId: row.cohort_id,
      userId: row.user_id,
      userName: names[row.user_id] ?? 'Member',
      action: row.action,
      summary: buildActivityDisplaySummary(row.action, row.summary, rawChanges),
      changes,
      snapshotBefore: parseActivitySnapshot(row.snapshot_before),
      snapshotAfter: parseActivitySnapshot(row.snapshot_after),
      createdAt: Number.isNaN(created.getTime())
        ? row.created_at
        : created.toLocaleString(),
    };
  });
}

export async function listCohorts(): Promise<CohortSummary[]> {
  const { data, error } = await requireSupabase()
    .from('mission_moments_cohorts')
    .select('id, name, company, start_date, cohort, qc_score, qc_status, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => formatCohortSummary(row as CohortRow));
}

export async function getCohort(id: string): Promise<CohortPayload> {
  const { data, error } = await requireSupabase()
    .from('mission_moments_cohorts')
    .select('cohort, qc')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Cohort not found.');
  return parseCohortPayload(data.cohort, data.qc);
}

export async function saveCohort(
  id: string | null,
  cohort: CohortForm,
  qc: FinalCheck,
  name?: string,
): Promise<string> {
  const client = requireSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error('Sign in to save cohort QC.');

  const qcResult = runQc(cohort, qc);
  const cohortName = (name ?? buildCohortName(cohort)).trim() || 'Untitled cohort';
  const payload = {
    name: cohortName,
    company: cohort.company.trim(),
    start_date: cohort.startDate || null,
    cohort,
    qc,
    qc_score: qcResult.score,
    qc_status: qcResult.status,
    updated_at: new Date().toISOString(),
  };

  let before: CohortPayload | null = null;
  if (id) {
    try {
      before = await getCohort(id);
    } catch {
      before = null;
    }
  }

  const changes = buildCohortActivityDiff(before, cohort, qc);
  const action = id ? 'updated' : 'created';
  const summary = summarizeActivityChanges(action, cohortName, changes);
  const snapshotAfter: CohortSnapshot = { cohort, qc };

  if (id) {
    const { data, error } = await client
      .from('mission_moments_cohorts')
      .update(payload)
      .eq('id', id)
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    await recordCohortActivity(
      data.id,
      user.id,
      action,
      summary,
      changes,
      before,
      snapshotAfter,
    );
    return data.id;
  }

  const { data, error } = await client
    .from('mission_moments_cohorts')
    .insert({ ...payload, created_by: user.id })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  await recordCohortActivity(
    data.id,
    user.id,
    'created',
    summarizeActivityChanges('created', cohortName, changes),
    changes,
    null,
    snapshotAfter,
  );
  return data.id;
}

export async function deleteCohort(id: string): Promise<void> {
  const { error } = await requireSupabase().from('mission_moments_cohorts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
