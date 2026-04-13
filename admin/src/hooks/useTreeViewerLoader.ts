import { useState, useEffect } from 'react';
import { useNodesState, useEdgesState } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import { DEV_TREE } from '../dev/devData';
import {
  applyDagreLayout,
  buildFlowNodes,
  buildFlowEdges,
  recomputeNodeStatuses,
  computeReachability,
} from '../utils/graphUtils';
import type { StepData, EdgeData } from '../types';

interface Options {
  moduleId: number | string;
  IS_DEV: boolean;
  restUrl: string;
}

/**
 * Read-only tree data loader for TreeViewer.
 * Fetches, builds, lays out, and computes node status + reachability.
 * Orphan nodes (unreachable from root) are filtered out — they're an
 * authoring concern and irrelevant to end users.
 */
export default function useTreeViewerLoader({ moduleId, IS_DEV, restUrl }: Options): {
  nodes: Node<StepData>[];
  edges: Edge<EdgeData>[];
  loading: boolean;
  error: string | null;
} {
  const [nodes, setNodes] = useNodesState<StepData>([]);
  const [edges, setEdges] = useEdgesState<EdgeData>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!moduleId && !IS_DEV) return;

    setLoading(true);
    setError(null);

    const loadData = IS_DEV
      ? Promise.resolve(DEV_TREE)
      : fetch(restUrl + 'tree/' + moduleId).then(r => r.json());

    loadData
      .then(data => {
        if (data.code) throw new Error(data.message);

        const flowNodes = buildFlowNodes(data.nodes, 'viewer-node');
        const flowEdges = buildFlowEdges(data.edges);
        const laid      = applyDagreLayout(flowNodes, flowEdges);
        const statused  = recomputeNodeStatuses(laid, flowEdges);

        const incomingIds = new Set(flowEdges.map(e => e.target));
        const autoRoot    = flowNodes.find(n => !incomingIds.has(n.id))?.id || flowNodes[0]?.id || null;
        const rootId      = data.rootNodeId || autoRoot;

        const withReachability = computeReachability(statused, flowEdges, rootId);

        // Filter orphans — unreachable nodes are an authoring issue, not shown to end users
        const orphanIds    = new Set(withReachability.filter(n => n.data?.isOrphan).map(n => n.id));
        const visibleNodes = withReachability.filter(n => !n.data?.isOrphan);
        const visibleEdges = flowEdges.filter(e => !orphanIds.has(e.source) && !orphanIds.has(e.target));

        setNodes(visibleNodes);
        setEdges(visibleEdges);
      })
      .catch(e => setError(e.message || 'Could not load tree.'))
      .finally(() => setLoading(false));
  }, [moduleId, IS_DEV, restUrl]);

  return { nodes, edges, loading, error };
}
