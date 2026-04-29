import { EDGE_COLORS, CHROME, FD, STATUS_COLORS_BUTTON } from '../config/theme';
import type { Edge } from 'reactflow';
import type { EdgeData } from '../types';

/**
 * Shared decision path card pair — used in both EditorNodePanel and ViewerNodePanel.
 *
 * Renders two soft-square cards (Yes / No). When `onSelectNode` is provided, linked
 * cards are clickable and navigate the sidebar to the target node. Unlinked paths
 * render as muted placeholders.
 *
 * Editor-only edit-mode UI lives in EditorNodePanel and is not part of this component.
 */

interface DecisionPathCardsProps {
  yesEdge?: Edge<EdgeData>;
  noEdges?: Edge<EdgeData>[];
  /** When provided, linked cards become clickable and call this with the target node ID. */
  onSelectNode?: (nodeId: string) => void;
}

export default function DecisionPathCards({ yesEdge, noEdges = [], onSelectNode }: DecisionPathCardsProps) {
  const noSlots = noEdges.length > 0 ? noEdges.length : 1; // always show at least 1 No slot
  const totalCards = 1 + noSlots;
  // 1–3 cards: all in one row. 4+: 2-column grid (2×2, 2×3, …)
  const cols = totalCards <= 3 ? totalCards : 2;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      <PathCard
        answer="Yes"
        edge={yesEdge}
        bg={EDGE_COLORS.yes.bg}
        border={EDGE_COLORS.yes.border}
        text={EDGE_COLORS.yes.text}
        onSelectNode={onSelectNode}
      />
      {noEdges.length > 0
        ? noEdges.map((e) => (
            <PathCard
              key={e.id}
              answer="No"
              edge={e}
              bg={EDGE_COLORS.no.bg}
              border={EDGE_COLORS.no.border}
              text={EDGE_COLORS.no.text}
              onSelectNode={onSelectNode}
            />
          ))
        : (
          <PathCard
            answer="No"
            edge={undefined}
            bg={EDGE_COLORS.no.bg}
            border={EDGE_COLORS.no.border}
            text={EDGE_COLORS.no.text}
            onSelectNode={onSelectNode}
          />
        )
      }
    </div>
  );
}

interface PathCardProps {
  answer: 'Yes' | 'No';
  edge?: Edge<EdgeData>;
  bg: string;
  border: string;
  text: string;
  onSelectNode?: (nodeId: string) => void;
}

function PathCard({ answer, edge, bg, border, text, onSelectNode }: PathCardProps) {
  const isLinked = !!edge;
  const clickable = isLinked && !!onSelectNode;

  const baseStyle: React.CSSProperties = {
    minHeight: 72, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 5,
    borderRadius: 8, padding: '10px 8px', textAlign: 'center',
  };

  if (isLinked) {
    return (
      <button
        onClick={clickable ? () => onSelectNode!(edge!.target) : undefined}
        style={{
          ...baseStyle,
          background: bg,
          border: `2px solid ${border}`,
          cursor: clickable ? 'pointer' : 'default',
        }}
      >
        <span style={{ background: border, color: FD.btnActionText, borderRadius: 10, padding: '1px 9px', fontWeight: 700, fontSize: 11 }}>
          {answer}
        </span>
        <span style={{ fontSize: 11, color: text, lineHeight: 1.3, wordBreak: 'break-word' }}>
          {edge!.data?.label || '—'}
        </span>
      </button>
    );
  }

  return (
    <div style={{
      ...baseStyle,
      background: CHROME.rowBg,
      border: `2px dashed ${CHROME.panelBorder}`,
      opacity: 0.6,
    }}>
      <span style={{ background: CHROME.panelBorder, color: CHROME.textSubtle, borderRadius: 10, padding: '1px 9px', fontWeight: 700, fontSize: 11 }}>
        {answer}
      </span>
      <span style={{ fontSize: 11, color: STATUS_COLORS_BUTTON.orphan, fontStyle: 'italic' }}>
        ⚠ not linked
      </span>
    </div>
  );
}
