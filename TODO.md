# Decision Tree Plugin — To-Do

Items are added here as they come up and ticked off at the point of a git commit.

---

## Planned

### TreeViewer refactor

> Context: TreeViewer.jsx is the read-only React Flow graph for end users (shortcode `[tree_viewer]`). It has its own inline copies of utility functions that already exist in `graphUtils.js`, its own inline `DecisionEdge`, and its own `ViewerNode`. The goals are to eliminate duplication without over-centralising — ViewerNode intentionally differs from DTNode (denser layout, no action buttons, dynamic height).

**Phase 1 — de-duplicate graph utilities (low risk)**
- [x] Import `buildFlowEdges`, `recomputeNodeStatuses`, `computeReachability` from `graphUtils.js` — they are identical to the inline copies in TreeViewer
- [x] Add `nodeType` param to `buildFlowNodes(apiNodes, nodeType = 'kb-node')` in `graphUtils.js`; TreeViewer calls it with `'viewer-node'`
- [x] Update `buildFlowEdges` in `graphUtils.js` to use `CHROME.edgeStroke` (was hardcoded `#999`)
- [x] Delete the now-redundant inline definitions from TreeViewer.jsx

**Phase 2 — share DecisionEdge**
- [x] Delete the inline `DecisionEdge` function from TreeViewer.jsx — it is identical to `components/DecisionEdge.jsx`
- [x] Import `DecisionEdge` from `./DecisionEdge` instead

**Phase 3 — viewer-specific layout**
- [x] Remove `calculateNodeHeight` and dynamic dagre height from TreeViewer — use same fixed `getNodeHeight()` as editor so nodes look consistent
- [x] Wire `fitMinZoom`/`fitMaxZoom` from `tree-layout-config.js` into `fitViewOptions`, matching editor behaviour
- [x] Apply shared layout config to TreeViewer (layout phase 1 item)
- [x] Fix scroll behaviour: removed `panOnScroll={true}` which was overriding scroll-to-zoom; viewer now zooms on scroll like the editor

**Phase 4 — ViewerNode audit**
- [x] `boxShadow` in ViewerNode updated to use `CHROME.cardShadow`
- [x] Body truncation aligned: ViewerNode uses `TRUNCATE_BODY` (120 chars) same as DTNode — centralised in `tree-layout-config.js`
- [x] ViewerNode theme tokens confirmed consistent with DTNode

**Phase 5 — filter orphans from TreeViewer**
- [x] After `computeReachability`, filter out orphan nodes and their attached edges before `setNodes`/`setEdges` — done inside `useTreeViewerLoader`

**Phase 6 — edge label centering**
- [x] Use `labelX`/`labelY` returned by `getSmoothStepPath` instead of manual linear interpolation — label now sits on the curved path, applies to both editor and viewer since they share `DecisionEdge.jsx`

**Optional Phase 7 — extract `useTreeViewerLoader` hook**
- [x] Extracted fetch → build → layout → set pipeline from TreeViewer into `hooks/useTreeViewerLoader.js`; TreeViewer component is now render-only (~80 lines)

---

### ACF / WP Integration — solidify robustness

> Context: the plugin already stores the selected field group ID as a WP option and detects field group role by schema, not by name. The gap is that field group *selection* is manual (user picks from all ACF groups) and there's no auto-discovery or pre-filtering in the UI.

- [ ] Filter the field group dropdown in the editor to only show groups that match the resource or submodule schema — don't show unrelated ACF groups
- [ ] In `get_field_groups` REST endpoint: return schema mode alongside each group (`mode: 'resource'|'submodule'|'unknown'`) so the frontend can group/label/filter them
- [ ] Auto-select field groups on first load: if exactly one resource FG and one submodule FG are detected, skip manual selection step entirely
- [ ] Validate that both a resource FG and a submodule FG are present before allowing tree load; surface a clear "setup needed" message in the editor if not
- [ ] Handle the case where `module_linked_sub_modules` returns mixed array (some items as WP_Post objects, some as IDs) — defensive normalisation already exists in `build_tree_response` but should be tested explicitly

### Layout / responsive graph (phase 1)
- [x] Add shared layout config object for editor — `config/tree-layout-config.js` with `getRankSep()`, `getNodeSep()`, `getZoomBounds()`, `getFitLevels()`
- [x] Apply responsive node width/height using min/max clamps and viewport-derived values (editor)
- [x] Apply shared `rankSep/nodeSep` and `zoom bounds` to TreeEditor
- [x] Smart default fitView: BFS first N levels, honours `fitMinZoom`/`fitMaxZoom` bounds (editor)
- [x] Apply shared layout config to TreeViewer (covered in TreeViewer refactor Phase 3)

### Layout / editable settings (phase 2)
- [ ] Add REST endpoint and module postmeta for persisted layout settings
- [ ] Add editor UI controls for layout settings (width, height, spacing, zoom limits)
- [ ] TreeViewer consumes persisted module layout config as read-only

