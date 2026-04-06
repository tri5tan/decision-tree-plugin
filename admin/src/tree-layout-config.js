// Shared layout config for TreeEditor + TreeViewer (phase 1, read-only).
// Phase 2 can make this per-module editable via REST and WP postmeta.

const DEFAULT_LAYOUT = {
  nodeWidthMin: 220,
  nodeWidthMax: 420,
  nodeHeightMin: 140,
  nodeHeightMax: 320,

  rankSep: 90,
  nodeSep: 50,

  minZoom: 0.15,
  maxZoom: 1.9,
  maxZoomOut: 0.4, // override fitView zoom cap for very large trees

  rootTopOffset: 120,
  rootLeftOffset: 40,
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
  return getLayoutConfig().rankSep;
}

export function getNodeSep() {
  return getLayoutConfig().nodeSep;
}

export function getZoomBounds() {
  const c = getLayoutConfig();
  return { minZoom: c.minZoom, maxZoom: c.maxZoom, maxZoomOut: c.maxZoomOut };
}

export function getRootOffsets() {
  const c = getLayoutConfig();
  return { x: c.rootLeftOffset, y: c.rootTopOffset };
}
