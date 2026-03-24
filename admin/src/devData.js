/**
 * Mock data for local dev server.
 * Matches the shape returned by GET /wp-json/dt/v1/tree/{module_id}.
 * Used automatically when window.ctDT.restUrl is null (i.e. running via `npm run dev`).
 */


import treeData from './tree.json';


export const DEV_TREE = treeData;



export const DEV_MODULE_ID = 1;

export const DEV_MODULES = [
  { id: 1, title: 'Dog Control — Request for Service' },
  { id: 2, title: 'Food Act Compliance' },
];

export const DEV_FIELD_GROUPS = [
  { id: 'group_kb_submodule_fields', title: 'Knowledge Base Sub Module fields' },
  { id: 'group_kb_module_fields', title: 'Knowledge Base Module Fields' },
  { id: 'group_custom_tree', title: 'Custom Tree Schema' },
];



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

/**
 * Mock tree data mapped to field groups.
 * Only 'group_kb_submodule_fields' has valid tree data.
 * Other groups will return errors to simulate schema mismatch.
 */
export const DEV_FIELD_GROUP_TREE_MAP = {
  'group_kb_submodule_fields': DEV_TREE_og,  // Valid schema
  'group_kb_module_fields': {  // Error: missing required fields
    code: 'schema_error',
    message: 'Field group "Knowledge Base Module Fields" does not match the required schema. Missing fields: question_text, decisions, info_callout_text.',
  },
  'group_custom_tree': {  // Error: mismatched schema
    code: 'schema_error',
    message: 'Field group "Custom Tree Schema" has incompatible field names. Expected: question_text, decisions, info_callout_text. Found: custom_question, custom_choices.',
  },
};
