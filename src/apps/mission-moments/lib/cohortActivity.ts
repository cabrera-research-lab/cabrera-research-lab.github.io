import { parseEmails, type CohortForm, type FinalCheck } from './qcApplet';

export type CohortSnapshot = {
  cohort: CohortForm;
  qc: FinalCheck;
};

export type CohortActivityChange = {
  field: string;
  label: string;
  from: string;
  to: string;
};

const COHORT_LABELS: Record<keyof CohortForm, string> = {
  company: 'Company',
  qty: 'Quantity',
  startDate: 'Start date',
  startBelt: 'Start belt',
  finishBelt: 'Finish belt',
  wbTime: 'WB timeframe',
  ybTime: 'YB timeframe',
  bbTime: 'BB timeframe',
  products: 'Products promised',
  notes: 'Notes',
  senderName: 'Sender name',
  senderTitle: 'Sender title',
  senderEmail: 'Sender email',
  companyContactName: 'Company contact',
  companyContactEmail: 'Company contact email',
  emails: 'Email list',
};

const QC_LABELS: Record<keyof FinalCheck, string> = {
  testUserEmail: 'Test user email',
  cohortLink: 'Cohort link',
  finalCheckOwner: 'Final check owner',
  linkOpens: 'Link destination verified',
  newUserSignup: 'New-user signup verified',
  landsStartBelt: 'Starting belt landing verified',
  pathVisible: 'Belt path visible',
  domainsWhitelisted: 'Domains whitelisted',
  vpnSecurityConfirmed: 'VPN / security confirmed',
  buyerReady: 'Buyer email ready',
};

function formatEmailCount(raw: unknown): string {
  const count = parseEmails(String(raw ?? '')).length;
  if (count === 0) return '0 emails';
  if (count === 1) return '1 email';
  return `${count} emails`;
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  const text = String(value).trim();
  return text || '—';
}

function pushChange(
  changes: CohortActivityChange[],
  field: string,
  label: string,
  from: unknown,
  to: unknown,
) {
  const fromText = formatValue(from);
  const toText = formatValue(to);
  if (fromText === toText) return;
  changes.push({ field, label, from: fromText, to: toText });
}

function pushCohortChange(
  changes: CohortActivityChange[],
  key: keyof CohortForm,
  before: CohortForm | undefined,
  after: CohortForm,
) {
  if (key === 'emails') {
    const fromText = formatEmailCount(before?.emails);
    const toText = formatEmailCount(after.emails);
    if (fromText === toText) return;
    changes.push({ field: key, label: COHORT_LABELS[key], from: fromText, to: toText });
    return;
  }

  pushChange(changes, key, COHORT_LABELS[key], before?.[key], after[key]);
}

export function buildCohortActivityDiff(
  before: CohortSnapshot | null,
  afterCohort: CohortForm,
  afterQc: FinalCheck,
): CohortActivityChange[] {
  const changes: CohortActivityChange[] = [];
  const beforeCohort = before?.cohort;
  const beforeQc = before?.qc;

  for (const key of Object.keys(COHORT_LABELS) as (keyof CohortForm)[]) {
    pushCohortChange(changes, key, beforeCohort, afterCohort);
  }

  for (const key of Object.keys(QC_LABELS) as (keyof FinalCheck)[]) {
    pushChange(changes, key, QC_LABELS[key], beforeQc?.[key], afterQc[key]);
  }

  return changes;
}

export function sanitizeActivityChanges(changes: CohortActivityChange[]): CohortActivityChange[] {
  return changes
    .filter((change) => change.field !== 'qcScore' && change.field !== 'qcStatus')
    .map((change) => {
      if (change.field !== 'emails') return change;
      return {
        ...change,
        from: formatEmailCountFromStored(change.from),
        to: formatEmailCountFromStored(change.to),
      };
    });
}

function formatEmailCountFromStored(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return '0 emails';
  if (/^\d+ emails?$/.test(trimmed)) return trimmed;
  const count = parseEmails(trimmed).length;
  if (count === 0) return '0 emails';
  if (count === 1) return '1 email';
  return `${count} emails`;
}

export function formatActivityChangeDetail(change: CohortActivityChange): string {
  if (change.field === 'emails') {
    if (change.from === '0 emails') return `Updated to ${change.to}`;
    return `${change.from} → ${change.to}`;
  }
  return `${change.from} → ${change.to}`;
}

export function buildActivityDisplaySummary(
  action: 'created' | 'updated',
  storedSummary: string,
  changes: CohortActivityChange[],
): string {
  if (action === 'created') return storedSummary;
  const sanitized = sanitizeActivityChanges(changes);
  if (!sanitized.length) return storedSummary.replace(/,?\s*QC score/gi, '').replace(/,?\s*QC status/gi, '').trim();
  return summarizeActivityChanges('updated', '', sanitized);
}

export function summarizeActivityChanges(
  action: 'created' | 'updated',
  cohortName: string,
  changes: CohortActivityChange[],
): string {
  if (action === 'created') return `Created cohort ${cohortName}`;
  if (!changes.length) return `Updated ${cohortName}`;
  const labels = changes.map((c) => c.label);
  const preview = labels.slice(0, 4).join(', ');
  const extra = labels.length > 4 ? ` +${labels.length - 4} more` : '';
  return `Updated ${preview}${extra}`;
}

export type SnapshotPreviewLine = {
  label: string;
  value: string;
};

export function buildSnapshotPreview(snapshot: CohortSnapshot): SnapshotPreviewLine[] {
  const { cohort, qc } = snapshot;
  const emailCount = parseEmails(cohort.emails).length;
  const checksPassed = [
    qc.linkOpens,
    qc.newUserSignup,
    qc.landsStartBelt,
    qc.pathVisible,
    qc.domainsWhitelisted,
    qc.vpnSecurityConfirmed,
    qc.buyerReady,
  ].filter(Boolean).length;

  return [
    { label: 'Company', value: cohort.company.trim() || '—' },
    { label: 'Start date', value: cohort.startDate || '—' },
    { label: 'Quantity', value: cohort.qty || '—' },
    {
      label: 'Belts',
      value: `${cohort.startBelt} → ${cohort.finishBelt}`,
    },
    {
      label: 'Products',
      value: cohort.products.length ? cohort.products.join(', ') : '—',
    },
    {
      label: 'Emails',
      value: emailCount === 1 ? '1 email' : `${emailCount} emails`,
    },
    { label: 'Sender', value: cohort.senderName.trim() || '—' },
    { label: 'Test user', value: qc.testUserEmail.trim() || '—' },
    { label: 'Cohort link', value: qc.cohortLink.trim() || '—' },
    { label: 'Final checks', value: `${checksPassed} of 7 complete` },
  ];
}
