import { CHAR_LIMIT } from '@/apps/teaming/lib/cadenceConfig';

export type CharBandClass = 'anemic' | 'concise' | 'ideal' | 'long' | 'verbose';

export function band(length: number): [CharBandClass, string] {
  if (length < 60) return ['anemic', 'too thin'];
  if (length < 200) return ['concise', 'concise'];
  if (length <= 450) return ['ideal', 'ideal'];
  if (length <= CHAR_LIMIT) return ['long', 'getting long'];
  return ['verbose', 'over limit'];
}

export function formatCounter(length: number): {
  className: CharBandClass;
  label: string;
  text: string;
} {
  const [cls, label] = band(length);
  return {
    className: cls,
    label,
    text: `${length} / ${CHAR_LIMIT} · ${label}`,
  };
}

export function missionLabel(score: number): string {
  if (score === 0) return '0 / 5 Ms · not rated';
  let alignment = 'low alignment';
  if (score >= 4) alignment = 'high alignment';
  else if (score >= 3) alignment = 'moderate alignment';
  return `${score} / 5 Ms · ${alignment}`;
}
