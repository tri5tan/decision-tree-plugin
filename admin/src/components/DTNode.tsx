import { useState, memo, createContext, useContext } from "react";
import { Handle, Position } from "reactflow";
import { STATUS_COLORS, STATUS_META, CHROME, BADGE } from "../config/theme";
import { getNodeWidth, TRUNCATE_BODY } from "../config/tree-layout-config";
import type { StepData } from "../types";

// ─── Custom node ─────────────────────────────────────────────────────────────────
// Passes callbacks down to DTNode without re-creating nodeTypes on every render
export const NodeCallbacks = createContext<{
  onMarkTerminal: (id: string) => void;
  onSetStart: (id: string) => void;
  onClearStart: () => void;
  onUnmarkTerminal?: (id: string) => void;
}>({ onMarkTerminal: () => {}, onSetStart: () => {}, onClearStart: () => {} });

export function truncate(str: string, n: number): string {
  return str && str.length > n ? str.slice(0, n - 1) + "\u2026" : str || "";
}

// Leave these changes I made to the badge. I want simple.
interface BadgeProps { children: React.ReactNode; color?: string; }
export function Badge({ children, color = "#666" }: BadgeProps) {
  return (
    <span
      className="badge"
      style={{
        // background:   color + '18',
        // border:       `1px solid ${color}44`,
        // color,
        background: BADGE.bg,
        color: BADGE.text,
        borderRadius: 3,
        // padding:      '1px 7px',
        padding: "2px 6px 2px 4px",
        fontSize: 10,
        // lineHeight:   1.5,
        whiteSpace: "nowrap",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

// ─── Custom node ─────────────────────────────────────────────────────────────
const DTNode = memo(function DTNode({ id, data, selected }: { id: string; data: StepData; selected?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const { onMarkTerminal, onSetStart, onClearStart } =
    useContext(NodeCallbacks);

  const statusKey = data.isOrphan
    ? "orphan"
    : data.isRoot
      ? "start"
      : data.linkStatus;

  const accentColor = STATUS_COLORS[statusKey] || "#888";
  const icon = STATUS_META[statusKey] || STATUS_META.empty;

  // Determine which actions are possible for this node type
  // (used to pre-allocate footer space so the node size never changes on hover)
  const couldMarkEnd = statusKey === "empty";
  const couldSetStart = statusKey !== "start" && !data.hasIncoming;
  const couldRemoveStart = statusKey === "start";
  const hasActions = couldMarkEnd || couldSetStart || couldRemoveStart;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: CHROME.cardBg,
        color: CHROME.textStrong,
        borderRadius: 6,
        padding: "10px 12px",
        width: getNodeWidth(),
        boxSizing: "border-box",
        // Avoid border shorthand — it clobbers borderLeft when React Flow
        // toggles the selected state. Set each side individually instead.
        borderTop:
          statusKey === "orphan"
            ? "2px dashed " + STATUS_COLORS.orphan
            : `2px solid ${selected ? accentColor : CHROME.cardBorderSubtle}`,
        borderRight:
          statusKey === "orphan"
            ? "2px dashed " + STATUS_COLORS.orphan
            : `2px solid ${selected ? accentColor : CHROME.cardBorderSubtle}`,
        borderBottom:
          statusKey === "orphan"
            ? "2px dashed " + STATUS_COLORS.orphan
            : `2px solid ${selected ? accentColor : CHROME.cardBorderSubtle}`,
        borderLeft:
          statusKey === "orphan"
            ? `4px dashed ${STATUS_COLORS.orphan}`
            : `4px solid ${accentColor}`,
        boxShadow: CHROME.cardShadow,
        cursor: "pointer",
        // fontFamily:   'inherit',
        fontFamily: "Roboto, sans-serif",
        fontOpticalSizing: "auto",
        fontWeight: 400,
        fontStyle: "normal",
        position: "relative",
        paddingBottom: hasActions ? 34 : 10,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: CHROME.handleBg,
          border: `2px solid ${CHROME.handleBorder}`,
          top: -5,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: CHROME.handleBg,
          border: `2px solid ${CHROME.handleBorder}`,
          bottom: -5,
        }}
      />

      {/* Status icon row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: icon.color,
            fontWeight: 700,
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {icon.icon}
        </span>
        {statusKey === "start" && (
          <span
            style={{
              fontSize: 9,
              background: STATUS_COLORS.start,
              color: "#fff",
              borderRadius: 10,
              padding: "2px 7px",
              fontWeight: 700,
            }}
          >
            START
          </span>
        )}
      </div>

      {/* Step title */}
      <div
        className="title"
        style={{
          fontFamily: "Roboto, sans-serif",
          fontOpticalSizing: "auto",
          fontWeight: 600,
          fontStyle: "normal",
          fontSize: 12,
          lineHeight: 1.35,
          marginBottom: 5,
          color: CHROME.textPrimary,
        }}
      >
        {data.label}
      </div>

      {/* Question snippet — full text, no truncation */}
      {data.question && (
        <div
          style={{
            fontSize: 11,
            color: CHROME.textSecondary,
            fontStyle: "italic",
            lineHeight: 1.35,
            marginBottom: 6,
            borderLeft: `2px solid ${CHROME.cardBorderSubtle}`,
            paddingLeft: 6,
          }}
        >
          {data.question}
        </div>
      )}

      {/* Body snippet — 120 char limit */}
      {data.content && (
        <div
          style={{
            fontSize: 11,
            color: CHROME.textMuted,
            lineHeight: 1.35,
            marginBottom: 6,
            borderLeft: `2px solid ${CHROME.cardBorderSubtle}`,
            paddingLeft: 6,
          }}
        >
          {truncate(data.content.replace(/<\/?(p|br|li|div|h[1-6])[^>]*>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/\s{2,}/g, " ").trim(), TRUNCATE_BODY)}
        </div>
      )}

      {/* Footer badges */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
        {data.legislation?.length > 0 && (
          <Badge color="#6366f1">⚖ {data.legislation.length}</Badge>
        )}
        {data.callout && (
          <Badge color="#0891b2">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{
                verticalAlign: "middle",
                marginRight: 3,
                marginBottom: 1,
              }}
            >
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
            </svg>
            Best practise
          </Badge>
        )}
      </div>

      {/* Action buttons — always in DOM when relevant so no gap can break hover.
          Buttons sit inside the card's pre-allocated footer zone.
          visibility keeps the space reserved; no size jump on hover. */}
      {hasActions && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            display: "flex",
            gap: 5,
            justifyContent: "center",
            visibility: hovered ? "visible" : "hidden",
          }}
        >
          {/* {couldRemoveStart && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onClearStart?.(); }}
              style={{
                background: 'none', color: '#2c6e49', border: '1px solid #2c6e49',
                borderRadius: 10, padding: '3px 10px', fontSize: 10,
                fontWeight: 700, cursor: 'pointer', lineHeight: 1.6,
              }}
            >
              ↺ Unset start
            </button>
          )} */}
          {couldSetStart && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSetStart?.(id);
              }}
              style={{
                background: STATUS_COLORS.start,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "3px 10px",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                lineHeight: 1.6,
              }}
            >
              ▶ Set as start
            </button>
          )}
          {couldMarkEnd && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onMarkTerminal?.(id);
              }}
              style={{
                background: STATUS_COLORS.terminal,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "3px 10px",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                lineHeight: 1.6,
              }}
            >
              ■ Mark as end
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default DTNode;
