/** Base path for Mission Moments routes (cohort QC applet). */
export const MISSION_MOMENTS_BASE = '/mission-moments';

export function missionMomentsPath(suffix = ''): string {
  if (!suffix || suffix === '/') return MISSION_MOMENTS_BASE;
  return `${MISSION_MOMENTS_BASE}/${suffix.replace(/^\//, '')}`;
}

export function missionMomentsLoginPath(): string {
  return `/login?next=${encodeURIComponent(MISSION_MOMENTS_BASE)}`;
}
