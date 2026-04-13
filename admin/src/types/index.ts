/**
 * Canonical type definitions for the Decision Tree plugin.
 *
 * Naming:  Topic → Module → Step
 *
 * WordPress / ACF uses different names for the same concepts — this file is the
 * authoritative translation layer:
 *
 *   Plugin term │ WP post type       │ ACF field group label
 *   ────────────┼────────────────────┼──────────────────────────────────────────
 *   Topic       │ ct-kb-subsection   │ (parent of Modules — no dedicated FG)
 *   Module      │ ct-kb-module       │ "Knowledge Base Module Fields"
 *   Step        │ ct-kb-submodules   │ "Knowledge Base Resource Fields"  ← note:
 *               │                    │   WP labels Steps as "Resources"; Module
 *               │                    │   is what WP calls the "Resource" FG host
 *
 * React Flow layer (NOT plugin concept — just annotated here for clarity):
 *   FlowNode  = import type { Node } from 'reactflow'  →  Node<StepData>
 *   FlowEdge  = import type { Edge } from 'reactflow'  →  Edge<EdgeData>
 */

// ─── Hierarchy ────────────────────────────────────────────────────────────────

/** A top-level grouping (ct-kb-subsection). Contains Modules. */
export interface Topic {
  id: number;
  title: string;
}

/**
 * A decision tree container (ct-kb-module with module_decision_tree = true).
 * Only tree-enabled modules are surfaced by the REST API — filtered server-side.
 * `topicId: null` means no parent topic is assigned.
 */
export interface Module {
  id: number;
  title: string;
  topicId: number | null; // null = "No Topic assigned"
}

/**
 * A derived UI grouping: one Topic and the Modules belonging to it.
 * Computed client-side from the flat topics + modules arrays.
 * `topic.id = null` is the "No Topic assigned" sentinel group.
 */
export interface TopicGroup {
  topic: Topic | { id: null; title: string };
  modules: Module[];
}

// ─── ACF field shapes (raw WP storage) ────────────────────────────────────────

/**
 * ACF fields on a ct-kb-module post.
 * Previously mislabelled "ResourceFieldGroup" — this is one Module post, not a
 * collection.  The plugin reads these fields to build the tree and topic hierarchy.
 */
export interface ModuleFields {
  /** Toggle: true = this module has a decision tree. */
  module_decision_tree: boolean;
  /** Relationship → ct-kb-submodules post IDs. Steps/nodes in this tree. */
  module_linked_sub_modules: number[];
  /** Relationship → ct-kb-subsection post ID. Parent topic. */
  module_parent_subsection: number[] | null;
  /** Discriminator: "Steps or Decision Tree" | "Long Text" | "File Download". */
  resource_type: 'Long Text' | 'Steps or Decision Tree' | 'File Download';
}

/**
 * ACF fields on a ct-kb-submodules post.
 * Previously mislabelled "SubmoduleFieldGroup".  Each Step post maps to one Node
 * in the tree graph.  Only posts where `resource_type = "Decision Tree Step"` are
 * included; all other types are excluded by the REST API before the response is built.
 */
export interface StepFields {
  /**
   * Must be "Decision Tree Step" for the plugin to include this post.
   * Other values ("File Download", "Image Gallery", "Long Text", "External Links")
   * cause the post to be silently excluded from the tree.
   */
  resource_type: 'Decision Tree Step' | 'File Download' | 'Image Gallery' | 'Long Text' | 'External Links';
  /** Relationship → ct-kb-module post ID. Parent module (bidirectional with module_linked_sub_modules). */
  sub_module_parent_module: number[];
  /** Yes/No question prompt. Must be null/empty for terminal (end) nodes. */
  question_text: string | null;
  /** Repeater of Yes/No decision branches. */
  decisions: DecisionField[];
  /** Best-practice callout text. */
  info_callout_text: string | null;
  /** Legislation references. */
  relevant_legislation: LegislationField[];
}

/** Raw ACF repeater row shape for a decision branch. */
export interface DecisionField {
  decision_text: string;
  decision_answer: 'Yes' | 'No';
  /** ACF Relationship (return_format: ID). null/empty → terminal. */
  decision_path: number[] | null;
}

/** Raw ACF repeater row shape for legislation. Note: field is `legislation_link`, not `url`. */
export interface LegislationField {
  act: string;
  section: string;
  legislation_link: string; // ACF field name — mapped to `url` in API responses
}

// ─── REST API shapes (what the JS frontend receives) ─────────────────────────

/** Normalised legislation item in REST responses. `url` maps from `legislation_link`. */
export interface Legislation {
  act: string;
  section: string;
  url: string;
}

/** Valid status values for a Step node in the tree graph. */
export type LinkStatus = 'complete' | 'partial' | 'terminal' | 'empty';

/**
 * Data payload attached to each React Flow node.
 * All fields come from the REST API response; runtime flags (isRoot, isOrphan,
 * hasIncoming) are derived and set by the hook after the tree is loaded.
 */
export interface StepData {
  postId: number;
  label: string;
  question: string | null;
  /** HTML — passed through WP's `the_content` filter. */
  content: string;
  /** Raw WP post_content — used for the rich-text editor. */
  rawContent: string;
  callout: string | null;
  legislation: Legislation[];
  adminNotes: string;
  isTerminal: boolean;
  linkStatus: LinkStatus;
  // Runtime-computed flags:
  isRoot?: boolean;
  isOrphan?: boolean;
  hasIncoming?: boolean;
}

/** Edge data payload attached to React Flow edges. */
export interface EdgeData {
  label: string;
  answer: 'Yes' | 'No';
}

/** Step as returned by the REST API (before React Flow wrapping). */
export interface ApiStep {
  id: string;
  data: StepData;
}

/** Edge as returned by the REST API. */
export interface ApiEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  answer: 'Yes' | 'No';
}

/** Response shape of GET /wp-json/dt/v1/tree/{module_id} and /tree-resource/{id}. */
export interface TreeResponse {
  rootNodeId: string | null;
  nodes: ApiStep[];
  edges: ApiEdge[];
}

/** Response shape of GET /wp-json/dt/v1/resources. */
export interface ResourcesResponse {
  fieldGroupMode: FieldGroupMode;
  /** Topics for grouping in the UI. Only present when fieldGroupMode = 'resource'. */
  topics: Topic[];
  /** Tree-enabled modules. Only present when fieldGroupMode = 'resource'. */
  modules: Module[];
  /** Info message (e.g. submodule-mode explanation). */
  message?: string;
}

// ─── Field group detection ────────────────────────────────────────────────────

/** How the selected ACF field group was classified by schema inspection. */
export type FieldGroupMode = 'module' | 'resource' | 'unknown';

/** An ACF field group as returned by GET /wp-json/dt/v1/field-groups. */
export interface FieldGroup {
  id: string;
  title: string;
  mode: FieldGroupMode;
}
