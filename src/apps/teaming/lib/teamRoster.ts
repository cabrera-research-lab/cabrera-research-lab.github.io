/** Named owners for weekly, monthly, and quarterly priorities. */
export const TEAM_ROSTER = ['Dave', 'Derek', 'Elena', 'Laura', 'Sree'] as const;

export type TeamRosterName = (typeof TEAM_ROSTER)[number];

export function ownerOptions(current?: string): string[] {
  const names: string[] = [...TEAM_ROSTER];
  const extra = current?.trim();
  if (extra && !names.includes(extra)) names.push(extra);
  return names;
}
