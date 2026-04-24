/**
 * theme.js — single source of truth for all colours and status metadata.
 *
 * Sections:
 *   NODE_STATUS  — per-status accent/border/badge colours, icons, labels
 *   EDGE         — Yes/No decision edge pill colours
 *   CHROME       — panel backgrounds, borders, text
 */

// ─── Node status ──────────────────────────────────────────────────────────────

/** Create a color scale with base, bg (tinted), border, and text variants. */
// function createColorScale(base: string) {
//   return {
//     base,
//     bg: base + '10',        // 6% opacity
//     border: base + '20',    // 12.5% opacity
//     text: base,
//   };
// }

// Accent / border colour per status key
export const STATUS_COLORS = {
  // // start:    '#2c6e49', // green  — entry/root node
  // // start:    '#2563eb', // blue  — entry/root node
  // start:    '#1e6b7b', // Teal With It  — entry/root node
  // // complete: '#5A6E1A', // green  — all links set
  // complete: '#6f913e', // Hidden Valley green  — all links set
  // // partial:  '#d97706', // amber  — one link missing
  // // empty:    '#d97706', // amber  — no links yet
  // // partial:  '#6e661a', // amber  — one link missing
  // partial:  '#7c7e32', // Green Commando — one link missing
  // empty:    '#ac823f', // Weissbier — no links yet
  // // terminal: '#2563eb', // blue   — end/resolution node
  // terminal: '#5f6b70', // grey   — end/resolution node
  // // orphan:   '#c0392b', // red — disconnected from tree
  // orphan:   '#7f3d48', // Köfte Brown — disconnected from tree
  // start:    createColorScale('#1e6b7b'), // Teal With It  — entry/root node
  // complete: createColorScale('#6f913e'), // Hidden Valley green  — all links set
  // partial:  createColorScale('#7c7e32'), // Green Commando — one link missing
  // empty:    createColorScale('#ac823f'), // Weissbier — no links yet
  // terminal: createColorScale('#5f6b70'), // grey   — end/resolution node
  // orphan:   createColorScale('#7f3d48'), // Köfte Brown — disconnected from tree
  start:    { base: '#1e6b7b', bg: '#d4e9f0', border: '#5a9bb0', text: '#1e6b7b' }, // Teal With It
  complete: { base: '#6f913e', bg: '#eef5e0', border: '#99b657', text: '#6f913e' }, // Hidden Valley green
  partial:  { base: '#7c7e32', bg: '#f0f0e6', border: '#b0b163', text: '#7c7e32' }, // Green Commando
  empty:    { base: '#ac823f', bg: '#f5f0ea', border: '#d4b88a', text: '#ac823f' }, // Weissbier
  terminal: { base: '#5f6b70', bg: '#eaeced', border: '#8a9299', text: '#5f6b70' }, // grey
  orphan:   { base: '#7f3d48', bg: '#f4ebe9', border: '#a6686f', text: '#7f3d48' }, // Köfte Brown
};

// ─── Derived color contexts ────────────────────────────────────────────────────

// Shared MiniMap nodeColor helper — ReactFlow requires a plain color string, not an object.
// Use this in both editor and viewer: nodeColor={(n) => getNodeMinimapColor(n.data)}
export function getNodeMinimapColor(data?: { isOrphan?: boolean; isRoot?: boolean; linkStatus?: string }): string {
  const key = data?.isOrphan ? 'orphan' : data?.isRoot ? 'start' : data?.linkStatus;
  return STATUS_COLORS[key as keyof typeof STATUS_COLORS]?.base ?? '#888';
}

// For UI buttons: use base colour for each status
export const STATUS_COLORS_BUTTON = {
  start:    STATUS_COLORS.start.base,
  complete: STATUS_COLORS.complete.base,
  partial:  STATUS_COLORS.partial.base,
  empty:    STATUS_COLORS.empty.base,
  terminal: STATUS_COLORS.terminal.base,
  orphan:   STATUS_COLORS.orphan.base,
} as const;

// Short text labels (used in sidebar status badge)
export const STATUS_LABELS = {
  start:    'Start / entry point',
  complete: 'Connected',
  partial:  'Has 1 connection',
  empty:    'No connections',
  terminal: 'End / resolution',
  orphan:   'Disconnected',
};

