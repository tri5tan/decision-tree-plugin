import { useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
} from 'reactflow';
import dagre from 'dagre';
import ViewerNode from './ViewerNode';
import ViewerSidebar from './ViewerSidebar';
import { STATUS_COLORS } from './nodeStatus';
import { DEV_TREE } from './devData';
import { getNodeWidth, getNodeHeight, getRankSep, getNodeSep, getZoomBounds, getRootOffsets } from './tree-layout-config';

// ─── Dynamic height calculation ──────────────────────────────────────────────
function calculateNodeHeight(nodeData) {
  let height = 80; // Base: padding + icon row + title + handles

  // Question (italic box with background)
  if (nodeData.question) {
    height += 60; // ~60px for question box with padding
  }

  // Body content (HTML rendered, estimate by length)
  if (nodeData.content) {
    const textLength = nodeData.content.replace(/<[^>]*>/g, '').length;
    height += Math.ceil(textLength / 150) * 20; // ~20px per 150 chars
  }

  // Best practice callout
  if (nodeData.callout) {
    const calloutLength = nodeData.callout.length;
    height += 70 + Math.ceil(calloutLength / 200) * 15; // Header + wrapped text
  }

  // Legislation items
  if (nodeData.legislation?.length) {
    height += 40 + (nodeData.legislation.length * 30); // Header + ~30px per item
  }

  return height + 20; // Add 20px buffer
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ─── Custom edge (same as admin) ─────────────────────────────────────────────
function DecisionEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style }) {
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const lx = sourceX + (targetX - sourceX) * 0.75;
  const ly = sourceY + (targetY - sourceY) * 0.75;

  const isYes   = data?.answer === 'Yes';
  const bgColor = isYes ? '#eefaf2' : '#fef0f0';
  const border  = isYes ? '#2c6e49' : '#c0392b';
  const color   = isYes ? '#1a4d33' : '#8b1a1a';

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position:  'absolute',
            transform: `translate(-50%,-50%) translate(${lx}px,${ly}px)`,
            background: bgColor,
            border:    `1px solid ${border}`,
            color,
            padding:   '2px 8px',
            borderRadius: 10,
            fontSize:  11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {data?.label || data?.answer}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { 'viewer-node': ViewerNode };
const edgeTypes = { 'decision-edge': DecisionEdge };

// ─── Auto-layout via dagre ────────────────────────────────────────────────────
function applyDagreLayout(nodes, edges) {
  const graphNodeWidth = getNodeWidth();
  const graphRankSep = getRankSep();
  const graphNodeSep = getNodeSep();

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  // Balanced spacing for variable-height nodes
  g.setGraph({ rankdir: 'TB', ranksep: graphRankSep, nodesep: graphNodeSep });

  // Calculate dynamic height for each node
  nodes.forEach(n => {
    const height = clamp(calculateNodeHeight(n.data), getNodeHeight(), getNodeHeight() * 2);
    g.setNode(n.id, { width: graphNodeWidth, height });
  });
  
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    const height = clamp(calculateNodeHeight(n.data), getNodeHeight(), getNodeHeight() * 2);
    return { ...n, position: { x: pos.x - graphNodeWidth / 2, y: pos.y - height / 2 } };
  });
}

// ─── Map API data → React Flow format ────────────────────────────────────────
function buildFlowNodes(apiNodes) {
  return apiNodes.map(n => ({
    id:       n.id,
    type:     'viewer-node',
    data:     n.data,
    position: { x: 0, y: 0 },
  }));
}

function buildFlowEdges(apiEdges) {
  return apiEdges.map(e => ({
    id:       e.id,
    source:   e.source,
    target:   e.target,
    type:     'decision-edge',
    data:     { label: e.label, answer: e.answer },
    markerEnd: { type: 'arrowclosed', color: '#999' },
    style:     { stroke: '#999', strokeWidth: 1.5 },
  }));
}

