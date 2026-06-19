import type { Cadence, PriorityCadence } from './types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar day as YYYY-MM-DD (local). */
export function dailyPeriodStart(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ISO week Monday as YYYY-MM-DD */
export function weeklyPeriodStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthlyPeriodStart(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
}

export function quarterlyPeriodStart(date = new Date()): string {
  const q = Math.floor(date.getMonth() / 3) * 3;
  return `${date.getFullYear()}-${pad(q + 1)}-01`;
}

export function periodStartForCadence(cadence: Cadence, date = new Date()): string {
  if (cadence === 'daily') return dailyPeriodStart(date);
  if (cadence === 'weekly') return weeklyPeriodStart(date);
  if (cadence === 'monthly') return monthlyPeriodStart(date);
  return quarterlyPeriodStart(date);
}

export function periodStartForPriority(cadence: PriorityCadence, date = new Date()): string {
  if (cadence === 'weekly') return weeklyPeriodStart(date);
  if (cadence === 'monthly') return monthlyPeriodStart(date);
  return quarterlyPeriodStart(date);
}

/** Inclusive start, exclusive end (ISO strings for Supabase). */
export function periodRange(
  cadence: Cadence,
  periodStart: string,
): { from: string; to: string } {
  const start = parseLocalDate(periodStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (cadence === 'daily') end.setDate(end.getDate() + 1);
  else if (cadence === 'weekly') end.setDate(end.getDate() + 7);
  else if (cadence === 'monthly') end.setMonth(end.getMonth() + 1);
  else end.setMonth(end.getMonth() + 3);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function shiftPeriodStart(cadence: Cadence, periodStart: string, delta: number): string {
  const d = parseLocalDate(periodStart);
  if (cadence === 'daily') d.setDate(d.getDate() + delta);
  else if (cadence === 'weekly') d.setDate(d.getDate() + 7 * delta);
  else if (cadence === 'monthly') d.setMonth(d.getMonth() + delta);
  else d.setMonth(d.getMonth() + 3 * delta);
  return periodStartForCadence(cadence, d);
}

export function formatPeriodLabel(cadence: Cadence, periodStart: string): string {
  const d = parseLocalDate(periodStart);
  if (cadence === 'daily') {
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (cadence === 'weekly') {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (cadence === 'monthly') {
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

export function latestArchivePeriodStart(cadence: Cadence, date = new Date()): string {
  return shiftPeriodStart(cadence, periodStartForCadence(cadence, date), -1);
}

export function cadenceToPriorityParent(cadence: Cadence): PriorityCadence | null {
  if (cadence === 'daily') return 'weekly';
  if (cadence === 'weekly') return 'monthly';
  if (cadence === 'monthly') return 'quarterly';
  return null;
}

/** Daily and weekly activity is visible to all signed-in users, across teams. */
export function isOrgWideFeedCadence(cadence: Cadence): boolean {
  return cadence === 'daily' || cadence === 'weekly';
}
