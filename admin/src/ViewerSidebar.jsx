import { STATUS_COLORS, STATUS_LABELS, getStatusKey } from './nodeStatus';

export default function ViewerSidebar({ node, outgoingEdges = [], onClose }) {
  const d         = node.data;
  const statusKey = getStatusKey(d);
  const color     = STATUS_COLORS[statusKey] || '#888';
  const label     = STATUS_LABELS[statusKey] || 'Unknown';

  const yesEdge = outgoingEdges.find(e => e.data?.answer === 'Yes');
  const noEdge  = outgoingEdges.find(e => e.data?.answer === 'No');

  return (
    <div style={{
      width: 300, padding: 16, borderLeft: '1px solid #ddd',
      background: '#fafafa', overflowY: 'auto', fontSize: 13, flexShrink: 0,
    }}>
      {/* Header with title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>
            {d.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: '#888', flexShrink: 0 }}
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Status badge */}
      <span style={{
        display: 'inline-block', padding: '2px 9px', borderRadius: 12,
        background: color, color: '#fff', fontSize: 11, marginBottom: 10,
      }}>
        {label}
      </span>

      {/* Question — read-only */}
      <Section title="Question prompt">
        {d.question
          ? <p style={{ margin: 0, lineHeight: 1.5 }}>{d.question}</p>
          : <p style={{ margin: 0, color: d.isTerminal ? '#888' : '#aaa', fontStyle: 'italic' }}>
              {d.isTerminal ? 'End node — no question' : 'No question set'}
            </p>
        }
      </Section>

      {/* Yes / No decision paths — read-only */}
      {!d.isTerminal && (
        <Section title="Decision paths">
          {yesEdge ? (
            <PathRow
              answer="Yes" color="#2c6e49" bg="#eefaf2"
              label={yesEdge.data?.label}
            />
          ) : (
            <PathRow answer="Yes" color="#c0392b" bg="#fef0f0" label="Not linked" warn />
          )}
          {noEdge ? (
            <PathRow
              answer="No" color="#c0392b" bg="#fef0f0"
              label={noEdge.data?.label}
            />
          ) : (
            <PathRow answer="No" color="#c0392b" bg="#fef0f0" label="Not linked" warn />
          )}
        </Section>
      )}

      {/* Best practice callout — read-only */}
      {d.callout && (
        <Section title="Best practice callout">
          <p style={{ margin: 0, lineHeight: 1.5 }}>{d.callout}</p>
        </Section>
      )}

      {/* Body content — read-only */}
      {d.content && (
        <Section title="Body content">
          <div style={{ lineHeight: 1.55, fontSize: 12, color: '#444' }} dangerouslySetInnerHTML={{ __html: d.content }} />
        </Section>
      )}

      {/* Legislation */}
      {d.legislation && d.legislation.length > 0 && (
        <Section title={`Legislation (${d.legislation.length})`}>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {d.legislation.map((l, i) => (
              <li key={i} style={{ marginBottom: 5, lineHeight: 1.4 }}>
                <a href={l.url} target="_blank" rel="noopener noreferrer"
                   style={{ color: '#2563eb', fontSize: 12 }}>
                  {l.act}{l.section ? ` — ${l.section}` : ''}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em',
        color: '#999', marginBottom: 5, fontWeight: 600,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function PathRow({ answer, color, bg, label, warn }) {
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
      <span style={{ color: warn ? '#c0392b' : '#444', fontStyle: warn ? 'italic' : 'normal' }}>
        {label || '—'}
      </span>
    </div>
  );
}
