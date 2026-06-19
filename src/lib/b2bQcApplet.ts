export const BELTS = [
  'White Belt',
  'Yellow Belt',
  'Blue Belt - PST®',
  'Black Belt (GOAT Slate)',
] as const;

export type Belt = (typeof BELTS)[number];

export const BELT_SHORT: Record<Belt, string> = {
  'White Belt': 'WB',
  'Yellow Belt': 'YB',
  'Blue Belt - PST®': 'BB / PST®',
  'Black Belt (GOAT Slate)': 'Black Belt',
};

export type CheckState = 'pass' | 'warn' | 'fail';

export type QcCheck = {
  name: string;
  detail: string;
  state: CheckState;
};

export const PROMISED_PRODUCTS = [
  'Dedicated cohort space',
  'TQ rollup',
  'Training-level link',
  'Buyer-ready email template',
] as const;

export type PromisedProduct = (typeof PROMISED_PRODUCTS)[number];

export type CohortForm = {
  company: string;
  qty: string;
  startDate: string;
  startBelt: Belt;
  finishBelt: Belt;
  wbTime: string;
  ybTime: string;
  bbTime: string;
  products: PromisedProduct[];
  notes: string;
  senderName: string;
  senderTitle: string;
  senderEmail: string;
  companyContactName: string;
  companyContactEmail: string;
  emails: string;
};

export type FinalCheck = {
  testUserEmail: string;
  cohortLink: string;
  finalCheckOwner: string;
  linkOpens: boolean;
  newUserSignup: boolean;
  landsStartBelt: boolean;
  pathVisible: boolean;
  domainsWhitelisted: boolean;
  vpnSecurityConfirmed: boolean;
  buyerReady: boolean;
};

export type QcResult = {
  checks: QcCheck[];
  score: number;
  status: string;
  summary: string;
  validEmails: string[];
  path: Belt[];
};

export const DEFAULT_COHORT: CohortForm = {
  company: '',
  qty: '100',
  startDate: '',
  startBelt: 'Blue Belt - PST®',
  finishBelt: 'Blue Belt - PST®',
  wbTime: 'Day 1',
  ybTime: 'Week 1',
  bbTime: 'Week 2',
  products: [...PROMISED_PRODUCTS],
  notes: 'Email list → Sree creates link → Laura sends to buyer → buyer sends to users.',
  senderName: '',
  senderTitle: '',
  senderEmail: '',
  companyContactName: '',
  companyContactEmail: '',
  emails: '',
};

export const DEFAULT_FINAL_CHECK: FinalCheck = {
  testUserEmail: '',
  cohortLink: '',
  finalCheckOwner: '',
  linkOpens: false,
  newUserSignup: false,
  landsStartBelt: false,
  pathVisible: false,
  domainsWhitelisted: false,
  vpnSecurityConfirmed: false,
  buyerReady: false,
};

