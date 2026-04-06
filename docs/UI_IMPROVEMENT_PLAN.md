# Decision Tree Plugin — UX/UI Improvement Plan

## Current State Assessment

### ✅ What's Working Well
- **Color-coded status system** — Immediate visual feedback (complete/partial/empty/terminal/orphan/start)
- **Auto-layout via dagre** — Tree automatically organizes itself, no manual positioning needed
- **Intuitive drag-to-connect** — Drawing connections visually is natural
- **Drag-to-blank-space creation** — Creates new node + connects in one gesture (though discovery is low)
- **Mini map** — Quick overview of complex trees
- **Hover actions** — Buttons appear on hover (set as start, mark as end) without cluttering layout

### ⚠️ Current Pain Points

**Discovery & Guidance**
1. No clear explanation of "what should each field contain?"
2. Users don't know they can drag to blank space to create+connect
3. Legend shows colors but not HOW to achieve each status
4. No field tooltips / inline help
5. Status meanings (orphan, partial, etc.) not obvious to first-time users

**Content Management**
1. NodeSidebar likely cramped for large content blocks
2. No way to store "internal notes" (staff-only context)
3. Long text gets truncated in node preview (80 chars)
4. No expandable sections for detail/legislation/notes
5. Content HTML handling unclear to non-technical staff

**Visual/UX**
1. No indication of what you're supposed to do next (missing validation feedback)
2. Color status doesn't show visually HOW to fix incomplete nodes
3. No template examples for common tree patterns
4. Orphaned nodes frustrating — staff don't know how to fix them
5. No "dirty" state indicator (unsaved changes) — though auto-save mitigates

---

## Proposed Improvements (Priority Order)

### Priority 1: Field Guidance & Tooltips (Low effort, high impact)

**What to do:**
- Add small [?] help icons next to confusing fields
- Show tooltip on hover with concise explanation
- Add placeholder text hints in input fields

**Where:**
- NodeSidebar: Next to "Question", "Callout", "Content" fields
- Main canvas: Hover legend to show descriptions
- "Add a step" dialog: Brief instruction

**Example:**
```
Question [?]  "A yes/no question that determines which path the user takes"
Callout  [?]  "Important warning/requirement shown prominently. Leave blank if not needed."
Content  [?]  "Detailed guidance. Can be long — it's expandable in the UI."
```

**Implementation:**
- React component: `<Tooltip text="..."><span>[?]</span></Tooltip>`
- Or: CSS-only with `title` attribute + custom styling
- Or: Simple `<abbr title="...">` HTML

---

### Priority 2: NodeSidebar Layout Improvements (Medium effort)

**Current problem:**
- All fields crammed into narrow sidebar
- Long content gets cut off
- No clear section breaks

**Solution: Tabs or Expandable Sections**

```
┌─────────────────────────┐
│ sm-102: Roaming Dog     │
├─────────────────────────┤
│ ▼ Question              │
│   [text input]          │
│                         │
│ ▼ Callout [?]           │
│   [text input]          │
│                         │
│ ▼ Content/Guidance [?]  │
│   [expandable text area]│
│   Lorem ipsum...        │
│                         │
│ ▼ Legislation [?]       │
│   [list with + btn]     │
│   • Act 1996 — S.57     │
│                         │
│ ▼ Internal Notes        │
│   [expandable text]     │
│   "Added Feb 2026..."   │
│                         │
│ ... Decision Paths ...  │
│ Yes → step-5            │
│ No  → step-6            │
│                         │
│ [Edit in WP] [Delete]   │
└─────────────────────────┘
```

**Benefits:**
- Content doesn't overflow
- Clear visual hierarchy
- Users only see what they need
- Expandable sections feel less overwhelming

---

### Priority 3: Clarify Status Legend (Low effort)

**Current legend just shows colors. Make it actionable:**

```
Node Status
━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Complete (green left border)
  Both Yes & No paths connected
  Action: None needed ✓

⚠ Partial (amber left border)
  One path missing (Yes or No)
  Action: Hover & draw the missing connection

○ Empty (grey left border)
  No paths connected
  Action: Mark as "End node" OR connect Yes/No

■ Terminal/End (blue left border)
  Final outcome node, no paths needed
  Action: Click "Mark as End" when ready

✂ Orphan (red dashed border)
  Not reachable from start node
  Action: Either delete, or draw from elsewhere

▶ Start (green badge)
  Entry point to the tree
  Action: Auto-detected or click "Set as start"
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Priority 4: Inline Validation & Guidance (Medium effort)

**When a node is incomplete, show helpful action hints:**

```
Node: "Has application been received?"
└─ ⚠ Missing Yes path
   Draw connection or [Create & connect step]
   
