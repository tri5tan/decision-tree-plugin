# Decision Tree Plugin — Copilot Instructions

## Git identity — NON-NEGOTIABLE

**Every commit in this repo must use:**
- `user.name = tri5tan`
- `user.email = tri5tan@users.noreply.github.com`

**Before making any commit**, verify the local config — this is a git submodule with its own `.git/config`, it does NOT inherit from the parent repo:

```bash
git config --list --local | grep user
```

If missing or wrong, set it immediately:

```bash
git config user.name "tri5tan"
git config user.email "tri5tan@users.noreply.github.com"
```

**NEVER use:**
- `tristan@users.noreply.github.com` — wrong, missing `tri5`
- `tristanpatrick@gmail.com` — personal email, not for GitHub commits

Do not guess or infer the email from the username. Use the exact strings above, always.

---

## Project context

This is the `decision-tree-plugin` — a custom WordPress plugin for the Taituarā Council Toolkit. It is a **git submodule** of the root `taituara-toolkit` repo.

**Remote:** `git@github.com:tri5tan/decision-tree-plugin.git`  
**Branch:** `master`

### Structure

- `decision-tree.php` — plugin entry point, constants, hooks
- `includes/` — PHP classes: REST API, admin page, shortcodes
- `admin/` — React + React Flow admin editor (Vite build, TypeScript)
  - `src/components/` — React components
  - `src/hooks/` — custom hooks (`useTreeEditor`, `useTreeViewerLoader`)
  - `src/types/` — shared TypeScript types
  - `src/config/` — theme and layout config
  - `src/utils/` — utility functions
- `public/` — vanilla JS front-end wizard (`wizard.js`)

### Build

From `admin/`:
```bash
npm run build
```

From `plugin/` to build + zip:
```bash
cd decision-tree/admin && npm run build && cd ../.. && zip -r builds/decision-tree_plugin.zip decision-tree/ --exclude "decision-tree/admin/node_modules/*" ...
```

### REST API

```
GET /wp-json/dt/v1/modules          → module list
GET /wp-json/dt/v1/tree/{module_id} → full tree JSON
```

### ACF field names (snake_case, hardcoded)

- `question_text`
- `decisions` (repeater) — sub-fields: `decision_text`, `decision_answer`, `decision_path`
- `info_callout_text`
- `relevant_legislation` (repeater)
- `display_order`
