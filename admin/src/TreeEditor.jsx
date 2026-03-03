import { useState, useEffect, useCallback, useRef, memo, createContext, useContext } from 'react';

// Passes callbacks down to custom node components without re-creating nodeTypes
const NodeCallbacks = createContext({});
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  EdgeLabelRenderer,
  getSmoothStepPath,
  BaseEdge,
} from 'reactflow';
import dagre from 'dagre';
import NodeSidebar from './NodeSidebar';
import { STATUS_COLORS, STATUS_META } from './nodeStatus';
import { DEV_MODULES, DEV_TREE, DEV_MODULE_ID } from './devData';

// ─── Layout constants ────────────────────────────────────────────────────────
const NODE_W = 260;
const NODE_H = 200; // dagre spacing estimate — nodes themselves expand freely to fit content

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n - 1) + '\u2026' : (str || '');
}

// ─── Status chip (used in sidebar legend only) ───────────────────────────────
function StatusChip({ status }) {
  const s = STATUS_META[status] || STATUS_META.empty;
  return (
    <span style={{
      fontSize: 10, background: s.bg, color: s.color,
      borderRadius: 10, padding: '2px 8px',
      fontWeight: 700, border: `1px solid ${s.color}44`,
      whiteSpace: 'nowrap',
    }}>
      {s.icon} {s.label}
    </span>
  );
}


// Leave these changes I made to the badge. I want simple. 
function Badge({ children, color = '#666' }) {
  return (
    <span className='badge' style={{
      // background:   color + '18',
      // border:       `1px solid ${color}44`,
      // color,
      background: '#deffe1',
      color: '#404040',
      borderRadius: 3,
      // padding:      '1px 7px',
      padding: '2px 6px 2px 4px',
      fontSize:     10,
      // lineHeight:   1.5,       
      whiteSpace:   'nowrap',
      fontWeight:   600,
    }}>
      {children}
    </span>
  );
}

