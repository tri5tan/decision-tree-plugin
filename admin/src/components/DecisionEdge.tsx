import { useState, useContext, createContext } from "react";
import { getSmoothStepPath, BaseEdge, EdgeLabelRenderer } from "reactflow";
import type { EdgeProps } from "reactflow";
import { CHROME, EDGE_COLORS, STATUS_COLORS } from "../config/theme";
import { getNodeWidth } from "../config/tree-layout-config";
import type { EdgeData } from "../types";

// ─── Edge callbacks context ───────────────────────────────────────────────────
// Provided by TreeEditor. Null in the viewer — keeps edges fully inert there.
export const EdgeCallbacks = createContext<{
  onDeleteEdge: (edgeId: string, answer: string, sourceNodeId: string, targetNodeId: string) => void;
} | null>(null);

// ─── Custom edge ─────────────────────────────────────────────────────────────
// Positions label at 75% toward target so Yes/No labels don't overlap at source
export default function DecisionEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}: EdgeProps<EdgeData>) {
  const edgeCtx = useContext(EdgeCallbacks);
  const [hovered, setHovered] = useState(false);
  const isYes = data?.answer === "Yes";
  const { bg: bgColor, border, text } = isYes ? EDGE_COLORS.yes : EDGE_COLORS.no;
  const nodeWidth = getNodeWidth();
  const offsetX = nodeWidth * 0.8;  // How far the edge should bend away from the straight line between source and target when curving around nodes.

  // Back-edge: target is above the source in the layout (convergent / loop-back path).
  // Force the step to jog sideways before curving up so the direction is unambiguous.
  // No-branch back-edges push right; Yes-branch push left — mirrors the Yes-left/No-right
  // layout convention so the curve arcs toward the correct side of the tree.
  const isBackEdge = targetY < sourceY - 20;
  const backBorderRadius = isBackEdge ? 20 : 8;
  // Stagger forward-edge departure depth: Yes exits slightly shallower, No slightly deeper.
  // This splits the two paths vertically within the shared handle zone before they diverge.
  // Back-edges use a fixed offset of 30 for the arc clearance.
  const offset = isBackEdge ? 30 : (isYes ? 20 : 45);
  const centerX = isBackEdge
    ? (isYes ? sourceX - offsetX : sourceX + offsetX)   // Yes arcs left, No arcs right
    : undefined;

  // Yes path: heavier and fully opaque — dominant / success branch.
  // No path: lighter and slightly receded — shows through when coincident at source.
  const edgeStyle = {
    ...style,
    stroke: CHROME.edgeStroke,   // path is always grey; label pill carries the yes/no colour
    // strokeWidth: isYes ? 2 : 1.5,
    // opacity: isYes ? 1 : 0.65,
    strokeWidth: 1.5,
    opacity: 0.65,
  };

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    offset,
    borderRadius: backBorderRadius,
    centerX,
  });



  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          className="edge-label nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%,-50%) translate(${labelX}px,${(labelY)}px)`,
            // transform: `translate(-50%,-50%) translate(${targetX}px,${(labelY+20)}px)`,
            background: bgColor,
            boxShadow: `0 0 0 1px ${border}`,
            color: text,
            padding: "5px 8px",
            // padding: "6px 6px 9px 6px",
            borderRadius: 6,
            fontSize: 11,
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: 600,
            maxWidth: 200,
            textAlign: "center",
            wordBreak: "break-word",
            pointerEvents: edgeCtx ? "auto" : "none",
            cursor: edgeCtx ? "default" : undefined,
            userSelect: "none",
          }}
          onMouseEnter={edgeCtx ? () => setHovered(true) : undefined}
          onMouseLeave={edgeCtx ? () => setHovered(false) : undefined}
        >
          {data?.label || data?.answer}
          {hovered && edgeCtx && (
            <div
              onClick={() => edgeCtx.onDeleteEdge(id, data?.answer || '', source, target)}
              style={{
                marginTop: 5,
                fontSize: 10,
                color: STATUS_COLORS.orphan.text,
                cursor: "pointer",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              Delete connection
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
