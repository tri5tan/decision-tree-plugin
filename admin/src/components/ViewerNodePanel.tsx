import { STATUS_COLORS, STATUS_LABELS, EDGE_COLORS, CHROME, getStatusKey } from '../config/theme';
import { decodeEntities } from '../utils/htmlUtils';
import DecisionPathCards from './DecisionPathCards';
import type { Node, Edge } from 'reactflow';
import type { StepData, EdgeData } from '../types';

interface ViewerNodePanelProps {
  node: Node<StepData>;
  outgoingEdges?: Edge<EdgeData>[];
  onClose: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export default function ViewerNodePanel({ node, outgoingEdges = [], onClose, onSelectNode }: ViewerNodePanelProps) {
  const d         = node.data;
  const statusKey = getStatusKey(d);
  const color     = STATUS_COLORS[statusKey] || '#888';
  const label     = STATUS_LABELS[statusKey] || 'Unknown';

  const yesEdge = outgoingEdges.find(e => e.data?.answer === 'Yes');
  const noEdges  = outgoingEdges.filter(e => e.data?.answer === 'No');

  return (
    <div style={{
      width: '35%', maxWidth: 415, padding: 16, borderLeft: `1px solid ${CHROME.panelBorder}`,
      background: CHROME.panelBg, overflowY: 'auto', fontSize: 13, flexShrink: 0,
    }}>
      {/* Header with title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
            {decodeEntities(d.label)}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: CHROME.textSubtle, flexShrink: 0 }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Status badge */}
      {/* <span className='status-badge' style={{
        display: 'inline-block', padding: '2px 9px', borderRadius: 12,
        background: color, color: '#fff', fontSize: 11, marginBottom: 10,
      }}>
        {label}
      </span> */}

      {/* Question — read-only */}
      {/* UPDATE: removed for end user */}
      {/* <Section title="Question prompt">
        {d.question
          ? <p style={{ margin: 0, lineHeight: 1.5 }}>{d.question}</p>
          : <p style={{ margin: 0, color: d.isTerminal ? CHROME.textSubtle : CHROME.textPlaceholder, fontStyle: 'italic' }}>
              {d.isTerminal ? 'End node — no question' : 'No question set'}
            </p>
        }
      </Section> */}

     

      {/* Best practice callout — read-only */}
      {d.callout && (
        <Section>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{decodeEntities(d.callout)}</p>
        </Section>
      )}

      {/* Body content — read-only */}
      {d.content && (
        <Section>
          <div style={{ lineHeight: 1.55, fontSize: 12, color: CHROME.textPrimary }} dangerouslySetInnerHTML={{ __html: d.content }} />
        </Section>
      )}

      {/* Legislation */}
      {d.legislation && d.legislation.length > 0 && (
        <Section title={`Legislation (${d.legislation.length})`}>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {d.legislation.map((l: { act: string; section?: string; url: string }, i: number) => (
              <li key={i} style={{ marginBottom: 5, lineHeight: 1.4 }}>
                <a href={l.url} target="_blank" rel="noopener noreferrer"
                   style={{ color: STATUS_COLORS.terminal.base, fontSize: 12 }}>
                  {l.act}{l.section ? ` — ${l.section}` : ''}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

       {/* Decision paths — navigable cards */}
      {!d.isTerminal && (
        <Section>
          <DecisionPathCards yesEdge={yesEdge} noEdges={noEdges} onSelectNode={onSelectNode} />
        </Section>
      )}
      
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {title && (
        <div style={{
          fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em',
          color: CHROME.sectionLabel, marginBottom: 5, fontWeight: 600,
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function PathRow({ answer, color, bg, label, warn }: { answer: string; color: string; bg: string; label?: string; warn?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 6,
      marginBottom: 6, fontSize: 12,
    }}>
      <span style={{
        background: bg, border: `1px solid ${color}`, color,
        borderRadius: 10, padding: '1px 7px', fontWeight: 700,
        fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {answer}
      </span>
      <span style={{ color: warn ? STATUS_COLORS.orphan.base : CHROME.textPrimary, fontStyle: warn ? 'italic' : 'normal' }}>
        {label || '—'}
      </span>
    </div>
  );
}
