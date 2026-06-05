import { requireSupabase } from './supabase';
import type {
  Cadence,
  PriorityCadence,
  PriorityItemInput,
  Profile,
  Team,
  UpdateComment,
  UpdateRating,
  UpdateRow,
} from './types';
import { resolveOrgPriorityTeamId } from './org';
import { periodRange, periodStartForCadence, periodStartForPriority } from './periods';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'team';
}

export async function getSession() {
  const { data } = await requireSupabase().auth.getSession();
  return data.session;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  return local.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function signInWithPassword(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  const { error } = await requireSupabase().auth.signInWithPassword({
    email: normalized,
    password,
  });
  if (error) throw error;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string,
) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email address.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const { data, error } = await requireSupabase().auth.signUp({
    email: normalized,
    password,
    options: {
      data: {
        display_name: displayName?.trim() || displayNameFromEmail(normalized),
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('user_id, display_name, username, default_team_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'display_name' | 'default_team_id'>>,
) {
  const { error } = await requireSupabase()
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function createTeam(name: string, userId: string): Promise<Team> {
  const sb = requireSupabase();
  let slug = slugify(name);
  const { data: existing } = await sb.from('teams').select('slug').like('slug', `${slug}%`);
  if (existing?.length) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const { data: team, error: teamErr } = await sb
    .from('teams')
    .insert({ name, slug })
    .select('id, name, slug')
    .single();
  if (teamErr) throw teamErr;

  const { error: memberErr } = await sb.from('team_members').insert({
    team_id: team.id,
    user_id: userId,
    role: 'lead',
  });
  if (memberErr) throw memberErr;

  await updateProfile(userId, { default_team_id: team.id });
  return team;
}

export async function joinTeamBySlug(slug: string, userId: string): Promise<Team> {
  const sb = requireSupabase();
  const { data: team, error } = await sb
    .from('teams')
    .select('id, name, slug')
    .eq('slug', slug.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!team) throw new Error('Team not found. Check the slug.');

  const { error: memberErr } = await sb.from('team_members').upsert(
    { team_id: team.id, user_id: userId, role: 'member' },
    { onConflict: 'team_id,user_id' },
  );
  if (memberErr) throw memberErr;

  await updateProfile(userId, { default_team_id: team.id });
  return team;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await requireSupabase()
    .from('teams')
    .select('id, name, slug')
    .eq('id', teamId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitUpdate(params: {
  teamId: string;
  userId: string;
  cadence: Cadence;
  answers: string[];
  selfMissionScore: number | null;
}) {
  const { data, error } = await requireSupabase()
    .from('updates')
    .insert({
      team_id: params.teamId,
      user_id: params.userId,
      cadence: params.cadence,
      answers: params.answers,
      self_mission_score: params.cadence === 'daily' ? params.selfMissionScore : null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function fetchUpdates(
  teamId: string | null,
  cadence: Cadence,
  periodStart?: string,
): Promise<UpdateRow[]> {
  const startKey = periodStart ?? periodStartForCadence(cadence);
  const { from, to } = periodRange(cadence, startKey);

  let query = requireSupabase()
    .from('updates')
    .select('id, team_id, user_id, cadence, answers, self_mission_score, created_at')
    .eq('cadence', cadence)
    .gte('created_at', from)
    .lt('created_at', to)
    .order('created_at', { ascending: false });

  if (teamId) query = query.eq('team_id', teamId);

  const { data: rows, error } = await query;
  if (error) throw error;

  const userIds = [...new Set((rows ?? []).map((u) => u.user_id))];
  const teamIds = [...new Set((rows ?? []).map((u) => u.team_id))];
  const [names, teamNames] = await Promise.all([
    fetchDisplayNames(userIds),
    fetchTeamNames(teamIds),
  ]);

  return (rows ?? []).map((u) => ({
    ...u,
    answers: u.answers as string[],
    profiles: { display_name: names[u.user_id] ?? 'Member' },
    teams: { name: teamNames[u.team_id] ?? '' },
  }));
}

async function fetchTeamNames(teamIds: string[]): Promise<Record<string, string>> {
  if (!teamIds.length) return {};
  const { data } = await requireSupabase()
    .from('teams')
    .select('id, name')
    .in('id', teamIds);
  const map: Record<string, string> = {};
  for (const t of data ?? []) map[t.id] = t.name;
  return map;
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

/** Lowercase email local part (profiles.username) for gate checks. */
export async function fetchProfileUsernames(
  userIds: string[],
): Promise<Record<string, string>> {
  if (!userIds.length) return {};
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('user_id, username')
    .in('user_id', userIds);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const p of data ?? []) {
    const u = p.username?.trim().toLowerCase();
    if (u) map[p.user_id] = u;
  }
  return map;
}

export async function fetchRatingsForUpdates(updateIds: string[]): Promise<Record<string, UpdateRating[]>> {
  if (!updateIds.length) return {};
  const { data, error } = await requireSupabase()
    .from('update_ratings')
    .select('id, update_id, rater_id, stars')
    .in('update_id', updateIds);
  if (error) throw error;
  const byUpdate: Record<string, UpdateRating[]> = {};
  for (const r of data ?? []) {
    if (!byUpdate[r.update_id]) byUpdate[r.update_id] = [];
    byUpdate[r.update_id].push(r);
  }
  return byUpdate;
}

export async function fetchCommentsForUpdates(
  updateIds: string[],
): Promise<Record<string, UpdateComment[]>> {
  if (!updateIds.length) return {};
  const { data, error } = await requireSupabase()
    .from('update_comments')
    .select('id, update_id, author_id, body, created_at')
    .in('update_id', updateIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const authorIds = [...new Set((data ?? []).map((c) => c.author_id))];
  const names = await fetchDisplayNames(authorIds);
  const byUpdate: Record<string, UpdateComment[]> = {};
  for (const c of data ?? []) {
    const row: UpdateComment = {
      ...c,
      profiles: { display_name: names[c.author_id] ?? 'Member' },
    };
    if (!byUpdate[c.update_id]) byUpdate[c.update_id] = [];
    byUpdate[c.update_id].push(row);
  }
  return byUpdate;
}

/** Step 3: user rates their own daily update only. */
export async function rateOwnDailyMission(updateId: string, userId: string, stars: number) {
  const sb = requireSupabase();
  const { data: update, error: fetchErr } = await sb
    .from('updates')
    .select('user_id, cadence')
    .eq('id', updateId)
    .single();
  if (fetchErr) throw fetchErr;
  if (update.user_id !== userId) {
    throw new Error('You can only rate your own daily update.');
  }
  if (update.cadence !== 'daily') {
    throw new Error('Self-ratings apply to daily updates only.');
  }

  const { error } = await sb
    .from('updates')
    .update({ self_mission_score: stars })
    .eq('id', updateId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function rateUpdate(updateId: string, raterId: string, stars: number) {
  const sb = requireSupabase();
  const { error } = await sb.from('update_ratings').upsert(
    { update_id: updateId, rater_id: raterId, stars },
    { onConflict: 'update_id,rater_id' },
  );
  if (error) throw error;

  const { data: update } = await sb.from('updates').select('user_id').eq('id', updateId).single();
  const { data: rater } = await sb.from('profiles').select('display_name').eq('user_id', raterId).single();
  const { data: author } = await sb
    .from('profiles')
    .select('display_name')
    .eq('user_id', update?.user_id)
    .single();

  await sb.from('update_comments').insert({
    update_id: updateId,
    author_id: raterId,
    body: `${rater?.display_name ?? 'Someone'} rated this ${stars}/5 stars. Note sent to ${author?.display_name ?? 'author'}.`,
  });
}

export async function addComment(updateId: string, authorId: string, body: string) {
  const { error } = await requireSupabase().from('update_comments').insert({
    update_id: updateId,
    author_id: authorId,
    body,
  });
  if (error) throw error;
}

export async function fetchPrioritySet(
  teamId: string,
  cadence: PriorityCadence,
): Promise<{ id: string; items: PriorityItemInput[] } | null> {
  const period_start = periodStartForPriority(cadence);
  const { data: set, error } = await requireSupabase()
    .from('priority_sets')
    .select('id')
    .eq('team_id', teamId)
    .eq('cadence', cadence)
    .eq('period_start', period_start)
    .maybeSingle();
  if (error) throw error;
  if (!set) return null;

  const { data: items, error: itemsErr } = await requireSupabase()
    .from('priority_items')
    .select('sort_order, goal, owner, metric, action')
    .eq('priority_set_id', set.id)
    .order('sort_order');
  if (itemsErr) throw itemsErr;
  return { id: set.id, items: items ?? [] };
}

/** Shared weekly list for the whole org (one canonical storage team). */
export async function fetchOrgWeeklyPriorities(
  fallbackTeamId?: string | null,
): Promise<PriorityItemInput[]> {
  try {
    const teamId = await resolveOrgPriorityTeamId(fallbackTeamId);
    const data = await fetchPrioritySet(teamId, 'weekly');
    return data?.items ?? [];
  } catch {
    return fetchWeeklyPrioritiesMergedFallback();
  }
}

async function fetchWeeklyPrioritiesMergedFallback(): Promise<PriorityItemInput[]> {
  const period_start = periodStartForPriority('weekly');
  const { data: sets, error } = await requireSupabase()
    .from('priority_sets')
    .select('id')
    .eq('cadence', 'weekly')
    .eq('period_start', period_start);
  if (error || !sets?.length) return [];

  const { data: items, error: itemsErr } = await requireSupabase()
    .from('priority_items')
    .select('sort_order, goal, owner, metric, action')
    .in(
      'priority_set_id',
      sets.map((s) => s.id),
    )
    .order('sort_order');
  if (itemsErr) return [];

  let order = 0;
  return (items ?? [])
    .filter((i) => i.goal.trim())
    .map((i) => ({
      sort_order: order++,
      goal: i.goal,
      owner: i.owner,
      metric: i.metric,
      action: i.action,
    }));
}

export async function saveOrgWeeklyPriorities(
  items: PriorityItemInput[],
  fallbackTeamId?: string | null,
): Promise<void> {
  const teamId = await resolveOrgPriorityTeamId(fallbackTeamId);
  await savePrioritySet(teamId, 'weekly', items);
}

export async function savePrioritySet(
  teamId: string,
  cadence: PriorityCadence,
  items: PriorityItemInput[],
) {
  const sb = requireSupabase();
  const period_start = periodStartForPriority(cadence);

  const { data: existing } = await sb
    .from('priority_sets')
    .select('id')
    .eq('team_id', teamId)
    .eq('cadence', cadence)
    .eq('period_start', period_start)
    .maybeSingle();

  let setId = existing?.id;
  if (!setId) {
    const { data: created, error } = await sb
      .from('priority_sets')
      .insert({ team_id: teamId, cadence, period_start })
      .select('id')
      .single();
    if (error) throw error;
    setId = created.id;
  } else {
    await sb.from('priority_items').delete().eq('priority_set_id', setId);
  }

  if (items.length) {
    const { error } = await sb.from('priority_items').insert(
      items.map((item) => ({
        priority_set_id: setId,
        sort_order: item.sort_order,
        goal: item.goal,
        owner: item.owner,
        metric: item.metric,
        action: item.action,
      })),
    );
    if (error) throw error;
  }
}

export function formatTargetsText(
  items: PriorityItemInput[],
  empty: string,
): string {
  const filled = items.filter((i) => i.goal.trim());
  if (!filled.length) return empty;
  return filled
    .map((item, idx) => {
      let line = `${idx + 1}. ${item.goal.trim()}`;
      if (item.metric.trim()) line += `\n   Metric: ${item.metric.trim()}`;
      return line;
    })
    .join('\n\n');
}

export function buildUpdatePreview(params: {
  cadenceTitle: string;
  name: string;
  date: string;
  questions: string[];
  answers: string[];
}): string {
  let out = `TE∆M ${params.cadenceTitle}\nName: ${params.name}\nDate: ${params.date}\n\n`;
  params.questions.forEach((q, i) => {
    out += `${i + 1}. ${q}\n${params.answers[i]?.trim() || '—'}\n\n`;
  });
  return out.trimEnd();
}

export function buildPrioritiesPreview(title: string, items: PriorityItemInput[]): string {
  let out = `${title}\nDate: ${new Date().toLocaleDateString()}\n\n`;
  const filled = items.filter((i) => i.goal.trim());
  if (!filled.length) return out.trimEnd();
  filled.forEach((item, idx) => {
    out += `Priority ${idx + 1}\n`;
    out += `Goal: ${item.goal || '—'}\n`;
    out += `Success Metric: ${item.metric || '—'}\n\n`;
  });
  return out.trimEnd();
}
