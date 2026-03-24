# Decision Tree Plugin — To-Do

Items are added here as they come up and ticked off at the point of a git commit.

---

## Planned

### Node Editing
- [ ] Admin notes field — editor-visible only, never shown in public viewer or wizard *(in progress)*

### General
- [ ] (add items as they come up)

---

## Completed

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
- [x] Mark as terminal / unmark terminal (persisted as post meta `_ct_is_terminal`)
- [x] Set as start / unset start with BFS auto-detection fallback (persisted on module as `_ct_start_node`)
- [x] Delete node (moves WP post to trash, removes all connections)
- [x] Orphan detection via BFS from root node
- [x] Node sidebar with contextual action buttons (mark end, set start, unset start, unmark terminal)
- [x] Public-facing viewer shortcode (step-by-step wizard UX)
- [x] Dev mode: full editor runs via `npm run dev` with local `devData.js` fixture
