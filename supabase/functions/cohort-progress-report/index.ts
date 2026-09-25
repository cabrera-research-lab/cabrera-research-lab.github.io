/**
 * Build a saved Mission Moments cohort progress report.
 * The practice.stsi secret stays in this function. The browser sends only a cohort id.
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COHORT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EMAILS = 500;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function emailsFromCohort(cohort: unknown): string[] {
  if (!cohort || typeof cohort !== 'object') return [];
  const raw = (cohort as { emails?: unknown }).emails;
  if (typeof raw !== 'string') return [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\n,;]+/)) {
    const token = part.trim();
    if (!token) continue;
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(token);
    if (emails.length >= MAX_EMAILS) break;
  }
  return emails;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Use POST' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const reportUrl = Deno.env.get('PRACTICE_COHORT_REPORT_URL');
  const reportSecret = Deno.env.get('COHORT_REPORT_API_SECRET');
  if (!supabaseUrl || !anonKey) {
    return json(500, { error: 'Function is missing Supabase secrets' });
  }
  if (!reportUrl || !reportSecret) {
    return json(500, { error: 'Activity report service is not configured' });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) return json(401, { error: 'Sign in to generate a report' });

  const userRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: anonKey },
  });
  if (!userRes.ok) return json(401, { error: 'Sign in to generate a report' });

  let cohortId = '';
  try {
    const body = (await req.json()) as { cohortId?: unknown };
    if (typeof body?.cohortId === 'string') cohortId = body.cohortId.trim();
  } catch {
    return json(400, { error: 'Request body must be JSON' });
  }
  if (!COHORT_ID.test(cohortId)) {
    return json(400, { error: 'Save the cohort before generating a report' });
  }

  const cohortRes = await fetch(
    `${supabaseUrl.replace(/\/$/, '')}/rest/v1/mission_moments_cohorts?id=eq.${cohortId}&select=company,start_date,cohort`,
    {
      headers: {
        Authorization: auth,
        apikey: anonKey,
        Accept: 'application/json',
      },
    },
  );
  if (!cohortRes.ok) {
    return json(502, { error: 'Could not load the saved cohort' });
  }
  const rows = (await cohortRes.json()) as Array<{
    company?: string | null;
    start_date?: string | null;
    cohort?: unknown;
  }>;
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) return json(404, { error: 'Cohort not found' });

  const emails = emailsFromCohort(row.cohort);
  if (!emails.length) {
    return json(400, { error: 'This cohort has no saved email list' });
  }

  const company = (row.company || '').trim();
  const dateFrom = typeof row.start_date === 'string' ? row.start_date : '';
  const title = company ? `${company} PST®-SA Progress Report` : 'PST®-SA Progress Report';

  let practiceRes: Response;
  try {
    practiceRes = await fetch(reportUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${reportSecret}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title,
        company,
        date_from: dateFrom || null,
        date_to: null,
        emails,
      }),
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    return json(502, { error: 'Could not reach the practice report service' });
  }

  let practiceBody: { error?: unknown; filename?: unknown; docx_base64?: unknown } = {};
  try {
    practiceBody = await practiceRes.json();
  } catch {
    practiceBody = {};
  }
  if (!practiceRes.ok) {
    if (practiceRes.status === 401 || practiceRes.status === 503) {
      return json(502, { error: 'Activity report service is not configured' });
    }
    const message =
      typeof practiceBody.error === 'string' && practiceBody.error
        ? practiceBody.error
        : 'Practice report service could not build the report';
    return json(practiceRes.status, { error: message });
  }
  if (typeof practiceBody.filename !== 'string' || typeof practiceBody.docx_base64 !== 'string') {
    return json(502, { error: 'Practice report service returned an incomplete document' });
  }

  return json(200, {
    filename: practiceBody.filename,
    docx_base64: practiceBody.docx_base64,
  });
});
