# Decision Tree — Maintainability & Security

This document is intended for anyone who will maintain, extend, or hand over the Decision Tree plugin.

It focuses on:
- ✅ What can be changed without rebuilding (no build required)
- ✅ Key long-term risks (ACF field drift, data model, dependency deprecations)
- ✅ Security posture (REST routes, sanitisation, capability checks)
- ✅ Hand-off guidance for future teams

---

## 1) “No-build” surfaces (edit and deploy without `npm run build`)

These are the places you should edit when you want a fast change that doesn’t require building the React app.

### ✅ Wizard (shortcode: `[decision_tree]`)
**Files you can edit directly:**
- `plugin/decision-tree/public/wizard.js` — complete wizard behaviour (state machine, rendering, navigation)
- `plugin/decision-tree/public/wizard.css` — base styling for the wizard

> These files are loaded directly by WordPress and **do not require any build**. Changes appear immediately on page reload.

**Customisation approaches:**
- Override CSS via Bricks Global CSS or a theme Custom CSS field using `.dt-wizard` and the included BEM class names.
- For JS behaviour changes, edit `wizard.js` directly (it is a self-contained IIFE).

---

### ✅ Shortcodes (output wrappers & asset enqueueing)
**Files:**
- `plugin/decision-tree/includes/class-shortcode.php` — `[decision_tree]` wizard
- `plugin/decision-tree/includes/class-viewer-shortcode.php` — `[tree_viewer]` viewer

These files control the HTML wrapper output and which assets are loaded. Editing them does not require rebuilding.

---

### ✅ Content is controlled through ACF fields (no code changes needed)
All user-facing copy is stored on `submodules` posts via ACF fields:
- Question text (`question_text`)
- Decisions (`decisions` repeater)
- Callout (`info_callout_text`)
- Body content (post content)
- Legislation repeater (`relevant_legislation`)
- Display order (`display_order`)

> **Important:** The plugin assumes these fields exist with these exact slugs. If field slugs change, the plugin will stop working correctly (see risk section).

---

## 2) Build-required surfaces (React admin + viewer)
The following areas require a build step because they are part of the React app.

### 🔧 Admin Tree Editor (React + React Flow)
- Source: `plugin/decision-tree/admin/src/` (especially `TreeEditor.jsx`, `NodeSidebar.jsx`)
- Build output: `plugin/decision-tree/admin/dist/admin.js` + `dist/style.css`

**When build is required:**
- Changing UI structure or components
- Changing how nodes/edges are rendered
- Changing graph interactions (drag, connect, delete, etc.)

**How to rebuild:**
```bash
cd plugin/decision-tree/admin
npm install
npm run build
```

### 🔧 Public Tree Viewer (React + React Flow)
- Source: `plugin/decision-tree/admin/src/viewer-entry.jsx`, `TreeViewer.jsx`, `ViewerNode.jsx`
- Build output: `plugin/decision-tree/admin/dist/viewer.js` + `dist/viewer-decision-tree-admin.css`

**When build is required:**
- Changing public viewer UI or behaviour
- Updating the tree render logic or node content

---

## 3) Key long-term risks / maintenance pain points

### ⚠️ ACF field names / structure are hard-coded
The plugin expects specific field slugs and post types:
- Post types: `ct-kb-module`, `submodules`
- Required fields: `sub_module_parent_module`, `question_text`, `decisions`, `info_callout_text`, `relevant_legislation`, `display_order`, etc.

If any of these are renamed, removed, or changed in ACF, the plugin will fail to build the tree correctly.

**How to mitigate:**
- Keep the ACF field group versioned (see `field-groups/acf-export-2026-03-01.json`)
- Treat the field slugs as part of the “contract” and document any changes alongside updates
- The plugin now shows an admin notice when required ACF fields are missing, so misconfiguration is caught early
- The plugin now supports filters for post type + field names (see `decision_tree_*` helpers in `decision-tree.php`) so non-ct naming schemes can be supported
- Use the Decision Tree Settings page to set default module ID, and require selection before editor usage

---

