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
- Risk hierarchy and mitigation (ACF schema drift most likely; WP core changes unlikely)
- What's already mitigated vs. what still needs attention
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

## 3) Risks: likelihood, severity, and effort to fix

This section lists everything that can break, ordered by how likely it is to happen, with honest assessment of how hard it is to fix.

**Key principle:** Many things *can* break, but most are straightforward to fix. The real risk is uptime during dev phase while the ACF schema is unstable.

### 3.1 ACF field slug changes / schema drift (most likely)
**During active dev:** very high likelihood | **After locked schema:** low

The plugin expects specific field slugs: `question_text`, `decisions`, `decision_path`, `info_callout_text`, `relevant_legislation`, `display_order`, `sub_module_parent_module`.

If any are renamed, merged, or removed in ACF, the tree shows empty nodes or missing data.

**Symptom:** Red nodes in Tree Editor; missing text in wizard/viewer.

**Effort to fix:** 🟢 **Straightforward** (15–30 minutes)
- Identify which field changed (check WP admin ACF field group)
- Update field slug in `class-rest-api.php` or create a filter override
- Test tree render
- If using filter approach (recommended): add `apply_filters( 'decision_tree_field_question_text', 'question_text' )` etc.

**Prevention:**
- Document the "locked" schema once agreed (freeze ACF field slugs)
- Use the Tree Editor field-group selector to switch safely between experimental and locked groups
- Field group ID is already stored as a WP option (`decision_tree_field_group_id`) — not hardcoded
- All field slugs are already abstracted behind filterable functions in `decision-tree.php` (e.g. `decision_tree_get_field_question_text()`) — override via `add_filter()` in your theme if slugs ever change without touching plugin code

---

### 3.2 ACF return format mismatch (high likelihood during dev)
**During active dev:** high | **After schema is locked:** low

**The issue:** `decision_path` is a Relationship field in ACF. If the return format is set to **`ID`**, ACF returns post IDs (e.g., `[123]`). If changed to **`Post Object`**, ACF returns objects (e.g., `[{ ID: 123, post_title: "...", ... }]`).

The plugin expects IDs and will break if it gets objects — because the link-building code accesses `decision_path[0]` expecting a number, not an object.

**Symptom:** Decision buttons don't link to target nodes; "page not found" errors; or trees appear completely broken during navigation.

**Effort to fix:** 🟡 **Moderate** (30–60 minutes)
- Check `decision_path` return format in WP Admin → ACF → field group → Decisions repeater → Decision Path field
- Ensure return format is set to **`ID`** (not "Post Object")
- If it's definitely set to Post Object and must stay that way, edit `class-rest-api.php` to extract IDs: `const targetId = typeof path === 'object' ? path.ID : path`
- Test with a sample tree

