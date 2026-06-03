interface Props {
  label: string;
  sub: string;
}

export function StepBanner({ label, sub }: Props) {
  return (
    <div className="step-banner">
      <div className="step-label">{label}</div>
      <div className="step-sub">{sub}</div>
    </div>
  );
}
