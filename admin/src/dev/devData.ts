/**
 * Mock data for local dev server.
 * Matches the shape returned by GET /wp-json/dt/v1/tree/{module_id} and related endpoints.
 * Used automatically when window.ctDT.restUrl is null (i.e. running via `npm run dev`).
 *
 * Schema note (April 2026):
 * - `display_order` has been removed from the ACF resource field group. Node ordering in the
 *   tree is now derived entirely from connection structure (root = node with no incoming edges).
 * - A new `resource_type` select field has been added to resource posts. The PHP REST API
 *   now filters: only posts where resource_type = "Decision Tree Step" are included in the tree.
 *   All other resource types ("File Download", "Image Gallery", etc.) are excluded.
 *   This filtering happens in PHP before the REST response is built, so the tree JSON format
 *   here is NOT affected — nodes in devData never carry resource_type.
 * - New nodes created via the editor ("Add a step") automatically get resource_type set to
 *   "Decision Tree Step" by the create_node REST handler.
 */


import treeData from './tree.json';
import type { Topic, Module, FieldGroup, ResourcesResponse, FieldGroupMode } from '../types';


export const DEV_TREE = treeData;



export const DEV_MODULE_ID = 1;

export const DEV_TOPICS: Topic[] = [
  { id: 10, title: 'Dog Control' },
  { id: 20, title: 'Food Safety' },
];

export const DEV_MODULES: Module[] = [
  { id: 1, title: 'Dog Control — Request for Service', topicId: 10 },
  { id: 2, title: 'Food Act Compliance', topicId: 20 },
];

export const DEV_FIELD_GROUPS: FieldGroup[] = [
  { id: 'group_kb_resource_fields', title: 'Knowledge Base Resource Steps', mode: 'resource' },
  { id: 'group_kb_module_fields',  title: 'Knowledge Base Module Fields', mode: 'module' },
  { id: 'group_custom_tree',         title: 'Custom Tree Schema',             mode: 'resource' },
];

export const DEV_RESOURCES = [
  { id: 100, moduleId: 1, fieldGroupId: 'group_kb_module_fields', title: 'Dog Control Tree A', moduleDecisionTree: true,  topicId: 10 },
  { id: 101, moduleId: 1, fieldGroupId: 'group_kb_module_fields', title: 'Dog Control Tree B', moduleDecisionTree: true,  topicId: 10 },
  { id: 102, moduleId: 1, fieldGroupId: 'group_kb_module_fields', title: 'Dog Control Notes',  moduleDecisionTree: false, topicId: 10 },
  { id: 200, moduleId: 2, fieldGroupId: 'group_kb_module_fields', title: 'Food Act Steps',     moduleDecisionTree: true,  topicId: 20 },
  { id: 201, moduleId: 2, fieldGroupId: 'group_custom_tree',         title: 'Food Act Custom Tree', moduleDecisionTree: true, topicId: 20 },
];

/**
 * Mock GET /wp-json/dt/v1/resources response.
 * Simulates schema detection and resource filtering.
 */
export function mockGetResourcesResponse(moduleId: number, fieldGroupId: string): ResourcesResponse {
  let fieldGroupMode: FieldGroupMode = 'unknown';

  if (fieldGroupId === 'group_kb_module_fields') {
    fieldGroupMode = 'resource';
  } else if (fieldGroupId === 'group_kb_resource_fields') {
    fieldGroupMode = 'resource';
  } else if (fieldGroupId === 'group_custom_tree') {
    fieldGroupMode = 'resource'; // Also has resource schema
  }

  if (fieldGroupMode !== 'resource') {
    return {
      fieldGroupMode,
      topics: [],
      modules: [],
      // ...(fieldGroupMode === 'module' && {
      //   message: 'This field group is module-type. Tree loads directly from module.',
      // }),
    };
  }

  // Filter resources by module + field group + tree enabled, attach topicId
  const modules: Module[] = DEV_RESOURCES
    .filter(r =>
      r.moduleId === moduleId &&
      r.moduleDecisionTree &&
      r.fieldGroupId === fieldGroupId
    )
    .map(r => ({ id: r.id, title: r.title, topicId: r.topicId }));

  // Build unique topics from filtered modules
  const topicMap = new Map<number, string>();
  modules.forEach(m => {
    if (m.topicId !== null && m.topicId !== undefined && !topicMap.has(m.topicId)) {
      const t = DEV_TOPICS.find(dt => dt.id === m.topicId);
      if (t) topicMap.set(t.id, t.title);
    }
  });
  const topics: Topic[] = [...topicMap.entries()].map(([id, title]) => ({ id, title }));

  return { fieldGroupMode, topics, modules };
}

// dev-data tree payloads are defined below, so references are resolved after declaration


export const DEV_FIELD_TREE_MAP_BY_RESOURCE: Record<number, any> = {
  100: null,
  101: null,
  200: null,
};

