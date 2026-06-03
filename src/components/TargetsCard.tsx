interface Props {
  label: string;
  text: string;
  empty?: string;
}

export function TargetsCard({ label, text, empty }: Props) {
  const isEmpty = empty != null && text === empty;
  return (
    <div className="goal-card target">
      <label>{label}</label>
      <div className={`text ${isEmpty ? 'empty' : ''}`}>{text}</div>
    </div>
  );
}
