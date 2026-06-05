import type { ReactNode } from 'react';

const TEAM_BRAND_PARTS = new Set(['TE∆M', 'TE∆MING']);

/** Render TE∆M / TE∆MING in Montserrat so the delta matches surrounding letter weight. */
export function renderTeamBrand(text: string): ReactNode {
  const parts = text.split(/(TE∆MING|TE∆M)/g);
  return parts.map((part, i) =>
    TEAM_BRAND_PARTS.has(part) ? (
      <span key={i} className="team-mark">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
