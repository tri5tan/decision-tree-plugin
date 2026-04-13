import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { STATUS_COLORS, STATUS_META, CHROME, BADGE } from '../config/theme';
import { getNodeWidth, TRUNCATE_BODY } from '../config/tree-layout-config';
import type { StepData } from '../types';

function truncate(str: string | null | undefined, n: number): string {
  return str && str.length > n ? str.slice(0, n - 1) + '\u2026' : (str || '');
}

interface BadgeProps { children: React.ReactNode; color?: string; }
function Badge({ children, color = '#666' }: BadgeProps) {
  return (
    <span style={{
      background: BADGE.bg,
      color: BADGE.text,
      borderRadius: 3,
      padding: '2px 6px 2px 4px',
      fontSize: 10,
      whiteSpace: 'nowrap',
      fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

// ─── View-only node with truncated content ───────────────────────────────────
const ViewerNode = memo(function ViewerNode({ data, selected }: { data: StepData; selected?: boolean }) {
  const statusKey = data.isOrphan ? 'orphan'
    : data.isRoot   ? 'start'
    : data.linkStatus;

  const accentColor = STATUS_COLORS[statusKey] || '#888';
  const icon = STATUS_META[statusKey] || STATUS_META.empty;

  return (
    <div
      style={{
        background:   CHROME.cardBg,
        color:        CHROME.textStrong,
        borderRadius: 6,
        padding:      '12px 14px',
        width:        getNodeWidth(),
        boxSizing:    'border-box',
        borderTop:    statusKey === 'orphan' ? '2px dashed ' + STATUS_COLORS.orphan : `2px solid ${selected ? accentColor : CHROME.cardBorderSubtle}`,
        borderRight:  statusKey === 'orphan' ? '2px dashed ' + STATUS_COLORS.orphan : `2px solid ${selected ? accentColor : CHROME.cardBorderSubtle}`,
        borderBottom: statusKey === 'orphan' ? '2px dashed ' + STATUS_COLORS.orphan : `2px solid ${selected ? accentColor : CHROME.cardBorderSubtle}`,
        borderLeft:   statusKey === 'orphan' ? `4px dashed ${STATUS_COLORS.orphan}` : `4px solid ${accentColor}`,
        boxShadow:    CHROME.cardShadow,
        fontFamily:   "Roboto, sans-serif",
        fontOpticalSizing: 'auto',
        fontWeight:   400,
        fontStyle:    'normal',
        position:     'relative',
      }}
    >
      {/* Non-interactive handles for visual continuity */}
      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: CHROME.handleBg, border: `2px solid ${CHROME.handleBorder}`, top: -5, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom}
        style={{ width: 10, height: 10, background: CHROME.handleBg, border: `2px solid ${CHROME.handleBorder}`, bottom: -5, pointerEvents: 'none' }} />

      {/* Status icon row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: icon.color, fontWeight: 700, lineHeight: 1, userSelect: 'none' }}>
          {icon.icon}
        </span>
        {statusKey === 'start' && (
          <span style={{ fontSize: 9, background: STATUS_COLORS.start, color: '#fff', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>
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
        color: CHROME.textPrimary,
      }}>
        {data.label}
      </div>

      {/* Question */}
      {data.question && (
        <div style={{
          fontSize: 11, 
          color: CHROME.textSecondary,
          fontStyle: 'italic',
          lineHeight: 1.35, 
          marginBottom: 6,
          borderLeft: `2px solid ${CHROME.cardBorderSubtle}`, 
          paddingLeft: 6,
        }}>
          {data.question}
        </div>
      )}

      {/* Body snippet (truncated) */}
      {data.content && (
        <div style={{
          fontSize: 11, 
          color: CHROME.textMuted,
          lineHeight: 1.35, 
          marginBottom: 6,
          borderLeft: `2px solid ${CHROME.cardBorderSubtle}`, 
          paddingLeft: 6,
        }}>
          {truncate(data.content.replace(/<[^>]+>/g, ''), TRUNCATE_BODY)}
        </div>
      )}

      {/* Footer badges (like TreeEditor) */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
        {data.legislation?.length > 0 && (
          <Badge>⚖ {data.legislation.length}</Badge>
        )}
        {data.callout && (
          <Badge>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 3, marginBottom: 1 }}>
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
            </svg>
            Best practise
          </Badge>
        )}
      </div>
    </div>
  );
});

export default ViewerNode;
