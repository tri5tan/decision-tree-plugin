import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import { getNodeWidth, getNodeHeight, getRankSep, getNodeSep } from "../config/tree-layout-config";
import { CHROME, EDGE_COLORS } from "../config/theme";
import type { StepData, EdgeData, ApiStep, ApiEdge } from "../types";

/**
 * BFS = Breadth-First Search — graph traversal that explores nodes level by level (all nodes at depth 0, then depth 1, etc.) rather than going deep down one branch first.
 * BFS from rootId through edges, returning all node ids reachable within
 * `levels` hops (inclusive of root at level 0).
 */
export function getNodesInFirstNLevels(nodes: Node<StepData>[], edges: Edge<EdgeData>[], rootId: string, levels: number): Node<StepData>[] {
  const childMap = new Map();
  edges.forEach((e) => {
    if (!childMap.has(e.source)) childMap.set(e.source, []);
    childMap.get(e.source).push(e.target);
  });

  const visited = new Set();
  let frontier = [rootId];
  for (let depth = 0; depth < levels; depth++) {
    frontier.forEach((id) => visited.add(id));
    const next: any = [];
    frontier.forEach((id) => {
      (childMap.get(id) || []).forEach((childId: any) => {
        if (!visited.has(childId)) next.push(childId);
      });
    });
    frontier = next;
  }

  return nodes.filter((n) => visited.has(n.id));
}

// ─── BFS (Breadth-First Search) depth map from natural root (no incoming edges) ─────────────────────
/**
 * Returns a Map of nodeId → BFS (shortest-path) depth.
 * Used internally only to classify edges as forward vs back.
 * Orphan nodes are assigned depth 9999.
 */
function computeBfsDepths(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Map<string, number> {
  const targets = new Set(edges.map((e) => e.target));
  const root = nodes.find((n) => !targets.has(n.id)) ?? nodes[0];
  if (!root) return new Map();

  const depths = new Map<string, number>();
  const queue: [string, number][] = [[root.id, 0]];
  while (queue.length) {
    const [id, depth] = queue.shift()!;
    if (depths.has(id)) continue;
    depths.set(id, depth);
    edges
      .filter((e) => e.source === id)
      .forEach((e) => queue.push([e.target, depth + 1]));
  }
  nodes.forEach((n) => { if (!depths.has(n.id)) depths.set(n.id, 9999); });
  return depths;
}

/**
 * Compute layout depths as the LONGEST path from root.
 *
 * BFS (Breadth-First Search/shortest path) misranks convergent nodes: a node reached first via a
 * short path gets a low depth, so edges arriving from deeper parents are
 * misclassified as back-edges and reversed in dagre — placing the shared node
 * above one of its parents.
 *
 * Two-pass approach:
 *   Pass 1 — BFS to identify back-edges (tgtBfs <= srcBfs).
 *   Pass 2 — Topological longest-path over forward-only edges.
 * Result: every convergent node sits below its deepest parent.
 */
function computeLayoutDepths(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Map<string, number> {
  // Pass 1: BFS shortest paths — classify forward vs back edges only
  const bfsDepths = computeBfsDepths(nodes, edges);

  // Pass 2: longest path via Kahn's topological sort on forward edges only.
  // Use >= not > so same-depth "cross edges" (two parents BFS-equidistant from root
  // converging on the same child) are included — otherwise the convergent node only
  // gets depth from one parent and ends up coplanar with the other instead of below it.
  const forwardEdges = edges.filter(
    (e) => (bfsDepths.get(e.target) ?? 0) >= (bfsDepths.get(e.source) ?? 0)
  );

  const inDegree = new Map<string, number>();
  const adj      = new Map<string, string[]>();
  nodes.forEach((n) => { inDegree.set(n.id, 0); adj.set(n.id, []); });
  forwardEdges.forEach((e) => {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  });

  const depths = new Map<string, number>();
  const queue: string[] = [];
  nodes.forEach((n) => {
    if (!(inDegree.get(n.id) ?? 0)) { queue.push(n.id); depths.set(n.id, 0); }
  });

  while (queue.length) {
    const id = queue.shift()!;
    const d  = depths.get(id) ?? 0;
    for (const child of (adj.get(id) ?? [])) {
      depths.set(child, Math.max(depths.get(child) ?? 0, d + 1));
      const rem = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, rem);
      if (rem === 0) queue.push(child);
    }
  }

  nodes.forEach((n) => { if (!depths.has(n.id)) depths.set(n.id, 9999); });
  return depths;
}

// ─── Auto-layout via dagre ────────────────────────────────────────────────────
export function applyDagreLayout(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Node<StepData>[] {
  const graphNodeWidth = getNodeWidth();
  const graphNodeHeight = getNodeHeight();
  const graphRankSep = getRankSep();
  const graphNodeSep = getNodeSep();

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: graphRankSep, nodesep: graphNodeSep });

  // Compute longest-path depths to correctly classify back edges.
  // Using BFS (shortest path) misranks convergent nodes — see computeLayoutDepths.
  // Back edges (tgtDepth <= srcDepth) are reversed for dagre only; real edges render normally.
  const depths = computeLayoutDepths(nodes, edges);

  nodes.forEach((n) => g.setNode(n.id, { width: graphNodeWidth, height: graphNodeHeight }));
  edges.forEach((e) => {
    const srcDepth = depths.get(e.source) ?? 0;
    const tgtDepth = depths.get(e.target) ?? 9999;
    if (tgtDepth <= srcDepth) {
      // Back edge — reverse so dagre places the ancestor at its correct rank
      g.setEdge(e.target, e.source);
    } else {
      g.setEdge(e.source, e.target);
    }
  });
  dagre.layout(g);

  const laidOut = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - graphNodeWidth / 2, y: pos.y - graphNodeHeight / 2 },
    };
  });

  return enforceSingleChildCentered(enforceDirectPolarity(enforceConvergentPosition(enforceYesLeftNoRight(laidOut, edges), edges), edges), edges);
}

