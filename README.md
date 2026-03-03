# CT Decision Tree Plugin

Custom WordPress plugin for the Taituarā Council Toolkit.

Provides three interfaces from one data source:
1. **Admin tree editor** — a React Flow graph in WP Admin for Taituarā content staff to visualise and validate decision trees
2. **Front-end wizard** — a `[ct_decision_tree]` shortcode that renders a step-by-step UI for council end users
3. **Front-end tree viewer** — a `[ct_tree_viewer]` shortcode that renders a read-only interactive graph visualization for exploring the full tree structure

Data lives entirely in ACF Pro fields on `ct-kb-submodules` posts. No external services.

---

## Installation

1. Copy the `ct-decision-tree/` folder to `/wp-content/plugins/`
2. In WP Admin → Plugins → activate **CT Decision Tree**
3. Build the admin React app (first time and after any changes to `admin/src/`):
   ```bash
   cd admin
   npm install
   npm run build
   ```

---

## ACF field dependency

The plugin reads these fields on `ct-kb-submodules` posts:

| Field slug | Type | Notes |
|---|---|---|
| `sub_module_parent_module` | relationship | Links sub-module to its parent module |
| `question_text` | text | **Must be added manually** — see below |
| `decisions` | repeater | Two rows per node (Yes + No) |
| `decisions[].decision_text` | text | Button label shown to the user |
| `decisions[].decision_answer` | radio | `Yes` or `No` |
| `decisions[].decision_path` | relationship (ID) | Target post to navigate to |
| `info_callout_text` | text | Best Practice callout content |
| `display_order` | number | Sort order within module |
| `relevant_legislation` | repeater | Legislation entries |
| `relevant_legislation[].act` | text | Act name |
| `relevant_legislation[].section` | text | Section reference |
| `relevant_legislation[].legislation_link` | url | Link to legislation text |

### Adding the `question_text` field

This field is not in the original ACF export and must be added:

1. WP Admin → Custom Fields → **Knowledge Base Sub Module fields**
2. Click **+ Add Field**
3. Label: `Question Text`, Name: `question_text`, Type: `Text`
4. Drag it above the `Decisions` repeater
5. Click **Update**

---

## Admin tree editor

**Location:** WP Admin → Knowledge Base Module → **Tree View**

Select a module from the dropdown to see its full decision tree as a graph.

### Node colours

| Colour | Meaning |
|---|---|
| Green | All links set — both Yes and No targets filled |
| Amber | Partial — one target missing |
| Red | Empty — no targets set yet |
| Blue | Terminal node — end of the tree, displays content |

**Click any node** to open the detail sidebar showing question text, callout, legislation, and a direct link to edit that sub-module in WP Admin.

### Two-pass workflow for building a new tree

Because a decision link can only point to a sub-module that already exists:

1. **First pass:** Create all sub-module posts with titles and content. Leave the `Decisions` repeater empty.
2. **Second pass:** Open each sub-module and fill in the `Decisions` repeater, linking to the targets you created in step 1.
3. **Verify:** Open Tree View, select the module, confirm all nodes are green or blue.

---

## Front-end wizard (shortcode)

The wizard is a lightweight, **vanilla JavaScript** step-by-step UI. It requires no build tools — `wizard.js` and `wizard.css` are plain files you can edit directly via SFTP, the WP file manager, or a code editor. No Node.js, no npm, no terminal needed.

### Adding the wizard to a page

Place the shortcode in any Bricks Builder Code/Shortcode widget, page, or post:

```
[ct_decision_tree module_id="123"]
```

Where `123` is the **post ID of the `ct-kb-module`** whose tree you want to render. Find the module ID in WP Admin → Knowledge Base Module → hover over the module title to see the post ID in the URL.

The shortcode outputs a single empty div:
```html
<div class="ct-wizard" data-module-id="123"></div>
```

On page load `wizard.js` fetches the tree data from the REST API and renders the full UI into that div — no page reload required as the user navigates through steps.

