import type { PriorityCadence } from '@/apps/teaming/lib/types';
import { CADENCES } from '@/apps/teaming/lib/cadenceConfig';

const STORAGE_KEY = 'goatnet.teamingSettings.v1';

export type OrgStatement = {
  mission: string;
  vision: string;
};

export type OrgPrompts = Record<PriorityCadence, string[]>;

export type OrgSettings = {
  statement: OrgStatement;
  prompts: OrgPrompts;
};

export const DEFAULT_STATEMENT: OrgStatement = {
  mission: 'Build experiences people rave about and refer',
  vision: '8 Billion Systems Thinkers above the Standard Emerges',
};

function defaultPrompts(): OrgPrompts {
  const weekly = CADENCES.find((c) => c.id === 'weekly')?.considerationPrompts ?? [];
  const monthly = CADENCES.find((c) => c.id === 'monthly')?.considerationPrompts ?? [];
  const quarterly = CADENCES.find((c) => c.id === 'quarterly')?.considerationPrompts ?? [];
  return {
    weekly: [...weekly],
    monthly: [...monthly],
    quarterly: [...quarterly],
  };
}

export function defaultOrgSettings(): OrgSettings {
  return {
    statement: { ...DEFAULT_STATEMENT },
    prompts: defaultPrompts(),
  };
}

function parseSettings(raw: unknown): OrgSettings {
  const base = defaultOrgSettings();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Partial<OrgSettings>;
  const statement = {
    mission:
      typeof src.statement?.mission === 'string' && src.statement.mission.trim()
        ? src.statement.mission.trim()
        : base.statement.mission,
    vision:
      typeof src.statement?.vision === 'string' && src.statement.vision.trim()
        ? src.statement.vision.trim()
        : base.statement.vision,
  };
  const prompts = { ...base.prompts };
  for (const key of ['weekly', 'monthly', 'quarterly'] as PriorityCadence[]) {
    const list = src.prompts?.[key];
    if (Array.isArray(list)) {
      prompts[key] = list.map((p) => (typeof p === 'string' ? p : '')).filter(Boolean);
      if (!prompts[key].length) prompts[key] = [...base.prompts[key]];
    }
  }
  return { statement, prompts };
}

export function loadOrgSettings(): OrgSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultOrgSettings();
    return parseSettings(JSON.parse(raw));
  } catch {
    return defaultOrgSettings();
  }
}

export function saveOrgSettings(next: OrgSettings): OrgSettings {
  const cleaned = parseSettings(next);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  window.dispatchEvent(new CustomEvent('goatnet-settings-changed'));
  return cleaned;
}

export function saveOrgStatement(statement: OrgStatement): OrgSettings {
  const cur = loadOrgSettings();
  return saveOrgSettings({ ...cur, statement });
}

export function saveOrgPrompts(prompts: OrgPrompts): OrgSettings {
  const cur = loadOrgSettings();
  return saveOrgSettings({ ...cur, prompts });
}

export function getConsiderationPrompts(cadence: PriorityCadence): string[] {
  return loadOrgSettings().prompts[cadence] ?? [];
}
