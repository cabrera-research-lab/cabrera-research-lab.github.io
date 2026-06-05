import { useState } from 'react';
import { DeltaText } from '@/lib/deltaText';
import type { UpdateComment } from '@/lib/types';

interface Props {
  comments: UpdateComment[];
  onSend?: (text: string) => Promise<void>;
  readOnly?: boolean;
}

export function CommentThread({ comments, onSend, readOnly = false }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !onSend) return;
    setSending(true);
    setError('');
    try {
      await onSend(trimmed);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reply failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="thread">
      <div className="small">Response Thread</div>
      {comments.length === 0 ? (
        <div className="bubble">
          <div className="who">No comments yet</div>
          {readOnly ? 'No thread activity.' : 'Start the thread.'}
        </div>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="bubble">
            <div className="who">
              <DeltaText>{c.profiles?.display_name ?? 'Member'}</DeltaText>
            </div>
            <DeltaText>{c.body}</DeltaText>
          </div>
        ))
      )}
      {!readOnly && onSend && (
        <div className="comment-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button type="button" onClick={handleSend} disabled={sending}>
            Send
          </button>
        </div>
      )}
      {error && <div className="status-msg">{error}</div>}
    </div>
  );
}
