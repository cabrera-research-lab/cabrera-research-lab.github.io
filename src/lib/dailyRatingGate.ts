/** Email local parts (profiles.username) expected to submit daily before Step 3 opens. */
const DEFAULT_REQUIRED_USERNAMES = ['elena', 'sreek', 'daves', 'derekc', 'laurac'];

const ET_TIMEZONE = 'America/New_York';
const RATING_OPEN_HOUR_ET = 12;

export function getRequiredDailyUsernames(): string[] {
  const raw = (import.meta.env.VITE_DAILY_RATING_REQUIRED_USERS as string | undefined)?.trim();
  if (!raw) return [...DEFAULT_REQUIRED_USERNAMES];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** True when local time in US Eastern is 12:00 PM or later (handles DST). */
export function isAfterDailyRatingTimeEt(date = new Date()): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ET_TIMEZONE,
      hour: 'numeric',
      hour12: false,
    }).format(date),
  );
  return hour >= RATING_OPEN_HOUR_ET;
}

export function isDailyRatingGateOpen(
  submittedUsernames: Set<string>,
  date = new Date(),
): boolean {
  if (isAfterDailyRatingTimeEt(date)) return true;
  const required = getRequiredDailyUsernames();
  if (!required.length) return true;
  return required.every((u) => submittedUsernames.has(u));
}

export function getPendingDailyUsernames(submittedUsernames: Set<string>): string[] {
  return getRequiredDailyUsernames().filter((u) => !submittedUsernames.has(u));
}