### ⚠️ ACF return formats can change
`decision_path` is expected to return an array of post IDs (e.g. `[123]`). If ACF is changed to return an object or a single scalar, the link-building logic can break.

**Mitigation:**
- Ensure `decision_path` return format is set to **ID** (recommended). If you must change it, update the REST endpoint logic with robust handling.

---

### ⚠️ Data model hazards (missing/removed posts)
- If a sub-module post is deleted, any decisions linking to it become broken.
- If the “start node” post meta (`_ct_start_node`) is deleted or stale, root node detection can shift unexpectedly.

**Mitigation:**
- Continue using the two-pass workflow (create all nodes first, then connect them).
- If a node is deleted, use the tree editor to rewire or set a new start node.

---

### ⚠️ Dependency deprecations (WP / ACF / React Flow)
- **WordPress:** major WP upgrades can change REST API behaviors. Keep `WP_DEBUG` on during upgrades to spot deprecations.
- **ACF:** major ACF updates may subtly alter return formats or field metadata.
- **React Flow:** the admin/viewer bundles include React Flow. Breaking changes can occur on major versions.

**Mitigation:**
- When updating dependencies, test a full tree render and the wizard flow.
- Keep the built JS in the plugin as a snapshot; it won’t change unless you rebuild.

---

## 4) Security posture (what’s covered + what to monitor)

### ✅ Current protections
- REST mutation routes require `current_user_can('edit_posts')` (admin/editor access).
- All request input is sanitized (`sanitize_text_field`, `sanitize_textarea_field`, `absint`, `esc_url_raw`).
- Post content writes are sanitized with `wp_kses_post`.
- Public tree data (`GET /wp-json/dt/v1/tree/{module_id}`) is read-only.

### ⚠️ Things to watch
- **CSRF:** The plugin relies on WP REST cookie auth + capability checks. If you ever expose the API to non-admin clients, add nonces.
- **XSS (content fields):** The plugin outputs `the_content` via the REST API, so untrusted editor users can inject HTML/JS. Keep user roles tight.
- **Capability scope:** `edit_posts` is broad; if tighter control is needed, introduce a custom capability (e.g. `manage_decision_tree`) and map it to a role.

---

## 5) Handoff / onboarding checklist (for another team)

When handing over, ensure the following is communicated:

✅ **How to edit content (no code changes required):**
- Update ACF fields (question, decisions, callouts, legislation) on `submodules` posts.

✅ **How to adjust styling without rebuilding:**
- Edit `public/wizard.css` or add theme Custom CSS targeting `.dt-wizard`.

✅ **How to make small behavioural changes (wizard):**
- Edit `public/wizard.js` directly.

✅ **How to rebuild the React apps (admin + viewer):**
- `cd plugin/decision-tree/admin && npm install && npm run build`

✅ **How to check for broken trees:**
- Use the Tree Editor: look for red/amber nodes, or orphan nodes (they show up as red/striped).
- If the root shifts unexpectedly, check `main-module` post meta `_ct_start_node`.

✅ **Where the contract is defined:**
- ACF field slugs & meaning (this doc + `README.md` + `SCHEMA.md`)
- REST response format (nodes/edges structure)

---

## 6) Suggested “low-effort stability improvement” (optional)
If you want to reduce the “ACF field slugs are hard-coded” risk without a full rewrite, consider adding filters for the key slugs in `class-rest-api.php`:
- `apply_filters( 'dt_field_sub_module_parent_module', 'sub_module_parent_module' )`
- `apply_filters( 'dt_field_decisions', 'decisions' )`
- etc.

This gives future maintainers a simple hook to retarget the plugin to a different ACF schema.

---

## 7) Where to find more docs
- `plugin/decision-tree/README.md` — high-level instructions and deployment notes
- `plugin/decision-tree/SCHEMA.md` — the tree data structure schema
- `plugin/decision-tree/TODO.md` — feature backlog & completed items

---

**Notes:**
- This file is intended to be a stable reference for maintainers. It should be updated whenever field slugs change, REST routes are modified, or new “no-build” surfaces are added.
