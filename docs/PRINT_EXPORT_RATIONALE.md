# Print & Export — Design Rationale

## Why image capture instead of CSS `@media print`

React Flow places every node at an absolute pixel position via inline `transform: translate(x, y)`. The browser's CSS pagination engine (`page-break-inside: avoid`, `break-inside: avoid`) only applies to block-flow elements — it has no effect on absolutely-positioned elements. This means there is no CSS-only way to prevent the tree from being cut mid-node across a page boundary.

Additionally, `fitView` and `setViewport` compute their transforms against the **current screen container width**. On a typical widescreen monitor the container might be 1 400 px wide; the same transform looks completely different on an 800 px print viewport. Any approach that adjusts the live viewport for printing is inherently screen-size-dependent and produces inconsistent results.

## Why `html-to-image` (not `html2canvas`)

| Concern | html2canvas | html-to-image |
|---|---|---|
| SVG edge paths | Renders SVG poorly — curved edges, arrowheads, and edge labels often missing or mis-positioned | Full SVG serialisation; edges render correctly |
| Bundle size | ~50 kB gzipped | ~5 kB gzipped |
| External image support | Requires CORS proxy for cross-origin images | Same constraint, but less surface area |
| Maintenance | Rarely updated | Actively maintained |
| API | Promise-based, options object | Promise-based, options object (near-identical) |

The canvased React Flow example in the official ReactFlow docs also uses `html-to-image`.

## How the capture works

```
getNodesBounds(targetNodes)
  → Rect { x, y, width, height }

getViewportForBounds(bounds, A4_W, A4_H, minZoom=0.65, maxZoom=2.0, padding=0.05)
  → Viewport { x, y, zoom }

toPng(document.querySelector('.react-flow__viewport'), {
  backgroundColor: '#ffffff',
  width: A4_W,        // 719 px — A4 portrait at 96 dpi, 10 mm margins
  height: A4_H,       // 1047 px
  style: {
    width:     '719px',
    height:    '1047px',
    transform: `translate(${x}px, ${y}px) scale(${zoom})`,
  },
})
```

Key insight: we capture `.react-flow__viewport` (not the outer container), and override its `style.transform` in the `html-to-image` options. The DOM element never actually resizes — `html-to-image` uses the style overrides when serialising to canvas. This means:

- The captured image is always exactly 719 × 1047 px regardless of screen size.
- The transform is computed for A4, not for the user's screen.
- The tree is cropped to the first `PRINT_MAX_LEVELS` BFS levels (currently 5) so deeply nested trees don't produce an illegible thumbnail.

## Print window (Option B)

The PNG data URL is injected into a new `window.open()` pop-up. The pop-up contains:

- A text header: "Taituarā – Council Toolkit" (org label) + module title as `<h1>`
- The PNG `<img>` element
- A footer with the originating URL (for reference)
- `@media print { body { padding: 0 } }` scoped to the pop-up only

`window.print()` is called from the image's `onload` handler so the browser has fully rendered the image before the print dialog opens. The pop-up then closes itself.

**Pop-up blocker note:** If the browser blocks the pop-up, the function shows an `alert()` instructing the user to allow pop-ups for the page. There is no silent fallback that could confuse the user into thinking printing succeeded.

## PNG download (Option C)

Same `captureTreePng()` helper as the print path. The data URL is assigned to a programmatically created `<a download>` element and clicked. Filename is derived from the module title with spaces replaced by hyphens.

## Multi-page image cuts

When the captured PNG spans more than one printed page, the browser slices the image at the exact page boundary pixel — there is no automatic bleed or orphan protection for `<img>` elements. This is a known limitation of image-in-print-window approaches.

Mitigations considered and rejected:
- **Pre-calculate cut positions and add whitespace padding** — requires knowing paper height in CSS pixels at print resolution, which varies by browser/OS/DPI. Complex and fragile.
- **Landscape orientation** — wider but shorter; counter-productive for tall trees.
- **Reduce `PRINT_MAX_LEVELS`** — already at 5; reducing further loses too much context.

Accepted behaviour: for typical 5-level trees the image fits on one A4 page at the computed zoom. If it doesn't, the image cuts at the page boundary. Users can adjust print scale in the browser's print dialog.

## Zoom floor (0.65)

`getViewportForBounds` is given `minZoom = 0.65`. At zoom 0.65 the base 12 px node body font renders at ~7.8 px on screen, equivalent to ~6pt on paper — approximately the legibility floor for footnote-size text. Going lower would make node labels unreadably small in the printed output.

## `logo_url` (deferred)

The print header currently renders the plain text "Taituarā – Council Toolkit". A `logo_url` WP option should be added (see TODO.md) and passed via `wp_localize_script` into `window.dtViewer.logoUrl`. The print window header would then render `<img src="${logoUrl}" alt="Taituarā – Council Toolkit" />` instead of the text string.

## SVG export (deferred, optional)

`html-to-image` also exposes `toSvg()`. Deferred because:
- Custom font embedding is unreliable — the SVG references fonts by CSS name and browsers do not inline the font binary unless the font is already served as a data URI.
- SVG files are not directly openable as PDFs by end users without additional software.
- PNG + print window covers the primary use cases (PDF via browser print-to-PDF, image for documents).

If scoped later: use `toSvg()` in place of `toPng()` in `captureTreePng`, expose as `window.dtExportSvg`, add an "↓ SVG" button.
