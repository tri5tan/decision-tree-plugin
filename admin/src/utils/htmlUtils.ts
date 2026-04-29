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

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Resolve indent level from ql-indent-N class (Quill-native) or margin-left style (normalised).
  function indentLevel(li: Element): number {
    const cls = Array.from(li.classList).find(c => /^ql-indent-\d+$/.test(c));
    if (cls) return parseInt(cls.replace('ql-indent-', ''));
    const m = (li.getAttribute('style') || '').match(/margin-left:\s*([\d.]+)em/);
    return m ? Math.round(parseFloat(m[1]) / 2) : 0;
  }

  // Annotate list items with the correct prefix (including indent) before text extraction.
  // Handles both normalised <ul> and Quill-native <ol data-list> formats.
  // Use non-breaking spaces for indent so pre-line doesn't collapse them.
  const INDENT = '\u00a0\u00a0';
  doc.querySelectorAll('ul > li').forEach(li => {
    li.prepend(INDENT.repeat(indentLevel(li)) + '• ');
  });
  doc.querySelectorAll('ol').forEach(ol => {
    let n = 1;
    Array.from(ol.querySelectorAll(':scope > li')).forEach(li => {
      const pad = INDENT.repeat(indentLevel(li));
      if (li.getAttribute('data-list') === 'bullet') {
        li.prepend(pad + '• ');
      } else {
        li.prepend(pad + `${n}. `);
        n++;
      }
    });
  });

  // Insert newlines before block-level elements so items fall on separate lines.
  doc.querySelectorAll('p, li, ul, ol, div, h1, h2, h3, h4, h5, h6').forEach(el => {
    el.prepend('\n');
  });

  return (doc.body.textContent ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Normalise Quill v2 list HTML for rendering outside of a `.ql-editor` context.
 *
 * Quill v2 stores all lists as `<ol>` and uses `data-list="bullet"` or
 * `data-list="ordered"` on each `<li>` to distinguish list types.  Visual
 * styling is applied by Quill's own CSS (`.ql-editor li[data-list=bullet]`).
 * When that HTML is rendered via `dangerouslySetInnerHTML` without Quill's CSS
 * scope, every list appears as a numbered list.
 *
 * This function converts pure-bullet `<ol>` lists into standard `<ul>` and
 * strips all `data-list` attributes so the browser renders correctly.
 * Pure ordered lists and mixed lists are kept as `<ol>`.
 */
export function normaliseQuillHtml(html: string | null | undefined): string {
  if (!html) return html ?? '';
  if (!html.includes('data-list')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('ol').forEach(ol => {
    const items = Array.from(ol.querySelectorAll(':scope > li'));
    if (items.length === 0) return;

    const hasBullet  = items.some(li => li.getAttribute('data-list') === 'bullet');
    const hasOrdered = items.some(li => li.getAttribute('data-list') === 'ordered');

    items.forEach(li => li.removeAttribute('data-list'));

    if (hasBullet && !hasOrdered) {
      const ul = doc.createElement('ul');
      ul.innerHTML = ol.innerHTML;
      ol.replaceWith(ul);
    }
    // Ordered-only or mixed: keep as <ol> — data-list attrs already stripped
  });

  // Convert ql-indent-N classes to inline margin-left so indentation is visible
  // when rendered outside Quill's CSS scope.
  doc.querySelectorAll('li[class]').forEach(li => {
    const cls = Array.from(li.classList).find(c => /^ql-indent-\d+$/.test(c));
    if (!cls) return;
    const level = parseInt(cls.replace('ql-indent-', ''));
    const existing = (li.getAttribute('style') || '').replace(/;?\s*$/, '');
    li.setAttribute('style', (existing ? existing + '; ' : '') + `margin-left: ${level * 2}em`);
    li.classList.remove(cls);
    if (!li.className.trim()) li.removeAttribute('class');
  });

  return doc.body.innerHTML;
}

/**
 * Inverse of normaliseQuillHtml — converts standard <ul>/<li> back to Quill v2's
 * native <ol data-list="bullet"> format so the editor renders bullet lists correctly.
 *
 * Use this whenever loading stored HTML back into a Quill editor instance.
 */
export function denormaliseForQuill(html: string | null | undefined): string {
  if (!html) return html ?? '';
  if (!html.includes('<ul')) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('ul').forEach(ul => {
    const items = Array.from(ul.querySelectorAll(':scope > li'));
    items.forEach(li => li.setAttribute('data-list', 'bullet'));
    const ol = doc.createElement('ol');
    ol.innerHTML = ul.innerHTML;
    ul.replaceWith(ol);
  });

  // Convert inline margin-left back to ql-indent-N classes so Quill
  // recognises the indentation level when loading the HTML.
  doc.querySelectorAll('li[style]').forEach(li => {
    const style = li.getAttribute('style') || '';
    const m = style.match(/margin-left:\s*([\d.]+)em/);
    if (!m) return;
    const level = Math.round(parseFloat(m[1]) / 2);
    if (level > 0) li.classList.add(`ql-indent-${level}`);
    const cleaned = style.replace(/;?\s*margin-left:\s*[\d.]+em/g, '').trim().replace(/^;+|;+$/g, '').trim();
    if (cleaned) li.setAttribute('style', cleaned);
    else li.removeAttribute('style');
  });

  return doc.body.innerHTML;
}
