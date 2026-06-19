import type { CohortActivityEntry } from '@/lib/missionMomentsCohortApi';
import { buildSnapshotPreview, formatActivityChangeDetail } from '@/lib/cohortActivity';

type Props = {
  entries: CohortActivityEntry[];
  loading?: boolean;
  selectedId?: string | null;
  onSelect?: (entry: CohortActivityEntry | null) => void;
  onRestore?: (entry: CohortActivityEntry) => void;
};

export function CohortActivityLog({
  entries,
  loading,
  selectedId,
  onSelect,
  onRestore,
}: Props) {
  const selected = selectedId ? entries.find((entry) => entry.id === selectedId) : null;
  const snapshot = selected?.snapshotAfter;

  return (
    <section className="b2b-qc-card b2b-qc-full">
      <h2>Activity log</h2>
      <p className="b2b-qc-small">
        Select an entry to preview that saved version and restore it if needed.
      </p>

      {loading && <p className="b2b-qc-small">Loading activity…</p>}

      {!loading && entries.length === 0 && (
        <p className="b2b-qc-small">No activity yet. Save cohort QC to record the first entry.</p>
      )}

      {entries.length > 0 && (
        <ul className="b2b-qc-activity">
          {entries.map((entry) => {
            const isSelected = entry.id === selectedId;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`b2b-qc-activity-item${isSelected ? ' selected' : ''}${
                    entry.snapshotAfter ? '' : ' no-snapshot'
                  }`}
                  onClick={() => onSelect?.(isSelected ? null : entry)}
                >
                  <div className="b2b-qc-activity-head">
                    <strong>{entry.userName}</strong>
                    <span className="b2b-qc-small">{entry.createdAt}</span>
                  </div>
                  <p className="b2b-qc-activity-summary">{entry.summary}</p>
                  {entry.changes.length > 0 && (
                    <ul className="b2b-qc-activity-changes">
                      {entry.changes.map((change) => (
                        <li key={`${entry.id}-${change.field}`}>
                          <b>{change.label}</b>
                          <span>{formatActivityChangeDetail(change)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!entry.snapshotAfter && (
                    <p className="b2b-qc-small b2b-qc-activity-note">
                      Snapshot unavailable — save again to enable restore.
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && snapshot && (
        <div className="b2b-qc-activity-preview">
          <div className="b2b-qc-activity-preview-head">
            <h3>Version from {selected.createdAt}</h3>
            <p className="b2b-qc-small">
              Saved by {selected.userName}. Restore loads this version into the form — save to
              persist.
            </p>
          </div>
          <dl className="b2b-qc-activity-preview-grid">
            {buildSnapshotPreview(snapshot).map((line) => (
              <div key={line.label}>
                <dt>{line.label}</dt>
                <dd>{line.value}</dd>
              </div>
            ))}
          </dl>
          <div className="b2b-qc-actions">
            <button type="button" onClick={() => onRestore?.(selected)}>
              Restore to this version
            </button>
            <button type="button" className="secondary" onClick={() => onSelect?.(null)}>
              Clear selection
            </button>
          </div>
        </div>
      )}

      {selected && !snapshot && (
        <div className="b2b-qc-activity-preview muted">
          <p className="b2b-qc-small">
            This entry has no stored snapshot. New saves include snapshots for restore.
          </p>
          <div className="b2b-qc-actions">
            <button type="button" className="secondary" onClick={() => onSelect?.(null)}>
              Clear selection
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
