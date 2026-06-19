import { requireSupabase } from '@/shared/lib/supabase';
import { periodStartForPriority } from './periods';

/** Slug for the shared org priority list (optional; see resolveOrgPriorityTeamId). */
export const ORG_TEAM_SLUG = (import.meta.env.VITE_ORG_TEAM_SLUG as string | undefined)?.trim() || 'teaming';

/**
 * Team rows are labels (pods, projects). Weekly priorities for the whole org
 * live on one canonical team record — everyone reads and edits that list.
 */
export async function resolveOrgPriorityTeamId(
  fallbackTeamId?: string | null,
): Promise<string> {
  const sb = requireSupabase();

  const { data: bySlug } = await sb.from('teams').select('id').eq('slug', ORG_TEAM_SLUG).maybeSingle();
  if (bySlug?.id) return bySlug.id;

  const period_start = periodStartForPriority('weekly');
  const { data: sets } = await sb
    .from('priority_sets')
    .select('team_id')
    .eq('cadence', 'weekly')
    .eq('period_start', period_start);
  const teamIds = [...new Set((sets ?? []).map((s) => s.team_id))];
  if (teamIds.length === 1) return teamIds[0];

  if (fallbackTeamId) return fallbackTeamId;
  throw new Error(
    `No org priority team found. Create a team with slug "${ORG_TEAM_SLUG}" or join a team first.`,
  );
}
