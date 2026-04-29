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
export const GLOBAL = {
  // Primary brand values are expected to be provided by the site theme.
  // Components should consume GLOBAL.primary / GLOBAL.primaryText.
  // This is the one place we keep the fallback values, not in each component.
  primary: 'var(--primary, #F09644)',
  primaryText: 'var(--primary-text, #ffffff)',
};

export const FD = {
  statusStartBase:  'var(--fd-status-start-base, #1e6b7b)',
  statusStartBg:    'var(--fd-status-start-bg, #d4e9f0)',
  statusStartBorder:'var(--fd-status-start-border, #5a9bb0)',
  statusStartText:  'var(--fd-status-start-text, #1e6b7b)',

  statusCompleteBase:  'var(--fd-status-complete-base, #6f913e)',
  statusCompleteBg:    'var(--fd-status-complete-bg, #eef5e0)',
  statusCompleteBorder:'var(--fd-status-complete-border, #99b657)',
  statusCompleteText:  'var(--fd-status-complete-text, #6f913e)',

  statusPartialBase:  'var(--fd-status-partial-base, #7c7e32)',
  statusPartialBg:    'var(--fd-status-partial-bg, #f0f0e6)',
  statusPartialBorder:'var(--fd-status-partial-border, #b0b163)',
  statusPartialText:  'var(--fd-status-partial-text, #7c7e32)',

  statusEmptyBase:  'var(--fd-status-empty-base, #ac823f)',
  statusEmptyBg:    'var(--fd-status-empty-bg, #f5f0ea)',
  statusEmptyBorder:'var(--fd-status-empty-border, #d4b88a)',
  statusEmptyText:  'var(--fd-status-empty-text, #ac823f)',

  statusTerminalBase:  'var(--fd-status-terminal-base, #5f6b70)',
  statusTerminalBg:    'var(--fd-status-terminal-bg, #eaeced)',
  statusTerminalBorder:'var(--fd-status-terminal-border, #8a9299)',
  statusTerminalText:  'var(--fd-status-terminal-text, #5f6b70)',

  statusOrphanBase:  'var(--fd-status-orphan-base, #7f3d48)',
  statusOrphanBg:    'var(--fd-status-orphan-bg, #f4ebe9)',
  statusOrphanBorder:'var(--fd-status-orphan-border, #a6686f)',
  statusOrphanText:  'var(--fd-status-orphan-text, #7f3d48)',

  edgeYesBg:    'var(--fd-edge-yes-bg, #eff3e9)',
  edgeYesBorder:'var(--fd-edge-yes-border, #9db679)',
  edgeYesText:  'var(--fd-edge-yes-text, #648734)',

  edgeNoBg:    'var(--fd-edge-no-bg, #f4ecea)',
  edgeNoBorder:'var(--fd-edge-no-border, #d09e8e)',
  edgeNoText:  'var(--fd-edge-no-text, #b7694e)',

  canvasBg:      'var(--fd-canvas-bg, var(--bg-surface, #f7f7f7))',
  canvasGrid:    'var(--fd-canvas-grid, #ccc)',
  panelBg:       'var(--fd-panel-bg, var(--bg-surface, #fff))',
  panelBorder:   'var(--fd-panel-border, var(--border-primary, #ddd))',
  cardBg:        'var(--fd-card-bg, var(--bg-surface, #fff))',
  cardBorderSubtle:'var(--fd-card-border-subtle, var(--border-primary, #e5e7eb))',
  cardShadow:    'var(--fd-card-shadow, var(--shadow-primary, 0 1px 4px rgba(0,0,0,0.08)))',
  handleBg:      'var(--fd-handle-bg, #ddd)',
  handleBorder:  'var(--fd-handle-border, var(--border-primary, #aaa))',
  edgeStroke:    'var(--fd-edge-stroke, var(--border-primary, #999))',

  textStrong:      'var(--fd-text-strong, var(--text-title, #1a1a1a))',
  textPrimary:     'var(--fd-text-primary, var(--text-body, #404040))',
  textSecondary:   'var(--fd-text-secondary, #555)',
  textMuted:       'var(--fd-text-muted, #666)',
  textSubtle:      'var(--fd-text-subtle, #888)',
  textPlaceholder: 'var(--fd-text-placeholder, #aaa)',
  textError:       'var(--fd-text-error, var(--error-5, #c0392b))',

  btnNeutralBg:  'var(--fd-btn-neutral-bg, var(--light, #eee))',
  btnNeutralText:'var(--fd-btn-neutral-text, var(--text-body, #333))',
  btnActionBg:   'var(--fd-btn-action-bg, var(--primary, #F09644))',
  btnActionText: 'var(--fd-btn-action-text, var(--primary-text, #ffffff))',

  inputBorder:      'var(--fd-input-border, var(--border-primary, #ccc))',
  inputBgReadonly:  'var(--fd-input-bg-readonly, var(--bg-body, #e4edf5))',

  overlay:      'var(--fd-overlay, rgba(0,0,0,0.45))',
  modalBg:      'var(--fd-modal-bg, var(--bg-surface, #fff))',
  modalShadow:  'var(--fd-modal-shadow, var(--shadow-primary, 0 8px 32px rgba(0,0,0,0.25)))',

  errorBg: 'var(--fd-error-bg, var(--error-5, #fde8e8))',
  infoBg:  'var(--fd-info-bg, var(--secondary-10, #f2f8ff))',

  rowBg:         'var(--fd-row-bg, var(--bg-body, #f5f5f5))',
  sectionLabel:  'var(--fd-section-label, var(--text-body, #999))',

  badgeBg:          'var(--fd-badge-bg, #dcfef4)',
  badgeText:        'var(--fd-badge-text, #404040)',
  badgeLegislation: 'var(--fd-badge-legislation, #6366f1)',
  badgeCallout:     'var(--fd-badge-callout, #0891b2)',
} as const;

