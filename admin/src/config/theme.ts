/**
 * theme.js — single source of truth for all colours and status metadata.
 *
 * Sections:
 *   NODE_STATUS  — per-status accent/border/badge colours, icons, labels
 *   EDGE         — Yes/No decision edge pill colours
 *   CHROME       — panel backgrounds, borders, text
 */

// ─── Node status ──────────────────────────────────────────────────────────────

// Accent / border colour per status key
export const STATUS_COLORS = {
  start:    '#2c6e49', // green  — entry/root node
  complete: '#059669', // green  — all links set
  partial:  '#d97706', // amber  — one link missing
  empty:    '#d97706', // amber  — no links yet
  terminal: '#2563eb', // blue   — end/resolution node
  orphan:   '#c0392b', // red    — disconnected from tree
};

// Short text labels (used in sidebar status badge)
export const STATUS_LABELS = {
  start:    'Start / entry point',
  complete: 'Connected',
  partial:  'Needs 1 more link',
  empty:    'No links set',
  terminal: 'End / resolution',
  orphan:   'Disconnected',
};

// Full metadata for chips/legend (icon + label + accent + background tint)
export const STATUS_META = {
  start:    { icon: '▶', label: STATUS_LABELS.start,    color: '#2c6e49', bg: '#eefaf2' },
  complete: { icon: '✓', label: STATUS_LABELS.complete, color: '#059669', bg: '#f0fdf4' },
  partial:  { icon: '◑', label: STATUS_LABELS.partial,  color: '#d97706', bg: '#fef9ee' },
  empty:    { icon: '○', label: STATUS_LABELS.empty,    color: '#d97706', bg: '#fef9ee' },
  terminal: { icon: '■', label: STATUS_LABELS.terminal, color: '#2563eb', bg: '#eef2fe' },
  orphan:   { icon: '⚠', label: STATUS_LABELS.orphan,  color: '#c0392b', bg: '#fef0f0' },
};

/** Derive the display status key for a node from its data fields. */
export function getStatusKey(data: { isOrphan?: boolean; isRoot?: boolean; linkStatus?: string }): keyof typeof STATUS_COLORS {
  if (data.isOrphan) return 'orphan';
  if (data.isRoot)   return 'start';
  return (data.linkStatus || 'empty') as keyof typeof STATUS_COLORS;
}

// ─── Edge (Yes / No decision pills) ──────────────────────────────────────────

export const EDGE_COLORS = {
  yes: { bg: '#eefaf2', border: '#2c6e49', text: '#1a4d33' },
  no:  { bg: '#fef0f0', border: '#c0392b', text: '#8b1a1a' },
};

// ─── Chrome (panels, sidebar, canvas background) ──────────────────────────────

export const CHROME = {
  // Canvas
  canvasBg:        '#f0f0f1',
  canvasBgOverlay: 'rgba(240,240,241,0.8)',
  canvasGrid:      '#ccc',

  // Panels / sidebars
  panelBg:         '#fafafa',
  panelBorder:     '#ddd',

  // Cards (nodes)
  cardBg:          '#fff',
  cardBorderSubtle:'#e5e7eb',
  cardShadow:      '0 1px 4px rgba(0,0,0,0.08)',

  // Graph handles + edges
  handleBg:        '#ddd',
  handleBorder:    '#aaa',
  edgeStroke:      '#999',

  // Text hierarchy
  textStrong:      '#1a1a1a',  // headings, node titles
  textPrimary:     '#404040',  // body text
  textSecondary:   '#555',     // supporting text, italics
  textMuted:       '#666',     // captions, snippets
  textSubtle:      '#888',     // hints, placeholders, disabled
  textPlaceholder: '#aaa',     // empty-state copy

  // Neutral button (cancel / secondary action)
  btnNeutralBg:    '#eee',
  btnNeutralText:  '#333',

  // Note: primary (green) and danger (red) buttons use STATUS_COLORS.start / .orphan

  // Form inputs
  inputBorder:     '#ccc',
  inputBgReadonly: '#e4edf5',

  // Overlays / modals
  overlay:         'rgba(0,0,0,0.45)',
  modalBg:         '#fff',
  modalShadow:     '0 8px 32px rgba(0,0,0,0.25)',

  // Status banners
  errorBg:         '#fde8e8',
  infoBg:          '#f2f8ff',

  // Misc
  rowBg:           '#f5f5f5',
  sectionLabel:    '#999',
};

// ─── Node footer badge pills ───────────────────────────────────────────────────

export const BADGE = {
  bg:          '#deffe1',
  text:        '#404040',
  legislation: '#6366f1',  // indigo
  callout:     '#0891b2',  // cyan
};
