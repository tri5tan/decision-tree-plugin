import { memo } from "react";
import { Handle, Position } from "reactflow";
import { STATUS_COLORS, CHROME, BADGE, EDGE_COLORS } from "../config/theme";
import { getNodeWidth, TRUNCATE_BODY } from "../config/tree-layout-config";
import { decodeEntities, htmlToSnippet, normaliseQuillHtml } from "../utils/htmlUtils";
import type { StepData } from "../types";

// Uniform teal accent for all viewer nodes — no status colour coding in the public view.
const VIEWER_ACCENT = STATUS_COLORS.start.base;

function truncate(str: string | null | undefined, n: number): string {
  return str && str.length > n ? str.slice(0, n - 1) + "\u2026" : str || "";
}

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
}
function Badge({ children, color = "#666" }: BadgeProps) {
  return (
    <span
      className="badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: BADGE.bg,
        color: BADGE.text,
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

// ─── View-only node with truncated content ───────────────────────────────────
const ViewerNode = memo(function ViewerNode({
  data,
  selected,
}: {
  data: StepData;
  selected?: boolean;
}) {
  const isStart = !!data.isRoot;
  const isTerminal = !!data.isTerminal;

  return (
    <div
      style={{
        borderRadius: "4px 0 0 4px",
        borderLeft: `4px solid ${VIEWER_ACCENT}`,
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
          padding: "12px 14px",
          boxSizing: "border-box",
          fontFamily: "Roboto, sans-serif",
          fontOpticalSizing: "auto",
          fontWeight: 400,
          fontStyle: "normal",
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
          boxShadow: `inset 0 2px 0 0 ${selected ? VIEWER_ACCENT : CHROME.cardBg}, inset -2px 0 0 0 ${selected ? VIEWER_ACCENT : CHROME.cardBg}, inset 0 -2px 0 0 ${selected ? VIEWER_ACCENT : CHROME.cardBg}, ${CHROME.cardShadow}`,
        }}
      >
        {/* Non-interactive handles — hidden on nodes where they serve no purpose */}
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: 10,
            height: 10,
            background: CHROME.handleBg,
            border: `2px solid ${CHROME.handleBorder}`,
            top: -5,
            pointerEvents: "none",
            ...(isStart ? { display: "none" } : {}),
          }}
        />
        {!isTerminal &&
          (data.sourceHandles && data.sourceHandles.length > 0
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
                  pointerEvents: "none",
                }}
              />
            );
          })}

        {/* Role icon — only shown for start and terminal nodes */}
        {(isStart || isTerminal) && (
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: 8 }}
          >
            <span
              style={{
                fontSize: 14,
                color: isStart
                  ? STATUS_COLORS.start.text
                  : STATUS_COLORS.terminal.text,
                fontWeight: 700,
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              {isStart ? "▶" : "■"}
            </span>
          </div>
        )}

        {/* Step title */}
        <div
          style={{
            fontFamily: "Roboto, sans-serif",
            fontOpticalSizing: "auto",
            fontWeight: 600,
            fontStyle: "normal",
            fontSize: 14,
            lineHeight: 1.4,
            marginBottom: 8,
            color: CHROME.textPrimary,
          }}
        >
          {decodeEntities(data.label)}
        </div>

        {/* Question */}
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
            {decodeEntities(data.question)}
          </div>
        )}

        {/* Body snippet (truncated) */}
        {data.content && (
          <div
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

        {/* Footer badges (like TreeEditor) */}
        <div
          style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}
        >
          {data.legislation?.length > 0 && (
            // <Badge>⚖ {data.legislation.length}</Badge>
            <Badge>🕮 {data.legislation.length}</Badge>
          )}
          {data.callout && (
            <Badge>
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
      </div>
    </div>
  );
});

export default ViewerNode;