└─ ⚠ Missing No path
   Draw connection or [Use existing step]
```

**Shows:**
- What's actually missing
- 1-click solutions
- No jargon

---

### Priority 5: Template/Pattern Guide (Low effort)

**Add a collapsed "Quick patterns" section in left panel:**

```
▼ Quick Patterns

Pattern: Simple Yes/No Gate
  1. Single question: "Is X true?"
  2. Yes → next question or outcome
  3. No → outcome/terminal

Pattern: Rejection Path
  1. "Is condition met?"
  2. Yes → continue (green)
  3. No → terminal outcome (red)

Pattern: Sequential
  1. Question 1
  2. Both Yes & No → Question 2
  3. Continue…

[View templates library →]
```

---

### Priority 6: Internal Notes Field (Low effort)

**Allow staff to document decisions:**

```
▼ Internal Notes (staff only)
  [Text area]
  "Added 5 March after new regulation.
   Karen confirmed this is correct interpretation.
   TODO: Test with another council."
```

**Benefits:**
- Staff can track why decisions were made
- Audit trail for regulation updates
- Not exposed to front-end users

---

### Priority 7: Improve "Create & Connect" Discovery (Very low effort)

**Make it obvious users can create by dragging:**

```
Left panel → "New step" button
┌─────────────────────┐
│ + New step          │ ← Click this
│                     │
│ Or drag from any    │
│ node to blank space │
│ to create & connect │
└─────────────────────┘
```

Or: Flash a hint when user hovers near a node handle ("Drag to create & connect").

---

### Priority 8: Node Preview Improvement (Very low effort)

**Instead of truncating to 80 chars, show a "…" with tooltip:**

```
┌─────────────────────┐
│ 2. Check Timing     │
├─────────────────────┤
│ Has the application │
│ been received at    │
│ least 20 working... │
│     [full text →]   │
└─────────────────────┘
```

Click "[full text →]" or hover to see complete question.

---

## Design Principles

1. **Simple, not Complicated**
   - No modal dialogs (except confirm-delete, Yes/No branch choice)
   - Hover actions, not menus
   - Direct manipulation (drag, click)

2. **Obvious, not Hidden**
   - Tooltips on confusing fields
   - Status legend explains HOW to fix issues
   - Help text for new users
   - One obvious way to do each task

3. **Forgiving, not Restrictive**
   - Can undo most actions (delete is only permanent)
   - Color feedback is immediate
   - No weird edge cases

4. **Visual, not Textual**
   - Show status with colors, not words
   - Use badges to show metadata (legislation count, callout present)
   - Canvas layout (dagre) does the work, not instruction text

---

## Implementation Roadmap

### Phase 1: Low-hanging fruit (1-2 hours)
- [ ] Add tooltips to sidebar fields (Question, Callout, Content)
- [ ] Improve legend with action guidance
- [ ] Add "Quick Patterns" collapsed section (text only)
- [ ] Update "New step" button with usage hint

### Phase 2: Medium effort (2-3 hours)
- [ ] Refactor NodeSidebar with expandable sections
- [ ] Add Internal Notes field
- [ ] Implement inline validation hints for missing paths
- [ ] Improve node preview with "full text" link

### Phase 3: Polish (1-2 hours)
- [ ] Flash hint on first-time hover of node handle
- [ ] Add keyboard shortcuts (e.g., Delete key for selected node)
- [ ] Template library modal (pull from docs)
- [ ] Better orphan node recovery (highlight + suggest "delete or reconnect")

---

## No Major UI Changes Needed

**Existing strengths to keep:**
- ✓ Status color system (it works)
- ✓ Drag-to-connect gesture
- ✓ Left/center/right three-panel layout
- ✓ Mini map + auto-layout
- ✓ Hover action buttons

**Just add:**
- Better labels
- Context-sensitive help
- Expandable content
- Visual validation hints

---

## Questions for Refinement

1. **Tabs vs. Expandable sections?** Current idea is expandable (simpler), but tabs could work too.
2. **Where should templates live?** In sidebar, or separate modal?
3. **Should we add keyboard shortcuts?** (e.g., D for Delete, S for Set as Start)
4. **Do we need a "diff" view** for tracking what changed between saves?
5. **Should invalid/orphan nodes block save/publish?** Or just warn?

---

**Status:** Ready for implementation  
**Last updated:** 5 March 2026  
**Owner:** UX/Product team
