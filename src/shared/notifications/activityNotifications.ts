import { getProfile } from '@/apps/teaming/lib/api';
import { missionMomentsPath } from '@/apps/mission-moments/constants';
import type { Cadence } from '@/apps/teaming/lib/types';
import type { DesktopNotificationPayload } from '@/shared/notifications/desktopNotifications';

const profileNameCache = new Map<string, string>();

async function resolveDisplayName(userId: string): Promise<string> {
  const cached = profileNameCache.get(userId);
  if (cached) return cached;

  try {
    const profile = await getProfile(userId);
    const name = profile?.display_name?.trim() || 'Someone';
    profileNameCache.set(userId, name);
    return name;
  } catch {
    return 'Someone';
  }
}

function truncate(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function cadenceLabel(cadence: string): string {
  switch (cadence as Cadence) {
    case 'daily':
      return 'daily';
    case 'weekly':
      return 'weekly';
    case 'monthly':
      return 'monthly';
    case 'quarterly':
      return 'quarterly';
    default:
      return 'new';
  }
}

export async function notificationForUpdateInsert(
  row: Record<string, unknown>,
): Promise<DesktopNotificationPayload | null> {
  const userId = typeof row.user_id === 'string' ? row.user_id : null;
  const cadence = typeof row.cadence === 'string' ? row.cadence : 'update';
  const id = typeof row.id === 'string' ? row.id : undefined;
  if (!userId) return null;

  const name = await resolveDisplayName(userId);
  return {
    title: 'New team update',
    body: `${name} submitted a ${cadenceLabel(cadence)} update.`,
    tag: id ? `update-${id}` : undefined,
    url: `/?cadence=${encodeURIComponent(cadence)}`,
  };
}

export async function notificationForCommentInsert(
  row: Record<string, unknown>,
): Promise<DesktopNotificationPayload | null> {
  const authorId = typeof row.author_id === 'string' ? row.author_id : null;
  const body = typeof row.body === 'string' ? row.body : '';
  const id = typeof row.id === 'string' ? row.id : undefined;
  if (!authorId) return null;

  const name = await resolveDisplayName(authorId);
  return {
    title: 'New comment',
    body: `${name}: ${truncate(body) || 'Replied on an update.'}`,
    tag: id ? `comment-${id}` : undefined,
    url: '/?cadence=daily',
  };
}

export async function notificationForRatingInsert(
  row: Record<string, unknown>,
): Promise<DesktopNotificationPayload | null> {
  const raterId = typeof row.rater_id === 'string' ? row.rater_id : null;
  const stars = typeof row.stars === 'number' ? row.stars : null;
  const id = typeof row.id === 'string' ? row.id : undefined;
  if (!raterId || stars == null) return null;

  const name = await resolveDisplayName(raterId);
  return {
    title: 'New mission rating',
    body: `${name} rated an update ${stars}★.`,
    tag: id ? `rating-${id}` : undefined,
    url: '/?cadence=daily',
  };
}

export async function notificationForCohortActivityInsert(
  row: Record<string, unknown>,
): Promise<DesktopNotificationPayload | null> {
  const userId = typeof row.user_id === 'string' ? row.user_id : null;
  const summary = typeof row.summary === 'string' ? row.summary : '';
  const cohortId = typeof row.cohort_id === 'string' ? row.cohort_id : null;
  const id = typeof row.id === 'string' ? row.id : undefined;
  if (!userId) return null;

  const name = await resolveDisplayName(userId);
  return {
    title: 'Mission Moments update',
    body: summary ? `${name}: ${truncate(summary)}` : `${name} updated a cohort.`,
    tag: id ? `cohort-activity-${id}` : undefined,
    url: cohortId ? missionMomentsPath(cohortId) : missionMomentsPath(),
  };
}
