import { Fragment, useState } from 'react';
import { renderDeltaText } from '@/apps/teaming/lib/deltaText';
import { extractUrls, splitByUrls, truncateUrl } from '@/apps/teaming/lib/sharedLinks';

function LinkifiedText({ text }: { text: string }) {
  const parts = splitByUrls(text);
  return (
    <>
      {parts.map((part, i) =>
        part.type === 'url' ? (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
          >
            {part.value}
          </a>
        ) : (
          <Fragment key={i}>{renderDeltaText(part.value)}</Fragment>
        ),
      )}
    </>
  );
}

function SharedLinks({ links }: { links: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => {
        setCopied((current) => (current === url ? null : current));
      }, 1500);
    } catch {
      // Clipboard may be blocked; Open still works.
    }
  }

  if (!links.length) return null;

  return (
    <div className="shared-links">
      <div className="small">Shared links</div>
      <ul className="shared-links-list">
        {links.map((url) => (
          <li key={url} className="shared-link-row">
            <span className="shared-link-label" title={url}>
              {truncateUrl(url)}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shared-link-action"
            >
              Open
            </a>
            <button type="button" className="shared-link-action" onClick={() => copy(url)}>
              {copied === url ? 'Copied' : 'Copy'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Answer / comment body: linkified text plus an Open/Copy strip when URLs are present. */
export function AnswerBody({ text }: { text: string }) {
  const display = text || '—';
  const links = extractUrls(display === '—' ? '' : display);

  return (
    <>
      <div className="text">
        <LinkifiedText text={display} />
      </div>
      <SharedLinks links={links} />
    </>
  );
}