/**
 * Build a map of nodeId → [childId, ...] from the edge list.
 */
function buildChildrenMap(edges: Edge<EdgeData>[]): Map<string, string[]> {
  const map = new Map();
  edges.forEach((e) => {
    if (!map.has(e.source)) map.set(e.source, []);
    map.get(e.source).push(e.target);
  });
  return map;
}

/**
 * BFS from startId collecting the "exclusive" subtree — nodes that belong only
 * to this branch. Traversal stops at convergent nodes (incomingCount > 1) so
 * that shared nodes are never displaced by a single parent's positional swap.
 * The startId itself is always included regardless of its incoming count.
 */
function getExclusiveSubtreeIds(
  startId: string,
  childrenMap: Map<string, string[]>,
  incomingCount: Map<string, number>,
): Set<string> {
  const visited: Set<string> = new Set();
  const queue: string[] = [startId];
  while (queue.length) {
    const id: string = queue.shift()!;
    if (visited.has(id)) continue;
    // Non-start nodes that have >1 incoming edge are convergent — stop here.
    if (id !== startId && (incomingCount.get(id) ?? 0) > 1) continue;
    visited.add(id);
    (childrenMap.get(id) ?? []).forEach((c: string) => queue.push(c));
  }
  return visited;
}

/**
 * Post-process dagre positions so that for any node with both a Yes and No
 * outgoing edge, the Yes subtree is always to the left and No to the right.
 *
 * Uses exclusive subtrees (stops at convergent nodes) so that shared nodes are
 * never displaced by a single parent's swap — those are placed by
 * enforceConvergentPosition. Processed top-to-bottom so parent-level swaps
 * propagate cleanly before children are adjusted.
 */
