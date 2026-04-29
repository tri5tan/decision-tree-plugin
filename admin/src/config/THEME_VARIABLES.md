# Flow Diagram Theme Variables

This document defines the theme variable contract for the flow diagram plugin.
The plugin is moving toward a dedicated prefix for plugin-specific values, while still using shared site-level variables for global brand tokens.

## Naming rules

- Use `--fd-...` only for plugin-unique theming values.
- Use site-wide variables like `--primary` and `--primary-text` for brand-level colours.
- Centralize fallback values in the theme layer, not in arbitrary component code.


## Shared site-level variables

These values are intended to come from the core/site theme, not the plugin-specific contract.

- `--primary`
- `--primary-text`

Optional upstream design tokens that plugin theme variables may also fall back to when available:
- `--bg-surface`
- `--bg-body`
- `--text-body`
- `--text-title`
- `--border-primary`
- `--shadow-primary`
- `--light`
- `--secondary-10`
- `--error-5`

Preferred usage in plugin JavaScript is via the theme constants exported from `theme.ts`.

export const GLOBAL = {
  primary: 'var(--primary, #F09644)',
  primaryText: 'var(--primary-text, #ffffff)',
};

Example plugin JS usage:
- `background: GLOBAL.primary`
- `color: GLOBAL.primaryText`

Only use raw CSS variable fallback expressions in low-level CSS when components cannot access the JS theme layer.

## Plugin-unique variables

These tokens are specific to the flow diagram plugin and should use the `--fd-` prefix.

### Status palette
- `--fd-status-start-base`
- `--fd-status-start-bg`
- `--fd-status-start-border`
- `--fd-status-start-text`
- `--fd-status-complete-base`
- `--fd-status-complete-bg`
- `--fd-status-complete-border`
- `--fd-status-complete-text`
- `--fd-status-partial-base`
- `--fd-status-partial-bg`
- `--fd-status-partial-border`
- `--fd-status-partial-text`
- `--fd-status-empty-base`
- `--fd-status-empty-bg`
- `--fd-status-empty-border`
- `--fd-status-empty-text`
- `--fd-status-terminal-base`
- `--fd-status-terminal-bg`
- `--fd-status-terminal-border`
- `--fd-status-terminal-text`
- `--fd-status-orphan-base`
- `--fd-status-orphan-bg`
- `--fd-status-orphan-border`
- `--fd-status-orphan-text`

### Edge / decision pills
- `--fd-edge-yes-bg`
- `--fd-edge-yes-border`
- `--fd-edge-yes-text`
- `--fd-edge-no-bg`
- `--fd-edge-no-border`
- `--fd-edge-no-text`

### Chrome / UI shell
- `--fd-canvas-bg`
- `--fd-canvas-grid`
- `--fd-panel-bg`
- `--fd-panel-border`
- `--fd-card-bg`
- `--fd-card-border-subtle`
- `--fd-card-shadow`
- `--fd-handle-bg`
- `--fd-handle-border`
- `--fd-edge-stroke`

### Typography / text
- `--fd-text-strong`
- `--fd-text-primary`
- `--fd-text-secondary`
- `--fd-text-muted`
- `--fd-text-subtle`
- `--fd-text-placeholder`
- `--fd-text-error`

### Controls / buttons
- `--fd-btn-neutral-bg`
- `--fd-btn-neutral-text`
- `--fd-btn-action-bg`
- `--fd-btn-action-text`

### Inputs / forms
- `--fd-input-border`
- `--fd-input-bg-readonly`

### Overlay / modal
- `--fd-overlay`
- `--fd-modal-bg`
- `--fd-modal-shadow`

### Status banners
- `--fd-error-bg`
- `--fd-info-bg`

### Misc
- `--fd-row-bg`
- `--fd-section-label`
- `--fd-badge-bg`
- `--fd-badge-text`
- `--fd-badge-legislation`
- `--fd-badge-callout`

## Plugin variable definitions

The core framework should define these color variables in its CSS, using the plugin defaults when the site does not override them.