// ─── Node status computation ──────────────────────────────────────────────────
function recomputeNodeStatuses(nodes, edges) {
  const incomingSet = new Set(edges.map(e => e.target));
  return nodes.map(n => {
    const hasIncoming = incomingSet.has(n.id);
    const out    = edges.filter(e => e.source === n.id);
    const hasYes = out.some(e => e.data?.answer === 'Yes');
    const hasNo  = out.some(e => e.data?.answer === 'No');
    if (out.length > 0) {
      return { ...n, data: { ...n.data, isTerminal: false, linkStatus: hasYes && hasNo ? 'complete' : 'partial', hasIncoming } };
    }
    const isTerminal = !!n.data.isTerminal;
    return { ...n, data: { ...n.data, isTerminal, linkStatus: isTerminal ? 'terminal' : 'empty', hasIncoming } };
  });
}

// ─── Orphan / root detection ──────────────────────────────────────────────────
function computeReachability(nodes, edges, rootNodeId) {
  if (!rootNodeId) return nodes;
  const reachable = new Set();
  const queue     = [rootNodeId];
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    edges.filter(e => e.source === id).forEach(e => queue.push(e.target));
  }
  return nodes.map(n => ({
    ...n,
    data: { ...n.data, isOrphan: !reachable.has(n.id), isRoot: n.id === rootNodeId },
  }));
}

// ─── View-only Tree Component ─────────────────────────────────────────────────
export default function TreeViewer({ initialModuleId }) {
  const IS_DEV  = !window.dtViewer?.restUrl;  // true when running via `npm run dev`
  const { restUrl } = window.dtViewer || {};

  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    if (!initialModuleId && !IS_DEV) return;
    
    setLoading(true);
    setError(null);

    const loadData = IS_DEV
      ? Promise.resolve(DEV_TREE)
      : fetch(restUrl + 'tree/' + initialModuleId).then(r => r.json());

    loadData
      .then(data => {
        if (data.code) throw new Error(data.message);

        const flowNodes = buildFlowNodes(data.nodes);
        const flowEdges = buildFlowEdges(data.edges);
        const laid      = applyDagreLayout(flowNodes, flowEdges);
        const statused  = recomputeNodeStatuses(laid, flowEdges);

        // Determine root node
        const incomingIds = new Set(flowEdges.map(e => e.target));
        const autoRoot    = flowNodes.find(n => !incomingIds.has(n.id))?.id || flowNodes[0]?.id || null;
        const rootId      = data.rootNodeId || autoRoot;

        setNodes(computeReachability(statused, flowEdges, rootId));
        setEdges(flowEdges);
      })
      .catch(e => setError(e.message || 'Could not load tree.'))
      .finally(() => setLoading(false));
  }, [initialModuleId, IS_DEV, restUrl]);

  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0) return;

    const rootNode = nodes.find((n) => n.data?.isRoot);
    if (!rootNode) return;

    const { x, y } = rootNode.position;
    const { minZoom, maxZoom } = getZoomBounds();
    const currentZoom = reactFlowInstance.getZoom();
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));

    reactFlowInstance.setViewport({
      x: -x + 160,
      y: -y + getRootOffsets().y,
      zoom: clampedZoom,
    });
  }, [reactFlowInstance, nodes]);

  const handleNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const outgoingEdges = selectedNode 
    ? edges.filter(e => e.source === selectedNode.id)
    : [];

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      // minHeight: 400,
      background: '#fafafa',
      fontFamily: 'Roboto, sans-serif',
      display: 'flex',
    }}>
      {loading && (
        <div style={{
          position: 'absolute', 
          inset: 0, 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(250,250,250,0.9)', 
          zIndex: 10, 
          fontSize: 14,
          color: '#666',
        }}>
          Loading decision tree…
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute', 
          top: 20, 
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fde8e8', 
          padding: '12px 20px', 
          borderRadius: 6,
          color: '#c0392b', 
          fontSize: 14, 
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          {error}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={getZoomBounds().minZoom}
        maxZoom={getZoomBounds().maxZoom}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={handleNodeClick}
        onInit={(instance) => setReactFlowInstance(instance)}
        panOnScroll={true}
        zoomOnScroll={true}
        style={{ 
          flex: 1,
        }}
      >
        <Background color="#ddd" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => STATUS_COLORS[n.data?.isOrphan ? 'orphan' : n.data?.isRoot ? 'start' : n.data?.linkStatus] || '#888'}
          style={{ background: '#fff', border: '1px solid #ddd' }}
        />
      </ReactFlow>

      {/* Sidebar panel */}
      {selectedNode && (
        <ViewerSidebar
          node={selectedNode}
          outgoingEdges={outgoingEdges}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
