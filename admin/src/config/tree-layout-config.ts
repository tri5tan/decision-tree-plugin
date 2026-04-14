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

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── User layout preferences (persisted in localStorage) ──────────────────────
export type LayoutSpacing = 'compact' | 'normal' | 'relaxed';
export type NodeWidth    = 'narrow'  | 'normal' | 'wide';
export interface LayoutSettings {
  spacing:   LayoutSpacing;
  fitDepth:  number | null;
  nodeWidth: NodeWidth;
}

const SPACING_MULT: Record<LayoutSpacing, number> = { compact: 0.3, normal: 1.0, relaxed: 2.0 };
const WIDTH_MULT:   Record<NodeWidth,    number> = { narrow:  0.75, normal: 1.0, wide:    1.35 };

function loadSettings(): LayoutSettings {
  try {
    const s = localStorage.getItem('dt_layout_settings');
    if (s) return { spacing: 'normal', fitDepth: null, nodeWidth: 'normal', ...JSON.parse(s) };
  } catch { /* ignore */ }
  return { spacing: 'normal', fitDepth: null, nodeWidth: 'normal' };
}

let _override: LayoutSettings = loadSettings();

export function getLayoutSettings(): LayoutSettings { return { ..._override }; }

export function setLayoutSettings(patch: Partial<LayoutSettings>): void {
  _override = { ..._override, ...patch };
  try { localStorage.setItem('dt_layout_settings', JSON.stringify(_override)); } catch { /* ignore */ }
}

export function getLayoutConfig() {
  const sm = SPACING_MULT[_override.spacing]   ?? 1.0;
  const wm = WIDTH_MULT[_override.nodeWidth]    ?? 1.0;
  return {
    ...DEFAULT_LAYOUT,
    nodeWidthMin: Math.round(DEFAULT_LAYOUT.nodeWidthMin * wm),
    nodeWidthMax: Math.round(DEFAULT_LAYOUT.nodeWidthMax * wm),
    rankSepMin:   Math.round(DEFAULT_LAYOUT.rankSepMin * sm),
    rankSepMax:   Math.round(DEFAULT_LAYOUT.rankSepMax * sm),
    nodeSepMin:   Math.round(DEFAULT_LAYOUT.nodeSepMin * sm),
    nodeSepMax:   Math.round(DEFAULT_LAYOUT.nodeSepMax * sm),
  };
}

/**
 * Get the effective layout container size (for responsive calculations).
 * Prefers React Flow container if available, falls back to viewport dimensions.
 */
function getContainerDimensions(): { width: number; height: number } {
  // Check for React Flow container
  const rfContainer = document.querySelector('.react-flow');
  if (rfContainer instanceof HTMLElement) {
    return {
      width: rfContainer.clientWidth || window.innerWidth,
      height: rfContainer.clientHeight || window.innerHeight,
    };
  }
  
  // Fallback to viewport
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Get responsive breakpoint based on viewport width.
 * Helps adapt layout for mobile, tablet, desktop.
 */
function getBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1280) return 'tablet';
  return 'desktop';
}

export function getNodeWidth() {
  const config = getLayoutConfig();
  const { width } = getContainerDimensions();
  const breakpoint = getBreakpoint();
  
  // Adjust for breakpoint: mobile gets smaller nodes, desktop gets larger
  const basePercent = breakpoint === 'mobile' ? 0.22 : breakpoint === 'tablet' ? 0.18 : 0.2;
  const adaptive = width ? width * basePercent : (config.nodeWidthMin + config.nodeWidthMax) / 2;
  return clamp(adaptive, config.nodeWidthMin, config.nodeWidthMax);
}

export function getNodeHeight() {
  const config = getLayoutConfig();
  const { height } = getContainerDimensions();
  const breakpoint = getBreakpoint();
  
  // Adjust for breakpoint
  const basePercent = breakpoint === 'mobile' ? 0.22 : breakpoint === 'tablet' ? 0.18 : 0.18;
  const adaptive = height ? height * basePercent : (config.nodeHeightMin + config.nodeHeightMax) / 2;
  return clamp(adaptive, config.nodeHeightMin, config.nodeHeightMax);
}

export function getRankSep() {
  const c = getLayoutConfig();
  // Compact: bypass adaptive (which always exceeds the compact ceiling) and use the floor directly
  if (_override.spacing === 'compact') {
    return c.rankSepMin;
  }
  const { height } = getContainerDimensions();
  const breakpoint = getBreakpoint();
  const basePercent = breakpoint === 'mobile' ? 0.12 : 0.14;
  const adaptive = height ? height * basePercent : (c.rankSepMin + c.rankSepMax) / 2;
  return clamp(adaptive, c.rankSepMin, c.rankSepMax);
}

export function getNodeSep() {
  const c = getLayoutConfig();
  // Compact: bypass adaptive (which always exceeds the compact ceiling) and use the floor directly
  if (_override.spacing === 'compact') {
    return c.nodeSepMin;
  }
  const { width } = getContainerDimensions();
  const breakpoint = getBreakpoint();
  
  // Scale with container width (~5%) so wider screens spread siblings out more
  const basePercent = breakpoint === 'mobile' ? 0.04 : 0.05;
  const adaptive = width ? width * basePercent : (c.nodeSepMin + c.nodeSepMax) / 2;
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

/**
 * How many dagre rank levels to include in the initial fitView.
 * Scales with viewport height: taller screen → show one extra level.
 */
export function getFitLevels() {
  if (_override.fitDepth !== null) return _override.fitDepth;
  if (typeof window === "undefined") return 2;
  return window.innerHeight >= 900 ? 3 : 2;
}

/** Max characters to show in the body snippet on a node card (editor + viewer). */
export const TRUNCATE_BODY = 200;
