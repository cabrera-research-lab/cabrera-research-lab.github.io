import type { Cadence, PriorityCadence } from './types';

export const CHAR_LIMIT = 550;

export type CadencePanelMode = 'standup' | 'priorities';

export interface CadenceDefinition {
  id: Cadence;
  tabLabel: string;
  title: string;
  formTitle: string;
  subtitle: string;
  previewTitle: string;
  submitLabel: string;
  /** How this cadence renders in the cascade slot. */
  panelMode: CadencePanelMode;
  /** Shared lead-in shown once above all standup questions. */
  questionsIntro?: string;
  questions: string[];
  reportLabels: string[];
  /**
   * Tooltip prompts for priority cadences ("for team consideration").
   * Not saved — they guide conversation while priorities/metrics are edited.
   */
  considerationPrompts?: string[];
  /** Team report groups by question with all members' answers (monthly / quarterly). */
  groupReportByQuestion?: boolean;
  /** Per-update comment threads in the step 2 activity feed. */
  showResponseThreads?: boolean;
  step1Label: string;
  step1Sub: string;
  step2Label: string;
  step2Sub: string;
  step3Label?: string;
  step3Sub?: string;
}

export const CADENCES: CadenceDefinition[] = [
  {
    id: 'daily',
    tabLabel: 'Daily',
    title: 'Daily Standup',
    formTitle: 'Daily Standup',
    subtitle: '',
    previewTitle: 'Daily Standup',
    submitLabel: 'Submit daily update',
    panelMode: 'standup',
    questions: [
      'What updates to share with team?',
      'What will I do today to meet our weekly priorities?',
      'Blockers: what dependencies or support do I need?',
    ],
    reportLabels: ['Updates', 'Today / next', 'Blockers'],
    step1Label: 'Daily Standup',
    step1Sub: 'Each person shares updates, priorities, and blockers.',
    step2Label: 'TE∆MING REPORT',
    step2Sub: 'Discuss updates, blockers, dependencies, and support needs.',
    step3Label: 'TE∆M Rating',
    step3Sub: 'Rate the overall Daily update based on alignment to the Mission.',
  },
  {
    id: 'weekly',
    tabLabel: 'Weekly',
    title: 'Weekly Priorities',
    formTitle: 'Weekly Priorities',
    subtitle: "Set the team's priorities and success metrics for this week.",
    previewTitle: 'Weekly Priorities',
    submitLabel: 'Save',
    panelMode: 'priorities',
    questions: [],
    reportLabels: [],
    considerationPrompts: [
      'After looking at the data, what is the top friction for users?',
      'What is the top friction we should fix?',
    ],
    step1Label: 'Weekly Priorities',
    step1Sub: "Set the team's priorities and success metrics for this week.",
    step2Label: '',
    step2Sub: '',
  },
  {
    id: 'monthly',
    tabLabel: 'Monthly',
    title: 'Monthly Priorities',
    formTitle: 'Monthly Priorities',
    subtitle: "Set the team's priorities and success metrics for this month.",
    previewTitle: 'Monthly Priorities',
    submitLabel: 'Save',
    panelMode: 'priorities',
    questions: [],
    reportLabels: [],
    considerationPrompts: [
      'What progress have we made?',
      'Is there anything that MUST be added to the existing scope?',
      'Is there anything important that should go on backlog?',
    ],
    step1Label: 'Monthly Priorities',
    step1Sub: "Set the team's priorities and success metrics for this month.",
    step2Label: '',
    step2Sub: '',
  },
  {
    id: 'quarterly',
    tabLabel: 'Quarterly',
    title: 'Quarterly Priorities',
    formTitle: 'Quarterly Priorities',
    subtitle: "Set the team's priorities and success metrics for this quarter.",
    previewTitle: 'Quarterly Priorities',
    submitLabel: 'Save',
    panelMode: 'priorities',
    questions: [],
    reportLabels: [],
    considerationPrompts: [
      'What zoom in/out opportunity should we pursue?',
      'What zoom in/out improvement should we make?',
    ],
    step1Label: 'Quarterly Priorities',
    step1Sub: "Set the team's priorities and success metrics for this quarter.",
    step2Label: '',
    step2Sub: '',
  },
];

export function getCadence(id: Cadence): CadenceDefinition {
  const c = CADENCES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown cadence: ${id}`);
  return c;
}

export function isPriorityCadence(id: Cadence): id is PriorityCadence {
  return id === 'weekly' || id === 'monthly' || id === 'quarterly';
}