function enforceYesLeftNoRight(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Node<StepData>[] {
  const posMap = new Map(nodes.map((n) => [n.id, n.position]));
  const childrenMap = buildChildrenMap(edges);

  const incomingCount = new Map<string, number>();
  edges.forEach((e) => incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1));

  const outgoing = new Map<string, Edge<EdgeData>[]>();
  edges.forEach((e) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)?.push(e);
  });

  const sortedSources = [...outgoing.keys()].sort(
    (a, b) => (posMap.get(a)?.y ?? 0) - (posMap.get(b)?.y ?? 0)
  );

  sortedSources.forEach((sourceId) => {
    const outEdges = outgoing.get(sourceId);
    const yesEdge = outEdges?.find((e) => e.data?.answer === "Yes") ?? null;
    const noEdge  = outEdges?.find((e) => e.data?.answer === "No")  ?? null;

    if (!yesEdge || !noEdge) return;

    const yesPos = posMap.get(yesEdge.target);
    const noPos  = posMap.get(noEdge.target);
    if (!yesPos || !noPos) return;
    if (yesPos.x <= noPos.x) return; // already correct: Yes is left of No

    // Yes is to the right of No — swap exclusive subtrees.
    // Exclusive subtrees stop at convergent nodes, so the swap never displaces
    // a node that belongs to another parent's branch as well.
    const yesSubtree = getExclusiveSubtreeIds(yesEdge.target, childrenMap, incomingCount);
    const noSubtree  = getExclusiveSubtreeIds(noEdge.target,  childrenMap, incomingCount);

    const deltaX = noPos.x - yesPos.x; // negative: Yes moves left, No moves right
    yesSubtree.forEach((id) => {
      const p = posMap.get(id);
      if (p) posMap.set(id, { ...p, x: p.x + deltaX });
    });
    noSubtree.forEach((id) => {
      const p = posMap.get(id);
      if (p) posMap.set(id, { ...p, x: p.x - deltaX });
    });
  });

  return nodes.map((n) => ({ ...n, position: posMap.get(n.id) ?? n.position }));
}

/**
 * Place each convergent node (2+ incoming forward edges) at the centroid of its
 * parents' X positions, with a polarity bias that extends the Yes-left/No-right
 * convention:
 *   All-Yes parents → shift left
 *   All-No  parents → shift right
 *   Mixed           → stay at centroid
 *
 * Processed top-to-bottom so shallower convergent nodes are settled before
 * deeper ones use them as reference parents.
 *
 * A forward edge is identified by the parent's Y being clearly above the
 * target's Y (already placed by dagre, only X is modified here).
 *
 * After placing convergent nodes, enforce a minimum horizontal gap between all
 * nodes at the same Y rank so nothing overlaps.
 */
