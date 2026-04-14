import { useState, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import ViewerNode from './ViewerNode';
import ViewerSidebar from './ViewerSidebar';
import DecisionEdge from './DecisionEdge';
import { STATUS_COLORS, CHROME } from '../config/theme';
import { getZoomBounds, getFitLevels } from '../config/tree-layout-config';
import { getNodesInFirstNLevels } from '../utils/graphUtils';
import useTreeViewerLoader from '../hooks/useTreeViewerLoader';
import type { Node } from 'reactflow';
import type { StepData } from '../types';

const nodeTypes = { 'viewer-node': ViewerNode };
const edgeTypes = { 'decision-edge': DecisionEdge };

// ─── View-only Tree Component ─────────────────────────────────────────────────
export default function TreeViewer({ initialModuleId }: { initialModuleId: number }) {
  const IS_DEV  = !window.dtViewer?.restUrl;
  const { restUrl = '' } = window.dtViewer || {};

  const { nodes, edges, loading, error, moduleTitle } = useTreeViewerLoader({
    moduleId: initialModuleId,
    IS_DEV,
    restUrl: restUrl ? restUrl.replace(/\/?$/, '/') : '',
  });

  const [selectedNode, setSelectedNode] = useState<Node<StepData> | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Track whether we've already fitted view for this module to avoid repeated resets
  const hasFittedRef = useRef(false);
  const fittedModuleRef = useRef<string | null>(null);

  // Auto fitView on first load per module — same as editor
  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0) return;

    const rootNode = nodes.find((n) => (n as any).data?.isRoot);
    if (!rootNode) return;

    const treeKey = `viewer-${initialModuleId}`;
    if (fittedModuleRef.current !== treeKey) {
      hasFittedRef.current = false;
      fittedModuleRef.current = treeKey;
    }

    if (hasFittedRef.current) return;
    hasFittedRef.current = true;

    const levels = getFitLevels();
    const subset = getNodesInFirstNLevels(nodes, edges, rootNode.id, levels);

    setTimeout(() => {
      reactFlowInstance.fitView({
        nodes: subset.length > 0 ? subset : undefined,
        padding: 0.25,
        minZoom: getZoomBounds().fitMinZoom,
        maxZoom: getZoomBounds().fitMaxZoom,
        duration: 350,
      });
    }, 80);
  }, [reactFlowInstance, nodes, edges, initialModuleId]);

  const handleNodeClick = (_event: React.MouseEvent, node: Node<StepData>) => {
    setSelectedNode(node);
  };

  const outgoingEdges = selectedNode 
    ? edges.filter(e => e.source === selectedNode.id)
    : [];

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      minHeight: 500,
      background: CHROME.panelBg,
      fontFamily: 'Roboto, sans-serif',
      display: 'flex',
      position: 'relative',
    }}>
      {/* Module title overlay — top-left of canvas, no background */}
      {moduleTitle && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 16,
            fontSize: 15,
            fontWeight: 700,
            color: CHROME.textStrong,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {moduleTitle}
        </div>
      )}
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
        minZoom={getZoomBounds().minZoom}
        maxZoom={getZoomBounds().maxZoom}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={handleNodeClick}
        onInit={(instance: any) => setReactFlowInstance(instance)}
        style={{ 
          flex: 1,
        }}
      >
        <Background color={CHROME.canvasGrid} gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n: { data?: { isOrphan?: boolean; isRoot?: boolean; linkStatus?: string } }) =>
            STATUS_COLORS[(n.data?.isOrphan ? 'orphan' : n.data?.isRoot ? 'start' : n.data?.linkStatus) as keyof typeof STATUS_COLORS] || '#888'
          }
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
