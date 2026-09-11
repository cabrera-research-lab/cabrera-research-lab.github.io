import type { PropertyId } from '@/apps/seo-geo/lib/types';

export function RefreshButton({
  propertyId,
  busy,
  onRefresh,
}: {
  propertyId: PropertyId | 'all';
  busy: boolean;
  onRefresh: (propertyId: PropertyId | 'all') => void;
}) {
  return (
    <button
      type="button"
      className="seo-geo-refresh"
      disabled={busy}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRefresh(propertyId);
      }}
    >
      {busy ? 'Refreshing…' : propertyId === 'all' ? 'Refresh all' : 'Refresh'}
    </button>
  );
}
