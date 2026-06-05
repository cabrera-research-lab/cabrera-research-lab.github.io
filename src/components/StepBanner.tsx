interface Props {
  label: string;
  sub: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function StepBanner({ label, sub, collapsed, onToggle }: Props) {
  const collapsible = Boolean(onToggle);

  const content = (
    <>
      <div className="step-label">{label}</div>
      <div className="step-sub">{sub}</div>
    </>
  );

  if (!collapsible) {
    return <div className="step-banner">{content}</div>;
  }

  return (
    <button
      type="button"
      className={`step-banner step-banner--collapsible${collapsed ? ' step-banner--collapsed' : ''}`}
      onClick={onToggle}
      aria-expanded={!collapsed}
    >
      <span className="step-chevron" aria-hidden>
        ▾
      </span>
      {content}
    </button>
  );
}
