# Decision Tree Plugin - Data Schema

**This document is the canonical, single source of truth for the decision-tree plugin's data structures.**

All PHP constants, TypeScript interfaces, and field name references in the codebase must match definitions in this file.

---

## Overview

The plugin works with two main structures:

1. **Tree Structure** — The complete graph (used by REST API, dev data, etc.)
2. **ACF Field Groups** — How data is stored in WordPress (Resource and Submodule field groups)

This schema documents both structures and explicitly maps between them.

---

## Tree Structure

```typescript
interface Tree {
  nodes: Node[];
  edges: Edge[];
  metadata?: TreeMetadata;
}
```

### Complete Example

```json
{
  "nodes": [
    {
      "id": "alc-101",
      "data": {
        "label": "1. Application Received",
        "question": "Has an application been received for renewal?",
        "callout": "Check licence type before proceeding.",
        "content": "<p>On-Licence authorises sale for consumption on premises...</p>",
        "legislation": [
          {
            "act": "Sale and Supply of Alcohol Act 2012",
            "section": "Section 127 - Application for renewal",
            "url": "https://legislation.govt.nz/act/public/2012/0060/latest/whole.html"
          }
        ],
        "linkStatus": "complete",
        "isTerminal": false
      }
    }
  ],
  "edges": [
    {
      "id": "e-101-102",
      "source": "alc-101",
      "target": "alc-102",
      "label": "Yes — Proceed to timing check",
      "answer": "Yes"
    }
  ],
  "metadata": {
    "module": "alc",
    "title": "Alcohol Licensing - Renewal",
    "nodeCount": 10,
    "edgeCount": 9
  }
}
```

---

## Node Structure

```typescript
interface Node {
  id: string;
  data: NodeData;
}

interface NodeData {
  label: string;
  question: string | null;
  callout: string | null;
  content: string;
  legislation: Legislation[];
  linkStatus: "complete" | "partial" | "terminal";
  isTerminal: boolean;
}
```

### Node Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✓ | Unique identifier within tree. Format: `{module}-{number}` (e.g., `alc-101`, `dog-203`) |
| `data.label` | string | ✓ | Display label shown in graph nodes. Usually includes ordinal number. Max 100 chars recommended. |
| `data.question` | string \| null | ✓ | Yes/No question that drives the decision. **Must be null for terminal nodes.** |
| `data.callout` | string \| null | ✗ | Important callout/warning. Displayed prominently in wizard. Can be null or empty. |
| `data.content` | string | ✓ | HTML content with detailed guidance. Plain text should be wrapped in `<p>` tags. Can be empty string. |
| `data.legislation` | Legislation[] | ✓ | Array of relevant legislation references. Can be empty array. |
| `data.linkStatus` | string | ✓ | Admin UI status indicator: `complete` (both edges), `partial` (one edge), `terminal` (no edges) |
| `data.isTerminal` | boolean | ✓ | `true` if end node, `false` if has decision branches. **Terminal nodes must have `question: null`** |

### Legislation Object

