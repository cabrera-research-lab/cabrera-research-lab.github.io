export type TqChoice = {
  letter: string;
  text: string;
  keyed: boolean;
  image: string;
};

export type TqShapeName = 'circle' | 'square' | 'triangle' | 'pentagon' | 'hexagon' | 'diamond';

export type TqDiagramNode = {
  x: number;
  y: number;
  shape?: TqShapeName;
  icon?: string;
  caption?: string;
};

export type TqDiagram = {
  gap: number;
  nodes: TqDiagramNode[];
  edges: [number, number][];
};

export type TqVariant = {
  id: 'original' | 'A' | 'B' | 'C';
  label: string;
  stem: string;
  figure: string;
  image: string;
  choices: TqChoice[];
  diagram?: TqDiagram;
};

export type TqReviewMode = 'variants' | 'original' | 'recommend';

export type TqItem = {
  order: number;
  category: string;
  scoring: string;
  qtype: string;
  note: string;
  group: string;
  mode: TqReviewMode;
  variants: TqVariant[];
};

export type VariantNote = {
  isGood: boolean | null;
  comment: string;
};

export type AddedVariant = {
  id: string;
  stem: string;
  choices: string[];
  figure: string;
  isGood: boolean | null;
  comment: string;
  persisted: boolean;
};

export type QuestionWork = {
  feedback: Record<string, VariantNote>;
  added: AddedVariant[];
};

export type FeedbackRow = {
  user_id: string;
  question_order: number;
  variant_key: 'original' | 'A' | 'B' | 'C';
  is_good: boolean | null;
  comment: string;
  updated_at: string;
};

export type AddedVariantRow = {
  id: string;
  user_id: string;
  question_order: number;
  stem: string;
  choices: string[] | null;
  figure: string;
  is_good: boolean | null;
  comment: string;
  updated_at: string;
};

export type TqMemberName = {
  user_id: string;
  display_name: string;
  email: string;
};

export const EMPTY_WORK: QuestionWork = {
  feedback: {},
  added: [],
};

export function emptyNote(): VariantNote {
  return { isGood: null, comment: '' };
}