> **Note:** The wizard does **not** render inside the Bricks editor canvas. Always preview or visit the published frontend URL to see it working.

### How it works (for developers)

The wizard is entirely data-driven — all content comes from ACF fields on `ct-kb-submodules` posts:

- **Decision nodes** (amber/green in Tree View): show the question text and Yes/No choice buttons. Clicking a button pushes the current step onto a history stack and moves to the target node.
- **Terminal nodes** (blue in Tree View): show body content, best practice callout, and relevant legislation. These are nodes with no decisions set in ACF.
- **Breadcrumb trail**: shows previously visited steps as clickable links — clicking one jumps back to that point in the history.
- **Back / Start again**: Back pops one step, Start again resets to the root node.

No server round-trips after the initial fetch — the full tree is loaded once and navigated in memory.

### Editing the wizard behaviour

`public/wizard.js` is a self-contained IIFE (immediately-invoked function expression). To modify behaviour:

1. Edit `public/wizard.js` directly (SFTP or WP file manager)
2. No build step required — changes take effect on next page load
3. Clear any caching plugin cache after editing

The file is well-commented with a section-per-concern layout. Key functions:
- `runWizardFinal(container, data)` — the main state machine; owns `history` and `currentId`
- `render()` (inside `runWizardFinal`) — rebuilds the UI for the current node on every step change
- `initWizardFinal(container)` — fetches the REST data and boots the wizard for one `.ct-wizard` div

### Styling

**Option 1 — CSS custom properties (recommended)**

Override the design tokens on `.ct-wizard` in Bricks Global CSS, a child theme, or a Custom CSS field:

```css
.ct-wizard {
  --ct-primary:        #2c6e49;  /* choice button border + hover fill */
  --ct-callout-bg:     #f0f7ee;  /* best practice callout background */
  --ct-callout-accent: #2c6e49;  /* callout left border + label colour */
  --ct-leg-bg:         #f5f5f5;  /* legislation block background */
  --ct-link:           #2563eb;  /* legislation link colour */
}
```

**Option 2 — target class names directly**

All elements use a `ct-wizard__` BEM prefix, making them safe to target without specificity conflicts:

```
.ct-wizard              outer wrapper div
.ct-wizard--loading     added to wrapper while fetching (use for skeleton/spinner)
.ct-wizard__trail       breadcrumb row
.ct-wizard__crumb       individual breadcrumb button (clickable)
.ct-wizard__sep         breadcrumb separator › 
.ct-wizard__heading     step title <h3>
.ct-wizard__question    yes/no question prompt <p>
.ct-wizard__choices     choice button group wrapper
.ct-wizard__choice      individual Yes/No button (data-answer="Yes"|"No")
.ct-wizard__content     body copy <div> (rendered for all nodes, if content exists)
.ct-wizard__callout     best practice callout block
.ct-wizard__legislation legislation links block
.ct-wizard__nav         back + restart button row
.ct-wizard__back        back button
.ct-wizard__restart     start again button
.ct-wizard__error       error message <p>
```

**Option 3 — edit `wizard.css` directly**

The base stylesheet (`public/wizard.css`) is intentionally minimal — it provides layout and spacing only, with no opinionated colours beyond the custom properties. Edit it directly via SFTP for global changes, or leave it untouched and override in Bricks.

### Updating content

All wizard content is managed entirely through WordPress — **no code changes needed for content updates**:

| What to change | Where |
|---|---|
| Step title | Sub-module post title in WP Admin |
| Question text | `Question Text` ACF field on the sub-module |
| Body copy | Post content (block editor) on the sub-module |
| Best practice callout | `Info Callout Text` ACF field |
| Yes/No button labels | `Decision Text` in the Decisions repeater |
| Which step each button leads to | `Decision Path` in the Decisions repeater |
| Legislation entries | `Relevant Legislation` repeater |
| Step order | `Display Order` ACF field (lower = earlier) |

Changes appear immediately on the next page load — no cache to clear in the plugin itself (though a caching plugin may need clearing).

