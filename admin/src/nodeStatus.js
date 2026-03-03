/**
 * nodeStatus.js — single source of truth for all node status colours,
 * labels, icons, and metadata.  Imported by both TreeEditor.jsx and NodeSidebar.jsx.
 */

// Accent / border / badge colours per status key
export const STATUS_COLORS = {
  start:    '#2c6e49', // green  — entry/root node
  complete: '#059669', // green  — all links set
  partial:  '#d97706', // amber  — one link missing
  empty:    '#d97706', // amber  — no links yet
  terminal: '#2563eb', // blue   — end/resolution node
  orphan:   '#c0392b', // red    — disconnected from tree
};

// Short text labels shown in the sidebar status badge
export const STATUS_LABELS = {
  start:    'Start / entry point',
  complete: 'Connected',
  partial:  'Needs 1 more link',
  empty:    'No links set',
  terminal: 'End / resolution',
  orphan:   'Disconnected',
};

// Full metadata for chips/legend (icon + label + colour + background tint)
export const STATUS_META = {
start:    { icon: '▶', label: STATUS_LABELS.start,          color: '#2c6e49', bg: '#eefaf2' },
complete: { icon: '✓', label: STATUS_LABELS.complete,    color: '#059669', bg: '#f0fdf4' },
partial:  { icon: '◑', label: STATUS_LABELS.partial,   color: '#d97706', bg: '#fef9ee' },
empty:    { icon: '○', label: STATUS_LABELS.empty,       color: '#d97706', bg: '#fef9ee' },
terminal: { icon: '■', label: STATUS_LABELS.terminal,    color: '#2563eb', bg: '#eef2fe' },
orphan:   { icon: '⚠', label: STATUS_LABELS.orphan, color: '#c0392b', bg: '#fef0f0' },
};

/**
 * Derive the display status key for a node given its data fields.
 * Mirrors the same logic used inside KBNode.
 */
export function getStatusKey(data) {
  if (data.isOrphan) return 'orphan';
  if (data.isRoot)   return 'start';
  return data.linkStatus || 'empty';
}
