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
        {index + 1}. {question}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} />
      <div className={`counter ${counter.className}`}>{counter.text}</div>
    </>
  );
}
