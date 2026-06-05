import { Fragment, type ReactNode } from 'react';

export const DELTA = '\u0394';

const DELTA_TOKEN = new RegExp(`(\\S*${DELTA}\\S*)`, 'g');

function tokenHasDelta(token: string): boolean {
  return token.includes(DELTA);
}

function renderDeltaLine(line: string): ReactNode {
  const parts = line.split(DELTA_TOKEN);
  return parts.map((part, i) =>
    tokenHasDelta(part) ? (
      <span key={i} className="team-mark">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** Render any token containing U+0394 (∆) in Montserrat so the delta matches surrounding letter weight. */
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