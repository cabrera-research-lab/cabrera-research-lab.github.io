import { CHAR_LIMIT } from '@/apps/teaming/lib/cadenceConfig';

export type CharBandClass = 'anemic' | 'concise' | 'ideal' | 'long' | 'verbose';

export function band(length: number): [CharBandClass, string] {
  if (length <= 100) return ['anemic', 'anemic'];
  if (length <= 350) return ['concise', 'concise'];
  if (length <= CHAR_LIMIT) return ['ideal', 'ideal'];
  if (length <= 700) return ['long', 'getting long'];
  return ['verbose', 'too verbose'];
}

export function formatCounter(length: number): { className: CharBandClass; text: string } {
  const [cls, label] = band(length);
  return {
    className: cls,
    text: `${length} / ${CHAR_LIMIT} chars · ${label}`,
  };
}

export function missionLabel(score: number): string {
  if (score === 0) return '0 / 5 Ms · not rated';
  let alignment = 'low alignment';
  if (score >= 4) alignment = 'high alignment';
  else if (score >= 3) alignment = 'moderate alignment';
  return `${score} / 5 Ms · ${alignment}`;
}
