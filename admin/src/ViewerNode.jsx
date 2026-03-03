import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { STATUS_COLORS, STATUS_META } from './nodeStatus';

// Wider nodes for expanded content view
export const VIEWER_NODE_W = 400;

// ─── View-only node with full content ────────────────────────────────────────
const ViewerNode = memo(function ViewerNode({ data, selected }) {
  const statusKey = data.isOrphan ? 'orphan'
    : data.isRoot   ? 'start'
    : data.linkStatus;

  const accentColor = STATUS_COLORS[statusKey] || '#888';
  const icon = STATUS_META[statusKey] || STATUS_META.empty;

  return (
    <div
      style={{
        background:   '#fff',
        color:        '#1a1a1a',
        borderRadius: 6,
        padding:      '12px 14px',
        width:        VIEWER_NODE_W,
        boxSizing:    'border-box',
        borderTop:    statusKey === 'orphan' ? '2px dashed #c0392b' : `2px solid ${selected ? accentColor : '#e5e7eb'}`,
        borderRight:  statusKey === 'orphan' ? '2px dashed #c0392b' : `2px solid ${selected ? accentColor : '#e5e7eb'}`,
        borderBottom: statusKey === 'orphan' ? '2px dashed #c0392b' : `2px solid ${selected ? accentColor : '#e5e7eb'}`,
        borderLeft:   statusKey === 'orphan' ? `4px dashed #c0392b` : `4px solid ${accentColor}`,
        boxShadow:    '0 2px 6px rgba(0,0,0,0.1)',
        fontFamily:   "Roboto, sans-serif",
        fontOpticalSizing: 'auto',
        fontWeight:   400,
        fontStyle:    'normal',
        position:     'relative',
      }}
    >
      {/* Non-interactive handles for visual continuity */}
      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: '#ddd', border: '2px solid #aaa', top: -5, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom}
        style={{ width: 10, height: 10, background: '#ddd', border: '2px solid #aaa', bottom: -5, pointerEvents: 'none' }} />

      {/* Status icon row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: icon.color, fontWeight: 700, lineHeight: 1, userSelect: 'none' }}>
          {icon.icon}
        </span>
        {statusKey === 'start' && (
          <span style={{ fontSize: 9, background: '#2c6e49', color: '#fff', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>
            START
          </span>
        )}
      </div>

      {/* Step title */}
      <div style={{ 
        fontFamily: "Roboto, sans-serif",
        fontOpticalSizing: 'auto',
        fontWeight: 600,
        fontStyle: 'normal', 
        fontSize: 14, 
        lineHeight: 1.4, 
        marginBottom: 8, 
        color: '#404040',
      }}>
        {data.label}
      </div>

      {/* Full question (not snippet) */}
      {data.question && (
        <div style={{
          fontSize: 12, 
          color: '#555', 
          fontStyle: 'italic',
          lineHeight: 1.4, 
          marginBottom: 8,
          borderLeft: '3px solid #e5e7eb', 
          paddingLeft: 8,
          background: '#fafafa',
          padding: '8px',
          borderRadius: 4,
        }}>
          {data.question}
        </div>
      )}

      {/* Full body content (HTML) */}
      {data.content && (
        <div 
          style={{
            fontSize: 11, 
            color: '#666',
            lineHeight: 1.5, 
            marginBottom: 8,
            borderLeft: '2px solid #e5e7eb', 
            paddingLeft: 8,
          }}
          dangerouslySetInnerHTML={{ __html: data.content }}
        />
      )}

      {/* Best practice callout (expanded) */}
      {data.callout && (
        <div style={{
          background: '#f0f7ee',
          border: '1px solid #2c6e49',
          borderRadius: 4,
          padding: '8px 10px',
          marginBottom: 8,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#2c6e49">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
            </svg>
            <strong style={{ fontSize: 10, color: '#2c6e49', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Best Practice
            </strong>
          </div>
          <div style={{ fontSize: 11, color: '#333', lineHeight: 1.4 }}>
            {data.callout}
          </div>
        </div>
      )}

      {/* Legislation (expanded list) */}
      {data.legislation && data.legislation.length > 0 && (
        <div style={{
          background: '#f5f5f5',
          border: '1px solid #d0d0d0',
          borderRadius: 4,
          padding: '8px 10px',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 6,
          }}>
            ⚖ Relevant Legislation
          </div>
          <ul style={{
            margin: 0,
            padding: 0,
            paddingLeft: 18,
            fontSize: 11,
            color: '#444',
            lineHeight: 1.6,
          }}>
            {data.legislation.map((leg, i) => (
              <li key={i} style={{ marginBottom: 3 }}>
                <a 
                  href={leg.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: '#2563eb',
                    textDecoration: 'none',
                  }}
                >
                  {leg.act}{leg.section ? ` — ${leg.section}` : ''}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

export default ViewerNode;
