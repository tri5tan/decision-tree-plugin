import { useState, memo, createContext, useContext, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";
import {
  STATUS_COLORS,
  STATUS_COLORS_BUTTON,
  STATUS_META,
  CHROME,
  BADGE,
  EDGE_COLORS,
  FD,
} from "../config/theme";
import { getNodeWidth, TRUNCATE_BODY } from "../config/tree-layout-config";
import { decodeEntities, htmlToSnippet, normaliseQuillHtml } from "../utils/htmlUtils";
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
interface BadgeProps {
  children: React.ReactNode;
  color?: string;
}
export function Badge({ children, color }: BadgeProps) {
  const badgeColor = color || BADGE.text;
  return (
    <span
      className="badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: BADGE.bg,
        color: badgeColor,
        borderRadius: 3,
        padding: "3px 8px",
        minHeight: 18,
        lineHeight: 1,
        fontSize: 10,
        whiteSpace: "nowrap",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

// ─── Custom node ─────────────────────────────────────────────────────────────
const DTNode = memo(function DTNode({
  id,
  data,
  selected,
}: {
  id: string;
  data: StepData;
  selected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const { onMarkTerminal, onSetStart, onClearStart } =
    useContext(NodeCallbacks);
  const updateNodeInternals = useUpdateNodeInternals();

  // Tell ReactFlow to re-measure handle positions whenever sourceHandles changes.
  // Without this, edges referencing dynamically-added handles can't find their bounds (error #008).
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, data.sourceHandles, updateNodeInternals]);

  const statusKey = data.isOrphan
    ? "orphan"
    : data.isRoot
      ? "start"
      : data.linkStatus;

  const accentColor = (STATUS_COLORS[statusKey] || STATUS_COLORS.empty).base;
  const icon = STATUS_META[statusKey] || STATUS_META.empty;

  // Determine which actions are possible for this node type
  // (used to pre-allocate footer space so the node size never changes on hover)
  const couldMarkEnd = statusKey === "empty";
  const couldSetStart = statusKey !== "start" && !data.hasIncoming;
  const couldRemoveStart = statusKey === "start";
  const hasActions = couldMarkEnd || couldSetStart || couldRemoveStart;

  return (
    <div
      className="node-box"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "4px 0 0 4px",
        borderLeft:
          statusKey === "orphan"
            ? `4px solid ${STATUS_COLORS.orphan.base}`
            : `4px solid ${accentColor}`,
        width: getNodeWidth(),
        boxSizing: "border-box",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div
        style={{
          background: CHROME.cardBg,
          color: CHROME.textStrong,
          borderRadius: "0 4px 4px 0",
          padding: "10px 12px",
          boxSizing: "border-box",
          fontFamily: "Roboto, sans-serif",
          fontOpticalSizing: "auto",
          fontWeight: 400,
          fontStyle: "normal",
          paddingBottom: hasActions ? 34 : 10,
          ...(statusKey === "orphan"
            ? {
                borderTop: selected
                  ? "2px solid " + STATUS_COLORS.orphan.base
                  : "2px dashed " + STATUS_COLORS.orphan.base,
                borderRight: selected
                  ? "2px solid " + STATUS_COLORS.orphan.base
                  : "2px dashed " + STATUS_COLORS.orphan.base,
                borderBottom: selected
                  ? "2px solid " + STATUS_COLORS.orphan.base
                  : "2px dashed " + STATUS_COLORS.orphan.base,
                boxShadow: CHROME.cardShadow,
              }
            : {
                borderTop: "none",
                borderRight: "none",
                borderBottom: "none",
                boxShadow: `inset 0 2px 0 0 ${selected ? accentColor : CHROME.cardBg}, inset -2px 0 0 0 ${selected ? accentColor : CHROME.cardBg}, inset 0 -2px 0 0 ${selected ? accentColor : CHROME.cardBg}, ${CHROME.cardShadow}`,
              }),
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
        {/* Dynamic source handles — one per outgoing connection, color-coded and tightly spaced. */}
        {(data.sourceHandles && data.sourceHandles.length > 0
          ? data.sourceHandles
          : ["default" as const]
        ).map((answer, i, arr) => {
          const gap = 14;
          const totalWidth = (arr.length - 1) * gap;
          const offsetPx = arr.length === 1 ? 0 : i * gap - totalWidth / 2;
          // const colors = answer === 'Yes'
          //   ? { bg: EDGE_COLORS.yes.bg, border: EDGE_COLORS.yes.border }
          //   : answer.startsWith('No')
          //   ? { bg: EDGE_COLORS.no.bg, border: EDGE_COLORS.no.border }
          //   : { bg: CHROME.handleBg, border: CHROME.handleBorder };
          const colours = {
            bg: CHROME.handleBg,
            border: CHROME.handleBorder,
          };
          return (
            <Handle
              key={answer}
              id={answer}
              type="source"
              position={Position.Bottom}
              style={{
                width: 10,
                height: 10,
                left: `calc(50% + ${offsetPx}px)`,
                transform: "translateX(-50%)",
                background: colours.bg,
                border: `2px solid ${colours.border}`,
                bottom: -5,
              }}
            />
          );
        })}

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
                background: STATUS_COLORS.start.base,
                color: FD.btnActionText,
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
          {decodeEntities(data.label)}
        </div>

        {/* Question snippet — full text, no truncation */}
        {data.question && (
          <div
            className="question-text"
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
            {decodeEntities(data.question)}
          </div>
        )}

        {/* Body snippet — clipped HTML render so formatting (bullets, indentation) displays correctly */}
        {data.content && (
          <div
            className="body-content"
            style={{
              fontSize: 11,
              color: CHROME.textMuted,
              lineHeight: 1.35,
              marginBottom: 6,
              borderLeft: `2px solid ${CHROME.cardBorderSubtle}`,
              paddingLeft: 6,
              maxHeight: '4.2em',
              overflow: 'hidden',
            }}
            dangerouslySetInnerHTML={{ __html: normaliseQuillHtml(data.content) }}
          />
        )}

        {/* Footer badges */}
        <div
          className="badges"
          style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}
        >
          {data.legislation?.length > 0 && (
            // <Badge color={BADGE.legislation}>⚖ {data.legislation.length}</Badge>
            <Badge color={BADGE.text}>🕮 {data.legislation.length}</Badge>
          )}
          {data.callout && (
            // <Badge color="#0891b2">
            // <Badge color={BADGE.callout}>
            <Badge color={BADGE.text}>
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
              Best practice
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
                  background: STATUS_COLORS_BUTTON.start,
                  color: FD.btnActionText,
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
                  background: STATUS_COLORS_BUTTON.terminal,
                  color: FD.btnActionText,
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
    </div>
  );
});

export default DTNode;
