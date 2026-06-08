import type { Cadence } from './types';

export const CHAR_LIMIT = 550;

export interface CadenceDefinition {
  id: Cadence;
  tabLabel: string;
  title: string;
  formTitle: string;
  subtitle: string;
  previewTitle: string;
  submitLabel: string;
  targetsLabel?: string;
  targetsEmpty?: string;
  parentPriorityCadence?: 'weekly' | 'monthly' | 'quarterly';
  questions: string[];
  reportLabels: string[];
  /** Team report groups by question with all members' answers (monthly / quarterly). */
  groupReportByQuestion?: boolean;
  /** Per-update comment threads in the step 2 activity feed. */
  showResponseThreads?: boolean;
  showStep2?: boolean;
  step1Label: string;
  step1Sub: string;
  step2Label: string;
  step2Sub: string;
  step3Label?: string;
  step3Sub?: string;
  step2Title?: string;
  step2Description?: string;
}

export const CADENCES: CadenceDefinition[] = [
  {
    id: 'daily',
    tabLabel: 'Daily',
    title: 'Daily Standup',
    formTitle: 'Daily Standup',
    subtitle: '',
    previewTitle: 'Daily Standup',
    submitLabel: 'Submit Daily Update',
    targetsLabel: "This Week's Targets",
    targetsEmpty: 'No weekly priorities entered yet.',
    parentPriorityCadence: 'weekly',
    questions: [
      'What updates to share with team?',
      'What will I do today to meet our weekly priorities?',
      'Blockers: What blockers, dependencies, or support do I need?',
    ],
    reportLabels: ['Updates', 'Today / Next', 'Blockers / Dependencies / Support'],
    step1Label: 'STEP 1 • Individual Q/A',
    step1Sub: 'Each person shares updates, priorities, and blockers.',
    step2Label: 'STEP 2 • TE∆M Cross Chat',
    step2Sub: 'Discuss updates, blockers, dependencies, and support needs.',
    step3Label: 'STEP 3 • TE∆M Rating',
    step3Sub:
      'Each person rates the overall Daily update based on alignment to the Mission.',
  },
  {
    id: 'weekly',
    tabLabel: 'Weekly',
    title: 'Weekly Priorities', 
    formTitle: 'Weekly Priorities',
    subtitle: '',
    previewTitle: 'Weekly Learning',
    submitLabel: 'Submit Perspective on Data',
    targetsLabel: "This Month's Targets",
    targetsEmpty: 'No monthly priorities entered yet.',
    parentPriorityCadence: 'monthly',
    questions: [
      'What is my top unanswered question right now?',
      'What is the biggest business-level "Zoom Out" opportunity we should pursue?',
      'What is the biggest business-level "Zoom In" opportunity we should pursue?',
      'What is the single most important thing I should do this week to address the opportunities and questions identified above?',
    ],
    reportLabels: [
      'Top Unanswered Question',
      'Zoom Out Opportunity',
      'Zoom In Opportunity',
      'Most Important Action This Week',
    ],
    groupReportByQuestion: true,
    showResponseThreads: false,
    showStep2: true,
    step1Label: 'STEP 1 • Individual Q/A',
    step1Sub:
      'Options: Automated or in-person',
    step2Label: 'STEP 2 • TE∆M Synthesis',
    step2Sub: 'Discuss bottlenecks, systems, and resources.',
    step3Label: 'STEP 3 • TE∆M Priorities',
    step3Sub: 'Convert team synthesis into weekly priorities.',
    step2Title: 'Team Weekly Priorities',
    step2Description:
      'Complete together after reviewing the TE∆MING REPORT. These priorities roll down into the Daily tab.',
  },
  {
    id: 'monthly',
    tabLabel: 'Monthly',
    title: 'Monthly Priorities',
    formTitle: 'Monthly Priorities',
    subtitle: '',
    previewTitle: 'Monthly Systems',
    submitLabel: 'Submit Perspective',
    targetsLabel: "This Quarter's Targets",
    targetsEmpty: 'No quarterly priorities entered yet.',
    parentPriorityCadence: 'quarterly',
    questions: [
      'What bottlenecks most limit rave and refer?',
      'What systems need redesign to make rave→refer repeatable at scale?',
      'Where should resources shift?',
    ],
    reportLabels: ['Bottleneck', 'System Redesign', 'Resource Shift'],
    groupReportByQuestion: true,
    showStep2: true,
    step1Label: 'STEP 1 • Individual Q/A',
    step1Sub:
      'Optional: Use the automated prompts below, or simply have a team conversation around these questions before setting priorities.',
    step2Label: 'STEP 2 • TE∆M Cross Chat',
    step2Sub: 'Discuss updates, blockers, dependencies, and support needs.',
    step3Label: 'STEP 3 • TE∆M Priorities',
    step3Sub: 'Convert team synthesis into monthly priorities.',
    step2Title: 'Team Monthly Priorities',
    step2Description:
      'Complete together after reviewing monthly systems. These priorities roll down into the Weekly tab.',
  },
  {
    id: 'quarterly',
    tabLabel: 'Quarterly',
    title: 'Quarterly Priorities',
    formTitle: 'Quarterly Priorities',
    subtitle: '',
    previewTitle: 'Quarterly Roadmap',
    submitLabel: 'Submit Perspective',
    questions: [
      'What strategic bottleneck most limits rave and refer?',
      'What systems should be rebuilt this quarter?',
      'What should stop, start, test, or continue?',
    ],
    reportLabels: [
      'Strategic Bottleneck',
      'Systems to Rebuild',
      'Stop / Start / Test / Continue',
    ],
    showStep2: true,
    step1Label: 'STEP 1 • Individual Q/A',
    step1Sub:
      'Optional: Use the automated prompts below, or simply have a team conversation around these questions before setting priorities.',
    step2Label: 'STEP 2 • TE∆M Cross Chat',
    step2Sub: 'Discuss bottlenecks, systems, and priorities.',
    step3Label: 'STEP 3 • TE∆M Priorities',
    step3Sub: 'Convert team synthesis into quarterly priorities.',
    step2Title: 'Team Quarterly Priorities',
    step2Description:
      'Complete together after reviewing quarterly strategy. These priorities roll down into the Monthly tab.',
  },
];

export function getCadence(id: Cadence): CadenceDefinition {
  const c = CADENCES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown cadence: ${id}`);
  return c;
}
