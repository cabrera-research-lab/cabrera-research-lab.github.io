import { requireSupabase } from '@/shared/lib/supabase';

type ReportFile = {
  filename: string;
  docx_base64: string;
};

function downloadDocx(filename: string, base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function messageFromInvokeError(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : 'Could not generate the activity report';
  const context = (error as { context?: Response } | null)?.context;
  if (!context || typeof context.json !== 'function') return fallback;
  try {
    const body = await context.json();
    if (body && typeof body.error === 'string' && body.error.trim()) return body.error;
  } catch {
    return fallback;
  }
  return fallback;
}

export async function downloadCohortActivityReport(cohortId: string): Promise<void> {
  const { data, error } = await requireSupabase().functions.invoke('cohort-progress-report', {
    body: { cohortId },
  });
  if (error) throw new Error(await messageFromInvokeError(error));
  const file = data as ReportFile | null;
  if (!file || typeof file.docx_base64 !== 'string' || typeof file.filename !== 'string') {
    const reported = data && typeof data === 'object' && 'error' in data ? String(data.error) : '';
    throw new Error(reported || 'Activity report did not include a document');
  }
  downloadDocx(file.filename, file.docx_base64);
}
