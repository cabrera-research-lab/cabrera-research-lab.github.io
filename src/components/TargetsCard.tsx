interface Props {
  label: string;
  text: string;
}

export function TargetsCard({ label, text }: Props) {
  return (
    <div className="goal-card targets-highlight">
      <label>{label}</label>
      <div className="text">{text}</div>
    </div>
  );
}
