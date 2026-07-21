import { CHAR_LIMIT } from '@/apps/teaming/lib/cadenceConfig';
import { formatCounter } from '@/apps/teaming/hooks/useCharBand';

interface Props {
  question: string;
  index: number;
  value: string;
  onChange: (value: string) => void;
}

export function CharTextarea({ question, index, value, onChange }: Props) {
  const counter = formatCounter(value.length);
  return (
    <>
      <div className="q">
        <span className="n">{String(index + 1).padStart(2, '0')}</span>
        {question}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your response…"
      />
      <div className="counter">
        <span className={`band ${counter.className}`}>{counter.label}</span>
        <span className="counter-count">
          {value.length} / {CHAR_LIMIT}
        </span>
      </div>
    </>
  );
}
