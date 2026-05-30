interface Props {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canNext: boolean;
}

export function PeriodNavigator({ label, onPrev, onNext, canNext }: Props) {
  return (
    <div className="period-nav">
      <button type="button" className="period-nav-btn" onClick={onPrev} aria-label="Previous period">
        ←
      </button>
      <div className="period-nav-label">{label}</div>
      <button
        type="button"
        className="period-nav-btn"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next period"
      >
        →
      </button>
    </div>
  );
}