```typescript
interface Legislation {
  act: string;
  section: string;
  url: string;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `act` | string | ✓ | Act name (e.g., "Sale and Supply of Alcohol Act 2012") |
| `section` | string | ✓ | Section reference (e.g., "Section 127 - Application for renewal") |
| `url` | string | ✓ | Link to legislation text or government website |

---

## Edge Structure

```typescript
interface Edge {
  id: string;
  source: string;
  target: string;
  label: string;
  answer: "Yes" | "No";
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✓ | Unique identifier. Convention: `e-{source}-{target}` |
| `source` | string | ✓ | ID of source node (must exist in `nodes[]`) |
| `target` | string | ✓ | ID of target node (must exist in `nodes[]`) |
| `label` | string | ✓ | Human-readable transition label (e.g., "Yes — Proceed to timing check") |
| `answer` | string | ✓ | Either `"Yes"` or `"No"`. **Case sensitive.** |

### Edge Rules

1. ✅ Every non-terminal node **must** have exactly **2 outgoing edges** (`answer: "Yes"` and `answer: "No"`)
2. ✅ Terminal nodes **must not** have any outgoing edges
3. ✅ Both `source` and `target` must reference existing node IDs
4. ✅ No circular dependencies allowed
5. ✅ ID uniqueness: no duplicate edge IDs

---

## Metadata (Optional)

```typescript
interface TreeMetadata {
  module?: string;           // Module code (e.g., "alc", "dog")
  title?: string;            // Human-readable title
  nodeCount?: number;        // Total nodes for reference
  edgeCount?: number;        // Total edges for reference
  lastUpdated?: string;      // ISO date (e.g., "2026-03-05")
  source?: string;           // Where tree was created/extracted
  flowDiagram?: string;      // Reference to original diagram number
  [key: string]: any;        // Additional custom metadata
}
```

---

## Naming Conventions

### Module Code
3-letter code identifying the module:
- `alc` = Alcohol Licensing
- `dog` = Dog Control
- `food` = Food Act Compliance
- `env` = Environmental Health

### Node IDs
Format: `{module}-{number}`  
Examples:
- `alc-101` (first node in alcohol licensing)
- `dog-203` (third node in second flow diagram)
- `food-999` (custom numbering)

### Edge IDs
Format: `e-{source}-{target}`  
Examples:
- `e-101-102` (edge from alc-101 to alc-102)
- `e-dog-001-dog-002`

---

## Validation Rules

Use the provided `validate_tree.py` script or check manually:

```python
# Every non-terminal node has exactly 2 edges
for node in nodes:
    if not node.data.isTerminal:
        outgoing = [e for e in edges if e.source == node.id]
        assert len(outgoing) == 2, f"{node.id} has {len(outgoing)} edges, expected 2"

# Every terminal node has 0 edges
for node in nodes:
    if node.data.isTerminal:
        outgoing = [e for e in edges if e.source == node.id]
        assert len(outgoing) == 0, f"Terminal {node.id} has {len(outgoing)} edges, expected 0"

# All edges reference existing nodes
all_ids = {n.id for n in nodes}
for edge in edges:
    assert edge.source in all_ids, f"Edge {edge.id}: source {edge.source} not found"
    assert edge.target in all_ids, f"Edge {edge.id}: target {edge.target} not found"

# Terminal nodes must have null questions
for node in nodes:
    if node.data.isTerminal:
        assert node.data.question is None, f"Terminal {node.id} has question: {node.data.question}"
```

---

## ACF Field Groups

This section defines the exact WordPress ACF field groups used by the plugin. These are the canonical definitions for both PHP and TypeScript code.

### Resource Field Group (Knowledge Base Resource Fields)

ACF field group applied to: Module/Resource posts (post type determined by `decision_tree_get_module_post_type()` filter; default: `ct-kb-module`)

**Key identifying field:** `module_decision_tree` (True/False toggle) — only resource field groups with this field are valid for tree editing.

```typescript
interface ResourceFieldGroup {
  // Field 1: Toggle to enable decision tree for this resource
  module_decision_tree: boolean;

  // Field 3: Relationship to linked step/submodule posts
  // Only steps in this list are included in the tree
  module_linked_sub_modules: SubmodulePost[];

  // Field 2: Parent topic/section (hierarchy)
  module_parent_subsection: ModulePost[];

  // Field 1: Type of resource (text, steps/tree, file download)
  resource_type: "Long Text" | "Steps or Decision Tree" | "File Download";

  // Field 4: File downloads (if resource_type = "File Download")
  module_media_downloads: FileDownload[];
}

interface FileDownload {
  file_download: {
    ID: number;
    filename: string;
    url: string;
  };
  file_title: string;        // Title shown to user
  file_excerpt: string;      // Description/excerpt
  file_type?: "Image (JPG/PNG)" | "PDF" | "Word" | "Excel";
}
```

| Field Name | Label | Type | Required | Description |
|---|---|---|---|---|
| `resource_type` | Resource Type | Select | ✓ | Long Text \| Steps or Decision Tree \| File Download |
| `module_parent_subsection` | Knowledge Base Parent Topic | Relationship | ✗ | Parent module/subsection for hierarchy |
| `module_linked_sub_modules` | Knowledge Base Resource Steps | Relationship | ✗ | Steps/submodules to include in tree |
| `module_media_downloads` | Resource File Downloads | Repeater | ✗ | File downloads (if resource_type = File Download) |
| `module_decision_tree` | Resource Decision Tree Enabled | True/False | ✓ | Toggle: enable tree editing for this resource |

### Submodule Field Group (Knowledge Base Resource Steps)

ACF field group applied to: Step/Submodule posts (post type determined by `decision_tree_get_submodule_post_type()` filter; default: `ct-kb-submodules`)

**Key identifying fields:** `sub_module_parent_module`, `question_text`, `decisions`, `info_callout_text`, `relevant_legislation`, `display_order` — all required to be recognized as a submodule field group.

```typescript
interface SubmoduleFieldGroup {
  // Field 1: Relationship to parent resource
  sub_module_parent_module: ResourcePost[];

  // Field 2: The yes/no question text
  // Must be null/empty for terminal (end) nodes
  question_text: string | null;

  // Field 3: Decision branches (repeater of Yes/No buttons)
  decisions: Decision[];

  // Field 4: Important callout/warning text
  info_callout_text: string | null;

  // Field 5: Relevant legislation references
  relevant_legislation: Legislation[];

  // Field 6: Sort order within parent resource
  display_order: number;
}

interface Decision {
  decision_text: string;           // Button label shown in WP admin (e.g., "Yes — Proceed" or "No — Contact support")
  decision_answer: "Yes" | "No";   // Must be exactly "Yes" or "No" (case-sensitive)
  decision_path: number[] | null;  // ACF Relationship field (return format: ID) → post ID(s). Null/empty for terminal nodes.
}

interface Legislation {
  act: string;                     // Act name (e.g., "Sale and Supply of Alcohol Act 2012")
  section: string;                 // Section reference (e.g., "S.127 — Application for renewal")
  legislation_link: string;        // URL to legislation
}
```

| Field Name | Label | Type | Required | Description |
|---|---|---|---|---|
| `sub_module_parent_module` | Knowledge Base Parent Resource | Relationship | ✗ | Parent resource (bidirectional sync with `module_linked_sub_modules`) |
| `question_text` | Question Text | Text | ✗ | Yes/No question prompt. Null for terminal nodes. |
| `decisions` | Decisions | Repeater | ✗ | Yes/No decision branches (usually 2 rows within the repeater) |
| `decisions[].decision_text` | Decision Text | Text | ✗ | Button label shown to user |
| `decisions[].decision_answer` | Decision Answer | Radio | ✗ | Yes or No (case-sensitive) |
| `decisions[].decision_path` | Decision Path | Relationship (ID) | ✗ | Target submodule post ID — **must be set to return format ID, not object** |
| `info_callout_text` | Info Callout Text | Text | ✗ | Best practice callout/warning |
| `relevant_legislation` | Relevant Legislation | Repeater | ✗ | Legislation references |
| `display_order` | Display Order | Number | ✗ | Sort order within parent (ascending) |

**Note on Future Extensibility**

If field structure or post types change in future:

**Adding new fields to Submodule group:**
- Update this interface definition
- Update PHP constant definitions in `decision-tree.php`
- Update TypeScript constant definitions in `admin/src/` files
- Update REST API response building in `includes/class-rest-api.php`
- Update field group detection logic to require new fields
- Keep this file as authoritative reference during refactoring

**Changing post types:**
- Do NOT change SCHEMA.md (post types are not hardcoded here)
- Override the filter in your WP setup or child theme:
  ```php
  add_filter('decision_tree_module_post_type', fn() => 'your-custom-type');
  add_filter('decision_tree_submodule_post_type', fn() => 'your-custom-steps');
  ```
- The plugin detects field groups by schema, so post type names don't matter

---

## ACF Field Return Format & Plugin Consumption

**Critical distinction:** ACF field *definitions* in WP Admin vs. what the plugin's PHP/TS actually receives.

### Relationship Field (decision_path) — Most Important

**In WordPress ACF settings:**
- Field Type: `Relationship`
- Return Format: **must be `ID`** (NOT "Post Object")
- What ACF PHP returns: `number[]` (array of post IDs, e.g., `[123, 456]`)

**In this plugin's REST API / TypeScript:**
- Expected type: `number[] | null`
- Logic: extracts first ID → `decision_path[0]` = target node ID
- If empty or null → treated as terminal node

**⚠️ Critical Risk:** If ACF return format is changed to `Post Object`, plugin receives `{ ID: 123, post_title: "Learn about X", ... }` instead of just `[123]`.  Breaking result: cannot read `.ID` from an array of objects unless code is updated.

**Mitigation (see MAINTAINABILITY_AND_SECURITY.md § 3.2):**
- Ensure `decision_path` return format stays **`ID`** — do not change to Post Object
- If must change, update `class-rest-api.php` link-building logic to handle `isPO && decision_path[0].ID`

### Other Relationship Fields

Same rule: `sub_module_parent_module`, `module_linked_sub_modules` → return format must be `ID`.

### Simple Field Types

- **Text / Textarea** → `string | null`
- **Radio** → `string` (e.g., `"Yes"` or `"No"`)
- **True/False** → `boolean`
- **Number** → `number | string` (ACF sometimes returns string)
- **Repeater** → `object[]` (no return format choice)

---

### Post Types (Configurable)

Post types are **not hardcoded**. They are determined by WordPress filters in `decision-tree.php`:

```php
// Default values — can be overridden per-site
decision_tree_get_module_post_type()      // Default: 'ct-kb-module'
decision_tree_get_submodule_post_type()   // Default: 'ct-kb-submodules'
```

**Field Group Detection (not post type):**

The plugin identifies field group role by **schema inspection**, not post type name:

1. **Resource field group** = any ACF field group containing `module_decision_tree` field
   - Where `module_decision_tree == true`, the resource is tree-enabled

2. **Submodule field group** = any ACF field group containing all required submodule fields
   - `sub_module_parent_module`, `question_text`, `decisions`, `info_callout_text`, `relevant_legislation`, `display_order`

```typescript
// Field group detection (language-agnostic)
type FieldGroupMode = 'resource' | 'submodule' | 'unknown';

function detectFieldGroupMode(fields: ACFField[]): FieldGroupMode {
  const fieldNames = fields.map(f => f.name);
  
  const hasResourceSchema = 
    fieldNames.includes('module_decision_tree') &&
    fieldNames.includes('module_linked_sub_modules');
  
  const hasSubmoduleSchema = [
    'sub_module_parent_module',
    'question_text',
    'decisions',
    'info_callout_text',
    'relevant_legislation',
    'display_order'
  ].every(name => fieldNames.includes(name));
  
  if (hasResourceSchema) return 'resource';
  if (hasSubmoduleSchema) return 'submodule';
  return 'unknown';
}
```

**User Experience:**

In the Tree Editor, users select an ACF field group (any group in their WP install), and the plugin automatically detects whether it's resource-mode or submodule-mode. No hardcoding needed.

---

## ACF Field Mapping

When data is stored in WordPress via ACF fields, it maps to the Tree structure like this:

**Each `submodules` post represents one Node:**

| ACF Field | Maps to Node Data Field | Notes |
|---|---|---|
| `post_title` | `data.label` | Node display label |
| `question_text` | `data.question` | Yes/No question; null for terminal |
| `info_callout_text` | `data.callout` | Best practice callout |
| `post_content` | `data.content` | HTML guidance text |
| `relevant_legislation` repeater | `data.legislation` | Array of legislation refs |
| `decisions` repeater | `edges` (outgoing) | Each row with decision_answer creates one edge |
| Post ID | `data.id` | Node identifier (format: `sm-{postId}`) |
| `display_order` | (sort order) | Used for stable tree ordering |

**Each `module` resource with `module_decision_tree = true` represents a tree source:**

| ACF Field | Used for | Notes |
|---|---|---|
| `module_linked_sub_modules` | Tree nodes | Only these posts included |
| `module_decision_tree` | Tree enabled? | If false, resource excluded from editor |
| `post_title` | Resource name | Shown in resource selector |
| `module_parent_subsection` | Hierarchy filtering | Filters resources by module parent |

The plugin converts between ACF field storage and this JSON tree structure via REST API and admin UI.

---

## Missing Edge Detection

If you need to programmatically find missing edges (edges that should exist but don't):

```python
def find_missing_edges(nodes, edges):
    """Return non-terminal nodes with incomplete edge count."""
    missing = []
    for node in nodes:
        if not node.data.isTerminal:
            outgoing = len([e for e in edges if e.source == node.id])
            if outgoing < 2:
                missing.append({
                    "node_id": node.id,
                    "label": node.data.label,
                    "edge_count": outgoing,
                    "missing": 2 - outgoing
                })
    return missing
```

---

## Content HTML Rules

**`data.content`** can be HTML or plain text:

### Valid
```html
<p>This is a paragraph.</p>
<ul><li>Item 1</li><li>Item 2</li></ul>
<p><strong>Bold text</strong> and <em>italics</em>.</p>
```

### Valid (plain text — will be wrapped)
```
"Check all documents are signed before proceeding"
```

### Invalid (loses formatting)
```
"Line 1\nLine 2"  <!-- Use <p> or <br> instead -->
```

---

## API Endpoints

If storing in WordPress REST API:

```
GET  /wp-json/dt/v1/tree/{module_id}
POST /wp-json/dt/v1/tree
PUT  /wp-json/dt/v1/tree/{module_id}
```

Returns/expects the Tree structure.

---

## Examples

See:
- **Full example:** `data/alcohol-compliance-module/tree.json`
- **Sample data:** `plugin/decision-tree/admin/src/devData.js`
- **Schema validation:** `data/alcohol-compliance-module/validate_tree.py`

---

**Last Updated:** 1 April 2026  
**Version:** 1.1  
**Used by:** decision-tree plugin (PHP), React admin UI (TypeScript), REST API, data extraction tools