// ─── Custom node ─────────────────────────────────────────────────────────────
const KBNode = memo(function KBNode({ id, data, selected }) {
  const [hovered, setHovered]  = useState(false);
  const { onMarkTerminal, onSetStart, onClearStart } = useContext(NodeCallbacks);

  const statusKey = data.isOrphan ? 'orphan'
    : data.isRoot   ? 'start'
    : data.linkStatus;

  const accentColor = STATUS_COLORS[statusKey] || '#888';
  const icon = STATUS_META[statusKey] || STATUS_META.empty;

  // Determine which actions are possible for this node type
  // (used to pre-allocate footer space so the node size never changes on hover)
  const couldMarkEnd     = statusKey === 'empty';
  const couldSetStart    = statusKey !== 'start' && !data.hasIncoming;
  const couldRemoveStart = statusKey === 'start';
  const hasActions       = couldMarkEnd || couldSetStart || couldRemoveStart;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   '#fff',
        color:        '#1a1a1a',
        borderRadius: 6,
        padding:      '10px 12px',
        width:         NODE_W,
        boxSizing:    'border-box',
        // Avoid border shorthand — it clobbers borderLeft when React Flow
        // toggles the selected state. Set each side individually instead.
        borderTop:    statusKey === 'orphan' ? '2px dashed #c0392b' : `2px solid ${selected ? accentColor : '#e5e7eb'}`,
        borderRight:  statusKey === 'orphan' ? '2px dashed #c0392b' : `2px solid ${selected ? accentColor : '#e5e7eb'}`,
        borderBottom: statusKey === 'orphan' ? '2px dashed #c0392b' : `2px solid ${selected ? accentColor : '#e5e7eb'}`,
        borderLeft:   statusKey === 'orphan' ? `4px dashed #c0392b` : `4px solid ${accentColor}`,
        boxShadow:    '0 1px 4px rgba(0,0,0,0.08)',
        cursor:       'pointer',
        // fontFamily:   'inherit',
        fontFamily: "Roboto, sans-serif",
        fontOpticalSizing: 'auto',
        fontWeight: 400,
        fontStyle: 'normal',
        position:     'relative',
        paddingBottom: hasActions ? 34 : 10,
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ width: 10, height: 10, background: '#ddd', border: '2px solid #aaa', top: -5 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ width: 10, height: 10, background: '#ddd', border: '2px solid #aaa', bottom: -5 }} />

      {/* Status icon row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: icon.color, fontWeight: 700, lineHeight: 1, userSelect: 'none' }}>
          {icon.icon}
        </span>
        {statusKey === 'start' && (
          <span style={{ fontSize: 9, background: '#2c6e49', color: '#fff', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>
            START
          </span>
        )}
      </div>

      {/* Step title */}
      <div className='title' style={{ 
        fontFamily: "Roboto, sans-serif",
        fontOpticalSizing: 'auto',
        fontWeight: 600,
        fontStyle: 'normal', 
        fontSize: 12, 
        lineHeight: 1.35, 
        marginBottom: 5, 
        // color: '#111' 
        color: '#404040',
        }}>
        {data.label}
      </div>

      {/* Question snippet */}
      {data.question && (
        <div style={{
          fontSize: 11, color: '#555', fontStyle: 'italic',
          lineHeight: 1.35, marginBottom: 6,
          borderLeft: '2px solid #e5e7eb', paddingLeft: 6,
        }}>
          {data.question}
        </div>
      )}

      {/* Body snippet */}
      {data.content && (
        <div style={{
          fontSize: 11, color: '#666',
          lineHeight: 1.35, marginBottom: 6,
          borderLeft: '2px solid #e5e7eb', paddingLeft: 6,
        }}>
          {truncate(data.content.replace(/<[^>]+>/g, ''), 80)}
        </div>
      )}

      {/* Footer badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
        {data.legislation?.length > 0 && (
          <Badge color="#6366f1">⚖ {data.legislation.length}</Badge>
        )}
        {data.callout && (
          <Badge color="#0891b2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 3, marginBottom: 1 }}>
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
            </svg>
            Best practise
          </Badge>
        )}
      </div>

      {/* Action buttons — always in DOM when relevant so no gap can break hover.
          Buttons sit inside the card's pre-allocated footer zone.
          visibility keeps the space reserved; no size jump on hover. */}
      {hasActions && (
        <div style={{
          position: 'absolute', bottom: 8, left: 8, right: 8,
          display: 'flex', gap: 5, justifyContent: 'center',
          visibility: hovered ? 'visible' : 'hidden',
        }}>
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
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onSetStart?.(id); }}
              style={{
                background: '#2c6e49', color: '#fff', border: 'none',
                borderRadius: 10, padding: '3px 10px', fontSize: 10,
                fontWeight: 700, cursor: 'pointer', lineHeight: 1.6,
              }}
            >
              ▶ Set as start
            </button>
          )}
          {couldMarkEnd && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onMarkTerminal?.(id); }}
              style={{
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: 10, padding: '3px 10px', fontSize: 10,
                fontWeight: 700, cursor: 'pointer', lineHeight: 1.6,
              }}
            >
              ■ Mark as end
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Custom edge ─────────────────────────────────────────────────────────────
// Positions label at 75% toward target so Yes/No labels don't overlap at source
function DecisionEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd, style }) {
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  // Place label 75% of the way from source to target (near the arrowhead)
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

const nodeTypes = { 'kb-node': KBNode };
const edgeTypes = { 'decision-edge': DecisionEdge };

// ─── Auto-layout via dagre ────────────────────────────────────────────────────
function applyDagreLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 });

  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

// ─── Map API data → React Flow format ────────────────────────────────────────
function buildFlowNodes(apiNodes) {
  return apiNodes.map(n => ({
    id:       n.id,
    type:     'kb-node',     // uses KBNode custom component
    data:     n.data,
    position: { x: 0, y: 0 }, // overwritten by dagre
  }));
}

function buildFlowEdges(apiEdges) {
  return apiEdges.map(e => ({
    id:       e.id,
    source:   e.source,
    target:   e.target,
    type:     'decision-edge', // uses DecisionEdge custom component
    data:     { label: e.label, answer: e.answer },
    markerEnd: { type: 'arrowclosed', color: '#999' },
    style:     { stroke: '#999', strokeWidth: 1.5 },
  }));
}