**Prevention:**
- Document that `decision_path` return format must be **`ID`** (noted in SCHEMA.md § "ACF Field Return Format")
- Pin this in the ACF field group and avoid changes
- The plugin already detects field group role by schema inspection (`decision_tree_get_field_group_mode()`) and validates required fields at tree-load time — it will surface a `schema_mismatch` error before silently breaking
- See [SCHEMA.md ACF Field Return Format section](../SCHEMA.md#acf-field-return-format--plugin-consumption) for details
---

### 3.3 Data model inconsistency / orphaned posts (moderate likelihood)
Sub-module posts deleted, moved, or unpublished; broken `decision_path` relationships; start-node metadata stale.

**Symptom:** Orphan nodes (red, striped); missing branches; error nodes.

**Effort to fix:** 🟢 **Straightforward** (10–20 minutes)
- Use Tree Editor to visually identify red/orphan nodes
- Rewire decisions to valid target posts in the ACF Decisions repeater
- Or restore deleted posts from WP trash
- Use WP admin bulk actions to republish if needed

**Prevention:**
- Continue using the two-pass workflow (create all nodes first, then connect them)
- Avoid deleting posts during active tree building

---

### 3.4 WordPress core / REST API changes (low likelihood)
**Likelihood:** Very low for minor/patch; low for major. WordPress has strong backwards-compatibility guarantees.

The plugin uses standard WP REST (`register_rest_route`, `current_user_can`, `WP_Query`) with no private APIs.

**What could break:** A major WP version could deprecate a capability check pattern or change `WP_Query` behaviour for custom post types. Extremely rare in practice.

**Symptom:** 403 errors on REST routes; empty tree data; admin page fails to load.

**Effort to fix:** Moderate (1-3 hours depending on what changed)
- Enable `WP_DEBUG` and check PHP error log
- Test all REST endpoints: `/wp-json/dt/v1/modules`, `/wp-json/dt/v1/tree/{id}`
- Update capability checks or query args to match new WP conventions

**Prevention:**
- Review WP release notes before upgrading (focus on REST API and capability changes)
- Test on a staging environment before upgrading production

---

### 3.5 React Flow major version bump (low likelihood)
**Likelihood:** Low — only triggers if someone runs `npm update` and a major version lands.

React Flow has a history of breaking API changes between major versions (v10 to v11 had significant node/edge API changes).

**What could break:** Node/edge props, custom node component signatures, layout utilities, handle positioning.

**Symptom:** Build errors after `npm install`; blank graph; layout broken; custom nodes not rendering.

**Effort to fix:** Medium-high (2-6 hours for a major version)
- Check React Flow migration guide for the specific version jump
- Update `TreeEditor.jsx`, `ViewerNode.jsx`, `NodeSidebar.jsx` to new API
- Rebuild and test full tree render

**Prevention:**
- Pin React Flow in `package.json` with an exact version (no `^`) — already done
- Only upgrade React Flow deliberately, not as part of a bulk `npm update`
- Keep built JS committed — it only changes on explicit rebuild, so the app works even if deps drift

---

### 3.6 Wizard JS browser compatibility (very low likelihood)
**Likelihood:** Very low — vanilla JS IIFE, no build, no transpilation.

`wizard.js` uses modern JS (arrow functions, template literals, `fetch`, `Array.from`). All are baseline supported in any browser released after 2017.

**What could break:** Nothing realistically. Only a risk if the site needs to support IE11 or similar.

**Symptom:** Wizard doesn't render or throws JS errors in the browser console.

**Effort to fix:** Low (1-2 hours to add a polyfill or transpile via Babel if ever needed)

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

## 6) Integration robustness — what's already in place

The following are already implemented. This section exists so future maintainers don't re-solve solved problems.

**Field slugs are not hardcoded.**
All ACF field slug references go through filterable helper functions in `decision-tree.php`:
```php
decision_tree_get_field_question_text()       // default: 'question_text'
decision_tree_get_field_decisions()           // default: 'decisions'
decision_tree_get_field_submodule_parent_module() // default: 'sub_module_parent_module'
// ...etc
```
If a slug ever changes, add a `add_filter()` in your theme — no plugin edits required.

**Field group ID is not hardcoded.**
The selected ACF field group is stored as a WP option (`decision_tree_field_group_id`), set through the editor dropdown. It survives plugin updates.

**Schema detection is automatic.**
`decision_tree_get_field_group_mode( $id )` inspects any ACF field group by its field names and returns `'resource'`, `'submodule'`, or `'unknown'`. The plugin uses this to validate groups at load time and reject mismatches with a clear error — no silent failures.

**`module_decision_tree == false` resources are filtered.**
The `/wp-json/dt/v1/resources` endpoint already excludes resources where the `module_decision_tree` toggle is off.

**Mixed relationship return formats are handled.**
`module_linked_sub_modules` may return WP_Post objects or IDs depending on ACF config. The `build_tree_response` method already normalises both to IDs.

**What's not yet done (see TODO.md):**
- Field group dropdown in the editor still shows all ACF groups unfiltered — auto-filtering to schema-matched groups only is planned

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

> Last updated: 2026-04-02
