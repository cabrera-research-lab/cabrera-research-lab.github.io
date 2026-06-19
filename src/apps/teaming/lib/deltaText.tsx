import { Fragment, type ReactNode } from 'react';

/** Greek capital delta (U+0394) and increment sign (U+2206) — both used as the TE∆M mark. */
export const DELTA_CHARS = ['\u0394', '\u2206'] as const;

const DELTA_IN_TOKEN = `[${DELTA_CHARS.join('')}]`;
const DELTA_TOKEN = new RegExp(`(\\S*${DELTA_IN_TOKEN}\\S*)`, 'g');

export function hasDelta(text: string): boolean {
  return DELTA_CHARS.some((d) => text.includes(d));
}

function renderDeltaLine(line: string): ReactNode {
  const parts = line.split(DELTA_TOKEN);
  return parts.map((part, i) =>
    hasDelta(part) ? (
      <span key={i} className="team-mark">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Render any token containing ∆ (U+0394 or U+2206) in Montserrat so the delta matches surrounding letter weight. */
export function renderDeltaText(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => (
    <Fragment key={lineIdx}>
      {lineIdx > 0 ? '\n' : null}
      {renderDeltaLine(line)}
    </Fragment>
  ));
}

export function DeltaText({ children }: { children: string }) {
  return <>{renderDeltaText(children)}</>;
}
