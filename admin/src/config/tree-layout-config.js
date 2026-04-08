// Shared layout config for TreeEditor + TreeViewer (phase 1, read-only).
// Phase 2 can make this per-module editable via REST and WP postmeta.

const DEFAULT_LAYOUT = {
  nodeWidthMin: 320,
  nodeWidthMax: 420,
  nodeHeightMin: 240,
  nodeHeightMax: 320,

  // Spacing between ranks (vertical) and sibling nodes (horizontal).
  // These are baseline values; getRankSep/getNodeSep scale them with viewport size.
  rankSepMin: 120,
  rankSepMax: 220,
  nodeSepMin: 110,
  nodeSepMax: 180,

  // ── Canvas zoom bounds (enforced by React Flow on the interactive canvas) ──
  canvasMinZoom: 0.15, // how far out the user can manually zoom
  canvasMaxZoom: 1.5,  // how far in the user can manually zoom

  // ── Initial fitView zoom bounds (applied only on first load per module) ──
  fitMinZoom: 0.35,   // floor: never zoom out past this on auto-fit (keeps nodes readable)
  fitMaxZoom: 0.75,   // ceiling: never zoom in past this on auto-fit (avoids overly close view)

  rootTopOffset: 50,
  rootLeftOffset: 25,
};

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function getLayoutConfig() {
  return { ...DEFAULT_LAYOUT };
}

export function getNodeWidth() {
  const config = getLayoutConfig();
  const adaptive = window.innerWidth ? window.innerWidth * 0.2 : (config.nodeWidthMin + config.nodeWidthMax) / 2;
  return clamp(adaptive, config.nodeWidthMin, config.nodeWidthMax);
}

export function getNodeHeight() {
  const config = getLayoutConfig();
  const adaptive = window.innerHeight ? window.innerHeight * 0.18 : (config.nodeHeightMin + config.nodeHeightMax) / 2;
  return clamp(adaptive, config.nodeHeightMin, config.nodeHeightMax);
}

export function getRankSep() {
  const c = getLayoutConfig();
  // Scale with viewport height (~14%) so taller screens get more breathing room
  const adaptive = window.innerHeight ? window.innerHeight * 0.14 : (c.rankSepMin + c.rankSepMax) / 2;
  return clamp(adaptive, c.rankSepMin, c.rankSepMax);
}

export function getNodeSep() {
  const c = getLayoutConfig();
  // Scale with viewport width (~5%) so wider screens spread siblings out more
  const adaptive = window.innerWidth ? window.innerWidth * 0.05 : (c.nodeSepMin + c.nodeSepMax) / 2;
  return clamp(adaptive, c.nodeSepMin, c.nodeSepMax);
}

export function getZoomBounds() {
  const c = getLayoutConfig();
  return {
    minZoom: c.canvasMinZoom,
    maxZoom: c.canvasMaxZoom,
    fitMinZoom: c.fitMinZoom,
    fitMaxZoom: c.fitMaxZoom,
  };
}

export function getRootOffsets() {
  const c = getLayoutConfig();
  return { x: c.rootLeftOffset, y: c.rootTopOffset };
}

/**
 * How many dagre rank levels to include in the initial fitView.
 * Scales with viewport height: taller screen → show one extra level.
 */
export function getFitLevels() {
  if (typeof window === "undefined") return 2;
  return window.innerHeight >= 900 ? 3 : 2;
}

/** Max characters to show in the body snippet on a node card (editor + viewer). */
export const TRUNCATE_BODY = 120;