function enforceConvergentPosition(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Node<StepData>[] {
  const posMap   = new Map(nodes.map((n) => [n.id, n.position]));
  const nodeWidth  = getNodeWidth();
  const nodeHeight = getNodeHeight();
  const bias     = nodeWidth * 0.55;
  const yThresh  = nodeHeight * 0.25; // parent must be this much higher than child

  // Build forward-incoming map from current Y positions
  const forwardIncoming = new Map<string, { sourceId: string; answer?: string }[]>();
  nodes.forEach((n) => forwardIncoming.set(n.id, []));
  edges.forEach((e) => {
    const srcY = posMap.get(e.source)?.y ?? 0;
    const tgtY = posMap.get(e.target)?.y ?? 0;
    if (srcY < tgtY - yThresh) {
      forwardIncoming.get(e.target)?.push({ sourceId: e.source, answer: e.data?.answer });
    }
  });

  // Process top-to-bottom: shallower nodes are settled first
  const sortedNodes = [...nodes].sort(
    (a, b) => (posMap.get(a.id)?.y ?? 0) - (posMap.get(b.id)?.y ?? 0)
  );

  sortedNodes.forEach((n) => {
    const parents = forwardIncoming.get(n.id) ?? [];
    if (parents.length < 2) return; // only act on convergent nodes

    const centroid = parents.reduce((s, p) => s + (posMap.get(p.sourceId)?.x ?? 0), 0) / parents.length;
    const yesCount = parents.filter((p) => p.answer === "Yes").length;
    const noCount  = parents.filter((p) => p.answer === "No").length;

    // Double-Yes clause: extra leftward push (not downward) — Yes-side convergence
    // sits further left to mirror the Yes-left convention and distinguish the path.
    // Double-No clause: extra downward push (not leftward) — failure/escalation reads
    // visually distinct and the incoming diagonals have room to separate.
    const extraBias = (yesCount >= 2 && noCount === 0) ? bias * 0.6 : 0;
    const targetX =
      yesCount > 0 && noCount === 0 ? centroid - bias - extraBias :
      noCount  > 0 && yesCount === 0 ? centroid + bias :
      centroid;

    const pos = posMap.get(n.id);
    if (!pos) return;
    const extraY = (noCount >= 2 && yesCount === 0) ? getRankSep() * 0.85 : 0;
    posMap.set(n.id, { ...pos, x: targetX, y: pos.y + extraY });
  });

  // Enforce minimum gap between nodes at the same Y rank
  const minGap = nodeWidth + 16;
  const rankGroups = new Map<number, string[]>();
  nodes.forEach((n) => {
    const y = Math.round(posMap.get(n.id)?.y ?? 0);
    if (!rankGroups.has(y)) rankGroups.set(y, []);
    rankGroups.get(y)!.push(n.id);
  });

  rankGroups.forEach((ids) => {
    if (ids.length < 2) return;
    ids.sort((a, b) => (posMap.get(a)?.x ?? 0) - (posMap.get(b)?.x ?? 0));
    let changed = true;
    let iter = 0;
    while (changed && iter < 20) {
      changed = false;
      iter++;
      for (let i = 0; i < ids.length - 1; i++) {
        const pa = posMap.get(ids[i])!;
        const pb = posMap.get(ids[i + 1])!;
        if (pb.x - pa.x < minGap) {
          const push = (minGap - (pb.x - pa.x)) / 2;
          posMap.set(ids[i],     { ...pa, x: pa.x - push });
          posMap.set(ids[i + 1], { ...pb, x: pb.x + push });
          changed = true;
        }
      }
    }
  });

  return nodes.map((n) => ({ ...n, position: posMap.get(n.id) ?? n.position }));
}

/**
 * Final polarity pass — run after enforceConvergentPosition.
 *
 * Enforces parent-relative positioning: for every parent with both a Yes and
 * a No outgoing edge, the Yes child must sit at least `halfSpan` to the LEFT
 * of the parent center and the No child at least `halfSpan` to the RIGHT.
 * This prevents either child appearing directly beneath the parent when the
 * other has been shifted far away.
 *
 * Only non-convergent children are moved (convergent children with multiple
 * incoming edges were already placed by enforceConvergentPosition).
 * Exclusive subtrees travel with their root so non-convergent tails follow.
 * Processed top-to-bottom so shallower corrections propagate first.
 *
 * A final sibling gap check then ensures Yes.x + minGap ≤ No.x regardless
 * of convergence, splitting any remaining deficit around the midpoint.
 */
function enforceDirectPolarity(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Node<StepData>[] {
  const posMap      = new Map(nodes.map((n) => [n.id, n.position]));
  const nodeWidth   = getNodeWidth();
  // How far each child must sit from the parent's center (one side each).
  // nodeWidth * 0.7 ≈ half the natural sibling centre-to-centre distance.
  const halfSpan    = nodeWidth * 0.7;
  const minGap      = nodeWidth * 1.0;  // absolute floor gap between yes and no
  const childrenMap = buildChildrenMap(edges);

  const incomingCount = new Map<string, number>();
  edges.forEach((e) => incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1));

  const outgoing = new Map<string, Edge<EdgeData>[]>();
  edges.forEach((e) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)!.push(e);
  });

  const sortedSources = [...outgoing.keys()].sort(
    (a, b) => (posMap.get(a)?.y ?? 0) - (posMap.get(b)?.y ?? 0)
  );

  sortedSources.forEach((sourceId) => {
    const outEdges = outgoing.get(sourceId);
    const yesEdge  = outEdges?.find((e) => e.data?.answer === "Yes") ?? null;
    const noEdge   = outEdges?.find((e) => e.data?.answer === "No")  ?? null;
    if (!yesEdge || !noEdge) return;

    const parentX = posMap.get(sourceId)?.x ?? 0;
    const yesPos  = posMap.get(yesEdge.target);
    const noPos   = posMap.get(noEdge.target);
    if (!yesPos || !noPos) return;

    const yesConvergent = (incomingCount.get(yesEdge.target) ?? 0) > 1;
    const noConvergent  = (incomingCount.get(noEdge.target)  ?? 0) > 1;

    // ── Parent-relative enforcement (non-convergent children only) ─────────
    // Yes must be left of parent center — push further left if needed.
    if (!yesConvergent && yesPos.x > parentX - halfSpan) {
      const delta = (parentX - halfSpan) - yesPos.x;
      getExclusiveSubtreeIds(yesEdge.target, childrenMap, incomingCount).forEach((id) => {
        const p = posMap.get(id);
        if (p) posMap.set(id, { ...p, x: p.x + delta });
      });
    }
    // No must be right of parent center — push further right if needed.
    if (!noConvergent && noPos.x < parentX + halfSpan) {
      const delta = (parentX + halfSpan) - noPos.x;
      getExclusiveSubtreeIds(noEdge.target, childrenMap, incomingCount).forEach((id) => {
        const p = posMap.get(id);
        if (p) posMap.set(id, { ...p, x: p.x + delta });
      });
    }

    // ── Absolute sibling gap floor (covers convergent children too) ────────
    const yp  = posMap.get(yesEdge.target)!;
    const np  = posMap.get(noEdge.target)!;
    const gap = np.x - yp.x;
    if (gap < minGap) {
      const push = (minGap - gap) / 2;
      if (!yesConvergent) {
        getExclusiveSubtreeIds(yesEdge.target, childrenMap, incomingCount).forEach((id) => {
          const p = posMap.get(id);
          if (p) posMap.set(id, { ...p, x: p.x - push });
        });
      }
      if (!noConvergent) {
        getExclusiveSubtreeIds(noEdge.target, childrenMap, incomingCount).forEach((id) => {
          const p = posMap.get(id);
          if (p) posMap.set(id, { ...p, x: p.x + push });
        });
      }
    }
  });

  return nodes.map((n) => ({ ...n, position: posMap.get(n.id) ?? n.position }));
}

