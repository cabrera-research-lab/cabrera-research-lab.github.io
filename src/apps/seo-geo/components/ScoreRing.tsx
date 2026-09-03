import { scoreStatusClass } from '@/apps/seo-geo/lib/healthScore';

export function ScoreRing({
  label,
  score,
  status,
}: {
  label: string;
  score: number | null;
  status?: string;
}) {
  const pct = score ?? 0;
  const tone = scoreStatusClass(score);
  return (
    <div className={`seo-geo-ring-wrap ${tone}`}>
      <div className="seo-geo-ring" style={{ ['--pct' as string]: pct }}>
        <span>{score == null ? '—' : score}</span>
      </div>
      <div>
        <strong>{label}</strong>
        <p className="seo-geo-small">{status ?? (score == null ? 'No snapshot yet' : '')}</p>
      </div>
    </div>
  );
}
