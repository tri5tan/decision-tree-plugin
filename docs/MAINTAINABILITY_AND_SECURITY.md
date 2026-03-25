# Decision Tree — Maintainability & Security

This document is intended for anyone who will maintain, extend, or hand over the Decision Tree plugin.


It focuses on:
- ✅ What can be changed without rebuilding (no build required)
- ✅ Key long-term risks (ACF field drift, data model, dependency deprecations)
- ✅ Security posture (REST routes, sanitisation, capability checks)
- ✅ Hand-off guidance for future teams

---

## 0) Quick reference

- **Purpose:** a single source of truth for tree content, dependencies, risks, and action paths.
- **Note:** check ACF fields in WP Admin, monitor node colour status in Tree Editor, and report rebuild requests when UI behavior changes are required.
- **For developers:** follow build workflow and dependency upgrade guidance below.

### 0.1 What this doc covers
- No-build updates (wizard text/CSS, shortcode wrappers, ACF content)
- Build-required updates (React/React Flow UI behavior and rendering)
- Risk hierarchy and mitigation (WP > ACF > React Flow)
- Security checks (capability checks, sanitisation, role safety)

### 0.2 At-a-glance impact table

- ACF field slug changes: high impact, developer + ACF admin
- Tree editor UI/React Flow changes: medium impact, developer
- Wizard layout/text changes: low impact, any editor
- WP core/REST upgrades: high impact, developer

### 0.3 Safe actions
- Confirm `submodules` posts have expected fields (question_text, decisions, etc.)
- Use Tree Editor node status colours (green/amber/red/blue) as quality check
- In Tree Editor, use the ACF field group selector to switch which field configuration is used for module loading
- Report broken links or missing nodes to a developer with exact module ID

## 1) “No-build” surfaces (edit and deploy without `npm run build`)

These are the places you should edit when you want a fast change that doesn’t require building the React app.

### ✅ Wizard (shortcode: `[decision_tree]`) 
> It the Front-end wizard part of the plugin (see `../README.md`) — vanilla JS step-by-step guided flow for end users
**Files you can edit directly:**
- `plugin/decision-tree/public/wizard.js` — complete wizard behaviour (state machine, rendering, navigation)
- `plugin/decision-tree/public/wizard.css` — base styling for the wizard

**Or if within the plugin zip file:**
- `./decision-tree_plugin/decision-tree/public/wizard.js`
- `./decision-tree_plugin/decision-tree/public/wizard.css`

> If in a code editor it's just as easy to run (rebuild)/zip files command. See below. 

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

**Important Note:**
The wrapper requires a parent to control the size of Tree Viewer. This gives full size control to the WP/Bricksbuilder side.

---

### ✅ Content is controlled through ACF fields (no code changes needed)
All user-facing copy is stored on `submodules` posts via ACF fields:
- Question text (`question_text`)
- Decisions (`decisions` repeater)
- Callout (`info_callout_text`)
- Body content (`post_content`)
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

## 3) Risk hierarchy and long-term maintenance pain points

This section explains risk ranking, why each risk matters, and quick actions for technical and non-technical users.

### 3.1 ⚠️ WordPress core / REST changes (top priority)
- Why: Core WP API and auth changes can break tree endpoint behavior.
- Non-tech action: ask the developer to run test tree renders after WP major upgrades.
- Dev action: enable `WP_DEBUG`, run integration test and inspect REST output.

### 3.2 ⚠️ ACF field names / structure are contract-bound (low)
The plugin defaults to these field slugs:
- Post types: `ct-kb-module`, `submodules` (overrideable via filters)
- Required fields: `sub_module_parent_module`, `question_text`, `decisions`, `info_callout_text`, `relevant_legislation`, `display_order`, etc.

If any of these are renamed, removed, or changed in ACF, the tree may show as empty or missing nodes until a valid field group/module is selected in the editor, or site-specific overrides are applied.

