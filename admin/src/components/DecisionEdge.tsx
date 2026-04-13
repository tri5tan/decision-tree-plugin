import { getSmoothStepPath, BaseEdge, EdgeLabelRenderer } from "reactflow";
import type { EdgeProps } from "reactflow";
import { EDGE_COLORS } from "../config/theme";
import { getRankSep } from "../config/tree-layout-config";
import type { EdgeData } from "../types";

// ─── Custom edge ─────────────────────────────────────────────────────────────
// Positions label at 75% toward target so Yes/No labels don't overlap at source
export default function DecisionEdge({
  id,
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
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // getSmoothStepPath returns the true midpoint along the curved path
  const isYes = data?.answer === "Yes";
  const { bg: bgColor, border, text: color } = isYes ? EDGE_COLORS.yes : EDGE_COLORS.no;

  // Centred horizontally on the target node, halfway up the gap between nodes
  const labelX = targetX;
  const labelY = targetY - getRankSep() / 3;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="edge-label nodrag nopan"
          style={{
            position: "absolute",
            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
            background: bgColor,
            boxShadow: `0 0 0 1px ${border}`,
            color,
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {data?.label || data?.answer}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