---

## Front-end tree viewer (shortcode)

The tree viewer provides a **read-only, interactive graph visualisation** of a decision tree — similar to the admin Tree View, but designed for public viewing. End users can zoom, pan, and explore the full tree structure with all content visible directly on each node.

### When to use the viewer vs. wizard

- **Wizard** (`[ct_decision_tree]`): Guided step-by-step navigation. Best for users who need to follow a process and get an outcome.
- **Viewer** (`[ct_tree_viewer]`): Bird's-eye view of the entire tree structure. Best for users who want to understand the whole process at once, or for reference/documentation purposes.

Both shortcodes work independently and can be placed on different pages, or even on the same page for different use cases.

### Adding the tree viewer to a page

Place the shortcode in any Bricks Builder Code/Shortcode widget, page, or post:

```
[ct_tree_viewer module_id="123"]
```

Where `123` is the **post ID of the `ct-kb-module`** whose tree you want to visualise.

### Features

- **Interactive graph**: Same React Flow visualization as the admin editor
- **Full content on nodes**: All text, questions, callouts, and legislation displayed directly on nodes (no sidebar)
- **Read-only**: No editing, dragging, or connecting — optimised for viewing only
- **Zoom & pan**: Users can zoom in/out (mouse wheel) and pan (click-drag canvas) to explore
- **MiniMap**: Overview of entire tree structure in bottom-right corner
- **Color-coded nodes**: Same status colors as admin (green = complete, amber = partial, blue = terminal, red = empty, striped = orphan)
- **Public access**: No login required (unlike admin Tree View)

### Node content

Each node displays:
- **Step title** (heading)
- **Question text** (if present, in italics with background)
- **Body content** (full HTML, not truncated)
- **Best practice callout** (if present, in green box)
- **Relevant legislation** (expandable list with links)
- **Status indicator** (icon and color-coded border)

### Technical notes

- Loads React Flow library (~500KB gzipped) — only loads on pages with the `[ct_tree_viewer]` shortcode
- Uses the same REST API endpoint as wizard and admin (`/wp-json/ct/v1/tree/{module_id}`)
- Renders at 100vh height — best used on full-width pages or in dedicated sections
- Built with the admin React app (shares dependencies and build process)

### Styling the viewer

The viewer uses primarily inline styles for consistency with the admin editor. Future updates may extract styles to CSS custom properties similar to the wizard. For now, styling customization should be done via wrapper CSS targeting the `#ct-decision-tree-viewer` container.

---

## REST API

Both UIs consume the same endpoints. Public read access; module list requires editor login.

```
GET /wp-json/ct/v1/modules
→ [{ id, title }, ...]

GET /wp-json/ct/v1/tree/{module_id}
→ { rootNodeId, nodes[], edges[] }
```

Node shape:
```json
{
  "id": "sm-123",
  "data": {
    "postId":      123,
    "label":       "Classify request type",
    "question":    "Is the request for service a request for information?",
    "content":     "<p>...</p>",
    "callout":     "A standard template...",
    "legislation": [{ "act": "...", "section": "...", "url": "..." }],
    "isTerminal":  false,
    "linkStatus":  "complete"
  }
}
```

---

## File structure

```
ct-decision-tree/
├── ct-decision-tree.php          plugin entry, constants, requires
├── includes/
│   ├── class-rest-api.php        REST endpoints — reads ACF, returns JSON
│   ├── class-admin-page.php      WP Admin menu page + asset enqueue
│   ├── class-shortcode.php       [ct_decision_tree] shortcode (wizard)
│   └── class-viewer-shortcode.php [ct_tree_viewer] shortcode (graph viewer)
├── admin/
│   ├── src/
│   │   ├── index.jsx             React entry point (admin editor)
│   │   ├── viewer-entry.jsx      React entry point (public viewer)
│   │   ├── TreeEditor.jsx        React Flow graph + module selector (admin)
│   │   ├── TreeViewer.jsx        React Flow graph (public, read-only)
│   │   ├── ViewerNode.jsx        Custom node component for viewer
│   │   ├── NodeSidebar.jsx       Node detail panel (admin only)
│   │   └── nodeStatus.js         Status colors and metadata (shared)
│   ├── dist/                     built output (admin.js, viewer.js, style.css) — gitignore or commit
│   ├── index.html                dev harness for admin editor
│   ├── viewer-dev.html           dev harness for tree viewer
│   ├── package.json
│   └── vite.config.js            multi-entry build config
└── public/
    ├── wizard.js                 vanilla JS step-by-step wizard
    ├── wizard.css                base styles (wizard only)
    └── dev.html                  standalone wizard dev harness
```

