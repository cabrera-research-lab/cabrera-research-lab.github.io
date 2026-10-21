import type {
  AddedVariant,
  AddedVariantRow,
  FeedbackRow,
  TqMemberName,
  VariantNote,
} from '@/apps/tq-enhancement/lib/types';
import { requireSupabase } from '@/shared/lib/supabase';

const FEEDBACK_COLUMNS = 'user_id, question_order, variant_key, is_good, comment, updated_at';
const ADDED_COLUMNS = 'id, user_id, question_order, stem, choices, figure, is_good, comment, updated_at';

export async function isTqReviewer(userId: string): Promise<boolean> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('tq_reviewers')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listOwnFeedback(userId: string): Promise<FeedbackRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('tq_variant_feedback')
    .select(FEEDBACK_COLUMNS)
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as FeedbackRow[];
}

export async function listOwnAdded(userId: string): Promise<AddedVariantRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('tq_added_variants')
    .select(ADDED_COLUMNS)
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as AddedVariantRow[];
}

export async function listAllFeedback(): Promise<FeedbackRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('tq_variant_feedback').select(FEEDBACK_COLUMNS);
  if (error) throw error;
  return (data ?? []) as FeedbackRow[];
}

export async function listAllAdded(): Promise<AddedVariantRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('tq_added_variants')
    .select(ADDED_COLUMNS)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as AddedVariantRow[];
}

export async function saveFeedback(
  userId: string,
  order: number,
  variantKey: string,
  note: VariantNote,
): Promise<void> {
  const supabase = requireSupabase();
  if (note.isGood === null && !note.comment.trim()) {
    const { error } = await supabase
      .from('tq_variant_feedback')
      .delete()
      .eq('user_id', userId)
      .eq('question_order', order)
      .eq('variant_key', variantKey);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('tq_variant_feedback').upsert(
    {
      user_id: userId,
      question_order: order,
      variant_key: variantKey,
      is_good: note.isGood,
      comment: note.comment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,question_order,variant_key' },
  );
  if (error) throw error;
}

export async function saveAddedVariant(userId: string, order: number, variant: AddedVariant): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('tq_added_variants').upsert(
    {
      id: variant.id,
      user_id: userId,
      question_order: order,
      stem: variant.stem,
      choices: variant.choices,
      figure: variant.figure,
      is_good: variant.isGood,
      comment: variant.comment,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export async function deleteAddedVariant(userId: string, id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('tq_added_variants').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function listTqResponseNames(): Promise<TqMemberName[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('tq_response_names');
  if (error) throw error;
  return (data ?? []) as TqMemberName[];
}
