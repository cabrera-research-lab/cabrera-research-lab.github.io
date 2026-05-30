export type FeedView = 'current' | 'archive';

interface Props {
  active: FeedView;
  currentLabel: string;
  onChange: (view: FeedView) => void;
}

export function FeedViewTabs({ active, currentLabel, onChange }: Props) {
  return (
    <div className="feed-view-tabs">
      <button
        type="button"
        className={`feed-view-tab ${active === 'current' ? 'active' : ''}`}
        onClick={() => onChange('current')}
      >
        Current
        <span className="feed-view-sub">{currentLabel}</span>
      </button>
      <button
        type="button"
        className={`feed-view-tab ${active === 'archive' ? 'active' : ''}`}
        onClick={() => onChange('archive')}
      >
        Archive
        <span className="feed-view-sub">past periods</span>
      </button>
    </div>
  );
}
