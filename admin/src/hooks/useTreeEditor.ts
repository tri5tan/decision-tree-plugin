import { useState, useEffect, useCallback, useRef } from "react";
import { useNodesState, useEdgesState, addEdge, type Node, type Edge, type NodeChange } from "reactflow";
import { getNodeHeight, getZoomBounds, getFitLevels, getLayoutSettings, getLayoutConfig, setLayoutSettings as persistLayoutSettings, PRINT_MAX_LEVELS } from "../config/tree-layout-config";
import type { LayoutSettings } from "../config/tree-layout-config";
import {
  applyDagreLayout,
  buildFlowNodes,
  buildFlowEdges,
  recomputeNodeStatuses,
  computeReachability,
  getNodesInFirstNLevels,
  applySavedPositions,
} from "../utils/graphUtils";
import {
  DEV_MODULES,
  DEV_TOPICS,
  DEV_TREE,
  DEV_TREE_2,
  DEV_TREE_3,
  DEV_TREE_4,
  DEV_TREE_5,
  DEV_MODULE_ID,
} from "../dev/devData";
import type {
  Topic,
  Module,
  TopicGroup,
  StepData,
  EdgeData,
  ResourcesResponse,
  LinkStatus,
} from "../types";

export default function useTreeEditor() {
  const IS_DEV = !window.dt?.restUrl; // true when running via `npm run dev`
  const { restUrl, editPostUrl, subModulesUrl } = window.dt || {};

  // ── State ──────────────────────────────────────────────────────────────────
  const [topics, setTopics] = useState<Topic[]>([]);           // topic hierarchy
  const [treeModules, setTreeModules] = useState<Module[]>([]); // tree-enabled modules
  const [treeModuleId, setTreeModuleId] = useState<number>(0);
  const [topicId, setTopicId] = useState<number | null>(() => {
    const stored = localStorage.getItem("decision_tree_default_topic_id");
    if (stored === "null") return null;
    const n = Number(stored);
    return stored && !isNaN(n) ? n : null;
  });
  const [moduleId, setModuleId] = useState<number>(() => {
    const urlModule = Number(
      new URLSearchParams(window.location.search).get("module_id") || 0,
    );
    if (urlModule > 0) return urlModule;
    const stored = Number(localStorage.getItem("decision_tree_default_module_id") || 0);
    // In dev mode fall back to DEV_MODULE_ID if nothing stored; prod stays at 0 (no tree shown)
    return stored > 0 ? stored : IS_DEV ? DEV_MODULE_ID : 0;
  });
  const [nodes, setNodes, onNodesChange] = useNodesState<StepData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>([]);
  const [selectedNode, setSelectedNode] = useState<(Node<StepData> & { outgoingEdges: Edge<EdgeData>[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConn, setPendingConn] = useState<{ source: string; target: string } | null>(null);
  const [connSaving, setConnSaving] = useState(false);
  const [addingNode, setAddingNode] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [creatingNode, setCreatingNode] = useState(false);

  // Drag-to-blank-space → create + connect flow
  const connectHandled = useRef(false);
  const pendingConnSrc = useRef<string | null>(null);
  const [pendingDragToNew, setPendingDragToNew] = useState<{ sourceNodeId: string } | null>(null);
  const [dragNewTitle, setDragNewTitle] = useState("");
  const [dragNewSaving, setDragNewSaving] = useState(false);
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [layoutLocked, setLayoutLocked] = useState(false);  // true when saved positions are active
  const [layoutDirty, setLayoutDirty] = useState(false);    // true when nodes dragged since last save
  const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<typeof useNodesState>[0] extends unknown ? any : never>(null); // typed via setReactFlowInstance usage

  const hasFittedRef = useRef(false);
  const fittedModuleRef = useRef<string | null>(null);
  const nodesModuleRef = useRef<number | null>(null); // tracks which moduleId the current nodes belong to

  // ── Layout settings state (persisted in localStorage via tree-layout-config) ─
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>(getLayoutSettings);

  const handleLayoutSettingChange = useCallback((patch: Partial<LayoutSettings>) => {
    setLayoutSettings(prev => ({ ...prev, ...patch }));
    persistLayoutSettings(patch);
    // Reset fitView so it refires after the reload (needed for both spacing and fitDepth changes)
    hasFittedRef.current = false;
    fittedModuleRef.current = null;
    // Bounce moduleId to re-layout the tree with updated settings
    if (moduleId > 0) {
      const cur = moduleId;
      setModuleId(0);
      setTimeout(() => setModuleId(cur), 50);
    }
  }, [moduleId]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredTTreeModules: Module[] = (() => {
    if (topics.length === 0 || topicId === null) return treeModules;
    return treeModules.filter((m) => m.topicId === topicId);
  })();

  const selectedModuleTitle = treeModules.find((m) => m.id === moduleId)?.title ?? '';

  // ── Derived: topic groups (for rendering grouped select or list) ───────────
  const topicGroups: TopicGroup[] = (() => {
    if (topics.length === 0) return [];
    return topics.map((t) => ({
      topic: t,
      modules: treeModules.filter((m) => m.topicId === t.id),
    }));
  })();

  // ── Auto fitView on first load per module/resource ─────────────────────────
  useEffect(() => {
    // Guard: don't fire on stale nodes from the previous module.
    // nodesModuleRef is stamped when the tree fetch actually loads nodes for moduleId.
    if (!reactFlowInstance || nodes.length === 0 || !rootNodeId || nodesModuleRef.current !== moduleId) return;
    const treeKey = `m-${moduleId}`;
    if (fittedModuleRef.current !== treeKey) {
      hasFittedRef.current = false;
      fittedModuleRef.current = treeKey;
    }
    if (hasFittedRef.current) return;
    hasFittedRef.current = true;

    const levels = getFitLevels();
    const isShowAll = levels >= 99;
    const isFew = levels <= 2;
    const subset = getNodesInFirstNLevels(nodes, edges, rootNodeId, levels);
    setTimeout(() => {
      reactFlowInstance.fitView({
        nodes: subset.length > 0 ? subset : undefined,
        padding: isShowAll ? 0.1 : isFew ? 0.15 : 0.25,
        minZoom: isShowAll ? getZoomBounds().minZoom : getZoomBounds().fitMinZoom,
        maxZoom: isFew ? Math.min(1.0, getZoomBounds().maxZoom) : getZoomBounds().fitMaxZoom,
        duration: 350,
      });

      // // After fitView animation completes, apply sidebar offset for visual centering on page
      // setTimeout(() => {
      //   const sidebar = document.querySelector('.left-panel') as HTMLElement;
      //   if (sidebar && reactFlowInstance) {
      //     const sidebarWidth = sidebar.offsetWidth;
      //     const offset = sidebarWidth / 2; // Offset by half sidebar width for visual centering
          
      //     // Get current viewport and shift it
      //     const currentViewport = reactFlowInstance.getViewport?.();
      //     if (currentViewport) {
      //       reactFlowInstance.setViewport({
      //         x: currentViewport.x + offset,
      //         y: currentViewport.y,
      //         zoom: currentViewport.zoom,
      //       });
      //     }
      //   }
      // }, 350); // Wait for fitView animation to complete
    }, 80);
  }, [reactFlowInstance, nodes, edges, rootNodeId, moduleId]);

  // Fetch topics + tree-enabled modules on mount (independent of module selection).
  // Also handles auto-select: if no moduleId is set (or stored ID was deleted),
  // picks the first tree-enabled module from the fetched list.
  useEffect(() => {
    if (IS_DEV) {
      setTopics(DEV_TOPICS);
      setTreeModules(DEV_MODULES);
      // Topic-aware auto-select: validate stored moduleId against stored topicId
      setModuleId((prev) => {
        const rawTopic = localStorage.getItem("decision_tree_default_topic_id");
        const storedTopic = rawTopic && rawTopic !== "null" ? Number(rawTopic) : null;
        const pool = storedTopic !== null
          ? DEV_MODULES.filter((m: Module) => m.topicId === storedTopic)
          : DEV_MODULES;
        const validPool = pool.length > 0 ? pool : DEV_MODULES;
        if (prev > 0 && validPool.some((m: Module) => m.id === prev)) return prev;
        const firstId = validPool[0]?.id || 0;
        if (firstId > 0) {
          localStorage.setItem("decision_tree_default_module_id", String(firstId));
          setTreeModuleId(firstId);
        }
        return firstId;
      });
      return;
    }
    fetch(`${restUrl}resources`, {
      headers: { "X-WP-Nonce": window.dt?.nonce || "" },
    })
      .then((r) => r.json())
      .then((data: ResourcesResponse & { code?: string; message?: string }) => {
        if (data?.code) throw new Error(data.message || "Could not fetch module list.");
        const fetchedTopics = data?.topics ?? [];
        const fetchedModules = data?.modules ?? [];
        setTopics(fetchedTopics);
        setTreeModules(fetchedModules);
        // Topic-aware auto-select: validate stored moduleId against stored topicId
        setModuleId((prev) => {
          const rawTopic = localStorage.getItem("decision_tree_default_topic_id");
          const storedTopic = rawTopic && rawTopic !== "null" ? Number(rawTopic) : null;
          const pool = storedTopic !== null
            ? fetchedModules.filter((m: Module) => m.topicId === storedTopic)
            : fetchedModules;
          const validPool = pool.length > 0 ? pool : fetchedModules;
          if (prev > 0 && validPool.some((m: Module) => m.id === prev)) return prev;
          const firstId = validPool[0]?.id || 0;
          if (firstId > 0) {
            localStorage.setItem("decision_tree_default_module_id", String(firstId));
            setTreeModuleId(firstId);
          }
          return firstId;
        });
      })
      .catch((err: Error) => {
        setError(err.message || "Could not fetch module list.");
      });
  }, []);

  // ── handleTopicChange ─────────────────────────────────────────────────────
  const handleTopicChange = useCallback((newTopicId: number | null) => {
    setTopicId(newTopicId);
    localStorage.setItem("decision_tree_default_topic_id", String(newTopicId));
    // Auto-select first module in the chosen topic
    const inTopic = newTopicId === null
      ? treeModules
      : treeModules.filter((m) => m.topicId === newTopicId);
    const firstId = inTopic[0]?.id || 0;
    setModuleId(firstId);
    setTreeModuleId(firstId);
    localStorage.setItem("decision_tree_default_module_id", String(firstId));
  }, [treeModules]);

  // Fetch + layout tree whenever moduleId changes.
  useEffect(() => {
    if (!moduleId) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedNode(null);

    let loadData;
    if (IS_DEV) {
      const devTrees: Record<number, unknown> = { 1: DEV_TREE, 2: DEV_TREE_2, 3: DEV_TREE_3, 4: DEV_TREE_4, 5: DEV_TREE_5 };
      loadData = Promise.resolve(devTrees[moduleId] ?? DEV_TREE);
    } else {
      loadData = fetch(`${restUrl}tree/${moduleId}`).then((r) => r.json());
    }

    loadData
      .then((data) => {
        if (data.code) throw new Error(data.message);

        const flowNodes = buildFlowNodes(data.nodes);
        const flowEdges = buildFlowEdges(data.edges);
        const hasSaved = data.savedPositions && Object.keys(data.savedPositions).length > 0;
        const laid = hasSaved
          ? applySavedPositions(flowNodes, data.savedPositions)
          : applyDagreLayout(flowNodes, flowEdges);
        setLayoutLocked(!!hasSaved);
        setLayoutDirty(false);
        const statused = recomputeNodeStatuses(laid, flowEdges);

        // Use rootNodeId from PHP meta if set; otherwise auto-detect from edges
        // (first node that has no incoming edges = natural root)
        const incomingIds = new Set(flowEdges.map((e) => e.target));
        const autoRoot =
          flowNodes.find((n) => !incomingIds.has(n.id))?.id ||
          flowNodes[0]?.id ||
          null;
        const rootId = data.rootNodeId || autoRoot;
        setRootNodeId(rootId);

        nodesModuleRef.current = moduleId; // stamp before setNodes so fitView guard passes
        setNodes(computeReachability(statused, flowEdges, rootId));
        setEdges(flowEdges);
      })
      .catch((e) => {
        setError(e.message || "Could not load tree.");
        setNodes([]);
        setEdges([]);
      })
      .finally(() => setLoading(false));
  }, [moduleId, IS_DEV, restUrl]);

  // Recompute orphan / isRoot + hasIncoming whenever edges or root changes
  useEffect(() => {
    if (!rootNodeId) return;
    setNodes((prev) => {
      const incomingSet = new Set(edges.map((e) => e.target));
      const withIncoming = prev.map((n) => ({
        ...n,
        data: { ...n.data, hasIncoming: incomingSet.has(n.id) },
      }));
      return computeReachability(withIncoming, edges, rootNodeId);
    });
  }, [edges, rootNodeId]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<StepData>) => {
      // Attach outgoing edges so the sidebar can show Yes/No path labels
      const outgoing = edges.filter((e) => e.source === node.id);
      setSelectedNode({ ...node, outgoingEdges: outgoing });
    },
    [edges],
  );

  // Navigate the sidebar to a specific node by ID (used by decision path buttons).
  // Updates React Flow selection state and pans the canvas to centre the target node.
  // Zoom is preserved when already in a readable range; gently nudged if too far out/in.
  const selectNodeById = useCallback(
    (nodeId: string) => {
      setNodes((prev) => {
        const target = prev.find((n) => n.id === nodeId);
        if (target) {
          const outgoing = edges.filter((e) => e.source === nodeId);
          setSelectedNode({ ...target, selected: true, outgoingEdges: outgoing });

          // Pan canvas to centre the target node
          if (reactFlowInstance) {
            const cfg = getLayoutConfig();
            const nodeW = (cfg.nodeWidthMin + cfg.nodeWidthMax) / 2;
            // Centre horizontally; vertically aim at node top — height varies so avoid guessing
            const cx = (target.position?.x ?? 0) + nodeW / 2;
            const cy = (target.position?.y ?? 0);

            const MIN_ZOOM    = 0.45; // below this → too zoomed out, nudge in
            const MAX_ZOOM    = 1.2;  // above this → too zoomed in, nudge out
            const TARGET_LOW  = 0.65; // target zoom when currently too far out
            const TARGET_HIGH = 0.85; // target zoom when currently too far in

            const current = reactFlowInstance.getZoom?.() ?? 0.75;
            const zoom =
              current < MIN_ZOOM ? TARGET_LOW  :
              current > MAX_ZOOM ? TARGET_HIGH :
              current;

            reactFlowInstance.setCenter(cx, cy, { zoom, duration: 420 });
          }
        }
        // Deselect all, select only the target
        return prev.map((n) => ({ ...n, selected: n.id === nodeId }));
      });
    },
    [edges, reactFlowInstance],
  );

  // Called by EditorNodePanel after a successful save — updates the node in state
  const onUpdateNode = useCallback((nodeId: string, patch: Partial<StepData>) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id !== nodeId ? n : { ...n, data: { ...n.data, ...patch } },
      ),
    );
    setSelectedNode((prev) =>
      prev?.id === nodeId
        ? { ...prev, data: { ...prev.data, ...patch } }
        : prev,
    );
  }, []);

  // Called by EditorNodePanel after a decision label is saved
  const onUpdateEdge = useCallback((edgeId: string, patch: Record<string, unknown>) => {
    setEdges((prev) =>
      prev.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } as Edge<EdgeData> : e,
      ),
    );
    setSelectedNode((prev) =>
      prev
        ? {
            ...prev,
            outgoingEdges: prev.outgoingEdges?.map((e) =>
              e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } as Edge<EdgeData> : e,
            ),
          }
        : prev,
    );
  }, []);

  // Track which node the drag started from
  // Wrap onNodesChange to detect when the user finishes dragging a node,
  // marking the layout dirty so the Save Layout button becomes active.
  const wrappedOnNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);
    if (
      moduleId > 0 &&
      changes.some((c) => c.type === 'position' && (c as { dragging?: boolean }).dragging === false)
    ) {
      setLayoutDirty(true);
    }
  }, [onNodesChange, moduleId]);

  const onConnectStart = useCallback((_: React.MouseEvent, { nodeId }: { nodeId: string | null }) => {
    pendingConnSrc.current = nodeId;
    connectHandled.current = false;
  }, []);

  // Fires when user drags a connection onto an existing node
  const onConnect = useCallback((params: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) => {
    connectHandled.current = true; // mark as handled — suppress drag-to-new
    setPendingConn({ source: params.source, target: params.target });
  }, []);

  // Fires when drag ends — if onConnect didn't fire the drop was on blank space
  const onConnectEnd = useCallback(() => {
    const srcId = pendingConnSrc.current;
    pendingConnSrc.current = null;
    if (connectHandled.current) {
      connectHandled.current = false;
      return;
    }
    if (!srcId) return;
    // Dropped on empty canvas — open create+connect dialog
    setPendingDragToNew({ sourceNodeId: srcId });
    setDragNewTitle("");
  }, []);

  // Removes an edge from state and from the ACF decisions repeater in WP
  const deleteEdge = useCallback(
    async (edgeId: string, answer: string, sourceNodeId: string) => {
      const srcPostId = sourceNodeId.replace("sm-", "");
      try {
        if (!IS_DEV) {
          await fetch(`${restUrl}node/${srcPostId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": window.dt?.nonce || "",
            },
            body: JSON.stringify({ disconnect: { answer } }),
          });
        }
        // Compute updated state using current edges closure (latest committed after await).
        // setEdges and setNodes are sibling calls so React 18 batches them in one render.
        const updatedEdges = edges.filter((e) => e.id !== edgeId);
        const remaining = updatedEdges.filter((e) => e.source === sourceNodeId);
        const hasYes = remaining.some((e) => e.data?.answer === "Yes");
        const noRemaining = remaining.filter((e) => e.data?.answer === "No");
        const hasNo = noRemaining.length > 0;
        const hasQ = !!nodes.find((n) => n.id === sourceNodeId)?.data?.question;
        const newStatus =
          remaining.length === 0
            ? hasQ ? "terminal" : "empty"
            : hasYes && hasNo ? "complete" : "partial";
        const newSourceHandles = [
          ...(hasYes ? ['Yes'] : []),
          ...noRemaining.map(e => (e.sourceHandle as string) || `No-${e.target}`),
        ];
        setEdges(updatedEdges);
        setNodes((ns) =>
          ns.map((n) =>
            n.id === sourceNodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    linkStatus: newStatus,
                    isTerminal: newStatus === "terminal",
                    sourceHandles: newSourceHandles,
                  },
                }
              : n,
          ),
        );
        setSelectedNode((prev) =>
          prev
            ? {
                ...prev,
                outgoingEdges: (prev.outgoingEdges || []).filter(
                  (e) => e.id !== edgeId,
                ),
              }
            : prev,
        );
      } catch (e) {
        console.error("Delete edge failed", e);
      }
    },
    [IS_DEV, restUrl, edges, nodes],
  );

  // Creates a node AND immediately connects it to sourceNodeId with the chosen answer
  const confirmDragToNew = async (answer: 'Yes' | 'No') => {
    if (!pendingDragToNew || !dragNewTitle.trim()) return;
    setDragNewSaving(true);
    const { sourceNodeId } = pendingDragToNew;
    const srcPostId = sourceNodeId.replace("sm-", "");
    try {
      let newPostId: number | string = 0;
      let newNodeId: string = '';
      if (IS_DEV) {
        newPostId = Date.now();
        newNodeId = `sm-dev-${newPostId}`;
      } else {
        const r1 = await fetch(`${restUrl}nodes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.dt?.nonce || "",
          },
          body: JSON.stringify({
            title: dragNewTitle.trim(),
            module_id: moduleId,
          }),
        });
        if (!r1.ok) throw new Error("Failed to create node");
        const nodeData = await r1.json();
        newNodeId = nodeData.id;
        newPostId = nodeData.data.postId;

        await fetch(`${restUrl}node/${srcPostId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.dt?.nonce || "",
          },
          body: JSON.stringify({
            connect: { answer, target_id: parseInt(String(newPostId), 10) },
          }),
        });
      }
      const maxY = nodes.reduce((acc, n) => Math.max(acc, n.position.y), 0);
      const newNode = {
        id: newNodeId,
        type: "kb-node",
        position: { x: 80, y: maxY + getNodeHeight() + 80 },
        data: {
          postId: newPostId,
          label: dragNewTitle.trim(),
          question: null,
          content: "",
          rawContent: "",
          callout: null,
          legislation: [],
          adminNotes: "",
          isTerminal: false,
          linkStatus: "empty",
        },
      };
      const noHandle = answer === 'No' ? `No-${newNodeId}` : null;
      const newEdge = {
        // Use full node IDs so the ID is always unique regardless of node ID format.
        id: `e-${sourceNodeId}-${newNodeId}-${answer.toLowerCase()}`,
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle: noHandle ?? answer,
        type: "decision-edge",
        data: { label: answer, answer },
        markerEnd: { type: "arrowclosed", color: '#999' },
        style: { stroke: '#999', strokeWidth: 1.5 },
      };
      // Compute new sourceHandles for the source node.
      const currentOut = edges.filter(e => e.source === sourceNodeId);
      const willHaveYes = answer === 'Yes' || currentOut.some(e => e.data?.answer === 'Yes');
      const noHandlesAfter = [
        ...currentOut.filter(e => e.data?.answer === 'No').map(e => (e.sourceHandle as string) || `No-${e.target}`),
        ...(noHandle ? [noHandle] : []),
      ];
      const newSourceHandles = [...(willHaveYes ? ['Yes'] : []), ...noHandlesAfter];
      const newLinkStatus: LinkStatus = willHaveYes && noHandlesAfter.length > 0 ? 'complete' : 'partial';
      // Add the new node AND update the source node's handles in one setNodes call.
      // setEdges is a sibling call — React 18 batches both into one render so handle
      // and edge are always registered together by ReactFlow.
      setNodes((prev) => [
        ...prev.map(nd =>
          nd.id === sourceNodeId
            ? { ...nd, data: { ...nd.data, linkStatus: newLinkStatus, isTerminal: false, sourceHandles: newSourceHandles } }
            : nd
        ),
        newNode as Node<StepData>,
      ]);
      setEdges((prev) => addEdge(newEdge as Edge<EdgeData>, prev));
      setPendingDragToNew(null);
      setDragNewTitle("");
    } catch (e) {
      console.error("Create + connect failed", e);
    } finally {
      setDragNewSaving(false);
    }
  };

  // Removes the explicit start designation — auto-detects new root from edges
  const clearStart = useCallback(
    async () => {
      try {
        if (!IS_DEV) {
          await fetch(`${restUrl}module/${moduleId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": window.dt?.nonce || "",
            },
            body: JSON.stringify({ start_node_id: null }),
          });
        }
        // Fall back to auto-detection: first node with no incoming edges
        const incomingSet = new Set(edges.map((e) => e.target));
        const autoRoot =
          nodes.find((n) => !incomingSet.has(n.id))?.id || null;
        setRootNodeId(autoRoot);
        setNodes((prev) =>
          computeReachability(
            prev.map((n) => ({
              ...n,
              data: { ...n.data, isRoot: n.id === autoRoot },
            })),
            edges,
            autoRoot,
          ),
        );
        setSelectedNode((prev) =>
          prev ? { ...prev, data: { ...prev.data, isRoot: false } } : prev,
        );
      } catch (e) {
        console.error("Clear start failed", e);
      }
    },
    [IS_DEV, restUrl, moduleId, edges, nodes],
  );

  // Marks a node as the tree's start/entry node and persists to the module
  const setAsStart = useCallback(
    async (nodeId: string) => {
      try {
        if (!IS_DEV) {
          await fetch(`${restUrl}module/${moduleId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": window.dt?.nonce || "",
            },
            body: JSON.stringify({ start_node_id: nodeId }),
          });
        }
        setRootNodeId(nodeId);
        setNodes((prev) =>
          computeReachability(
            prev.map((n) => ({
              ...n,
              data: { ...n.data, isRoot: n.id === nodeId },
            })),
            edges,
            nodeId,
          ),
        );
        setSelectedNode((prev) =>
          prev !== null && prev.id === nodeId
            ? { ...prev, data: { ...prev.data, isRoot: true } }
            : prev,
        );
      } catch (e) {
        console.error("Set start node failed", e);
      }
    },
    [IS_DEV, restUrl, moduleId, edges],
  );

  // Marks a node as a terminal / end-of-path node and persists to WP
  const markAsTerminal = useCallback(
    async (nodeId: string) => {
      const postId = nodeId.replace("sm-", "");
      try {
        if (!IS_DEV) {
          await fetch(`${restUrl}node/${postId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": window.dt?.nonce || "",
            },
            body: JSON.stringify({ is_terminal: true }),
          });
        }
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: { ...n.data, isTerminal: true, linkStatus: "terminal" },
                }
              : n,
          ),
        );
        setSelectedNode((prev) =>
          prev !== null && prev.id === nodeId
            ? {
                ...prev,
                data: {
                  ...prev.data,
                  isTerminal: true,
                  linkStatus: "terminal",
                },
              }
            : prev,
        );
      } catch (e) {
        console.error("Mark terminal failed", e);
      }
    },
    [IS_DEV, restUrl],
  );

  // Removes the terminal/end designation from a node
  const unmarkTerminal = useCallback(
    async (nodeId: string) => {
      const postId = nodeId.replace("sm-", "");
      try {
        if (!IS_DEV) {
          await fetch(`${restUrl}node/${postId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": window.dt?.nonce || "",
            },
            body: JSON.stringify({ is_terminal: false }),
          });
        }
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: { ...n.data, isTerminal: false, linkStatus: "empty" },
                }
              : n,
          ),
        );
        setSelectedNode((prev) =>
          prev !== null && prev.id === nodeId
            ? {
                ...prev,
                data: { ...prev.data, isTerminal: false, linkStatus: "empty" },
              }
            : prev,
        );
      } catch (e) {
        console.error("Unmark terminal failed", e);
      }
    },
    [IS_DEV, restUrl],
  );

  // Deletes a node: trashes the WP post and removes it from the canvas
  const deleteNode = useCallback(
    async (nodeId: string) => {
      const postId = nodeId.replace("sm-", "");
      if (!window.confirm("Delete this step? This cannot be undone.")) return;
      try {
        if (!IS_DEV) {
          const res = await fetch(`${restUrl}node/${postId}`, {
            method: "DELETE",
            headers: { "X-WP-Nonce": window.dt?.nonce || "" },
          });
          if (!res.ok) throw new Error("Delete failed");
        }
        const sourcesAffected = edges
          .filter((e) => e.target === nodeId)
          .map((e) => e.source);
        const newEdges = edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        );

        // If we just deleted the start node, auto-detect a new one
        let newRoot = rootNodeId;
        if (nodeId === rootNodeId) {
          const incomingAfter = new Set(newEdges.map((e) => e.target));
          const remaining = nodes.filter((n) => n.id !== nodeId);
          newRoot =
            remaining.find((n) => !incomingAfter.has(n.id))?.id ||
            remaining[0]?.id ||
            null;
          setRootNodeId(newRoot);
          // Persist the new auto-detected root to PHP
          if (!IS_DEV && newRoot) {
            fetch(`${restUrl}module/${moduleId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-WP-Nonce": window.dt?.nonce || "",
              },
              body: JSON.stringify({ start_node_id: newRoot }),
            }).catch((e) =>
              console.error("Auto-persist new root failed", e),
            );
          }
        }

        setEdges(newEdges);
        setNodes((prev) => {
          let updated = prev.filter((n) => n.id !== nodeId);
          updated = updated.map((n) => {
            if (!sourcesAffected.includes(n.id)) return n;
            const remaining = newEdges.filter((e) => e.source === n.id);
            const hasYes = remaining.some((e) => e.data?.answer === "Yes");
            const hasNo = remaining.some((e) => e.data?.answer === "No");
            const hasQ = !!n.data.question;
            const newStatus =
              remaining.length === 0
                ? hasQ
                  ? "terminal"
                  : "empty"
                : hasYes && hasNo
                  ? "complete"
                  : "partial";
            return {
              ...n,
              data: {
                ...n.data,
                linkStatus: newStatus,
                isTerminal: newStatus === "terminal",
                sourceHandles: [
                  ...(hasYes ? ['Yes'] : []),
                  ...remaining.filter(e => e.data?.answer === 'No').map(e => (e.sourceHandle as string) || `No-${e.target}`),
                ],
              },
            };
          });
          return computeReachability(updated, newEdges, newRoot);
        });
        setSelectedNode(null);
      } catch (e) {
        console.error("Delete node failed", e);
        alert("Could not delete step. Please try again.");
      }
    },
    [IS_DEV, restUrl, moduleId, edges, nodes, rootNodeId],
  );

  // Creates a new sub-module WP post and drops it as an empty node on the canvas
  const createNode = async () => {
    if (!newNodeTitle.trim()) return;
    setCreatingNode(true);
    try {
      let nodeData;
      if (IS_DEV) {
        const fakeId = "sm-dev-" + Date.now();
        nodeData = {
          id: fakeId,
          data: {
            postId: 0,
            label: newNodeTitle.trim(),
            question: null,
            content: "",
            rawContent: "",
            callout: null,
            legislation: [],
            adminNotes: "",
            isTerminal: false,
            linkStatus: "empty",
          },
        };
      } else {
        const reqBody = {
          title: newNodeTitle.trim(),
          module_id: moduleId,
        };
        if (treeModuleId) {
          reqBody.module_id = treeModuleId;
        }

        const res = await fetch(`${restUrl}nodes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.dt?.nonce || "",
          },
          body: JSON.stringify(reqBody),
        });
        nodeData = await res.json();
      }
      const maxY = nodes.reduce((acc, n) => Math.max(acc, n.position.y), 0);
      setNodes((prev) => [
        ...prev,
        {
          id: nodeData.id,
          type: "kb-node",
          data: nodeData.data,
          position: { x: 80, y: maxY + getNodeHeight() + 80 },
        },
      ]);
      setNewNodeTitle("");
      setAddingNode(false);
    } catch (e) {
      console.error("Create node failed", e);
    } finally {
      setCreatingNode(false);
    }
  };

  const confirmConnect = async (answer: 'Yes' | 'No') => {
    if (!pendingConn) return;
    const sourcePostId = pendingConn.source.replace("sm-", "");
    const targetPostId = parseInt(pendingConn.target.replace("sm-", ""), 10);
    setConnSaving(true);
    try {
      if (!IS_DEV) {
        const res = await fetch(`${restUrl}node/${sourcePostId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WP-Nonce": window.dt?.nonce || "",
          },
          body: JSON.stringify({
            connect: { answer, target_id: targetPostId },
          }),
        });
        if (!res.ok) throw new Error("Server error");
      }
      const sourceHandle = answer === 'No' ? `No-${pendingConn.target}` : 'Yes';
      const newEdgeObj = {
        // Use full node IDs (not parseInt-extracted postIds) so the ID is always unique,
        // even when node IDs are non-numeric strings (e.g. dev data "fa-1").
        id: `e-${pendingConn.source}-${pendingConn.target}-${answer.toLowerCase()}`,
        source: pendingConn.source,
        target: pendingConn.target,
        sourceHandle,
        type: "decision-edge",
        data: { label: answer, answer },
        markerEnd: { type: "arrowclosed", color: '#999' },
        style: { stroke: '#999', strokeWidth: 1.5 },
      };
      // Compute sourceHandles ahead of time using the current edges closure.
      // setNodes and setEdges are sibling calls — React 18 batches them into one render
      // so the handle exists in the same frame as the edge. This is critical: if the handle
      // is added in a later render, ReactFlow loses the edge->handle position tracking.
      const currentOut = edges.filter(e => e.source === pendingConn.source);
      const willHaveYes = answer === 'Yes' || currentOut.some(e => e.data?.answer === 'Yes');
      const noHandlesAfter = [
        ...currentOut.filter(e => e.data?.answer === 'No').map(e => (e.sourceHandle as string) || `No-${e.target}`),
        ...(answer === 'No' ? [sourceHandle] : []),
      ];
      const newSourceHandles = [...(willHaveYes ? ['Yes'] : []), ...noHandlesAfter];
      const newLinkStatus: LinkStatus = willHaveYes && noHandlesAfter.length > 0 ? 'complete' : 'partial';
      setNodes(ns => ns.map(nd =>
        nd.id === pendingConn.source
          ? { ...nd, data: { ...nd.data, linkStatus: newLinkStatus, isTerminal: false, sourceHandles: newSourceHandles } }
          : nd
      ));
      setEdges(prev => addEdge(newEdgeObj as Edge<EdgeData>, prev));
      setPendingConn(null);
    } catch (e) {
      console.error("Connect failed", e);
    } finally {
      setConnSaving(false);
    }
  };

  // ── Layout lock: save current node positions to WP postmeta ──────────────
  const saveLayout = useCallback(async () => {
    if (moduleId <= 0) return;
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => { positions[n.id] = n.position; });
    if (!IS_DEV) {
      try {
        const res = await fetch(`${restUrl}layout/${moduleId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.dt?.nonce || '',
          },
          body: JSON.stringify({ positions }),
        });
        if (!res.ok) throw new Error('Save failed');
      } catch {
        return; // Don't mark saved if request failed
      }
    }
    setLayoutLocked(true);
    setLayoutDirty(false);
  }, [moduleId, nodes, IS_DEV, restUrl]);

  // ── Layout lock: clear saved positions and re-run dagre ───────────────────
  const resetLayout = useCallback(async () => {
    if (moduleId <= 0) return;
    if (!IS_DEV) {
      fetch(`${restUrl}layout/${moduleId}`, {
        method: 'DELETE',
        headers: { 'X-WP-Nonce': window.dt?.nonce || '' },
      }).catch(() => {}); // best effort, don't block
    }
    const laid = applyDagreLayout(nodes, edges);
    const statused = recomputeNodeStatuses(laid, edges);
    setNodes(computeReachability(statused, edges, rootNodeId));
    setLayoutLocked(false);
    setLayoutDirty(false);
  }, [moduleId, nodes, edges, IS_DEV, restUrl, rootNodeId]);

  return {
    // Environment
    IS_DEV,
    restUrl,
    editPostUrl,
    subModulesUrl,
    // Dropdowns
    topics,
    topicId,
    treeModules,
    treeModuleId,
    setTreeModuleId,
    filteredTTreeModules,
    topicGroups,
    handleTopicChange,
    moduleId,
    setModuleId,
    selectedModuleTitle,
    // Layout settings
    layoutSettings,
    handleLayoutSettingChange,
    // Layout lock
    layoutLocked,
    layoutDirty,
    saveLayout,
    resetLayout,
    // Graph
    nodes,
    edges,
    onNodesChange: wrappedOnNodesChange,
    onEdgesChange,
    selectedNode,
    setSelectedNode,
    reactFlowInstance,
    setReactFlowInstance,
    rootNodeId,
    // Loading / error
    loading,
    error,
    // Add-node UI
    addingNode,
    setAddingNode,
    newNodeTitle,
    setNewNodeTitle,
    creatingNode,
    // Dialog state
    pendingConn,
    setPendingConn,
    connSaving,
    pendingDragToNew,
    setPendingDragToNew,
    dragNewTitle,
    setDragNewTitle,
    dragNewSaving,
    // Callbacks
    onNodeClick,
    selectNodeById,
    onUpdateNode,
    onUpdateEdge,
    onConnectStart,
    onConnect,
    onConnectEnd,
    deleteEdge,
    confirmDragToNew,
    confirmConnect,
    clearStart,
    setAsStart,
    markAsTerminal,
    unmarkTerminal,
    deleteNode,
    createNode,
    fitForPrint,
  };

  /**
   * Fit the React Flow viewport to the first PRINT_MAX_LEVELS levels of the
   * tree, suitable for calling from a beforeprint handler.
   * Returns silently if the instance or root are unavailable.
   */
  function fitForPrint() {
    if (!reactFlowInstance || !rootNodeId) return;
    const subset = getNodesInFirstNLevels(nodes, edges, rootNodeId, PRINT_MAX_LEVELS);
    reactFlowInstance.fitView({
      nodes: subset.length > 0 ? subset : undefined,
      padding: 0.08,
      minZoom: 0.2,
      maxZoom: 1.0,
      duration: 0, // no animation — we need the position set before the print dialog opens
    });
  }
}
