import { missionLabel } from '@/hooks/useCharBand';
import { MISSION_QUESTION } from '@/lib/cadenceConfig';

interface Props {
  score: number;
  onRate: (n: number) => void;
}

export function MissionRating({ score, onRate }: Props) {
  return (
    <>
      <div className="q">4. {MISSION_QUESTION}</div>
      <div className="mini" style={{ margin: '0 0 10px' }}>
        Rate from 1–5 Ms based on how strongly your tasks support our &quot;rave and refer&quot;
        Mission.
      </div>
      <div className="stars" style={{ marginBottom: 14 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star ${n <= score ? 'gold' : ''}`}
            onClick={() => onRate(n)}
            aria-label={`Rate ${n} of 5`}
          >
            M
          </button>
        ))}
      </div>
      <div className={`counter ${score > 0 ? 'concise' : 'concise'}`}>{missionLabel(score)}</div>
    </>
  );
}