// Full metadata for chips/legend (icon + label + accent + background tint)
export const STATUS_META = {
  start:    { icon: '▶', label: STATUS_LABELS.start,    color: STATUS_COLORS.start.text, bg: STATUS_COLORS.start.bg },
  complete: { icon: '✓', label: STATUS_LABELS.complete, color: STATUS_COLORS.complete.text, bg: STATUS_COLORS.complete.bg },
  partial:  { icon: '◑', label: STATUS_LABELS.partial,  color: STATUS_COLORS.partial.text, bg: STATUS_COLORS.partial.bg },
  empty:    { icon: '○', label: STATUS_LABELS.empty,    color: STATUS_COLORS.empty.text, bg: STATUS_COLORS.empty.bg },
  terminal: { icon: '■', label: STATUS_LABELS.terminal, color: STATUS_COLORS.terminal.text, bg: STATUS_COLORS.terminal.bg },
  orphan:   { icon: '⚠', label: STATUS_LABELS.orphan,  color: STATUS_COLORS.orphan.text, bg: STATUS_COLORS.orphan.bg },
};

/** Derive the display status key for a node from its data fields. */
export function getStatusKey(data: { isOrphan?: boolean; isRoot?: boolean; linkStatus?: string }): keyof typeof STATUS_COLORS {
  if (data.isOrphan) return 'orphan';
  if (data.isRoot)   return 'start';
  return (data.linkStatus || 'empty') as keyof typeof STATUS_COLORS;
}

// ─── Edge (Yes / No decision pills) ──────────────────────────────────────────

// export const EDGE_COLORS = {
//   yes: { bg: '#eefaf2', border: '#2c6e49', text: '#1a4d33' },
//   no:  { bg: '#fef0f0', border: '#c0392b', text: '#8b1a1a' },
// };
// export const EDGE_COLORS = {
//   yes: { bg: '#F2F6E4', border: '#B8CC70', text: '#5A6E1A' },
//   no:  { bg: '#FDF2F2', border: '#F0C0C0', text: '#8A3030' },
// };
export const EDGE_COLORS = {
  yes: { bg: '#eff3e9', border: '#9db679', text: '#648734' },
  // yes: createColorScale('#648734'), // Green Commando
  // no:  { bg: '#eddfe0', border: '#ccaaaf', text: '#7f3d48' },
  no:  { bg: '#f4ecea', border: '#d09e8e', text: '#b7694e' },
  // no:  createColorScale('#b7694e'), // Clay
};

// ─── Chrome (panels, sidebar, canvas background) ──────────────────────────────

export const CHROME = {
  // Canvas
  canvasBg:         '#f7f7f7', // '#f0f0f1',
  canvasBgOverlay: 'rgba(240,240,241,0.8)',
  canvasGrid:      '#ccc',

  // Panels / sidebars
  panelBg:        '#fff', // '#fafafa',
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
  bg:          '#dcfef4', // '#deffe1',
  text:        '#404040',
  legislation: '#6366f1',  // indigo
  callout:     '#0891b2',  // cyan
};



// Poline Exports


// Whisky Godzilla

//     Godzilla
//     #455318
//     Aged Antics
//     #7c611f
//     Walnut
//     #723f17
//     Hot Fudge
//     #5d2515
//     Whisky Cola
//     #72232e



// Green Treasures

//     Godzilla
//     #48541d
//     Green Commando
//     #7e792d
//     Treasures
//     #ba8a3b
//     Radish
//     #9e3546


// Luscious Cruising

//     Godzilla
//     #48541d
//     Luscious Lemongrass
//     #587c36
//     Bulma Hair
//     #4da06c
//     Cruising
//     #2e8292


// Herbal Commando

//     Teal With It
//     #1e6b7b
//     Herbal
//     #42aa8c
//     Hidden Valley
//     #6f913e
//     Green Commando
//     #7c7e32
//     Weissbier
//     #ac823f
//     Clay
//     #b7694e
//     Köfte Brown
//     #7f3d48