### General
- [ ] (add items as they come up)

### Type safety (future)

> Context: the admin UI (`admin/src/`) is plain JavaScript (`.jsx`/`.js`). The TypeScript interfaces in `SCHEMA.md` (`SubmoduleFieldGroup`, `ResourceFieldGroup`, `Node`, `Edge`, `Decision`, etc.) are documentation-only — they are not imported or enforced anywhere in the codebase. Schema drift can happen silently.

**What to do:**
- Convert `admin/src/` to TypeScript (rename `.jsx` → `.tsx`, `.js` → `.ts`; update `vite.config.js` and `package.json`)
- Move the schema interfaces from SCHEMA.md into a shared `admin/src/types/schema.ts` file
- Type the REST API response shapes (`TreeResponse`, `ResourcesResponse`, `FieldGroupsResponse`, etc.)
- Annotate hook state and callback signatures in `useTreeEditor.js` → `.ts`
- Annotate utility function signatures in `graphUtils.js` → `.ts`
- Use `satisfies` or `as const` assertions on dev fixture data in `devData.ts` so mock data must conform to the schema types
- The PHP side cannot use these types directly, but SCHEMA.md remains the authoritative human reference — the TS types become the machine-enforceable equivalent

### Cross-tree linking (future consideration)

> Context: The ACF `decision_path` field allows linking to `ct-kb-module`, `ct-kb-section`, `ct-kb-subsection` and `ct-kb-submodules`. Currently the plugin treats all `decision_path` targets as submodules in the current tree and silently drops edges pointing elsewhere. Cross-tree linking is not yet implemented.

**Simple "note node" approach (~2h):**
In `build_tree_response()`, detect when a `decision_path` target is a post ID not in the current submodule set. Instead of dropping the edge, create a synthetic terminal node labelled "→ Continues in: [linked post title]" and add `isExternal: true` to its data. Style it with a distinct colour/dashed border. The sidebar could show a WP Admin edit link for the linked post.

**Full portal approach (~2–3 days):**
- New React Flow node type ("portal") with distinct visual treatment
- PHP resolves the external tree's module ID and embeds it in the node data
- Editor opens the linked tree in context (e.g. switches module selector, or opens a second panel)
- Schema additions: node fields `isExternal`, `externalPostId`, `externalTitle`, `externalAdminUrl`
- Cycle detection required: prevent circular cross-tree links

---

## Completed

- [x] TreeViewer refactored — removed all inline duplicate functions (DecisionEdge, applyDagreLayout, buildFlowNodes, buildFlowEdges, recomputeNodeStatuses, computeReachability); now shares graphUtils + shared DecisionEdge; dynamic node height removed in favour of consistent fixed height matching editor
- [x] Scroll-to-zoom fixed in TreeViewer (was overridden by `panOnScroll={true}`)
- [x] Orphan nodes filtered from TreeViewer before render — authoring concern only, not shown to end users
- [x] Edge label centering fixed — `DecisionEdge` now uses `labelX`/`labelY` from `getSmoothStepPath` (applies to both editor and viewer)
- [x] `useTreeViewerLoader` hook extracted from TreeViewer — fetch/build/layout/filter pipeline in one place, TreeViewer is now render-only
- [x] `TRUNCATE_BODY` constant centralised in `tree-layout-config.js`; both DTNode and ViewerNode use it (120 chars)
- [x] ViewerNode `boxShadow` updated to use `CHROME.cardShadow`
- [x] `buildFlowEdges` in `graphUtils.js` updated to use `CHROME.edgeStroke` (was hardcoded `#999`)
- [x] TreeEditor.jsx refactored — extracted `DTNode.jsx`, `DecisionEdge.jsx`, `utils/graphUtils.js`, `hooks/useTreeEditor.js`; component slimmed to ~60 lines
- [x] Renamed KBNode → DTNode throughout
- [x] Body text truncation 80 → 120 chars; question text uncapped
- [x] Adaptive node spacing — `rankSep` and `nodeSep` clamped to viewport dimensions
- [x] Smart default zoom — `fitView` on first N BFS levels so start node is always visible
- [x] `src/` reorganised to React best-practice: `components/`, `hooks/`, `utils/`, `config/`, `dev/`
- [x] `config/theme.js` created as single colour source of truth — exports `STATUS_COLORS`, `STATUS_LABELS`, `STATUS_META`, `getStatusKey`, `EDGE_COLORS`, `CHROME`, `BADGE`
- [x] `utils/nodeStatus.js` deleted; all consumers updated to import from `config/theme`
- [x] All hardcoded hex colours refactored to `CHROME`/`STATUS_COLORS`/`EDGE_COLORS` references across all components
- [x] `CHROME.canvasBgOverlay` added for the canvas loading overlay rgba value
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
