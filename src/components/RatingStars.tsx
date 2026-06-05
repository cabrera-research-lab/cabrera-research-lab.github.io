interface Props {
  average: number;
  onRate?: (stars: number) => void;
  readOnly?: boolean;
}

export function RatingStars({ average, onRate, readOnly = false }: Props) {
  const rounded = Math.round(average);
  return (
    <div className={`stars${readOnly ? ' stars--readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= rounded && average > 0 ? 'gold' : ''}`}
          onClick={readOnly ? undefined : () => onRate?.(n)}
          disabled={readOnly}
          aria-label={readOnly ? `Rated ${n}` : `Rate ${n}`}
        >
          M
        </button>
      ))}
    </div>
  );
}
