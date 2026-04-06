# Decision Tree Plugin — To-Do

Items are added here as they come up and ticked off at the point of a git commit.

---

## Planned

### ACF / WP Integration — solidify robustness

> Context: the plugin already stores the selected field group ID as a WP option and detects field group role by schema, not by name. The gap is that field group *selection* is manual (user picks from all ACF groups) and there's no auto-discovery or pre-filtering in the UI.

- [ ] Filter the field group dropdown in the editor to only show groups that match the resource or submodule schema — don't show unrelated ACF groups
- [ ] In `get_field_groups` REST endpoint: return schema mode alongside each group (`mode: 'resource'|'submodule'|'unknown'`) so the frontend can group/label/filter them
- [ ] Auto-select field groups on first load: if exactly one resource FG and one submodule FG are detected, skip manual selection step entirely
- [ ] Validate that both a resource FG and a submodule FG are present before allowing tree load; surface a clear "setup needed" message in the editor if not
- [ ] Handle the case where `module_linked_sub_modules` returns mixed array (some items as WP_Post objects, some as IDs) — defensive normalisation already exists in `build_tree_response` but should be tested explicitly

### Layout / responsive graph (phase 1)
- [ ] Add shared layout config object for editor + viewer (code-only, no UI edit)
- [ ] Apply responsive node width/height using min/max clamps and viewport-derived values
- [ ] Apply shared `rankSep/nodeSep` and `zoom bounds` to both TreeEditor and TreeViewer
- [ ] Ensure start node is positioned near top after fitView, with max zoom-out limit

### Layout / editable settings (phase 2)
- [ ] Add REST endpoint and module postmeta for persisted layout settings
- [ ] Add editor UI controls for layout settings (width, height, spacing, zoom limits)
- [ ] TreeViewer consumes persisted module layout config as read-only

### General
- [ ] (add items as they come up)

---

## Completed

- [x] Admin notes field — editor-visible only, never shown in public viewer or wizard
- [x] Inline add / edit / delete legislation items in node sidebar
- [x] Copy legislation as JSON to clipboard from sidebar
- [x] Import / paste JSON directly into legislation section (supports bulk entry + cross-node copy)
- [x] Add `legislation` write endpoint to REST API (`POST /node/{id}` with `legislation` array)
- [x] ACF field groups for sub-modules (question, callout, decisions repeater, legislation repeater)
- [x] REST API — GET modules, GET tree, POST node update, POST node create, DELETE node, POST module settings
- [x] React Flow tree editor with dagre auto-layout
- [x] Custom node component (KBNode) with status-coloured left border
- [x] Custom edge component (DecisionEdge) with Yes/No pill labels positioned near arrowhead
- [x] Node creation via "Add node" button
- [x] Node creation via drag-from-handle to blank canvas space (creates + connects in one step)
- [x] Node-to-node connections via drag between handles
- [x] Edge deletion from sidebar
- [x] Inline editing in sidebar: title, question, callout, body content
- [x] Node status computation: complete / partial / terminal / empty / orphan / start
- [x] Mark as terminal / unmark terminal (persisted as post meta `_dt_is_terminal`)
- [x] Set as start / unset start with BFS auto-detection fallback (persisted on module as `_dt_start_node`)
- [x] Delete node (moves WP post to trash, removes all connections)
- [x] Orphan detection via BFS from root node
- [x] Node sidebar with contextual action buttons (mark end, set start, unset start, unmark terminal)
- [x] Public-facing viewer shortcode (step-by-step wizard UX)
- [x] Dev mode: full editor runs via `npm run dev` with local `devData.js` fixture