export function parseEmails(raw: string): string[] {
  return raw
    .split(/[\n,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function computePath(startBelt: Belt, finishBelt: Belt): Belt[] {
  const a = BELTS.indexOf(startBelt);
  const b = BELTS.indexOf(finishBelt);
  if (a < 0 || b < 0) return [];
  if (a > b) return BELTS.slice(b, a + 1).reverse();
  return BELTS.slice(a, b + 1);
}

export function makeBuyerEmailTemplate(form: CohortForm, cohortLink = ''): string {
  const path = computePath(form.startBelt, form.finishBelt)
    .map((x) => BELT_SHORT[x])
    .join(' → ');
  const senderName = form.senderName || '[INTERNAL SENDER NAME]';
  const replyLine = form.senderEmail
    ? `If you land anywhere else, stop and reply to ${senderName} at ${form.senderEmail} before continuing.`
    : `If you land anywhere else, stop and reply to ${senderName} before continuing.`;

  return `Subject: ${form.company} training access — start here
From: ${senderName}${form.senderTitle ? ` — ${form.senderTitle}` : ''}${form.senderEmail ? ` <${form.senderEmail}>` : ''}

Hi everyone,

Welcome to your STSI training cohort. Please use the link below to sign in and begin at the correct training level.

Start here: ${cohortLink || '[INSERT COHORT LINK]'}

Your training path is: ${path}.

For this cohort, you will start at ${form.startBelt} and progress to ${form.finishBelt}. Please do not use an old Basecamp, White Belt, Yellow Belt, or Blue Belt link unless it is the exact cohort link above.

Expected start date: ${form.startDate || '[INSERT DATE]'}

What to expect:
- Sign in with the same email address that received this message.
- Confirm that the page shows ${form.startBelt} first.
- ${replyLine}

Thanks,
${senderName}${form.senderTitle ? `\n${form.senderTitle}` : ''}${form.senderEmail ? `\n${form.senderEmail}` : ''}`;
}

export function makeCompanyTechEmail(form: CohortForm): string {
  const contact = form.companyContactName || '[COMPANY CONTACT NAME]';
  const path = computePath(form.startBelt, form.finishBelt)
    .map((x) => BELT_SHORT[x])
    .join(' → ');

  return `Subject: ${form.company} cohort access requirements — please confirm before launch
From: Laura Cabrera <laura@stsi.pro>
To: ${contact}${form.companyContactEmail ? ` <${form.companyContactEmail}>` : ''}

Hi ${contact},

We are preparing the ${form.company} training cohort and want to make sure every participant can sign in smoothly on the first try.

Please confirm the following before the cohort start date: ${form.startDate || '[INSERT DATE]'}.

1. Browser support
Participants should use Google Chrome or Microsoft Edge only.

2. Domain allowlist
Please make sure these domains are whitelisted by your IT/network team:

- camp.stsi.pro
- practice.stsi.pro
- stsipractice.pro

3. VPNs and security software
If participants use a VPN, web filtering service, proxy, SSL inspection tool, security gateway, or endpoint security platform, please ensure that access to the STSI training domains is permitted.

VPNs and security tools can sometimes block authentication, redirect users, or prevent access to training content. For the smoothest experience, participants should disable VPNs during signup and initial login when possible, and access the training platform directly without proxy redirection.

4. Access flow
Participants will receive one cohort link. They should use the same email address that received the invitation and should land on the correct starting belt after sign-up.

For this cohort, the expected path is:
${path}

The starting belt is:
${form.startBelt}

Please reply once your team has confirmed the browser and domain requirements.

Thank you,
Laura Cabrera
STSI / GO∆TNET`;
}

export function runQc(form: CohortForm, finalCheck: FinalCheck): QcResult {
  const parsed = parseEmails(form.emails);
  const valid = parsed.filter(isValidEmail);
  const qty = Number(form.qty);
  const path = computePath(form.startBelt, form.finishBelt);
  const checks: QcCheck[] = [];
  let pts = 0;
  const total = 14;

  const hasCompany = form.company.length > 1;
  checks.push({
    name: 'Company named',
    detail: hasCompany ? 'Cohort label is clear.' : 'Add company/cohort name before creating links.',
    state: hasCompany ? 'pass' : 'fail',
  });
  if (hasCompany) pts++;

  const qtyOK = qty > 0;
  checks.push({
    name: 'Quantity set',
    detail: qtyOK ? `${qty} expected users.` : 'Add expected user count.',
    state: qtyOK ? 'pass' : 'fail',
  });
  if (qtyOK) pts++;

  const dateOK = !!form.startDate;
  checks.push({
    name: 'Start date set',
    detail: dateOK ? `Kickoff date is ${form.startDate}.` : 'Add the Monday kickoff date/timeframe.',
    state: dateOK ? 'pass' : 'fail',
  });
  if (dateOK) pts++;

  const pathOK = path.length > 0;
  checks.push({
    name: 'Belt path explicit',
    detail: pathOK ? `Path: ${path.map((x) => BELT_SHORT[x]).join(' → ')}.` : 'Choose start and finish belt.',
    state: pathOK ? 'pass' : 'fail',
  });
  if (pathOK) pts++;

  const emailsOK = parsed.length > 0 && valid.length === parsed.length;
  checks.push({
    name: 'Email list clean',
    detail: emailsOK
      ? `${valid.length} valid emails parsed.`
      : parsed.length
        ? `${valid.length}/${parsed.length} look valid. Fix malformed emails.`
        : 'Paste/upload the buyer user list before sending.',
    state: emailsOK ? 'pass' : parsed.length ? 'warn' : 'fail',
  });
  if (emailsOK) pts++;

  const mismatch = Math.abs(valid.length - qty);
  const qtyMatch = valid.length > 0 && mismatch === 0;
  checks.push({
    name: 'Quantity matches email list',
    detail: qtyMatch
      ? 'Email count matches expected quantity.'
      : valid.length
        ? `Expected ${qty}; parsed ${valid.length}. Reconcile before launch.`
        : 'Cannot verify until email list is added.',
    state: qtyMatch ? 'pass' : valid.length ? 'warn' : 'fail',
  });
  if (qtyMatch) pts++;

  const productsOK = form.products.length > 0;
  checks.push({
    name: 'Products promised',
    detail: productsOK
      ? `${form.products.length} selected: ${form.products.join(', ')}.`
      : 'Select at least one customer-facing product.',
    state: productsOK ? 'pass' : 'fail',
  });
  if (productsOK) pts++;

  const linkOK = finalCheck.linkOpens;
  checks.push({
    name: 'Final check: link destination',
    detail: linkOK
      ? 'Email link opens the correct cohort/training page.'
      : 'Internally test the exact email link before buyer send.',
    state: linkOK ? 'pass' : 'fail',
  });
  if (linkOK) pts++;

  const signupOK = finalCheck.newUserSignup;
  checks.push({
    name: 'Final check: new-user signup',
    detail: signupOK
      ? 'Fresh-user signup/sign-in works cleanly.'
      : 'Test with a fresh/new-user email.',
    state: signupOK ? 'pass' : 'fail',
  });
  if (signupOK) pts++;

  const landingOK = finalCheck.landsStartBelt;
  checks.push({
    name: 'Final check: starting belt landing',
    detail: landingOK
      ? 'New user lands on the selected starting belt.'
      : 'Confirm signup lands on the starting belt, not Basecamp or another belt.',
    state: landingOK ? 'pass' : 'fail',
  });
  if (landingOK) pts++;

  const pathVisibleOK = finalCheck.pathVisible;
  checks.push({
    name: 'Final check: path clarity',
    detail: pathVisibleOK
      ? 'The belt path is visible and clear to the user.'
      : 'Confirm the path sentence/visualization is visible after signup.',
    state: pathVisibleOK ? 'pass' : 'fail',
  });
  if (pathVisibleOK) pts++;

  const domainsOK = finalCheck.domainsWhitelisted;
  checks.push({
    name: 'Final check: domain whitelist',
    detail: domainsOK
      ? 'Required domains are whitelisted: camp.stsi.pro, practice.stsi.pro, stsipractice.pro.'
      : 'Confirm IT has whitelisted camp.stsi.pro, practice.stsi.pro, and stsipractice.pro.',
    state: domainsOK ? 'pass' : 'fail',
  });
  if (domainsOK) pts++;

  const vpnOK = finalCheck.vpnSecurityConfirmed;
  checks.push({
    name: 'Final check: VPN/security filtering',
    detail: vpnOK
      ? 'VPNs, proxies, filters, SSL inspection, and endpoint security will not block access.'
      : 'Confirm VPN/security filtering will not block authentication or training access.',
    state: vpnOK ? 'pass' : 'fail',
  });
  if (vpnOK) pts++;

  const buyerReadyOK = finalCheck.buyerReady;
  checks.push({
    name: 'Final check: buyer-ready email',
    detail: buyerReadyOK
      ? 'Buyer-facing email is ready to forward.'
      : 'Confirm sender info and verified link are in the template.',
    state: buyerReadyOK ? 'pass' : 'fail',
  });
  if (buyerReadyOK) pts++;

  const score = Math.round((pts / total) * 100);
  const status = score === 100 ? 'Ready to send' : score >= 75 ? 'Fix minor friction' : 'Do not send yet';
  const summary =
    score === 100
      ? 'This cohort has a clean first-click path and buyer-ready instructions.'
      : 'Resolve the flagged items before Laura sends the link to the buyer.';

  return { checks, score, status, summary, validEmails: valid, path };
}

export function makeFinalCheckSummary(form: CohortForm, finalCheck: FinalCheck): string {
  return `Final Check — Internal First-Click Test
Company/Cohort: ${form.company}
Test user email: ${finalCheck.testUserEmail || '[not entered]'}
Cohort link tested: ${finalCheck.cohortLink || '[not entered]'}
Final check owner: ${finalCheck.finalCheckOwner || '[not entered]'}

Checked:
1. Email link opens correct destination: ${finalCheck.linkOpens ? 'YES' : 'NO'}
2. New-user signup works: ${finalCheck.newUserSignup ? 'YES' : 'NO'}
3. New user lands on starting belt (${form.startBelt}): ${finalCheck.landsStartBelt ? 'YES' : 'NO'}
4. Belt path is visible and clear: ${finalCheck.pathVisible ? 'YES' : 'NO'}
5. Required domains whitelisted: ${finalCheck.domainsWhitelisted ? 'YES' : 'NO'}
6. VPN / security filtering confirmed: ${finalCheck.vpnSecurityConfirmed ? 'YES' : 'NO'}
7. Buyer email is ready to forward: ${finalCheck.buyerReady ? 'YES' : 'NO'}`;
}

export function buildQcRecord(form: CohortForm, finalCheck: FinalCheck) {
  return {
    company: form.company,
    quantity: form.qty,
    internalSender: {
      name: form.senderName,
      title: form.senderTitle,
      email: form.senderEmail,
    },
    companyContact: {
      name: form.companyContactName,
      email: form.companyContactEmail,
    },
    startDate: form.startDate,
    startBelt: form.startBelt,
    finishBelt: form.finishBelt,
    path: computePath(form.startBelt, form.finishBelt),
    timeframes: {
      whiteBelt: form.wbTime,
      yellowBelt: form.ybTime,
      blueBelt: form.bbTime,
    },
    products: form.products,
    notes: form.notes,
    emails: parseEmails(form.emails),
    finalCheck,
    generatedAt: new Date().toISOString(),
  };
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function downloadQcRecord(form: CohortForm, finalCheck: FinalCheck): void {
  const record = buildQcRecord(form, finalCheck);
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(form.company || 'cohort').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_qc_record.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
