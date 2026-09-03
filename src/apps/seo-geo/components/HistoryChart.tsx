import type { SnapshotRow } from '@/apps/seo-geo/lib/snapshotApi';

export function HistoryChart({ rows }: { rows: SnapshotRow[] }) {
  const chronological = [...rows].reverse();
  if (chronological.length === 0) {
    return <p className="seo-geo-small">No snapshots yet. Run the collector workflow to start the trend.</p>;
  }

  return (
    <div className="seo-geo-history">
      {chronological.map((row) => {
        const when = new Date(row.fetchedAt);
        const label = Number.isNaN(when.getTime())
          ? row.fetchedAt
          : when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return (
          <div key={row.id} className="seo-geo-history-col" title={`${label} · SEO ${row.health.seo.score} · GEO ${row.health.geo.score}`}>
            <div className="seo-geo-bars">
              <span className="seo-geo-bar seo" style={{ height: `${row.health.seo.score}%` }} />
              <span className="seo-geo-bar geo" style={{ height: `${row.health.geo.score}%` }} />
            </div>
            <span className="seo-geo-history-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