// ─── Recompute node status from actual edge data ───────────────────────────
// Respects explicitly-set isTerminal (from _ct_is_terminal post meta via PHP).
// Nodes with outgoing edges are never terminal.
// Also tracks hasIncoming so KBNode can gate "Set as start" appropriately.
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
    // No outgoing edges — only terminal if explicitly set by user
    const isTerminal = !!n.data.isTerminal;
    return { ...n, data: { ...n.data, isTerminal, linkStatus: isTerminal ? 'terminal' : 'empty', hasIncoming } };
  });
}

// ─── Orphan / root detection ──────────────────────────────────────────────────
// BFS from root; marks isOrphan + isRoot on every node.
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function TreeEditor({ initialModuleId }) {
  const IS_DEV  = !window.ctDT?.restUrl;  // true when running via `npm run dev`
  const { restUrl, editPostUrl, subModulesUrl } = window.ctDT || {};

  const [modules,      setModules]      = useState([]);
  const [moduleId,     setModuleId]     = useState(IS_DEV ? DEV_MODULE_ID : initialModuleId);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [pendingConn,  setPendingConn]  = useState(null);
  const [connSaving,   setConnSaving]   = useState(false);
  const [addingNode,   setAddingNode]   = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [creatingNode, setCreatingNode] = useState(false);

  // Drag-to-blank-space → create + connect flow
  const connectHandled     = useRef(false);         // true when onConnect fires (node→node)
  const pendingConnSrc     = useRef(null);           // source nodeId from onConnectStart
  const [pendingDragToNew, setPendingDragToNew] = useState(null); // { sourceNodeId }
  const [dragNewTitle,     setDragNewTitle]     = useState('');
  const [dragNewSaving,    setDragNewSaving]    = useState(false);
  const [rootNodeId,       setRootNodeId]       = useState(null);

  // Fetch module list for the dropdown (requires editor login).
  useEffect(() => {
    if (IS_DEV) { setModules(DEV_MODULES); return; }
    fetch(restUrl + 'modules', {
      headers: { 'X-WP-Nonce': window.ctDT?.nonce || '' },
    })
      .then(r => r.json())
      .then(setModules)
      .catch(() => setError('Could not fetch module list.'));
  }, []);

  // Fetch + layout tree whenever moduleId changes.
  useEffect(() => {
    if (!moduleId) return;
    setLoading(true);
    setError(null);
    setSelectedNode(null);

    const loadData = IS_DEV
      ? Promise.resolve(DEV_TREE)
      : fetch(restUrl + 'tree/' + moduleId).then(r => r.json());

    loadData
      .then(data => {
        if (data.code) throw new Error(data.message);

        const flowNodes = buildFlowNodes(data.nodes);
        const flowEdges = buildFlowEdges(data.edges);
        const laid      = applyDagreLayout(flowNodes, flowEdges);
        const statused  = recomputeNodeStatuses(laid, flowEdges);

        // Use rootNodeId from PHP meta if set; otherwise auto-detect from edges
        // (first node that has no incoming edges = natural root)
        const incomingIds = new Set(flowEdges.map(e => e.target));
        const autoRoot    = flowNodes.find(n => !incomingIds.has(n.id))?.id || flowNodes[0]?.id || null;
        const rootId      = data.rootNodeId || autoRoot;
        setRootNodeId(rootId);

        setNodes(computeReachability(statused, flowEdges, rootId));
        setEdges(flowEdges);
      })
      .catch(e => setError(e.message || 'Could not load tree.'))
      .finally(() => setLoading(false));
  }, [moduleId]);

  // Recompute orphan / isRoot + hasIncoming whenever edges or root changes
  useEffect(() => {
    if (!rootNodeId) return;
    setNodes(prev => {
      const incomingSet = new Set(edges.map(e => e.target));
      const withIncoming = prev.map(n => ({ ...n, data: { ...n.data, hasIncoming: incomingSet.has(n.id) } }));
      return computeReachability(withIncoming, edges, rootNodeId);
    });
  }, [edges, rootNodeId]);

  const onNodeClick = useCallback((_, node) => {
    // Attach outgoing edges so the sidebar can show Yes/No path labels
    const outgoing = edges.filter(e => e.source === node.id);
    setSelectedNode({ ...node, outgoingEdges: outgoing });
  }, [edges]);

  // Called by NodeSidebar after a successful save — updates the node in state
  const onUpdateNode = useCallback((nodeId, patch) => {
    setNodes(prev => prev.map(n =>
      n.id !== nodeId ? n : { ...n, data: { ...n.data, ...patch } }
    ));
    setSelectedNode(prev =>
      prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...patch } } : prev
    );
  }, []);

  // Called by NodeSidebar after a decision label is saved
  const onUpdateEdge = useCallback((edgeId, patch) => {
    setEdges(prev => prev.map(e =>
      e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e
    ));
    setSelectedNode(prev => prev ? {
      ...prev,
      outgoingEdges: prev.outgoingEdges?.map(e =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e
      ),
    } : prev);
  }, []);

  // Track which node the drag started from
  const onConnectStart = useCallback((_, { nodeId }) => {
    pendingConnSrc.current   = nodeId;
    connectHandled.current   = false;
  }, []);

  // Fires when user drags a connection onto an existing node
  const onConnect = useCallback((params) => {
    connectHandled.current = true;           // mark as handled — suppress drag-to-new
    setPendingConn({ source: params.source, target: params.target });
  }, []);

  // Fires when drag ends — if onConnect didn't fire the drop was on blank space
  const onConnectEnd = useCallback((event) => {
    const srcId = pendingConnSrc.current;
    pendingConnSrc.current = null;
    if (connectHandled.current) { connectHandled.current = false; return; }
    if (!srcId) return;
    // Dropped on empty canvas — open create+connect dialog
    setPendingDragToNew({ sourceNodeId: srcId });
    setDragNewTitle('');
  }, []);

  // Removes an edge from state and from the ACF decisions repeater in WP
  const deleteEdge = useCallback(async (edgeId, answer, sourceNodeId) => {
    const srcPostId = sourceNodeId.replace('sm-', '');
    try {
      if (!IS_DEV) {
        await fetch(`${restUrl}node/${srcPostId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ disconnect: { answer } }),
        });
      }
      setEdges(prev => {
        const updated  = prev.filter(e => e.id !== edgeId);
        const remaining = updated.filter(e => e.source === sourceNodeId);
        const hasYes   = remaining.some(e => e.data?.answer === 'Yes');
        const hasNo    = remaining.some(e => e.data?.answer === 'No');
        const hasQ     = !!nodes.find(n => n.id === sourceNodeId)?.data?.question;
        const newStatus = remaining.length === 0
          ? (hasQ ? 'terminal' : 'empty')
          : (hasYes && hasNo ? 'complete' : 'partial');
        setNodes(ns => ns.map(n =>
          n.id === sourceNodeId
            ? { ...n, data: { ...n.data, linkStatus: newStatus, isTerminal: newStatus === 'terminal' } }
            : n
        ));
        return updated;
      });
      setSelectedNode(prev => prev ? {
        ...prev,
        outgoingEdges: (prev.outgoingEdges || []).filter(e => e.id !== edgeId),
      } : prev);
    } catch (e) {
      console.error('Delete edge failed', e);
    }
  }, [IS_DEV, restUrl, nodes]);

  // Creates a node AND immediately connects it to sourceNodeId with the chosen answer
  const confirmDragToNew = async (answer) => {
    if (!pendingDragToNew || !dragNewTitle.trim()) return;
    setDragNewSaving(true);
    const { sourceNodeId } = pendingDragToNew;
    const srcPostId = sourceNodeId.replace('sm-', '');
    try {
      let newPostId, newNodeId;
      if (IS_DEV) {
        newPostId = Date.now();
        newNodeId = `sm-dev-${newPostId}`;
      } else {
        const r1 = await fetch(`${restUrl}nodes`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ title: dragNewTitle.trim(), module_id: moduleId }),
        });
        if (!r1.ok) throw new Error('Failed to create node');
        const nodeData = await r1.json();
        newNodeId = nodeData.id;
        newPostId = nodeData.data.postId;

        await fetch(`${restUrl}node/${srcPostId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ connect: { answer, target_id: parseInt(newPostId, 10) } }),
        });
      }
      const maxY = nodes.reduce((acc, n) => Math.max(acc, n.position.y), 0);
      const newNode = {
        id: newNodeId, type: 'kb-node',
        position: { x: 80, y: maxY + NODE_H + 80 },
        data: { postId: newPostId, label: dragNewTitle.trim(), question: null, content: '', rawContent: '', callout: null, legislation: [], isTerminal: false, linkStatus: 'empty' },
      };
      setNodes(prev => [...prev, newNode]);
      const newEdge = {
        id: `e-${srcPostId}-${newPostId}-${answer.toLowerCase()}`,
        source: sourceNodeId, target: newNodeId,
        type: 'decision-edge', data: { label: answer, answer },
        markerEnd: { type: 'arrowclosed', color: '#999' },
        style: { stroke: '#999', strokeWidth: 1.5 },
      };
      setEdges(prev => {
        const updated = addEdge(newEdge, prev);
        const outgoing = updated.filter(e => e.source === sourceNodeId);
        const hasYes = outgoing.some(e => e.data?.answer === 'Yes');
        const hasNo  = outgoing.some(e => e.data?.answer === 'No');
        setNodes(ns => ns.map(nd =>
          nd.id === sourceNodeId
            ? { ...nd, data: { ...nd.data, linkStatus: hasYes && hasNo ? 'complete' : 'partial', isTerminal: false } }
            : nd
        ));
        return updated;
      });
      setPendingDragToNew(null);
      setDragNewTitle('');
    } catch (e) {
      console.error('Create + connect failed', e);
    } finally {
      setDragNewSaving(false);
    }
  };

  // Removes the explicit start designation — auto-detects new root from edges
  const clearStart = useCallback(async () => {
    try {
      if (!IS_DEV) {
        await fetch(`${restUrl}module/${moduleId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ start_node_id: null }),
        });
      }
      // Fall back to auto-detection: first node with no incoming edges
      const incomingSet = new Set(edges.map(e => e.target));
      const autoRoot    = nodes.find(n => !incomingSet.has(n.id))?.id || null;
      setRootNodeId(autoRoot);
      setNodes(prev => computeReachability(
        prev.map(n => ({ ...n, data: { ...n.data, isRoot: n.id === autoRoot } })),
        edges, autoRoot
      ));
      setSelectedNode(prev => prev ? { ...prev, data: { ...prev.data, isRoot: false } } : prev);
    } catch (e) {
      console.error('Clear start failed', e);
    }
  }, [IS_DEV, restUrl, moduleId, edges, nodes]);

  // Marks a node as the tree's start/entry node and persists to the module
  const setAsStart = useCallback(async (nodeId) => {
    try {
      if (!IS_DEV) {
        await fetch(`${restUrl}module/${moduleId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ start_node_id: nodeId }),
        });
      }
      setRootNodeId(nodeId);
      setNodes(prev => computeReachability(
        prev.map(n => ({ ...n, data: { ...n.data, isRoot: n.id === nodeId } })),
        edges, nodeId
      ));
      setSelectedNode(prev => prev?.id === nodeId
        ? { ...prev, data: { ...prev.data, isRoot: true } }
        : prev
      );
    } catch (e) {
      console.error('Set start node failed', e);
    }
  }, [IS_DEV, restUrl, moduleId, edges]);

  // Marks a node as a terminal / end-of-path node and persists to WP
  const markAsTerminal = useCallback(async (nodeId) => {
    const postId = nodeId.replace('sm-', '');
    try {
      if (!IS_DEV) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ is_terminal: true }),
        });
      }
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, isTerminal: true, linkStatus: 'terminal' } } : n
      ));
      setSelectedNode(prev => prev?.id === nodeId
        ? { ...prev, data: { ...prev.data, isTerminal: true, linkStatus: 'terminal' } }
        : prev
      );
    } catch (e) {
      console.error('Mark terminal failed', e);
    }
  }, [IS_DEV, restUrl]);

  // Removes the terminal/end designation from a node
  const unmarkTerminal = useCallback(async (nodeId) => {
    const postId = nodeId.replace('sm-', '');
    try {
      if (!IS_DEV) {
        await fetch(`${restUrl}node/${postId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ is_terminal: false }),
        });
      }
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, isTerminal: false, linkStatus: 'empty' } } : n
      ));
      setSelectedNode(prev => prev?.id === nodeId
        ? { ...prev, data: { ...prev.data, isTerminal: false, linkStatus: 'empty' } }
        : prev
      );
    } catch (e) {
      console.error('Unmark terminal failed', e);
    }
  }, [IS_DEV, restUrl]);

  // Deletes a node: trashes the WP post and removes it from the canvas
  const deleteNode = useCallback(async (nodeId) => {
    const postId = nodeId.replace('sm-', '');
    if (!window.confirm('Delete this step? This cannot be undone.')) return;
    try {
      if (!IS_DEV) {
        const res = await fetch(`${restUrl}node/${postId}`, {
          method:  'DELETE',
          headers: { 'X-WP-Nonce': window.ctDT?.nonce || '' },
        });
        if (!res.ok) throw new Error('Delete failed');
      }
      const sourcesAffected = edges.filter(e => e.target === nodeId).map(e => e.source);
      const newEdges        = edges.filter(e => e.source !== nodeId && e.target !== nodeId);

      // If we just deleted the start node, auto-detect a new one
      let newRoot = rootNodeId;
      if (nodeId === rootNodeId) {
        const incomingAfter = new Set(newEdges.map(e => e.target));
        const remaining     = nodes.filter(n => n.id !== nodeId);
        newRoot = remaining.find(n => !incomingAfter.has(n.id))?.id || remaining[0]?.id || null;
        setRootNodeId(newRoot);
        // Persist the new auto-detected root to PHP
        if (!IS_DEV && newRoot) {
          fetch(`${restUrl}module/${moduleId}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
            body: JSON.stringify({ start_node_id: newRoot }),
          }).catch(e => console.error('Auto-persist new root failed', e));
        }
      }

      setEdges(newEdges);
      setNodes(prev => {
        let updated = prev.filter(n => n.id !== nodeId);
        updated = updated.map(n => {
          if (!sourcesAffected.includes(n.id)) return n;
          const remaining = newEdges.filter(e => e.source === n.id);
          const hasYes    = remaining.some(e => e.data?.answer === 'Yes');
          const hasNo     = remaining.some(e => e.data?.answer === 'No');
          const hasQ      = !!n.data.question;
          const newStatus = remaining.length === 0
            ? (hasQ ? 'terminal' : 'empty')
            : (hasYes && hasNo ? 'complete' : 'partial');
          return { ...n, data: { ...n.data, linkStatus: newStatus, isTerminal: newStatus === 'terminal' } };
        });
        return computeReachability(updated, newEdges, newRoot);
      });
      setSelectedNode(null);
    } catch (e) {
      console.error('Delete node failed', e);
      alert('Could not delete step. Please try again.');
    }
  }, [IS_DEV, restUrl, moduleId, edges, nodes, rootNodeId]);

  // Creates a new sub-module WP post and drops it as an empty node on the canvas
  const createNode = async () => {
    if (!newNodeTitle.trim()) return;
    setCreatingNode(true);
    try {
      let nodeData;
      if (IS_DEV) {
        const fakeId = 'sm-dev-' + Date.now();
        nodeData = {
          id: fakeId,
          data: { postId: 0, label: newNodeTitle.trim(), question: null, content: '', rawContent: '', callout: null, legislation: [], isTerminal: false, linkStatus: 'empty' },
        };
      } else {
        const res = await fetch(`${restUrl}nodes`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ title: newNodeTitle.trim(), module_id: moduleId }),
        });
        nodeData = await res.json();
      }
      const maxY = nodes.reduce((acc, n) => Math.max(acc, n.position.y), 0);
      setNodes(prev => [...prev, {
        id:       nodeData.id,
        type:     'kb-node',
        data:     nodeData.data,
        position: { x: 80, y: maxY + NODE_H + 80 },
      }]);
      setNewNodeTitle('');
      setAddingNode(false);
    } catch (e) {
      console.error('Create node failed', e);
    } finally {
      setCreatingNode(false);
    }
  };

  const confirmConnect = async (answer) => {
    if (!pendingConn) return;
    const sourcePostId = pendingConn.source.replace('sm-', '');
    const targetPostId = parseInt(pendingConn.target.replace('sm-', ''), 10);
    setConnSaving(true);
    try {
      if (!IS_DEV) {
        const res = await fetch(`${restUrl}node/${sourcePostId}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.ctDT?.nonce || '' },
          body: JSON.stringify({ connect: { answer, target_id: targetPostId } }),
        });
        if (!res.ok) throw new Error('Server error');
      }
      const newEdgeObj = {
        id:        `e-${sourcePostId}-${targetPostId}-${answer.toLowerCase()}`,
        source:    pendingConn.source,
        target:    pendingConn.target,
        type:      'decision-edge',
        data:      { label: answer, answer },
        markerEnd: { type: 'arrowclosed', color: '#999' },
        style:     { stroke: '#999', strokeWidth: 1.5 },
      };
      setEdges(prev => {
        const updated = addEdge(newEdgeObj, prev);
        // Recompute source node colour immediately
        const outgoing = updated.filter(e => e.source === pendingConn.source);
        const hasYes = outgoing.some(e => e.data?.answer === 'Yes');
        const hasNo  = outgoing.some(e => e.data?.answer === 'No');
        setNodes(ns => ns.map(nd =>
          nd.id === pendingConn.source
            ? { ...nd, data: { ...nd.data, linkStatus: hasYes && hasNo ? 'complete' : 'partial', isTerminal: false } }
            : nd
        ));
        return updated;
      });
      setPendingConn(null);
    } catch (e) {
      console.error('Connect failed', e);
    } finally {
      setConnSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <NodeCallbacks.Provider value={{ onMarkTerminal: markAsTerminal, onSetStart: setAsStart, onUnmarkTerminal: unmarkTerminal, onClearStart: clearStart }}>
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: '#f0f0f1' }}>

      {/* ── Left panel: module selector + legend ── */}
      <div style={{
        width: 240, padding: 16, borderRight: '1px solid #ddd',
        background: '#fafafa', flexShrink: 0, overflowY: 'auto',
      }}>
        <h2 style={{ marginTop: 0, fontSize: 14, fontWeight: 700 }}>Decision Tree Editor</h2>

        <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 12 }}>
          Module
        </label>
        <select
          value={moduleId}
          onChange={e => setModuleId(Number(e.target.value))}
          style={{ width: '100%', padding: '5px 6px', fontSize: 12, marginBottom: 20 }}
        >
          <option value={0}>— Select a module —</option>
          {modules.map(m => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>

        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Node status</p>
        {['start', 'complete', 'partial', 'empty', 'terminal', 'orphan'].map(key => (
          <div className='chip-box' key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <StatusChip status={key} />
          </div>
        ))}

        <hr style={{ margin: '16px 0', borderColor: '#ddd' }} />
        <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
          Click a node to inspect it. Fix issues by editing sub-modules directly.
        </p>
        {subModulesUrl && (
          <a href={subModulesUrl} style={{ fontSize: 12, color: '#2c6e49', display: 'block', marginBottom: 8 }}>
            ↗ All sub-modules
          </a>
        )}
        {moduleId > 0 && (
          <button
            onClick={() => { const cur = moduleId; setModuleId(0); setTimeout(() => setModuleId(cur), 50); }}
            style={{ fontSize: 11, color: '#888', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
          >
            ↺ Reload tree
          </button>
        )}

        <hr style={{ margin: '16px 0', borderColor: '#ddd' }} />
        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Add a step</p>
        {!addingNode ? (
          <button
            onClick={() => setAddingNode(true)}
            disabled={!moduleId}
            style={{ width: '100%', padding: '6px 0', background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: moduleId ? 'pointer' : 'not-allowed', opacity: moduleId ? 1 : 0.5 }}
          >
            + New step
          </button>
        ) : (
          <div>
            <input
              value={newNodeTitle}
              onChange={e => setNewNodeTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createNode()}
              placeholder="Step title…"
              autoFocus
              style={{ width: '100%', fontSize: 12, padding: '5px 6px', borderRadius: 3, border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                onClick={createNode}
                disabled={creatingNode || !newNodeTitle.trim()}
                style={{ flex: 1, padding: '5px 0', background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 3, fontSize: 11, cursor: 'pointer' }}
              >
                {creatingNode ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setAddingNode(false); setNewNodeTitle(''); }}
                style={{ padding: '5px 8px', background: '#eee', color: '#333', border: 'none', borderRadius: 3, fontSize: 11, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Main canvas ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(240,240,241,0.8)', zIndex: 10, fontSize: 13,
          }}>
            Loading tree…
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute', top: 12, left: 12, right: selectedNode ? 312 : 12,
            background: '#fde8e8', padding: '10px 14px', borderRadius: 4,
            color: '#c0392b', fontSize: 13, zIndex: 10,
          }}>
            {error}
          </div>
        )}
        {!moduleId && !loading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13,
          }}>
            Select a module on the left to view its decision tree.
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          nodesDraggable={true}
          nodesConnectable={true}
          deleteKeyCode={null}
          onPaneClick={() => setSelectedNode(null)}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          elementsSelectable={true}
        >
          <Background color="#ccc" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={n => STATUS_COLORS[n.data?.isOrphan ? 'orphan' : n.data?.isRoot ? 'start' : n.data?.linkStatus] || '#888'}
            style={{ background: '#f0f0f1' }}
          />
        </ReactFlow>
      </div>

      {/* ── Right panel: node detail ── */}

      {/* Drag-to-blank-space → create + connect dialog */}
      {pendingDragToNew && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: 24, width: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14 }}>Create &amp; connect new step</p>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#666' }}>Name the new step, then choose which branch links to it.</p>
            <input
              value={dragNewTitle}
              onChange={e => setDragNewTitle(e.target.value)}
              placeholder="Step title…"
              autoFocus
              style={{ width: '100%', fontSize: 13, padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => confirmDragToNew('Yes')}
                disabled={dragNewSaving || !dragNewTitle.trim()}
                style={{ flex: 1, padding: '8px 0', background: '#2c6e49', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: dragNewTitle.trim() ? 1 : 0.5 }}
              >Yes branch</button>
              <button
                onClick={() => confirmDragToNew('No')}
                disabled={dragNewSaving || !dragNewTitle.trim()}
                style={{ flex: 1, padding: '8px 0', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: dragNewTitle.trim() ? 1 : 0.5 }}
              >No branch</button>
            </div>
            <button
              onClick={() => { setPendingDragToNew(null); setDragNewTitle(''); }}
              disabled={dragNewSaving}
              style={{ width: '100%', padding: '6px 0', background: '#eee', color: '#555', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
            >Cancel</button>
            {dragNewSaving && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#888', textAlign: 'center' }}>Creating…</p>}
          </div>
        </div>
      )}

      {/* Yes / No connection dialog — node to existing node */}
      {pendingConn && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 8, padding: 24, width: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 14 }}>New connection</p>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#555' }}>
              Is this the <strong>Yes</strong> or <strong>No</strong> branch?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => confirmConnect('Yes')} disabled={connSaving} style={{
                flex: 1, padding: '8px 0', background: '#2c6e49', color: '#fff',
                border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>Yes</button>
              <button onClick={() => confirmConnect('No')} disabled={connSaving} style={{
                flex: 1, padding: '8px 0', background: '#c0392b', color: '#fff',
                border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>No</button>
              <button onClick={() => setPendingConn(null)} disabled={connSaving} style={{
                padding: '8px 12px', background: '#eee', color: '#333',
                border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer',
              }}>Cancel</button>
            </div>
            {connSaving && <p style={{ margin: '10px 0 0', fontSize: 12, color: '#888' }}>Saving…</p>}
          </div>
        </div>
      )}

      {selectedNode && (
        <NodeSidebar
          node={selectedNode}
          outgoingEdges={selectedNode.outgoingEdges || []}
          onClose={() => setSelectedNode(null)}
          editPostUrl={editPostUrl}
          onUpdateNode={onUpdateNode}
          onUpdateEdge={onUpdateEdge}
          onDeleteEdge={deleteEdge}
          onDeleteNode={deleteNode}
          onMarkTerminal={markAsTerminal}
          onSetStart={setAsStart}
          onUnmarkTerminal={unmarkTerminal}
          onClearStart={clearStart}
        />
      )}
    </div>
    </NodeCallbacks.Provider>
  );
}