/**
 * For any parent with exactly one outgoing edge, center its child's entire
 * subtree directly below it. Only acts when the child has a single incoming
 * edge — shared nodes (reached from multiple parents) are left in place.
 * Processed top-to-bottom so shifts compose correctly with parent adjustments.
 */
function enforceSingleChildCentered(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Node<StepData>[] {
  const posMap = new Map(nodes.map((n) => [n.id, n.position]));
  const childrenMap = buildChildrenMap(edges);

  const incomingCount = new Map<string, number>();
  edges.forEach((e) => {
    incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
  });

  const outgoing = new Map<string, Edge<EdgeData>[]>();
  edges.forEach((e) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source)?.push(e);
  });

  const sortedSources = [...outgoing.keys()].sort(
    (a, b) => (posMap.get(a)?.y ?? 0) - (posMap.get(b)?.y ?? 0)
  );

  sortedSources.forEach((sourceId) => {
    const outEdges = outgoing.get(sourceId);
    if (!outEdges || outEdges.length !== 1) return;

    const childId = outEdges[0].target;
    if ((incomingCount.get(childId) || 0) > 1) return; // shared node — don't move

    const parentPos = posMap.get(sourceId);
    const childPos  = posMap.get(childId);
    if (!parentPos || !childPos) return;

    const deltaX = parentPos.x - childPos.x;
    if (deltaX === 0) return;

    getExclusiveSubtreeIds(childId, childrenMap, incomingCount).forEach((id) => {
      const p = posMap.get(id);
      if (p) posMap.set(id, { ...p, x: p.x + deltaX });
    });
  });

  return nodes.map((n) => ({ ...n, position: posMap.get(n.id) ?? n.position }));
}

