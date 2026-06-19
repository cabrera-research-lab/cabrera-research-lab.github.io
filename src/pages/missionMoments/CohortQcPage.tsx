import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MissionMomentsHeader } from '@/components/missionMoments/MissionMomentsHeader';
import {
  BELTS,
  BELT_SHORT,
  DEFAULT_COHORT,
  DEFAULT_FINAL_CHECK,
  PROMISED_PRODUCTS,
  type Belt,
  type CohortForm,
  type FinalCheck,
  type PromisedProduct,
  copyToClipboard,
  downloadQcRecord,
  makeBuyerEmailTemplate,
  makeCompanyTechEmail,
  makeFinalCheckSummary,
  runQc,
} from '@/lib/b2bQcApplet';
import { buildCohortName, getCohort, listCohortActivity, saveCohort } from '@/lib/missionMomentsCohortApi';
import type { CohortActivityEntry } from '@/lib/missionMomentsCohortApi';
import { CohortActivityLog } from '@/components/missionMoments/CohortActivityLog';
import { isSupabaseConfigured } from '@/lib/supabase';
import '@/styles/b2bQcApplet.css';

const FINAL_CHECK_KEYS: (keyof FinalCheck)[] = [
  'linkOpens',
  'newUserSignup',
  'landsStartBelt',
  'pathVisible',
  'domainsWhitelisted',
  'vpnSecurityConfirmed',
  'buyerReady',
];

const COHORT_CHECK_COUNT = 7;

function CheckIcon({ state }: { state: 'pass' | 'warn' | 'fail' }) {
  return state === 'pass' ? '✓' : state === 'warn' ? '!' : '×';
}

