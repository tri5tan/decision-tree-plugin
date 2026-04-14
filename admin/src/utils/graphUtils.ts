import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import { getNodeWidth, getNodeHeight, getRankSep, getNodeSep } from "../config/tree-layout-config";
import { CHROME } from "../config/theme";
import type { StepData, EdgeData, ApiStep, ApiEdge } from "../types";

/**
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

// ─── Auto-layout via dagre ────────────────────────────────────────────────────
export function applyDagreLayout(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Node<StepData>[] {
  const graphNodeWidth = getNodeWidth();
  const graphNodeHeight = getNodeHeight();
  const graphRankSep = getRankSep();
  const graphNodeSep = getNodeSep();

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: graphRankSep, nodesep: graphNodeSep });

  nodes.forEach((n) => g.setNode(n.id, { width: graphNodeWidth, height: graphNodeHeight }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const laidOut = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - graphNodeWidth / 2, y: pos.y - graphNodeHeight / 2 },
    };
  });

  return enforceSingleChildCentered(enforceYesLeftNoRight(laidOut, edges), edges);
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
 * BFS from startId, returning a Set of all descendant IDs (including startId).
 */
function getSubtreeIds(startId: string, childrenMap: Map<string, string[]>): Set<string> {
  const visited: Set<string> = new Set();
  const queue: string[] = [startId];
  while (queue.length) {
    const id: string = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    (childrenMap.get(id) || []).forEach((c: string) => queue.push(c));
  }
  return visited;
}

/**
 * Post-process dagre positions so that for any node with both a Yes and No
 * outgoing edge, the Yes subtree is always to the left and the No subtree is
 * always to the right.
 *
 * Shifts the ENTIRE subtree of each child, not just the child node itself, so
 * the whole branch moves together. Processed top-to-bottom so parent-level
 * swaps propagate cleanly before children are adjusted.
 *
 * Fallback: if the two subtrees share any nodes (convergent paths), the swap
 * for that parent is skipped. If answer values are not "Yes"/"No", dagre's
 * natural order (= repeater row order) is kept.
 */
function enforceYesLeftNoRight(nodes: Node<StepData>[], edges: Edge<EdgeData>[]): Node<StepData>[] {
  const posMap = new Map(nodes.map((n) => [n.id, n.position]));
  const childrenMap = buildChildrenMap(edges);

  // Group outgoing edges by source, sorted top-to-bottom
  const outgoing = new Map<string, Edge<EdgeData>[]>();
  edges.forEach((e) => {
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    outgoing.get(e.source )?.push(e);
  });

  const sortedSources = [...outgoing.keys()].sort(
    (a, b) => (posMap.get(a)?.y ?? 0) - (posMap.get(b)?.y ?? 0)
  );

  sortedSources.forEach((sourceId) => {
    const outEdges = outgoing.get(sourceId);
    const yesEdge = outEdges?.find((e) => e.data?.answer === "Yes") || null;
    const noEdge  = outEdges?.find((e) => e.data?.answer === "No") || null;

    if (!yesEdge || !noEdge) return;

    const yesPos = posMap.get(yesEdge.target);
    const noPos  = posMap.get(noEdge.target);
    if (!yesPos || !noPos) return;
    if (yesPos.x <= noPos.x) return; // already correct

    const yesSubtree = getSubtreeIds(yesEdge.target, childrenMap);
    const noSubtree  = getSubtreeIds(noEdge.target,  childrenMap);

    // If the subtrees share nodes (converging paths), skip — can't safely swap
    if ([...yesSubtree].some((id) => noSubtree.has(id))) return;

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

    getSubtreeIds(childId, childrenMap).forEach((id) => {
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
  })) as Edge<EdgeData>[];
  // }));
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
    const hasNo = out.some((e) => e.data?.answer === "No");
    if (out.length > 0) {
      return {
        ...n,
        data: {
          ...n.data,
          isTerminal: false,
          linkStatus: hasYes && hasNo ? "complete" : "partial",
          hasIncoming,
        },
      };
    }
    // No outgoing edges — only terminal if explicitly set by user
    const isTerminal = !!n.data.isTerminal;
    return {
      ...n,
      data: {
        ...n.data,
        isTerminal,
        linkStatus: isTerminal ? "terminal" : "empty",
        hasIncoming,
      },
    };
  });
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