export const STATUS_COLORS = {
  start:    { base: FD.statusStartBase, bg: FD.statusStartBg, border: FD.statusStartBorder, text: FD.statusStartText },
  complete: { base: FD.statusCompleteBase, bg: FD.statusCompleteBg, border: FD.statusCompleteBorder, text: FD.statusCompleteText },
  partial:  { base: FD.statusPartialBase, bg: FD.statusPartialBg, border: FD.statusPartialBorder, text: FD.statusPartialText },
  empty:    { base: FD.statusEmptyBase, bg: FD.statusEmptyBg, border: FD.statusEmptyBorder, text: FD.statusEmptyText },
  terminal: { base: FD.statusTerminalBase, bg: FD.statusTerminalBg, border: FD.statusTerminalBorder, text: FD.statusTerminalText },
  orphan:   { base: FD.statusOrphanBase, bg: FD.statusOrphanBg, border: FD.statusOrphanBorder, text: FD.statusOrphanText },
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
  yes: { bg: FD.edgeYesBg, border: FD.edgeYesBorder, text: FD.edgeYesText },
  // yes: createColorScale('#648734'), // Green Commando
  // no:  { bg: '#eddfe0', border: '#ccaaaf', text: '#7f3d48' },
  no:  { bg: FD.edgeNoBg, border: FD.edgeNoBorder, text: FD.edgeNoText },
  // no:  createColorScale('#b7694e'), // Clay
};

// ─── Chrome (panels, sidebar, canvas background) ──────────────────────────────

export const CHROME = {
  // Canvas
  canvasBg:         FD.canvasBg,
  canvasBgOverlay: 'rgba(240,240,241,0.8)',
  canvasGrid:      FD.canvasGrid,

  // Panels / sidebars
  panelBg:        FD.panelBg,
  panelBorder:     FD.panelBorder,

  // Cards (nodes)
  cardBg:          FD.cardBg,
  cardBorderSubtle:FD.cardBorderSubtle,
  cardShadow:      FD.cardShadow,

  // Graph handles + edges
  handleBg:        FD.handleBg,
  handleBorder:    FD.handleBorder,
  edgeStroke:      FD.edgeStroke,

  // Text hierarchy
  textStrong:      FD.textStrong,  // headings, node titles
  textPrimary:     FD.textPrimary,  // body text
  textSecondary:   FD.textSecondary,     // supporting text, italics
  textMuted:       FD.textMuted,     // captions, snippets
  textSubtle:      FD.textSubtle,     // hints, placeholders, disabled
  textPlaceholder: FD.textPlaceholder,     // empty-state copy

  // Neutral button (cancel / secondary action)
  btnNeutralBg:    FD.btnNeutralBg,
  btnNeutralText:  FD.btnNeutralText,

  // Note: primary (green) and danger (red) buttons use STATUS_COLORS.start / .orphan

  // Form inputs
  inputBorder:     FD.inputBorder,
  inputBgReadonly: FD.inputBgReadonly,

  // Overlays / modals
  overlay:         FD.overlay,
  modalBg:         FD.modalBg,
  modalShadow:     FD.modalShadow,

  // Status banners
  errorBg:         FD.errorBg,
  infoBg:          FD.infoBg,

  // Misc
  rowBg:           FD.rowBg,
  sectionLabel:    FD.sectionLabel,
};

// ─── Node footer badge pills ───────────────────────────────────────────────────

export const BADGE = {
  bg:          FD.badgeBg,
  text:        FD.badgeText,
  legislation: FD.badgeLegislation,
  callout:     FD.badgeCallout,
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

