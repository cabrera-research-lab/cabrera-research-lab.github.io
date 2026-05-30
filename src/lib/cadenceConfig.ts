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
  showSelfMissionRating?: boolean;
  showStep2?: boolean;
  step2Title?: string;
  step2Kicker?: string;
  step2Description?: string;
}

export const CADENCES: CadenceDefinition[] = [
  {
    id: 'daily',
    tabLabel: 'Daily',
    title: 'Daily Standup',
    formTitle: 'Daily Standup',
    subtitle: 'Yesterday → Today → Blockers',
    previewTitle: 'Daily Standup',
    submitLabel: 'Submit Daily Update',
    targetsLabel: "This Week's Targets",
    targetsEmpty: 'No weekly goals entered yet.',
    parentPriorityCadence: 'weekly',
    questions: [
      'What updates to share with team?',
      'What will I do today to meet our weekly priorities?',
      'Blockers: What blockers, dependencies, or support do I need?',
    ],
    reportLabels: ['Yesterday / Signal', 'Today / Next', 'Blockers / Support'],
    showSelfMissionRating: true,
  },
  {
    id: 'weekly',
    tabLabel: 'Weekly',
    title: 'Weekly Learning',
    formTitle: 'Weekly Learning',
    subtitle: 'Report → Fixes → Roadmap',
    previewTitle: 'Weekly Learning',
    submitLabel: 'Submit Weekly Update',
    targetsLabel: "This Month's Targets",
    targetsEmpty: 'No monthly goals entered yet.',
    parentPriorityCadence: 'monthly',
    questions: [
      'After looking at the data, what do you think caused the most rave and refer?',
      'After looking at the data, what do you think caused the most friction for users?',
      'What opportunity should we pursue? What improvement should we make? What deficiency should we fix?',
    ],
    reportLabels: ['Rave & Refer', 'Friction', 'Opportunity / Fix'],
    showStep2: true,
    step2Kicker: 'Weekly Step 2',
    step2Title: 'Team Weekly Priorities',
    step2Description:
      'Complete together after reviewing the TE∆MING REPORT. Choose the few goals that most increase rave→refer this week.',
  },
  {
    id: 'monthly',
    tabLabel: 'Monthly',
    title: 'Monthly Systems',
    formTitle: 'Monthly Systems',
    subtitle: 'Bottlenecks → Systems → Roadmap',
    previewTitle: 'Monthly Systems',
    submitLabel: 'Submit Monthly Update',
    targetsLabel: "This Quarter's Targets",
    targetsEmpty: 'No quarterly goals entered yet.',
    parentPriorityCadence: 'quarterly',
    questions: [
      'What bottlenecks most limit rave and refer?',
      'What systems need redesign to make rave→refer repeatable at scale?',
      'Where should resources shift?',
    ],
    reportLabels: ['Bottlenecks', 'Systems Redesign', 'Resource Shift'],
    showStep2: true,
    step2Kicker: 'Monthly Step 2',
    step2Title: 'Team Monthly Priorities',
    step2Description:
      'Complete together after reviewing monthly systems. Choose the few goals that most increase rave→refer this month.',
  },
  {
    id: 'quarterly',
    tabLabel: 'Quarterly',
    title: 'Quarterly Roadmap',
    formTitle: 'Quarterly Roadmap',
    subtitle: 'Strategic Reset',
    previewTitle: 'Quarterly Roadmap',
    submitLabel: 'Submit Quarterly Update',
    questions: [
      'What strategic bottleneck most limits rave and refer?',
      'What systems should be rebuilt this quarter?',
      'What should stop, start, test, or continue?',
    ],
    reportLabels: ['Strategic Bottleneck', 'Rebuild', 'Stop / Start / Test / Continue'],
    showStep2: true,
    step2Kicker: 'Quarterly Step 2',
    step2Title: 'Team Quarterly Priorities',
    step2Description:
      'Complete together after reviewing quarterly strategy. Choose the few goals that most increase rave→refer this quarter.',
  },
];

export function getCadence(id: Cadence): CadenceDefinition {
  const c = CADENCES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown cadence: ${id}`);
  return c;
}

export const MISSION_QUESTION =
  'Mission Rating: How aligned are my tasks today to our "rave and refer" Mission?';