```css
:root {
  --fd-status-start-base: #1e6b7b;
  --fd-status-start-bg: #d4e9f0;
  --fd-status-start-border: #5a9bb0;
  --fd-status-start-text: #1e6b7b;

  --fd-status-complete-base: #6f913e;
  --fd-status-complete-bg: #eef5e0;
  --fd-status-complete-border: #99b657;
  --fd-status-complete-text: #6f913e;

  --fd-status-partial-base: #7c7e32;
  --fd-status-partial-bg: #f0f0e6;
  --fd-status-partial-border: #b0b163;
  --fd-status-partial-text: #7c7e32;

  --fd-status-empty-base: #ac823f;
  --fd-status-empty-bg: #f5f0ea;
  --fd-status-empty-border: #d4b88a;
  --fd-status-empty-text: #ac823f;

  --fd-status-terminal-base: #5f6b70;
  --fd-status-terminal-bg: #eaeced;
  --fd-status-terminal-border: #8a9299;
  --fd-status-terminal-text: #5f6b70;

  --fd-status-orphan-base: #7f3d48;
  --fd-status-orphan-bg: #f4ebe9;
  --fd-status-orphan-border: #a6686f;
  --fd-status-orphan-text: #7f3d48;

  --fd-edge-yes-bg: #eff3e9;
  --fd-edge-yes-border: #9db679;
  --fd-edge-yes-text: #648734;

  --fd-edge-no-bg: #f4ecea;
  --fd-edge-no-border: #d09e8e;
  --fd-edge-no-text: #b7694e;

  --fd-canvas-bg: #f7f7f7;
  --fd-canvas-grid: #ccc;
  --fd-panel-bg: #fff;
  --fd-panel-border: #ddd;
  --fd-card-bg: #fff;
  --fd-card-border-subtle: #e5e7eb;
  --fd-card-shadow: 0 1px 4px rgba(0,0,0,0.08);
  --fd-handle-bg: #ddd;
  --fd-handle-border: #aaa;
  --fd-edge-stroke: #999;

  --fd-text-strong: #1a1a1a;
  --fd-text-primary: #404040;
  --fd-text-secondary: #555;
  --fd-text-muted: #666;
  --fd-text-subtle: #888;
  --fd-text-placeholder: #aaa;
  --fd-text-error: #c0392b;

  --fd-btn-neutral-bg: #eee;
  --fd-btn-neutral-text: #333;
  --fd-btn-action-bg: #F09644;
  --fd-btn-action-text: #ffffff;

  --fd-input-border: #ccc;
  --fd-input-bg-readonly: #e4edf5;

  --fd-overlay: rgba(0,0,0,0.45);
  --fd-modal-bg: #fff;
  --fd-modal-shadow: 0 8px 32px rgba(0,0,0,0.25);

  --fd-error-bg: #fde8e8;
  --fd-info-bg: #f2f8ff;

  --fd-row-bg: #f5f5f5;
  --fd-section-label: #999;
  --fd-badge-bg: #dcfef4;
  --fd-badge-text: #404040;
  --fd-badge-legislation: #6366f1;
  --fd-badge-callout: #0891b2;
}
```

## Fallback strategy

Fallback values should be centralized in the theme layer, not repeated across component code.

- In JS, consume `GLOBAL.primary` and `GLOBAL.primaryText` from `theme.ts`.
- In plugin CSS only when necessary, use `var(--fd-some-token, var(--primary, #F09644))` for values that may fall through to site branding.
- For UI shell and chrome values, plugin vars may also chain to broader site tokens like `--bg-surface`, `--text-body`, `--border-primary`, `--shadow-primary`, `--secondary-10`, and `--error-5` before final defaulting.
- Use `var(--fd-some-token, #someDefault)` only for plugin-specific colours that are not shared with site branding.

## Example

### JS usage

```ts
import { GLOBAL } from './theme';

const buttonStyle = {
  background: GLOBAL.primary,
  color: GLOBAL.primaryText,
};

// Example use in React:
function PrintButton() {
  return <button style={buttonStyle}>Print</button>;
}
```

### CSS usage

```css
.status-chip {
  background: var(--fd-status-start-bg, #d4e9f0);
  color: var(--fd-status-start-text, #1e6b7b);
}
```

## Notes

- The plugin is expected to migrate from `decision-tree` to `flow-diagram`.
- The `--fd-` prefix is chosen for plugin-unique tokens and should remain stable across that rename.
- Site-branding variables such as `--primary` should stay outside the plugin-specific prefix.
