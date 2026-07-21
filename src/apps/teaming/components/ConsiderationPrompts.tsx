import { useState } from 'react';
import { renderDeltaText } from '@/apps/teaming/lib/deltaText';

interface Props {
  prompts: string[];
}

export function ConsiderationPrompts({ prompts }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!prompts.length) return null;

  return (
    <div className="prompts">
      <div className="prompts-l">{renderDeltaText('For team consideration — hover a prompt')}</div>
      <div className="prompt-row">
        {prompts.map((prompt, i) => (
          <button
            key={i}
            type="button"
            className={`tip${openIndex === i ? ' open' : ''}`}
            onClick={() => setOpenIndex((cur) => (cur === i ? null : i))}
            onBlur={() => setOpenIndex(null)}
          >
            <span className="ic">?</span>
            Prompt {i + 1}
            <span className="tip-body">{prompt}</span>
          </button>
        ))}
      </div>
      <div className="prompt-hint">
        Prompts guide the conversation. They aren&apos;t saved — your priorities and metrics above
        are.
      </div>
    </div>
  );
}