export function CohortQcPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const isNew = cohortId === 'new';

  const [form, setForm] = useState<CohortForm>(DEFAULT_COHORT);
  const [finalCheck, setFinalCheck] = useState<FinalCheck>(DEFAULT_FINAL_CHECK);
  const [loading, setLoading] = useState(() => cohortId !== 'new' && Boolean(cohortId));
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<CohortActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    if (!cohortId) {
      navigate('/b2b-qc', { replace: true });
      return;
    }

    if (isNew) {
      setForm({ ...DEFAULT_COHORT, products: [...DEFAULT_COHORT.products] });
      setFinalCheck({ ...DEFAULT_FINAL_CHECK });
      setLoading(false);
      return;
    }

    if (authLoading) return;

    if (!session || !isSupabaseConfigured) {
      setLoading(false);
      showToast('Sign in to load cohort QC');
      navigate('/b2b-qc', { replace: true });
      return;
    }

    let cancelled = false;
    setLoading(true);

    getCohort(cohortId)
      .then((payload) => {
        if (cancelled) return;
        setForm(payload.cohort);
        setFinalCheck(payload.qc);
      })
      .catch((err) => {
        if (cancelled) return;
        showToast(err instanceof Error ? err.message : 'Could not load cohort');
        navigate('/b2b-qc', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cohortId, isNew, authLoading, session, navigate, showToast]);

  const refreshActivity = useCallback(async () => {
    if (!cohortId || isNew || !session || !isSupabaseConfigured) {
      setActivity([]);
      setSelectedActivityId(null);
      return;
    }
    setLoadingActivity(true);
    try {
      setActivity(await listCohortActivity(cohortId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load activity log');
    } finally {
      setLoadingActivity(false);
    }
  }, [cohortId, isNew, session, showToast]);

  useEffect(() => {
    if (authLoading || loading) return;
    refreshActivity().catch(console.error);
  }, [authLoading, loading, refreshActivity]);

  const updateForm = useCallback(<K extends keyof CohortForm>(key: K, value: CohortForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateFinalCheck = useCallback(<K extends keyof FinalCheck>(key: K, value: FinalCheck[K]) => {
    setFinalCheck((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleProduct = useCallback((product: PromisedProduct) => {
    setForm((prev) => ({
      ...prev,
      products: prev.products.includes(product)
        ? prev.products.filter((p) => p !== product)
        : [...prev.products, product],
    }));
  }, []);

  const handleSelectActivity = useCallback((entry: CohortActivityEntry | null) => {
    setSelectedActivityId(entry?.id ?? null);
  }, []);

  const handleRestoreActivity = useCallback(
    (entry: CohortActivityEntry) => {
      const snapshot = entry.snapshotAfter;
      if (!snapshot) return;
      setForm({ ...snapshot.cohort, products: [...snapshot.cohort.products] });
      setFinalCheck({ ...snapshot.qc });
      showToast('Restored version into form — save to persist');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [showToast],
  );

  const qc = useMemo(() => runQc(form, finalCheck), [form, finalCheck]);
  const buyerTemplate = useMemo(
    () => makeBuyerEmailTemplate(form, finalCheck.cohortLink),
    [form, finalCheck.cohortLink],
  );
  const companyTechEmail = useMemo(() => makeCompanyTechEmail(form), [form]);

  const pageTitle = isNew ? 'New cohort' : buildCohortName(form);

  const handleSave = async () => {
    if (!session) {
      showToast('Sign in to save cohort QC');
      return;
    }
    setSaving(true);
    try {
      const id = await saveCohort(isNew ? null : cohortId ?? null, form, finalCheck);
      showToast(isNew ? 'Cohort saved' : 'Cohort QC updated');
      if (isNew) {
        navigate(`/b2b-qc/${id}`, { replace: true });
      } else {
        await refreshActivity();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save cohort QC');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await copyToClipboard(text);
      showToast(`${label} copied`);
    } catch {
      showToast('Copy failed — check browser permissions');
    }
  };

  if (loading) {
    return (
      <div className="b2b-qc">
        <MissionMomentsHeader />
        <p className="b2b-qc-small">Loading cohort…</p>
      </div>
    );
  }

  return (
    <div className="b2b-qc">
      <MissionMomentsHeader />

      <div className="b2b-qc-detail-bar">
        <Link to="/b2b-qc" className="b2b-qc-back">
          ← All cohorts
        </Link>
        <div className="b2b-qc-detail-actions">
          {!session && isSupabaseConfigured && (
            <Link to="/login?next=/b2b-qc" className="b2b-qc-link">
              Sign in to save
            </Link>
          )}
          <button
            type="button"
            className="primary"
            disabled={!session || saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : isNew ? 'Save cohort QC' : 'Update cohort QC'}
          </button>
        </div>
      </div>

      <div className="b2b-qc-detail-title">
        <h2>{pageTitle}</h2>
        {!isNew && (
          <p className="b2b-qc-small">
            {qc.score}% · {qc.status}
          </p>
        )}
      </div>

      <div className="b2b-qc-grid">
        <section className="b2b-qc-card">
          <h2>1. Cohort</h2>
          <div className="b2b-qc-row">
            <div className="b2b-qc-field">
              <label htmlFor="company">Company / Cohort</label>
              <input
                id="company"
                value={form.company}
                onChange={(e) => updateForm('company', e.target.value)}
                placeholder="Huntress"
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="qty">Quantity</label>
              <input
                id="qty"
                type="number"
                min={1}
                value={form.qty}
                onChange={(e) => updateForm('qty', e.target.value)}
              />
            </div>
          </div>

          <div className="b2b-qc-row3">
            <div className="b2b-qc-field">
              <label htmlFor="startDate">Start date</label>
              <input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => updateForm('startDate', e.target.value)}
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="startBelt">Start belt</label>
              <select
                id="startBelt"
                value={form.startBelt}
                onChange={(e) => updateForm('startBelt', e.target.value as Belt)}
              >
                {BELTS.map((belt) => (
                  <option key={belt} value={belt}>
                    {belt}
                  </option>
                ))}
              </select>
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="finishBelt">Finish belt</label>
              <select
                id="finishBelt"
                value={form.finishBelt}
                onChange={(e) => updateForm('finishBelt', e.target.value as Belt)}
              >
                {BELTS.map((belt) => (
                  <option key={belt} value={belt}>
                    {belt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="b2b-qc-belt-strip">
            <span className="b2b-qc-belt wb">WB</span>
            <span className="b2b-qc-belt yb">YB</span>
            <span className="b2b-qc-belt bb">BB / PST®</span>
            <span className="b2b-qc-belt pb">PB</span>
            <span className="b2b-qc-belt brb">BR</span>
            <span className="b2b-qc-belt blk">BLACK</span>
          </div>

          <h3>Path + Timeframes</h3>
          <div className="b2b-qc-path">
            {qc.path.length > 0 ? (
              qc.path.map((belt, i) => (
                <span key={belt}>
                  <span className="b2b-qc-step">{BELT_SHORT[belt]}</span>
                  {i < qc.path.length - 1 && <span className="b2b-qc-arrow">→</span>}
                </span>
              ))
            ) : (
              <span className="b2b-qc-small">Choose start and finish belts.</span>
            )}
          </div>

          <div className="b2b-qc-row3" style={{ marginTop: 14 }}>
            <div className="b2b-qc-field">
              <label htmlFor="wbTime">WB timeframe</label>
              <input
                id="wbTime"
                value={form.wbTime}
                onChange={(e) => updateForm('wbTime', e.target.value)}
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="ybTime">YB timeframe</label>
              <input
                id="ybTime"
                value={form.ybTime}
                onChange={(e) => updateForm('ybTime', e.target.value)}
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="bbTime">BB timeframe</label>
              <input
                id="bbTime"
                value={form.bbTime}
                onChange={(e) => updateForm('bbTime', e.target.value)}
              />
            </div>
          </div>

          <h3>Expected Customer-Facing Products</h3>
          <div className="b2b-qc-row">
            <div className="b2b-qc-field">
              <span className="b2b-qc-field-label">Products promised</span>
              <div className="b2b-qc-pill-box" role="group" aria-label="Products promised">
                {PROMISED_PRODUCTS.map((product) => {
                  const selected = form.products.includes(product);
                  return (
                    <button
                      key={product}
                      type="button"
                      className={`b2b-qc-product-pill${selected ? ' selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => toggleProduct(product)}
                    >
                      {product}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="notes">Notes / special routing</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
              />
            </div>
          </div>

          <h3>Email List Upload / Paste</h3>
          <div className="b2b-qc-row3">
            <div className="b2b-qc-field">
              <label htmlFor="senderName">Sender Name</label>
              <input
                id="senderName"
                value={form.senderName}
                onChange={(e) => updateForm('senderName', e.target.value)}
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="senderTitle">Sender Title</label>
              <input
                id="senderTitle"
                value={form.senderTitle}
                onChange={(e) => updateForm('senderTitle', e.target.value)}
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="senderEmail">Sender Email Address</label>
              <input
                id="senderEmail"
                type="email"
                value={form.senderEmail}
                onChange={(e) => updateForm('senderEmail', e.target.value)}
              />
            </div>
          </div>

          <div className="b2b-qc-row">
            <div className="b2b-qc-field">
              <label htmlFor="companyContactName">Company contact name</label>
              <input
                id="companyContactName"
                value={form.companyContactName}
                onChange={(e) => updateForm('companyContactName', e.target.value)}
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="companyContactEmail">Company contact email</label>
              <input
                id="companyContactEmail"
                type="email"
                value={form.companyContactEmail}
                onChange={(e) => updateForm('companyContactEmail', e.target.value)}
              />
            </div>
          </div>

          <div className="b2b-qc-field">
            <label htmlFor="emails">Paste emails, one per line or comma-separated</label>
            <textarea
              id="emails"
              value={form.emails}
              onChange={(e) => updateForm('emails', e.target.value)}
            />
          </div>

          <div className="b2b-qc-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => handleCopy(buyerTemplate, 'Buyer email')}
            >
              Copy Buyer Email
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => handleCopy(companyTechEmail, 'Company requirements email')}
            >
              Copy Company Requirements Email
            </button>
            <button
              type="button"
              className="tertiary"
              onClick={() => downloadQcRecord(form, finalCheck)}
            >
              Download QC Record
            </button>
          </div>
        </section>

        <aside className="b2b-qc-card">
          <h2>2. QC status</h2>
          <div className="b2b-qc-scorebox">
            <div className="b2b-qc-score" style={{ ['--pct' as string]: qc.score }}>
              <span>{qc.score}%</span>
            </div>
            <div>
              <p className="b2b-qc-status">{qc.status}</p>
              <p className="b2b-qc-small">{qc.summary}</p>
            </div>
          </div>

          <div className="b2b-qc-checks">
            {qc.checks.slice(0, COHORT_CHECK_COUNT).map((check) => (
              <div key={check.name} className={`b2b-qc-check ${check.state}`}>
                <div className="b2b-qc-dot">
                  <CheckIcon state={check.state} />
                </div>
                <div>
                  <b>{check.name}</b>
                  <p>{check.detail}</p>
                </div>
                <span className="b2b-qc-tag">{check.state}</span>
              </div>
            ))}

            <h3 className="b2b-qc-checks-heading">Final check</h3>

            {qc.checks.slice(COHORT_CHECK_COUNT).map((check, i) => {
              const key = FINAL_CHECK_KEYS[i];
              return (
                <label key={check.name} className={`b2b-qc-check b2b-qc-check--toggle ${check.state}`}>
                  <input
                    type="checkbox"
                    className="b2b-qc-check-box"
                    checked={finalCheck[key] as boolean}
                    onChange={(e) =>
                      updateFinalCheck(key, e.target.checked as FinalCheck[typeof key])
                    }
                  />
                  <div>
                    <b>{check.name}</b>
                    <p>{check.detail}</p>
                  </div>
                  <span className="b2b-qc-tag">{check.state}</span>
                </label>
              );
            })}
          </div>

          <h3>Operational Snapshot</h3>
          <div className="b2b-qc-mini">
            <div className="b2b-qc-metric">
              <span className="b2b-qc-small">Valid emails</span>
              <strong>{qc.validEmails.length}</strong>
            </div>
            <div className="b2b-qc-metric">
              <span className="b2b-qc-small">Expected users</span>
              <strong>{form.qty || '0'}</strong>
            </div>
            <div className="b2b-qc-metric">
              <span className="b2b-qc-small">Start level</span>
              <strong>{BELT_SHORT[form.startBelt]}</strong>
            </div>
            <div className="b2b-qc-metric">
              <span className="b2b-qc-small">Finish level</span>
              <strong>{BELT_SHORT[form.finishBelt]}</strong>
            </div>
          </div>

          <h3>Buyer-Facing Email Template</h3>
          <div className="b2b-qc-output">{buyerTemplate}</div>

          <h3>Company Technical Requirements Email</h3>
          <div className="b2b-qc-output">{companyTechEmail}</div>
        </aside>

        <section className="b2b-qc-card b2b-qc-full">
          <h2>3. First-click test</h2>
          <p className="b2b-qc-small">
            Complete this on our side before the buyer sends the email. Mark each final-check item
            in the QC status pane as you verify it.
          </p>

          <div className="b2b-qc-row3" style={{ marginTop: 14 }}>
            <div className="b2b-qc-field">
              <label htmlFor="testUserEmail">Test user email</label>
              <input
                id="testUserEmail"
                type="email"
                value={finalCheck.testUserEmail}
                onChange={(e) => updateFinalCheck('testUserEmail', e.target.value)}
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="cohortLink">Cohort link in email</label>
              <input
                id="cohortLink"
                type="url"
                value={finalCheck.cohortLink}
                onChange={(e) => updateFinalCheck('cohortLink', e.target.value)}
              />
            </div>
            <div className="b2b-qc-field">
              <label htmlFor="finalCheckOwner">Final check owner</label>
              <input
                id="finalCheckOwner"
                value={finalCheck.finalCheckOwner}
                onChange={(e) => updateFinalCheck('finalCheckOwner', e.target.value)}
              />
            </div>
          </div>

          <div className="b2b-qc-actions">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                handleCopy(makeFinalCheckSummary(form, finalCheck), 'Final check summary')
              }
            >
              Copy Final Check Summary
            </button>
          </div>
        </section>

        {!isNew && (
          <CohortActivityLog
            entries={activity}
            loading={loadingActivity}
            selectedId={selectedActivityId}
            onSelect={handleSelectActivity}
            onRestore={handleRestoreActivity}
          />
        )}
      </div>

      <div className="b2b-qc-footer">©2026 GO∆TNET Internal Private and Confidential</div>

      {toast && <div className="b2b-qc-toast">{toast}</div>}
    </div>
  );
}
