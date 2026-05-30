import { useEffect, useState } from 'react';
import {
  formatPeriodLabel,
  latestArchivePeriodStart,
  periodStartForCadence,
  shiftPeriodStart,
} from '@/lib/periods';
import type { Cadence } from '@/lib/types';
import { FeedViewTabs, type FeedView } from './FeedViewTabs';
import { PeriodNavigator } from './PeriodNavigator';
import { TeamReport } from './TeamReport';

interface Props {
  cadence: Cadence;
  teamId: string | null;
  refreshKey: number;
  orgWide?: boolean;
  view: FeedView;
  onViewChange: (view: FeedView) => void;
}

export function ActivityFeed({
  cadence,
  teamId,
  refreshKey,
  orgWide = false,
  view,
  onViewChange,
}: Props) {
  const currentPeriod = periodStartForCadence(cadence);
  const [archivePeriod, setArchivePeriod] = useState(() => latestArchivePeriodStart(cadence));

  useEffect(() => {
    onViewChange('current');
    setArchivePeriod(latestArchivePeriodStart(cadence));
  }, [cadence, onViewChange]);

  const latestArchive = latestArchivePeriodStart(cadence);
  const canGoNext = archivePeriod < latestArchive;

  return (
    <>
      <FeedViewTabs
        active={view}
        currentLabel={formatPeriodLabel(cadence, currentPeriod)}
        onChange={onViewChange}
      />
      {view === 'archive' && (
        <PeriodNavigator
          label={formatPeriodLabel(cadence, archivePeriod)}
          onPrev={() => setArchivePeriod((p) => shiftPeriodStart(cadence, p, -1))}
          onNext={() => setArchivePeriod((p) => shiftPeriodStart(cadence, p, 1))}
          canNext={canGoNext}
        />
      )}
      <TeamReport
        cadence={cadence}
        teamId={teamId}
        refreshKey={refreshKey}
        orgWide={orgWide}
        periodStart={view === 'archive' ? archivePeriod : currentPeriod}
        archive={view === 'archive'}
      />
    </>
  );
}

export type { FeedView } from './FeedViewTabs';