// ─── Map API data → React Flow format ────────────────────────────────────────
export function buildFlowNodes(apiNodes: ApiStep[], nodeType = "kb-node"): Node<StepData>[] {
  return apiNodes.map((n) => ({
    id: n.id,
    type: nodeType,
    data: n.data,
    position: { x: 0, y: 0 }, // overwritten by dagre
  }));
}

export function buildFlowEdges(apiEdges: ApiEdge[]): Edge<EdgeData>[] {
  return apiEdges.map((e: ApiEdge) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "decision-edge",
    data: { label: e.label, answer: e.answer },
    markerEnd: { type: "arrowclosed" as const, color: CHROME.edgeStroke },
    style: { stroke: CHROME.edgeStroke, strokeWidth: 1.5 },
    // No edges get a unique sourceHandle per target so ReactFlow tracks each independently.
    // Multiple No edges share the same visual 'No' handle dot — they fan out from it.
    sourceHandle: e.answer === 'No' ? `No-${e.target}` : e.answer,
  })) as Edge<EdgeData>[];
}

// ─── Recompute node status from actual edge data ───────────────────────────
// Respects explicitly-set isTerminal (from _dt_is_terminal post meta via PHP).
// Nodes with outgoing edges are never terminal.
// Also tracks hasIncoming so DTNode can gate "Set as start" appropriately.
export function recomputeNodeStatuses(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Node<StepData>[] {
  const incomingSet = new Set(edges.map((e) => e.target));
  return nodes.map((n) => {
    const hasIncoming = incomingSet.has(n.id);
    const out = edges.filter((e) => e.source === n.id);
    const hasYes = out.some((e) => e.data?.answer === "Yes");
    const noEdges = out.filter((e) => e.data?.answer === "No");
    const hasNo = noEdges.length > 0;
    // TODO: rethink yes/no decision paths — see plans/decision-tree-plugin.md backlog.
    // Each No edge gets a unique sourceHandle `No-{targetId}` so ReactFlow tracks positions
    // independently. All No handles render from the same 'No' visual dot on the node.
    const sourceHandles: string[] = [
      ...(hasYes ? ['Yes'] : []),
      ...noEdges.map(e => (e.sourceHandle as string) || `No-${e.target}`),
    ];
    if (out.length > 0) {
      return {
        ...n,
        data: {
          ...n.data,
          isTerminal: false,
          linkStatus: hasYes && hasNo ? "complete" : "partial",
          hasIncoming,
          sourceHandles,
        },
      };
    }
    const isTerminal = !!n.data.isTerminal;
    return {
      ...n,
      data: {
        ...n.data,
        isTerminal,
        linkStatus: isTerminal ? "terminal" : "empty",
        hasIncoming,
        sourceHandles: [],
      },
    };
  });
}

// ─── Apply persisted positions ────────────────────────────────────────────────
// When a saved layout exists (from WP postmeta), apply those x/y values directly
// instead of running dagre. Nodes missing from the saved map keep their default position.
export function applySavedPositions(
  nodes: Node<StepData>[],
  savedPositions: Record<string, { x: number; y: number }>
): Node<StepData>[] {
  return nodes.map((n) => ({
    ...n,
    position: savedPositions[n.id] ?? n.position,
  }));
}

// ─── Orphan / root detection ──────────────────────────────────────────────────
// BFS from root; marks isOrphan + isRoot on every node.
export function computeReachability(nodes: Node<StepData>[], edges: Edge<EdgeData>[], rootNodeId: string | null): Node<StepData>[] {
  if (!rootNodeId) return nodes;
  const reachable = new Set();
  const queue = [rootNodeId];
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    edges.filter((e) => e.source === id).forEach((e) => queue.push(e.target));
  }
  return nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      isOrphan: !reachable.has(n.id),
      isRoot: n.id === rootNodeId,
    },
  }));
}