export const DEV_TREE_og = {
  nodes: [
    {
      id: 'sm-101',
      data: {
        label:       '1. Initial Assessment',
        question:    'Has a dog attack been reported or is one currently in progress?',
        callout:     'Ensure officer safety before approaching the scene.',
        content:     '<p>Check whether the incident involves injury to a person or another animal. Gather initial information from the caller.</p>',
        legislation: [
          { act: 'Dog Control Act 1996', section: 'S.57 — Dog attack', url: 'https://legislation.govt.nz/act/public/1996/0013/latest/DLM374600.html' },
        ],
        linkStatus:  'complete',
        isTerminal:  false,
      },
    },
    {
      id: 'sm-102',
      data: {
        label:       '2. Roaming Dog Check',
        question:    'Is the dog currently roaming uncontrolled on public land?',
        callout:     null,
        content:     '',
        legislation: [],
        linkStatus:  'complete',
        isTerminal:  false,
      },
    },
    {
      id: 'sm-103',
      data: {
        label:       '3. Owner Identified?',
        question:    'Has the owner of the roaming dog been identified?',
        callout:     null,
        content:     '',
        legislation: [],
        linkStatus:  'partial',
        isTerminal:  false,
      },
    },
    {
      id: 'sm-104',
      data: {
        label:       '4. Attack — Outcome',
        question:    null,
        callout:     'Always file a formal Request for Service report within 24 hours.',
        content:     '<p>Issue a notice to the owner. Consider seizure under S.57 if the dog is a continuing danger.</p><p>Notify the public health team if a person suffered injury.</p>',
        legislation: [
          { act: 'Dog Control Act 1996', section: 'S.57 — Dog attack',             url: '#' },
          { act: 'Dog Control Act 1996', section: 'S.58 — Dangerous dog declaration', url: '#' },
        ],
        linkStatus:  'terminal',
        isTerminal:  true,
      },
    },
    {
      id: 'sm-105',
      data: {
        label:       '5. Infringement — Known Owner',
        question:    null,
        callout:     null,
        content:     '<p>Issue a roaming infringement notice under S.54. Confirm registration status.</p>',
        legislation: [
          { act: 'Dog Control Act 1996', section: 'S.54 — Roaming infringement', url: '#' },
        ],
        linkStatus:  'terminal',
        isTerminal:  true,
      },
    },
    {
      id: 'sm-106',
      data: {
        label:       '6. Impound Dog',
        question:    null,
        callout:     null,
        content:     '<p>Impound the dog under S.52. Owner to be notified within 24 hours. Charge impound fees on release.</p>',
        legislation: [
          { act: 'Dog Control Act 1996', section: 'S.52 — Impounding', url: '#' },
        ],
        linkStatus:  'terminal',
        isTerminal:  true,
      },
    },
  ],
  edges: [
    { id: 'e-101-104', source: 'sm-101', target: 'sm-104', label: 'Yes — Proceed with attack protocol', answer: 'Yes' },
    { id: 'e-101-102', source: 'sm-101', target: 'sm-102', label: 'No — Check for roaming dog',         answer: 'No'  },
    { id: 'e-102-103', source: 'sm-102', target: 'sm-103', label: 'Yes — Identify owner',               answer: 'Yes' },
    { id: 'e-102-106', source: 'sm-102', target: 'sm-106', label: 'No — No further action',             answer: 'No'  },
    { id: 'e-103-105', source: 'sm-103', target: 'sm-105', label: 'Yes — Issue infringement',           answer: 'Yes' },
    { id: 'e-103-106', source: 'sm-103', target: 'sm-106', label: 'No — Impound dog',                   answer: 'No'  },
  ],
};

DEV_FIELD_TREE_MAP_BY_RESOURCE[100] = DEV_TREE_og;
DEV_FIELD_TREE_MAP_BY_RESOURCE[101] = {
  nodes: DEV_TREE_og.nodes.slice(0, 3),
  edges: DEV_TREE_og.edges.slice(0, 2),
};
DEV_FIELD_TREE_MAP_BY_RESOURCE[200] = {
  nodes: [
    {
      id: 'sm-201',
      data: {
        postId: 201,
        label: 'Start Food Act',
        question: 'Is the premises a food business?',
        content: '<p>Check registration and food safety practices.</p>',
        callout: null,
        legislation: [
          { act: 'Food Act 2014', section: 'S.22 — Registration', url: '#' },
        ],
        linkStatus: 'complete',
        isTerminal: false,
      },
    },
  ],
  edges: [],
};

// Custom under unsupported field group -> error path in dev
DEV_FIELD_TREE_MAP_BY_RESOURCE[201] = {
  code: 'schema_mismatch',
  message: 'Resource uses an unsupported field group and is not available for tree editing.',
};

/**
 * Legacy helper; kept for backwards compatibility only.
 * Resource-level tree data is authoritative in the new pattern.
 */
export const DEV_FIELD_GROUP_TREE_MAP = {
  // Field-group payloads are not used directly in the current React tree flow,
  // but we keep these here for debugging / schema validation stubbing.
  'group_kb_resource_fields': DEV_TREE_og,
  'group_kb_module_fields': {
    code: 'schema_error',
    message:
      'Field group "Knowledge Base Module Fields" does not match the required schema. Missing fields: question_text, decisions, info_callout_text.',
  },
  'group_custom_tree': {
    code: 'schema_error',
    message:
      'Field group "Custom Tree Schema" has incompatible field names. Expected: question_text, decisions, info_callout_text. Found: custom_question, custom_choices.',
  },
};