---

## Development

All commands run from the `admin/` directory unless noted.

### First-time setup

```bash
cd plugin/ct-decision-tree/admin
npm install
```

### Local dev — admin tree editor (no WordPress needed)

Starts Vite on `http://localhost:3737` with hot-reload. Uses mock data from `src/devData.js`.

```bash
cd plugin/ct-decision-tree/admin
npm run dev
```

Then open **http://localhost:3737/** (admin editor with sidebar)



### Local dev — tree viewer (no WordPress needed)

Same Vite dev server, different HTML file. Uses mock data from `src/devData.js`.

```bash
cd plugin/ct-decision-tree/admin
npm run dev
```

Then open **http://localhost:3737/viewer-dev.html** (read-only graph view)





### Local dev — front-end wizard (no WordPress needed)

Serves `public/dev.html` — a standalone wizard harness with mocked tree data, no REST API required.

```bash
cd plugin/ct-decision-tree/public && python3 -m http.server 8080
```

Then open **http://localhost:8080/dev.html**



### Production build

All commands run from the `admin/` directory unless noted.

Compiles React source → `admin/dist/admin.js` + `admin/dist/viewer.js` + `admin/dist/style.css`. Always run before zipping/deploying.

```bash
npm run build
```

The build creates two entry points:
- `admin.js` — admin tree editor
- `viewer.js` — public tree viewer
- `style.css` — shared React Flow styles

> **Note:** `wizard.js` is vanilla JS with no build step — edit `public/wizard.js` directly.

### Build + zip for WordPress upload

Run from the `plugin/` directory: (`cd plugin/` or `cd ../../` if in `admin/`)

```bash
cd ct-decision-tree/admin && rm -rf dist && npm run build && cd ../.. && rm -f ct-decision-tree_plugin.zip && zip -r ct-decision-tree_plugin.zip ct-decision-tree/ --exclude "ct-decision-tree/admin/node_modules/*" --exclude "ct-decision-tree/admin/src/*" --exclude "ct-decision-tree/admin/package.json" --exclude "ct-decision-tree/admin/vite.*.config.js" --exclude "ct-decision-tree/admin/index.html" --exclude "ct-decision-tree/admin/viewer-dev.html" --exclude "ct-decision-tree/README.md" --exclude "ct-decision-tree/public/dev.html" && echo "Done: $(du -sh ct-decision-tree_plugin.zip)"
```

Produces a ~168 KB `ct-decision-tree_plugin.zip` in the `plugin/` directory, ready for **WP Admin → Plugins → Add New → Upload Plugin**.

To replace an existing install: deactivate + delete the old plugin first, then upload. ACF field data lives on the posts so nothing is lost.

---

## Known issues / TODO

- `wizard.js` contains some dead code from an earlier draft at the top of the IIFE — safe to remove, does not affect runtime behaviour. The active code path is `DOMContentLoaded → initWizardFinal → runWizardFinal`.
- Bidirectional ACF field sync (`module_linked_sub_modules` ↔ `sub_module_parent_module`) is unreliable per Rachel's notes. The REST API queries sub-modules directly (via `sub_module_parent_module`) rather than trusting the reverse field — this is intentional.
- `decision_path` accepts any CPT (module, submodule, section, subsection). The wizard and admin graph both handle any target post type gracefully, but mixed-type trees are untested.
