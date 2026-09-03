import { requireSupabase } from '@/shared/lib/supabase';
import { periodStartForPriority } from './periods';
import type { PriorityCadence } from './types';

/** Slug for the shared org priority list (optional; see resolveOrgPriorityTeamId). */
export const ORG_TEAM_SLUG = (import.meta.env.VITE_ORG_TEAM_SLUG as string | undefined)?.trim() || 'teaming';

/** Weekly, monthly, and quarterly priorities are shared across the org. */
export type OrgPriorityCadence = PriorityCadence;

/**
 * Team rows are labels (pods, projects). Org-wide priorities live on one
 * canonical team record — everyone reads and edits that list.
 */
export async function resolveOrgPriorityTeamId(
  fallbackTeamId?: string | null,
  cadence: OrgPriorityCadence = 'weekly',
  periodStart?: string,
): Promise<string> {
  const sb = requireSupabase();

  const { data: bySlug } = await sb.from('teams').select('id').eq('slug', ORG_TEAM_SLUG).maybeSingle();
  if (bySlug?.id) return bySlug.id;

  const period_start = periodStart ?? periodStartForPriority(cadence);
  const { data: sets } = await sb
    .from('priority_sets')
    .select('team_id')
    .eq('cadence', cadence)
    .eq('period_start', period_start);
  const teamIds = [...new Set((sets ?? []).map((s) => s.team_id))];
  if (teamIds.length === 1) return teamIds[0];

  if (fallbackTeamId) return fallbackTeamId;
  throw new Error(
    `No org priority team found. Create a team with slug "${ORG_TEAM_SLUG}" or join a team first.`,
  );
}