**Migration note:**
- Old field groups can be re-targeted using the Tree Editor ACF field group selector; no rebuild is required for layout keys or module selection.
- Schema changes are handled via filters (fallbacks are safe, empty state is the user-facing result).
- The plugin now shows an admin notice when required ACF fields are missing, so misconfiguration is caught early

**Implementation detail:**
- `/wp-json/dt/v1/field-groups` returns all ACF field groups (via the ACF API function `acf_get_field_groups`, not core WP), then Tree Editor's select uses those IDs.
- `/wp-json/dt/v1/field-group` stores the selected group in option `decision_tree_field_group_id` through `decision_tree_set_field_group_id`.
- `/wp-json/dt/v1/tree/{module_id}` reads the selected group, validates required field names with `acf_get_fields` and an explicit required field list (`sub_module_parent_module`, `question_text`, `decisions`, `info_callout_text`, `relevant_legislation`, `display_order`), and then builds nodes/edges from the chosen submodule content.

> See `plugin/decision-tree/includes/class-rest-api.php`

**Robustness:**
- The plugin supports overrides via filter hooks:
  - `decision_tree_module_post_type`
  - `decision_tree_submodule_post_type`
  - `decision_tree_field_submodule_parent_module`
  - `decision_tree_field_question_text`
  - `decision_tree_field_decisions`
  - `decision_tree_field_info_callout`
  - `decision_tree_field_legislation`
  - `decision_tree_field_order`



### 3.3 ⚠️ ACF return formats can change (medium)
`decision_path` is expected to return an array of post IDs (e.g. `[123]`). If ACF is changed to return an object or a single scalar, the link-building logic can break.

**Mitigation:**
- Ensure `decision_path` return format is set to **ID** (recommended). If you must change it, update the REST endpoint logic with robust handling.

### 3.4 ⚠️ Data model hazards (missing/removed posts)
- If a sub-module post is deleted, any decisions linking to it become broken.
- If the “start node” post meta (`_dt_start_node`) is deleted or stale, root node detection can shift unexpectedly.

**Mitigation:**
- Continue using the two-pass workflow (create all nodes first, then connect them).
- If a node is deleted, use the tree editor to rewire or set a new start node.

### 3.5 ⚠️ Dependency risk hierarchy (priority order)
1. **WordPress (highest priority):** major core plugin upgrades can break REST endpoints, capabilities, hook behavior, URL rewriting, and auth. Always test with `WP_DEBUG` enabled and run a full tree render after upgrades.
2. **ACF (medium-high):** field schema and return formats are part of the contract (`decision_path`, `question_text`, etc.). ACF return format change (IDs → objects) is an immediate functional break for tree resolution.
3. **React Flow (lower severity for small updates):** the JS bundles in admin/viewer use React Flow. Patch versions are stable but major library upgrades may require component/API updates. If the version pinned in `package.json` (and not auto-upgraded to “latest major”), this is low.

**Mitigation:**
- When updating dependencies, run full tree render and wizard tests.
- Keep built JS as a versioned snapshot; it only changes on explicit rebuild.

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
- If the root shifts unexpectedly, check `main-module` post meta `_dt_start_node`.

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

## 8) Glossary (quick definitions)
- **ACF:** Advanced Custom Fields plugin used for structured module content.
- **React Flow:** graph library used by admin/editor and viewer for node-edge visuals.
- **REST:** WordPress JSON API used by `/wp-json/dt/v1/*` routes.
- **Post type:** WP content entity type (`submodules`, `ct-kb-module`).
- **No-build:** changes that do not require `npm run build` (wizard JS/CSS, shortcode wrappers, ACF content).
- **Build-required:** changes requiring React/React Flow code rebuild in `plugin/decision-tree/admin/`.

---

**Notes:**
- This file is intended to be a stable reference for maintainers. It should be updated whenever field slugs change, REST routes are modified, or new “no-build” surfaces are added.

> Last updated: 2026-03-25 (optional, keep in sync with commits).
