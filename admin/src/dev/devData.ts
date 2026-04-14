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
  ],
  edges: [
    { id: 'e-fa1-fa3', source: 'fa-1', target: 'fa-3', label: 'No — not a food business', answer: 'No' },
    { id: 'e-fa1-fa2', source: 'fa-1', target: 'fa-2', label: 'Yes — check registration', answer: 'Yes' },
    { id: 'e-fa2-fa4', source: 'fa-2', target: 'fa-4', label: 'Yes — registered and compliant', answer: 'Yes' },
    { id: 'e-fa2-fa5', source: 'fa-2', target: 'fa-5', label: 'No — not registered', answer: 'No' },
  ],
};

export const DEV_MODULE_ID = 1;

export const DEV_TOPICS: Topic[] = [
  { id: 10, title: 'Dog Control' },
  { id: 20, title: 'Food Safety' },
];

export const DEV_MODULES: Module[] = [
  { id: 1, title: 'Dog Control — Request for Service', topicId: 10 },
  { id: 3, title: 'Dog Control — Barking Dog Complaint', topicId: 10 },
  { id: 2, title: 'Food Act Compliance', topicId: 20 },
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


