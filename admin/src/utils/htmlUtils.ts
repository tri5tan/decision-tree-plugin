/**
 * Centralised HTML/entity utilities.
 *
 * WP ACF content often contains HTML entities (numeric + named) in fields that
 * are rendered as plain React text nodes.  The browser only auto-decodes these
 * when content is injected via innerHTML / dangerouslySetInnerHTML.  For every
 * other render path we use these helpers.
 */

/**
 * Decode all HTML entities (named & numeric, e.g. &#8211; → –, &amp; → &).
 * Safe to call at render time; uses a single throw-away DOM element.
 * Returns an empty string for null / undefined input.
 */
export function decodeEntities(str: string | null | undefined): string {
  if (!str) return '';
  const el = document.createElement('div');
  el.innerHTML = str;
  return el.textContent ?? '';
}

/**
 * Convert an HTML string to a plain-text snippet suitable for truncated
 * display inside node cards.
 *
 * - Block-level elements (<p>, <li>, <br>, etc.) are replaced with a space so
 *   word boundaries are preserved.
 * - All remaining tags are stripped.
 * - All HTML entities (including numeric ones like &#8211;) are decoded.
 * - Runs of whitespace are collapsed to a single space.
 */
export function htmlToSnippet(html: string | null | undefined): string {
  if (!html) return '';
  const spaced = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|li|ul|ol|div|h[1-6])[^>]*>/gi, ' ');
  const el = document.createElement('div');
  el.innerHTML = spaced;
  return (el.textContent ?? '').replace(/\s{2,}/g, ' ').trim();
}
