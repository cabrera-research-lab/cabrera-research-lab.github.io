import { seoGeoKeywordsPath } from '@/apps/seo-geo/constants';
import { hasKeywordDashboard } from '@/apps/seo-geo/lib/keywordConfig';
import { connectionLabel } from '@/apps/seo-geo/lib/keywordScore';
import type { KeywordCardStat } from '@/apps/seo-geo/lib/keywordTypes';
import type { PropertyId } from '@/apps/seo-geo/lib/types';

function formatPos(value: number): string {
  return value > 0 ? value.toFixed(1) : '—';
}

export function PropertyKeywordsStrip({
  propertyId,
  stat,
  onOpen,
}: {
  propertyId: PropertyId;
  stat: KeywordCardStat | null;
  onOpen: (path: string) => void;
}) {
  const enabled = hasKeywordDashboard(propertyId);
  const connected = stat?.connection?.status === 'connected';
  const totals = stat?.totals;

  return (
    <div className="seo-geo-card-keywords">
      <div className="seo-geo-card-keywords-top">
        <strong>Keywords</strong>
        <span
          className={`seo-geo-status-chip ${
            !enabled ? 'neutral' : connected ? 'ready' : stat?.connection?.status === 'error' ? 'bad' : 'neutral'
          }`}
        >
          {!enabled ? 'Not enabled' : connectionLabel(stat?.connection ?? null)}
        </span>
      </div>
      {enabled && (
        <>
          <div className="seo-geo-card-keywords-metrics">
            <span>
              <b>{totals ? totals.clicks.toLocaleString() : '—'}</b> clicks
            </span>
            <span>
              <b>{totals ? totals.impressions.toLocaleString() : '—'}</b> impr.
            </span>
            <span>
              <b>{totals && totals.position > 0 ? formatPos(totals.position) : '—'}</b> avg pos
            </span>
            <span>
              <b>{totals ? totals.queries.toLocaleString() : '—'}</b> queries
            </span>
          </div>
          <button
            type="button"
            className="seo-geo-refresh"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpen(seoGeoKeywordsPath(propertyId));
            }}
          >
            Open keywords
          </button>
        </>
      )}
    </div>
  );
}
