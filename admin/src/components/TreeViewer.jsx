import { useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import ViewerNode from './ViewerNode';
import ViewerSidebar from './ViewerSidebar';
import DecisionEdge from './DecisionEdge';
import { STATUS_COLORS, CHROME } from '../config/theme';
import { getZoomBounds, getRootOffsets } from '../config/tree-layout-config';
import useTreeViewerLoader from '../hooks/useTreeViewerLoader';

const nodeTypes = { 'viewer-node': ViewerNode };
const edgeTypes = { 'decision-edge': DecisionEdge };

// ─── View-only Tree Component ─────────────────────────────────────────────────
export default function TreeViewer({ initialModuleId }) {
  const IS_DEV  = !window.dtViewer?.restUrl;
  const { restUrl } = window.dtViewer || {};

  const { nodes, edges, loading, error } = useTreeViewerLoader({
    moduleId: initialModuleId,
    IS_DEV,
    restUrl,
  });

  const [selectedNode, setSelectedNode] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

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
      background: CHROME.panelBg,
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
          color: CHROME.textMuted,
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
          background: CHROME.errorBg, 
          padding: '12px 20px', 
          borderRadius: 6,
          color: STATUS_COLORS.orphan, 
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
        fitViewOptions={{ padding: 0.2, minZoom: getZoomBounds().fitMinZoom, maxZoom: getZoomBounds().fitMaxZoom }}
        minZoom={getZoomBounds().minZoom}
        maxZoom={getZoomBounds().maxZoom}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={handleNodeClick}
        onInit={(instance) => setReactFlowInstance(instance)}
        style={{ 
          flex: 1,
        }}
      >
        <Background color={CHROME.canvasGrid} gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={n => STATUS_COLORS[n.data?.isOrphan ? 'orphan' : n.data?.isRoot ? 'start' : n.data?.linkStatus] || '#888'}
          style={{ background: CHROME.cardBg, border: `1px solid ${CHROME.panelBorder}` }}
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
