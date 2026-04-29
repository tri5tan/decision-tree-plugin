import treeData from './tree.json';
import type { Topic, Module } from '../types';

export const DEV_TREE = { ...treeData, moduleTitle: 'Dog Control — Request for Service' };

/** Simple Food Act Compliance tree for module 2 in dev mode */
export const DEV_TREE_2 = {
  moduleTitle: 'Food Act Compliance',
  rootNodeId: 'fa-1',
  nodes: [
    {
      id: 'fa-1',
      data: {
        postId: 20, label: '1. Food Business?',
        question: 'Does the premises sell or supply food to the public?',
        content: '<p>Determine whether the premises meets the definition of a food business under the Food Act 2014.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'fa-2',
      data: {
        postId: 21, label: '2. Registered?',
        question: 'Is the food business currently registered under the Food Act 2014?',
        content: '<p>All food businesses must be registered with the council under the Food Act 2014 and hold a current food control plan or national programme registration.</p>',
        rawContent: '', callout: 'Registration must be renewed annually.', adminNotes: '',
        legislation: [{ act: 'Food Act 2014', section: 'S.22 — Registration of food businesses', url: 'https://legislation.govt.nz/act/public/2014/0032/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'fa-3',
      data: {
        postId: 22, label: '3. Not a food business — no action',
        question: null,
        content: '<p>Premises does not meet the definition of a food business. No food compliance action required under the Food Act 2014.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-4',
      data: {
        postId: 23, label: '4. Registered — compliant',
        question: null,
        content: '<p>Registration confirmed and current. No further action required at this time. File for annual renewal review.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-6',
      data: {
        postId: 25, label: '4. Compliance Triage',
        question: 'Which compliance issue was identified during the inspection?',
        content: '<p>Inspectors may identify multiple possible non-compliance issues. This node branches into several specific follow-up pathways for the business.</p>',
        rawContent: '', callout: 'This node is intentionally overloaded with many outgoing connections to stress-test the editor.', legislation: [], adminNotes: '',
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'fa-5',
      data: {
        postId: 24, label: '5. Not registered — issue notice',
        question: null,
        content: '<p>Food business is operating without registration. Issue an improvement notice requiring the operator to apply for registration within 10 working days.</p>',
        rawContent: '', callout: 'Failure to register is an offence. Infringement notice may follow if compliance is not achieved.',
        legislation: [{ act: 'Food Act 2014', section: 'S.242 — Power to issue improvement notice', url: 'https://legislation.govt.nz/act/public/2014/0032/latest/whole.html' }],
        adminNotes: '', linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-7',
      data: {
        postId: 26, label: '4a. Training required',
        question: null,
        content: '<p>Food handler training is required. Issue a notice requiring completion of approved training within 20 working days.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-8',
      data: {
        postId: 27, label: '4b. Labelling non-compliant',
        question: null,
        content: '<p>Food labels do not meet regulatory requirements. Require corrective labelling and re-inspect within 10 working days.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-9',
      data: {
        postId: 28, label: '4c. Temperature breach',
        question: null,
        content: '<p>Storage temperatures are outside the permitted range. Issue an immediate corrective action notice and verify controls.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-10',
      data: {
        postId: 29, label: '4d. Cross-contamination risk',
        question: null,
        content: '<p>Cross-contamination hazards were identified. Require physical separation or procedure changes before re-inspection.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-11',
      data: {
        postId: 30, label: '4e. Cleanliness notice',
        question: null,
        content: '<p>Premises cleanliness is inadequate. Issue a cleanliness notice and follow up with a re-check within 7 days.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-12',
      data: {
        postId: 31, label: '4f. Sourcing audit required',
        question: null,
        content: '<p>Food sourcing records are incomplete. Require an audit of suppliers and source documentation.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-13',
      data: {
        postId: 32, label: '4g. Allergen controls missing',
        question: null,
        content: '<p>Allergen management controls are not documented. Issue a corrective action to establish allergen procedures.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'fa-14',
      data: {
        postId: 33, label: '4h. Equipment maintenance required',
        question: null,
        content: '<p>Critical equipment is overdue maintenance. Require service or replacement and verify before reopening.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
  ],
  edges: [
    { id: 'e-fa1-fa3', source: 'fa-1', target: 'fa-3', label: 'No — not a food business', answer: 'No' },
    { id: 'e-fa1-fa2', source: 'fa-1', target: 'fa-2', label: 'Yes — check registration', answer: 'Yes' },
    { id: 'e-fa2-fa6', source: 'fa-2', target: 'fa-6', label: 'Yes — inspect specific compliance issues', answer: 'Yes' },
    { id: 'e-fa2-fa5', source: 'fa-2', target: 'fa-5', label: 'No — not registered', answer: 'No' },
    { id: 'e-fa6-fa4', source: 'fa-6', target: 'fa-4', label: 'Yes — low-risk control pathway', answer: 'Yes' },
    { id: 'e-fa6-fa7', source: 'fa-6', target: 'fa-7', label: 'No — training required', answer: 'No' },
    { id: 'e-fa6-fa8', source: 'fa-6', target: 'fa-8', label: 'No — labelling non-compliant', answer: 'No' },
    { id: 'e-fa6-fa9', source: 'fa-6', target: 'fa-9', label: 'No — temperature breach', answer: 'No' },
    { id: 'e-fa6-fa10', source: 'fa-6', target: 'fa-10', label: 'No — cross-contamination risk', answer: 'No' },
    { id: 'e-fa6-fa11', source: 'fa-6', target: 'fa-11', label: 'No — cleanliness notice', answer: 'No' },
    { id: 'e-fa6-fa12', source: 'fa-6', target: 'fa-12', label: 'No — sourcing audit required', answer: 'No' },
    { id: 'e-fa6-fa13', source: 'fa-6', target: 'fa-13', label: 'No — allergen controls missing', answer: 'No' },
    { id: 'e-fa6-fa14', source: 'fa-6', target: 'fa-14', label: 'No — equipment maintenance required', answer: 'No' },
  ],
};

export const DEV_MODULE_ID = 1;

export const DEV_TOPICS: Topic[] = [
  { id: 10, title: 'Dog Control' },
  { id: 20, title: 'Food Safety' },
  { id: 30, title: 'Environmental Health' },
  { id: 40, title: 'Privacy Act' },
];

export const DEV_MODULES: Module[] = [
  { id: 1, title: 'Dog Control — Request for Service', topicId: 10 },
  { id: 3, title: 'Dog Control — Barking Dog Complaint', topicId: 10 },
  { id: 2, title: 'Food Act Compliance', topicId: 20 },
  { id: 4, title: 'Noise Control — Enforcement', topicId: 30 },
  { id: 5, title: 'Privacy Act — Receipt of Personal Information', topicId: 40 },
];

/** Barking Dog Complaint tree for module 3 in dev mode */
export const DEV_TREE_3 = {
  moduleTitle: 'Dog Control — Barking Dog Complaint',
  rootNodeId: 'bd-1',
  nodes: [
    {
      id: 'bd-1',
      data: {
        postId: 30, label: '1. Complaint Received',
        question: 'Has a barking dog complaint been received from a member of the public?',
        content: '<p>Log the complaint. Capture complainant details, address of the dog, and a description of the nuisance behaviour (times, frequency, duration).</p>',
        rawContent: '', callout: 'Do not reveal complainant identity to the dog owner without consent.', adminNotes: '',
        legislation: [{ act: 'Dog Control Act 1996', section: 'S.55 — Barking dog', url: 'https://legislation.govt.nz/act/public/1996/0013/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'bd-2',
      data: {
        postId: 31, label: '2. First Complaint?',
        question: 'Is this the first complaint received about this dog / address in the last 12 months?',
        content: '<p>Check council records for prior complaints at this address. Prior history may escalate the response pathway.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [], linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'bd-3',
      data: {
        postId: 32, label: '3. Education Letter',
        question: 'Has an education letter been issued to the dog owner advising of the complaint?',
        content: '<p>Issue a standard letter to the dog owner explaining the complaint and advising remedial options (anti-bark collar, additional exercise, desexing, kennelling). Allow 10 working days for response.</p><p>No formal penalty at this stage — the goal is compliance through education.</p>',
        rawContent: '', callout: 'Most complaints resolve at this stage.', adminNotes: '',
        legislation: [], linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'bd-4',
      data: {
        postId: 33, label: '4. Resolved After Letter?',
        question: 'Has the barking nuisance ceased following the education letter?',
        content: '<p>Follow up with the complainant after 10 working days. If no further complaints are received, consider the matter resolved. Close and record.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [], linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'bd-5',
      data: {
        postId: 34, label: '5. Complaint Resolved — Close File',
        question: null,
        content: '<p>Nuisance has abated. File closed. Record outcome in council system. Advise complainant of resolution.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [], linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'bd-6',
      data: {
        postId: 35, label: '6. Noise Diary Issued',
        question: 'Has a noise/nuisance diary been issued to the complainant to record ongoing incidents?',
        content: '<p>Issue a diary or online log form to the complainant to document specific incidents (date, time, duration, nature of disturbance). A minimum of 5 recorded incidents over 2 weeks is typically required to support a formal notice.</p>',
        rawContent: '', callout: 'Diary evidence is critical — verbal complaints alone are insufficient for a formal notice.', adminNotes: '',
        legislation: [], linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'bd-7',
      data: {
        postId: 36, label: '7. Sufficient Evidence?',
        question: 'Has the diary returned sufficient evidence of persistent nuisance barking (5+ incidents)?',
        content: '<p>Review diary entries. Five or more documented incidents with times and durations is the standard threshold for issuing a formal nuisance notice under S.55.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [{ act: 'Dog Control Act 1996', section: 'S.55 — Barking dog', url: 'https://legislation.govt.nz/act/public/1996/0013/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'bd-8',
      data: {
        postId: 37, label: '8. Insufficient Evidence — Monitor',
        question: null,
        content: '<p>Diary returned but evidence is insufficient to support formal action. Advise complainant to continue recording. Re-issue diary for a further 2-week period. Escalate if complaints persist.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [], linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'bd-9',
      data: {
        postId: 38, label: '9. Formal Nuisance Notice',
        question: 'Has a formal nuisance notice been served on the dog owner under S.55?',
        content: '<p>Serve a formal written notice on the owner requiring them to take specified steps to prevent the dog from causing nuisance barking. The notice must specify: the behaviour constituting the nuisance, required remedial action, and deadline (typically 10 working days).</p>',
        rawContent: '', callout: 'Ensure notice is properly served — personal delivery or registered post.', adminNotes: '',
        legislation: [{ act: 'Dog Control Act 1996', section: 'S.55 — Barking dog', url: 'https://legislation.govt.nz/act/public/1996/0013/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'bd-10',
      data: {
        postId: 39, label: '10. Complied With Notice?',
        question: 'Has the owner complied with the formal nuisance notice within the specified timeframe?',
        content: '<p>Follow up with complainant after the notice deadline. If barking has ceased and remedial steps taken (e.g. bark collar fitted, dog rehomed), consider the matter resolved.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [], linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'bd-11',
      data: {
        postId: 40, label: '11. Complaint Resolved — File Closed',
        question: null,
        content: '<p>Owner has complied. Nuisance abated. File closed. Record outcome. Advise complainant.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [], linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'bd-12',
      data: {
        postId: 41, label: '12. Infringement — Repeat Offence',
        question: null,
        content: '<p>Owner has failed to comply with the formal notice. Issue an infringement notice. Consider seizure of the dog under S.56 if nuisance is severe and ongoing. Refer to team leader if history spans multiple addresses or owners.</p>',
        rawContent: '', callout: 'Infringement fee applies. Escalate to prosecution if owner continues to ignore notices.', adminNotes: '',
        legislation: [
          { act: 'Dog Control Act 1996', section: 'S.55 — Barking dog', url: 'https://legislation.govt.nz/act/public/1996/0013/latest/whole.html' },
          { act: 'Dog Control Act 1996', section: 'S.56 — Seizure of barking dog', url: 'https://legislation.govt.nz/act/public/1996/0013/latest/whole.html' },
        ],
        linkStatus: 'terminal', isTerminal: true,
      },
    },
  ],
  edges: [
    { id: 'e-bd1-bd2',   source: 'bd-1',  target: 'bd-2',  label: 'Yes — log and assess', answer: 'Yes' },
    { id: 'e-bd2-bd3',   source: 'bd-2',  target: 'bd-3',  label: 'Yes — first complaint, send education letter', answer: 'Yes' },
    { id: 'e-bd2-bd6',   source: 'bd-2',  target: 'bd-6',  label: 'No — repeat complaint, issue diary', answer: 'No' },
    { id: 'e-bd3-bd4',   source: 'bd-3',  target: 'bd-4',  label: 'Yes — follow up after letter', answer: 'Yes' },
    { id: 'e-bd4-bd5',   source: 'bd-4',  target: 'bd-5',  label: 'Yes — resolved, close file', answer: 'Yes' },
    { id: 'e-bd4-bd6',   source: 'bd-4',  target: 'bd-6',  label: 'No — still barking, issue diary', answer: 'No' },
    { id: 'e-bd6-bd7',   source: 'bd-6',  target: 'bd-7',  label: 'Yes — diary returned, assess evidence', answer: 'Yes' },
    { id: 'e-bd7-bd8',   source: 'bd-7',  target: 'bd-8',  label: 'No — insufficient evidence', answer: 'No' },
    { id: 'e-bd7-bd9',   source: 'bd-7',  target: 'bd-9',  label: 'Yes — serve formal notice', answer: 'Yes' },
    { id: 'e-bd9-bd10',  source: 'bd-9',  target: 'bd-10', label: 'Yes — check compliance', answer: 'Yes' },
    { id: 'e-bd10-bd11', source: 'bd-10', target: 'bd-11', label: 'Yes — complied, close file', answer: 'Yes' },
    { id: 'e-bd10-bd12', source: 'bd-10', target: 'bd-12', label: 'No — non-compliant, infringement', answer: 'No' },
  ],
};

/**
 * Noise Control — Enforcement (module 4)
 *
 * Specifically designed to stress-test convergent-node layout bugs:
 *
 * CONVERGENT #1 — Diamond (two parents, same BFS depth → shared child):
 *   nc-4 (No)  ──┐
 *   nc-5 (Yes) ──┴──► nc-7   [both at depth 2, nc-7 should sit at depth 3]
 *
 * CONVERGENT #2 — Extreme triple (three parents at *different* depths → same node):
 *   nc-4 (No)  ──┐
 *   nc-5 (Yes) ──┼──► nc-7   [nc-4 & nc-5 at depth 2; nc-6 (No) at depth 3]
 *   nc-6 (No)  ──┘            Without the fix, dagre pulls nc-7 to rank 4+.
 *
 * CONVERGENT #3 — Shared terminals from different depths:
 *   nc-7 (Yes) ──┐              nc-7 is at depth 3
 *   nc-9 (Yes) ──┴──► nc-10    nc-9 is at depth 4
 *   nc-7 (No)  ──┐              nc-10 / nc-11 should sit at depth 4, not 5+.
 *   nc-9 (No)  ──┴──► nc-11
 */
export const DEV_TREE_4 = {
  moduleTitle: 'Noise Control — Enforcement',
  rootNodeId: 'nc-1',
  nodes: [
    {
      id: 'nc-1',
      data: {
        postId: 50, label: '1. Reportable Noise?',
        question: 'Has the complaint been assessed as reportable noise under the Resource Management Act?',
        content: '<p>Check the initial complaint log. Confirm the noise type and source before escalating.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [{ act: 'Resource Management Act 1991', section: 'S.16 — Duty to avoid unreasonable noise', url: 'https://legislation.govt.nz/act/public/1991/0069/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'nc-2',
      data: {
        postId: 51, label: '2. Prohibited Hours?',
        question: 'Is the noise occurring during prohibited hours as defined in the district plan?',
        content: '<p>Prohibited hours are typically 10pm-7am weekdays and 10pm-8am weekends. Check the local district plan for specific rules.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'nc-3',
      data: {
        postId: 52, label: '3. Not Reportable — Advise & Close',
        question: null,
        content: '<p>Noise does not meet the threshold for enforcement action. Advise the caller of options (civil mediation, body corporate process if applicable) and close the complaint.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'nc-4',
      data: {
        postId: 53, label: '4. Commercial Source?',
        question: 'Is the noise source a commercial premises (retail, hospitality, industrial)?',
        content: '<p>Commercial premises may be subject to conditions under their resource consent. Check consent conditions before proceeding.</p>',
        rawContent: '', callout: 'Check resource consent conditions — commercial operators may have extended hours.', legislation: [], adminNotes: '',
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'nc-5',
      data: {
        postId: 54, label: '5. Repeat Complaint?',
        question: 'Has a complaint about the same address been received in the last 7 days?',
        content: '<p>Check the enforcement system for prior complaints at this address in the past week. Repeat complaints escalate the response pathway.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'nc-6',
      data: {
        postId: 55, label: '6. Above Threshold?',
        question: 'Has a noise measurement confirmed the level exceeds the district plan limit?',
        content: '<p>Attend site and measure noise using a calibrated sound level meter. Compare against the relevant district plan noise standard for the zone.</p>',
        rawContent: '', callout: 'Measurements must be taken at the boundary of the affected property. Log readings with time and location.',
        legislation: [{ act: 'Resource Management Act 1991', section: 'S.327 — Power to take samples', url: 'https://legislation.govt.nz/act/public/1991/0069/latest/whole.html' }],
        adminNotes: '', linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'nc-7',
      // CONVERGENT TARGET: receives edges from nc-4 (depth 2), nc-5 (depth 2), nc-6 (depth 3)
      data: {
        postId: 56, label: '7. Issue Abatement Notice',
        question: 'Has a formal abatement notice been served on the noise-maker?',
        content: '<p>Issue a written abatement notice specifying the breach, required action, and compliance deadline. Serve personally or by registered post.</p>',
        rawContent: '', callout: 'Notice must specify the noise standard breached and the exact remediation required.',
        legislation: [{ act: 'Resource Management Act 1991', section: 'S.322 — Abatement notice', url: 'https://legislation.govt.nz/act/public/1991/0069/latest/whole.html' }],
        adminNotes: '', linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'nc-8',
      data: {
        postId: 57, label: '8. Log & Monitor',
        question: null,
        content: '<p>Noise is within hours and not a repeat complaint. Log for monitoring. Advise the complainant to report any further incidents.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'nc-9',
      data: {
        postId: 58, label: '9. Has Notice Been Complied With?',
        question: 'Has the commercial operator complied with the improvement notice within the specified timeframe?',
        content: '<p>Follow up after the deadline. If the operator has installed acoustic treatment or restricted hours, confirm compliance and close.</p>',
        rawContent: '', callout: null,
        legislation: [{ act: 'Resource Management Act 1991', section: 'S.322 — Abatement notice', url: 'https://legislation.govt.nz/act/public/1991/0069/latest/whole.html' }],
        adminNotes: '', linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'nc-10',
      // CONVERGENT TARGET: receives edges from nc-7 (depth 3) and nc-9 (depth 4)
      data: {
        postId: 59, label: '10. Resolved — Close File',
        question: null,
        content: '<p>Noise nuisance has abated. Compliance confirmed. Close file and record outcome. Advise complainant of resolution.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'nc-11',
      // CONVERGENT TARGET: receives edges from nc-7 (depth 3) and nc-9 (depth 4)
      data: {
        postId: 60, label: '11. Escalate — Infringement',
        question: null,
        content: '<p>Notice not complied with. Issue an infringement notice. Consider an enforcement order from the Environment Court for persistent offenders.</p>',
        rawContent: '', callout: 'Infringement fee applicable. Escalate to prosecution if owner continues to ignore notices.',
        legislation: [{ act: 'Resource Management Act 1991', section: 'S.338 — Offences', url: 'https://legislation.govt.nz/act/public/1991/0069/latest/whole.html' }],
        adminNotes: '', linkStatus: 'terminal', isTerminal: true,
      },
    },
  ],
  edges: [
    { id: 'e-nc1-nc3', source: 'nc-1', target: 'nc-3', label: 'No — not reportable, advise & close', answer: 'No' },
    { id: 'e-nc1-nc2', source: 'nc-1', target: 'nc-2', label: 'Yes — assess further', answer: 'Yes' },
    { id: 'e-nc2-nc4', source: 'nc-2', target: 'nc-4', label: 'Yes — prohibited hours', answer: 'Yes' },
    { id: 'e-nc2-nc5', source: 'nc-2', target: 'nc-5', label: 'No — within permitted hours', answer: 'No' },

    // Commercial path → measure noise
    { id: 'e-nc4-nc6', source: 'nc-4', target: 'nc-6', label: 'Yes — commercial, measure', answer: 'Yes' },
    // CONVERGENT #1 — Diamond: nc-4(No) AND nc-5(Yes) both converge on nc-7 (both parents at depth 2)
    { id: 'e-nc4-nc7', source: 'nc-4', target: 'nc-7', label: 'No — residential, issue notice', answer: 'No' },
    { id: 'e-nc5-nc7', source: 'nc-5', target: 'nc-7', label: 'Yes — repeat complaint, issue notice', answer: 'Yes' },
    { id: 'e-nc5-nc8', source: 'nc-5', target: 'nc-8', label: 'No — first complaint, log & monitor', answer: 'No' },

    // CONVERGENT #2 — Extreme triple: nc-6(No) ALSO feeds nc-7 (parent at depth 3, deeper than nc-4/nc-5)
    { id: 'e-nc6-nc9', source: 'nc-6', target: 'nc-9', label: 'Yes — over threshold, improvement notice', answer: 'Yes' },
    { id: 'e-nc6-nc7', source: 'nc-6', target: 'nc-7', label: 'No — borderline, standard notice', answer: 'No' },

    // CONVERGENT #3 — Shared terminals: nc-7 (depth 3) and nc-9 (depth 4) both lead to nc-10 and nc-11
    { id: 'e-nc7-nc10', source: 'nc-7', target: 'nc-10', label: 'Yes — complied, close file', answer: 'Yes' },
    { id: 'e-nc7-nc11', source: 'nc-7', target: 'nc-11', label: 'No — non-compliant, escalate', answer: 'No' },
    { id: 'e-nc9-nc10', source: 'nc-9', target: 'nc-10', label: 'Yes — complied, close file', answer: 'Yes' },
    { id: 'e-nc9-nc11', source: 'nc-9', target: 'nc-11', label: 'No — non-compliant, escalate', answer: 'No' },
  ],
};

/**
 * Privacy Act — Receipt of Personal Information (module 5)
 *
 * Simple linear tree with one node (pact-9) that receives
 * THREE 'Yes' inputs from different depths:
 *   pact-6 (depth 3) ──Yes──┐
 *   pact-7 (depth 3) ──Yes──┼──► pact-9
 *   pact-10 (depth 4) ─Yes──┘
 * Longest-path depth of pact-9 = 5 (below pact-10 at depth 4).
 */
export const DEV_TREE_5 = {
  moduleTitle: 'Privacy Act — Receipt of Personal Information',
  rootNodeId: 'pact-1',
  nodes: [
    {
      id: 'pact-1',
      data: {
        postId: 70, label: '1. Personal Info Collected?',
        question: 'Has personal information about an identifiable individual been received or collected by the council?',
        content: '<p>Personal information is any information about an identifiable individual. This includes names, contact details, health information, financial details, and opinions about a person.</p>',
        rawContent: '', callout: 'If in doubt, treat the information as personal information and apply the Privacy Act.', adminNotes: '',
        legislation: [{ act: 'Privacy Act 2020', section: 'S.7 — Meaning of personal information', url: 'https://legislation.govt.nz/act/public/2020/0031/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'pact-2',
      data: {
        postId: 71, label: '2. No Action Required',
        question: null,
        content: '<p>No personal information has been collected. No Privacy Act obligations apply at this time. No further action required.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'pact-3',
      data: {
        postId: 72, label: '2. Lawful Collection?',
        question: 'Is the collection of this personal information authorised by or necessary for a lawful function of the council?',
        content: '<p>Under IPP 1, personal information must only be collected for a lawful purpose connected to the council\'s functions. Check that the collection is necessary — not merely convenient.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [{ act: 'Privacy Act 2020', section: 'IPP 1 — Purpose of collection', url: 'https://legislation.govt.nz/act/public/2020/0031/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'pact-4',
      data: {
        postId: 73, label: '3. Do Not Collect — No Lawful Basis',
        question: null,
        content: '<p>Collection is not authorised by a lawful council function. Do not collect or retain this information. Return or destroy it and advise the individual accordingly.</p>',
        rawContent: '', callout: 'Seek legal advice before destroying records.', legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'pact-12',
      data: {
        postId: 81, label: '3. Seek Privacy Officer Advice',
        question: null,
        content: '<p>The collection is borderline. Refer to the council Privacy Officer before taking further action. Document the legal basis and next steps.</p>',
        rawContent: '', callout: 'This path exercises a third outgoing connection from pact-3.', legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'pact-5',
      data: {
        postId: 74, label: '3. Individual Notified?',
        question: 'Was the individual notified of the purpose of collection at or before the time information was collected?',
        content: '<p>Under IPP 3, individuals must be told why their information is being collected, that they have a right to access it, and who will receive it. Notification should be at or before the time of collection.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [{ act: 'Privacy Act 2020', section: 'IPP 3 — Collection from subject', url: 'https://legislation.govt.nz/act/public/2020/0031/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'pact-6',
      data: {
        postId: 75, label: '4. Lawful Exemption from Notification?',
        question: 'Does a lawful exemption from the notification requirement apply (e.g. prejudice to purpose, safety, public interest)?',
        content: '<p>IPP 3 exemptions include: notification would prejudice the purpose of collection; the information is publicly available; collection is for a law enforcement purpose. The exemption must be clearly justified and documented.</p>',
        rawContent: '', callout: 'Exemptions are narrow — document the basis carefully.', adminNotes: '',
        legislation: [{ act: 'Privacy Act 2020', section: 'IPP 3(4) — Exceptions to notification', url: 'https://legislation.govt.nz/act/public/2020/0031/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'pact-7',
      data: {
        postId: 76, label: '4. Consent on File?',
        question: 'Is there a current, informed consent record in the system for this individual for this purpose?',
        content: '<p>Consent must be freely given, specific to the purpose, and informed. Check the records management system for a signed consent form or electronic consent record. Verbal consent is not sufficient on its own.</p>',
        rawContent: '', callout: null, adminNotes: '',
        legislation: [{ act: 'Privacy Act 2020', section: 'IPP 2 — Source of personal information', url: 'https://legislation.govt.nz/act/public/2020/0031/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'pact-8',
      data: {
        postId: 77, label: '5. Halt — Notify Before Use',
        question: null,
        content: '<p>No exemption applies and notification was not given. Do not use or share the information until the individual has been notified of the collection purpose. Issue a retrospective notification letter and obtain acknowledgement before proceeding.</p>',
        rawContent: '', callout: 'Do not use or disclose this information until notification is complete.', legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'pact-10',
      data: {
        postId: 78, label: '5. Record Consent Now',
        question: 'Has consent now been obtained from the individual and recorded in the system?',
        content: '<p>Obtain consent using the standard Privacy Act consent form. Record the consent in the document management system against the individual\'s profile. Consent must reference the specific purpose and be signed or electronically acknowledged.</p>',
        rawContent: '', callout: 'Consent must be recorded before the information is used or shared.', adminNotes: '',
        legislation: [{ act: 'Privacy Act 2020', section: 'IPP 3 — Collection from subject', url: 'https://legislation.govt.nz/act/public/2020/0031/latest/whole.html' }],
        linkStatus: 'complete', isTerminal: false,
      },
    },
    {
      id: 'pact-11',
      data: {
        postId: 79, label: '6. Cannot Proceed — Seek Advice',
        question: null,
        content: '<p>Consent cannot be obtained and no exemption applies. Do not use or retain the information. Refer to the council Privacy Officer for advice on destruction or return of the information.</p>',
        rawContent: '', callout: null, legislation: [], adminNotes: '',
        linkStatus: 'terminal', isTerminal: true,
      },
    },
    {
      id: 'pact-9',
      // CONVERGENT TARGET — receives Yes from pact-6 (depth 3), pact-7 (depth 3), pact-10 (depth 4)
      // Longest-path depth = 5 (max(3,3,4) + 1)
      data: {
        postId: 80, label: '6. Log Receipt & Store Securely',
        question: null,
        content: '<p>All Privacy Act checks are satisfied. Log the receipt of personal information in the records system. Assign a retention period in accordance with the council\'s retention schedule. Route to secure storage with access controls applied. Advise the relevant officer that the information is available.</p>',
        rawContent: '', callout: 'Assign a retention period at the time of storage — do not defer this step.',
        legislation: [
          { act: 'Privacy Act 2020', section: 'IPP 5 — Storage and security', url: 'https://legislation.govt.nz/act/public/2020/0031/latest/whole.html' },
          { act: 'Privacy Act 2020', section: 'IPP 9 — Retention of personal information', url: 'https://legislation.govt.nz/act/public/2020/0031/latest/whole.html' },
        ],
        adminNotes: '', linkStatus: 'terminal', isTerminal: true,
      },
    },
  ],
  edges: [
    { id: 'e-p1-p2',   source: 'pact-1',  target: 'pact-2',  label: 'No — not personal info', answer: 'No' },
    { id: 'e-p1-p3',   source: 'pact-1',  target: 'pact-3',  label: 'Yes — check lawful basis', answer: 'Yes' },
    { id: 'e-p3-p4',   source: 'pact-3',  target: 'pact-4',  label: 'No — no lawful basis', answer: 'No' },
    { id: 'e-p3-p12',  source: 'pact-3',  target: 'pact-12', label: 'No — seek privacy officer advice', answer: 'No' },
    { id: 'e-p3-p5',   source: 'pact-3',  target: 'pact-5',  label: 'Yes — check notification', answer: 'Yes' },
    { id: 'e-p5-p6',   source: 'pact-5',  target: 'pact-6',  label: 'No — not notified, check exemption', answer: 'No' },
    { id: 'e-p5-p7',   source: 'pact-5',  target: 'pact-7',  label: 'Yes — notified, check consent', answer: 'Yes' },
    // Yes #1 into pact-9: from pact-6 (depth 3)
    { id: 'e-p6-p8',   source: 'pact-6',  target: 'pact-8',  label: 'No — no exemption, halt', answer: 'No' },
    { id: 'e-p6-p9',   source: 'pact-6',  target: 'pact-9',  label: 'Yes — exemption applies, log & store', answer: 'Yes' },
    // Yes #2 into pact-9: from pact-7 (depth 3)
    { id: 'e-p7-p10',  source: 'pact-7',  target: 'pact-10', label: 'No — no consent, record now', answer: 'No' },
    { id: 'e-p7-p9',   source: 'pact-7',  target: 'pact-9',  label: 'Yes — consent on file, log & store', answer: 'Yes' },
    // Yes #3 into pact-9: from pact-10 (depth 4)
    { id: 'e-p10-p11', source: 'pact-10', target: 'pact-11', label: 'No — cannot obtain consent', answer: 'No' },
    { id: 'e-p10-p9',  source: 'pact-10', target: 'pact-9',  label: 'Yes — consent recorded, log & store', answer: 'Yes' },
  ],
};
