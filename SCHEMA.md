# Decision Tree Plugin - Data Schema

This document defines the exact JSON structure that the `decision-tree` plugin expects for tree data.

## Overview

The plugin works with two main structures:

1. **Tree Structure** — The complete graph (used by REST API, dev data, etc.)
2. **ACF Field Structure** — How data is stored in WordPress (used by admin panels)

This schema primarily documents the **Tree Structure** used for REST API, exports, and development data.

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

## ACF Field Mapping

When data is stored in WordPress via ACF fields, it maps like this:

**Each `submodules` post represents one Node:**

| ACF Field | Maps to Node Data Field |
|---|---|
| `question_text` | `data.question` |
| `info_callout_text` | `data.callout` |
| `post_content` | `data.content` |
| `post_title` | `data.label` |
| `decisions` repeater | `edges` (outgoing) |
| `relevant_legislation` | `data.legislation` |
| Post ID / slug | `data.id` |

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

**Last Updated:** 5 March 2026  
**Version:** 1.0  
**Used by:** decision-tree plugin & data extraction tools
