/** Match http(s) URLs; trailing punctuation is stripped after match. */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;

export function normalizeUrlMatch(raw: string): string {
  return raw.replace(TRAILING_PUNCT, '');
}

/** Unique URLs in appearance order. */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = normalizeUrlMatch(match[0]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    found.push(url);
  }
  return found;
}

export type TextPart = { type: 'text'; value: string } | { type: 'url'; value: string; href: string };

/** Split text into plain segments and URL segments for rendering. */
export function splitByUrls(text: string): TextPart[] {
  if (!text) return [{ type: 'text', value: '' }];
  const parts: TextPart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const href = normalizeUrlMatch(raw);
    const trailing = raw.slice(href.length);

    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) });
    }
    if (href) {
      parts.push({ type: 'url', value: href, href });
    }
    if (trailing) {
      parts.push({ type: 'text', value: trailing });
    }
    lastIndex = index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts.length ? parts : [{ type: 'text', value: text }];
}

export function truncateUrl(url: string, max = 42): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = `${u.pathname}${u.search}`;
    const short = path === '/' || path === '' ? host : `${host}${path}`;
    if (short.length <= max) return short;
    return `${short.slice(0, max - 1)}…`;
  } catch {
    return url.length <= max ? url : `${url.slice(0, max - 1)}…`;
  }
}
