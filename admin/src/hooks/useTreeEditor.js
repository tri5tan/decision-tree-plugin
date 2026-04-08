import { useState, useEffect, useCallback, useRef } from "react";
import { useNodesState, useEdgesState, addEdge } from "reactflow";
import { getNodeHeight, getZoomBounds, getRootOffsets, getFitLevels } from "../config/tree-layout-config";
import {
  applyDagreLayout,
  buildFlowNodes,
  buildFlowEdges,
  recomputeNodeStatuses,
  computeReachability,
  getNodesInFirstNLevels,
} from "../utils/graphUtils";
import {
  DEV_MODULES,
  DEV_TREE,
  DEV_MODULE_ID,
  DEV_FIELD_GROUPS,
  DEV_FIELD_TREE_MAP_BY_RESOURCE,
  mockGetResourcesResponse,
} from "../dev/devData";

export default function useTreeEditor() {
  const IS_DEV = !window.dt?.restUrl; // true when running via `npm run dev`
  const { restUrl, editPostUrl, subModulesUrl, fieldGroupId: initialFieldGroupId } = window.dt || {};

  const [modules, setModules] = useState([]);
  const [resources, setResources] = useState([]);
  const [resourceId, setResourceId] = useState(0);
  const [fieldGroups, setFieldGroups] = useState([]);
  const [fieldGroupId, setFieldGroupId] = useState(() => {
    if (IS_DEV) return "";
    return initialFieldGroupId || "";
  });
  const [fieldGroupMode, setFieldGroupMode] = useState("resource"); // 'resource' or 'submodule'
  const [loadingFieldGroups, setLoadingFieldGroups] = useState(false);
  const [moduleId, setModuleId] = useState(() => {
    if (IS_DEV) return DEV_MODULE_ID;

    const urlModule = Number(
      new URLSearchParams(window.location.search).get("module_id") || 0,
    );
    if (urlModule > 0) return urlModule;

    const storedModule = Number(
      localStorage.getItem("decision_tree_default_module_id") || 0,
    );
    return storedModule > 0 ? storedModule : 0;
  });
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingConn, setPendingConn] = useState(null);
  const [connSaving, setConnSaving] = useState(false);
  const [addingNode, setAddingNode] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [creatingNode, setCreatingNode] = useState(false);

  // Drag-to-blank-space → create + connect flow
  const connectHandled = useRef(false); // true when onConnect fires (node→node)
  const pendingConnSrc = useRef(null); // source nodeId from onConnectStart
  const [pendingDragToNew, setPendingDragToNew] = useState(null); // { sourceNodeId }
  const [dragNewTitle, setDragNewTitle] = useState("");
  const [dragNewSaving, setDragNewSaving] = useState(false);
  const [rootNodeId, setRootNodeId] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // On first load (or module change): fit the first 2-3 levels into view so the
  // root and immediate decisions are readable without showing the whole tree.
  // We track whether we've already fitted for the current module with a ref so
  // subsequent node/edge updates don't keep re-fitting.
  const hasFittedRef = useRef(false);
  const fittedModuleRef = useRef(null);

  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0 || !rootNodeId) return;
    // Reset fit flag when module or resource (tree source) changes
    const treeKey = fieldGroupMode === "resource" ? `r-${resourceId}` : `m-${moduleId}`;
    if (fittedModuleRef.current !== treeKey) {
      hasFittedRef.current = false;
      fittedModuleRef.current = treeKey;
    }
    if (hasFittedRef.current) return;
    hasFittedRef.current = true;

    const levels = getFitLevels();
    const subset = getNodesInFirstNLevels(nodes, edges, rootNodeId, levels);
    // Small delay so React Flow has finished measuring node dimensions
    setTimeout(() => {
      reactFlowInstance.fitView({
        nodes: subset.length > 0 ? subset : undefined,
        padding: 0.25,
        minZoom: getZoomBounds().fitMinZoom,
        maxZoom: getZoomBounds().fitMaxZoom,
        duration: 350,
      });
    }, 80);
  }, [reactFlowInstance, nodes, edges, rootNodeId, moduleId, resourceId, fieldGroupMode]);

  // Fetch module list for the dropdown (requires editor login).
  useEffect(() => {
    if (IS_DEV) {
      setModules(DEV_MODULES);
      return;
    }
    fetch(restUrl + "modules", {
      headers: { "X-WP-Nonce": window.dt?.nonce || "" },
    })
      .then((r) => r.json())
      .then(setModules)
      .catch(() => setError("Could not fetch module list."));
  }, []);

  // Fetch ACF field groups for the dropdown
  useEffect(() => {
    if (IS_DEV) {
      setFieldGroups(DEV_FIELD_GROUPS);
      return;
    }
    if (!restUrl) return;
    setLoadingFieldGroups(true);
    fetch(restUrl + "field-groups", {
      headers: { "X-WP-Nonce": window.dt?.nonce || "" },
    })
      .then((r) => r.json())
      .then((groups) => {
        setFieldGroups(groups);

        // Auto-select a field group if none is saved yet.
        // Prefer resource-mode groups, fall back to submodule-mode.
        if (!initialFieldGroupId) {
          const best =
            groups.find((g) => g.mode === "resource") ||
            groups.find((g) => g.mode === "submodule");
          if (best) {
            setFieldGroupId(best.id);
            // Persist the selection so future page loads skip this step
            fetch(restUrl + "field-group", {
              method: "POST",
              headers: {
                "X-WP-Nonce": window.dt?.nonce || "",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ id: best.id }),
            }).catch(() => {});
          }
        }
      })
      .catch(() => setError("Could not fetch field groups."))
      .finally(() => setLoadingFieldGroups(false));
  }, []);

  // Auto-select first module if none is selected, modules are loaded, and a field group is chosen
  useEffect(() => {
    if (!moduleId && modules.length > 0 && fieldGroupId) {
      setModuleId(modules[0].id);
      localStorage.setItem("decision_tree_default_module_id", modules[0].id);
    }
  }, [modules, moduleId, fieldGroupId]);

  // Fetch resource list for the selected module
  useEffect(() => {
    if (!moduleId || !fieldGroupId) {
      setResources([]);
      setResourceId(0);
      return;
    }

    if (IS_DEV) {
      const mockResponse = mockGetResourcesResponse(moduleId, fieldGroupId);
      setFieldGroupMode(mockResponse.fieldGroupMode);
      setResources(mockResponse.resources);
      setResourceId(mockResponse.resources[0]?.id || 0);

      if (mockResponse.message) {
        setError(mockResponse.message);
      }
      return;
    }

    const gp = encodeURIComponent(fieldGroupId || "");
    fetch(`${restUrl}resources?module_id=${moduleId}&field_group_id=${gp}`, {
      headers: { "X-WP-Nonce": window.dt?.nonce || "" },
    })
      .then((r) => r.json())
      .then((data) => {
        // Handle error response
        if (data?.code) {
          throw new Error(data.message || "Could not fetch resource list.");
        }

        // Extract fieldGroupMode and resources from new response format
        const mode = data?.fieldGroupMode || "unknown";
        const resList = data?.resources || [];

        setFieldGroupMode(mode);

        if (mode === "submodule") {
          setResources([]);
          setResourceId(0);
          return;
        }

        if (mode === "resource") {
          setResources(resList);
          setResourceId(resList[0]?.id || 0);
          return;
        }

        // Unknown mode
        setResources([]);
        setResourceId(0);
        if (data?.message) {
          setError(data.message);
        }
      })
      .catch((err) => {
        setError(err.message || "Could not fetch resource list.");
        setResources([]);
        setResourceId(0);
      });
  }, [moduleId, fieldGroupId, IS_DEV, restUrl]);

  // Handle field group change
  const handleFieldGroupChange = useCallback(
    (selectedId) => {
      setFieldGroupId(selectedId);
      setFieldGroupMode("resource");
      setModuleId(0);
      setResources([]);
      setResourceId(0);

      if (IS_DEV) return; // Skip POST in dev mode

      fetch(restUrl + "field-group", {
        method: "POST",
        headers: {
          "X-WP-Nonce": window.dt?.nonce || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: selectedId }),
      })
        .then((r) => {
          if (!r.ok) {
            return r.json().then((err) => {
              throw new Error(
                err?.message || "Could not save field group selection.",
              );
            });
          }
          return r.json();
        })
        .catch(() => setError("Could not save field group selection."));
    },
    [IS_DEV, restUrl],
  );

  // Fetch + layout tree whenever resourceId, moduleId, or fieldGroupId changes.
  useEffect(() => {
    if (!moduleId || fieldGroupId === "") {
      setNodes([]);
      setEdges([]);
      return;
    }

    if (fieldGroupMode === "resource" && !resourceId) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedNode(null);

    let loadData;
    if (IS_DEV) {
      if (fieldGroupMode === "submodule") {
        loadData = Promise.resolve(DEV_TREE);
      } else {
        loadData = Promise.resolve(
          DEV_FIELD_TREE_MAP_BY_RESOURCE[resourceId] || {
            code: "resource_not_found",
            message: "Resource not configured for this module tree.",
          },
        );
      }
    } else {
      if (fieldGroupMode === "submodule") {
        loadData = fetch(`${restUrl}tree/${moduleId}`).then((r) => r.json());
      } else {
        loadData = fetch(`${restUrl}tree-resource/${resourceId}`).then((r) =>
          r.json(),
        );
      }
    }

    loadData
      .then((data) => {
        if (data.code) throw new Error(data.message);

        const flowNodes = buildFlowNodes(data.nodes);
        const flowEdges = buildFlowEdges(data.edges);
        const laid = applyDagreLayout(flowNodes, flowEdges);
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

        setNodes(computeReachability(statused, flowEdges, rootId));
        setEdges(flowEdges);
      })
      .catch((e) => {
        setError(e.message || "Could not load tree.");
        setNodes([]);
        setEdges([]);
      })
      .finally(() => setLoading(false));
  }, [moduleId, fieldGroupId, resourceId, fieldGroupMode, IS_DEV]);

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
    (_, node) => {
      // Attach outgoing edges so the sidebar can show Yes/No path labels
      const outgoing = edges.filter((e) => e.source === node.id);
      setSelectedNode({ ...node, outgoingEdges: outgoing });
    },
    [edges],
  );

  // Called by NodeSidebar after a successful save — updates the node in state
  const onUpdateNode = useCallback((nodeId, patch) => {
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

  // Called by NodeSidebar after a decision label is saved
  const onUpdateEdge = useCallback((edgeId, patch) => {
    setEdges((prev) =>
      prev.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e,
      ),
    );
    setSelectedNode((prev) =>
      prev
        ? {
            ...prev,
            outgoingEdges: prev.outgoingEdges?.map((e) =>
              e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e,
            ),
          }
        : prev,
    );
  }, []);

  // Track which node the drag started from
  const onConnectStart = useCallback((_, { nodeId }) => {
    pendingConnSrc.current = nodeId;
    connectHandled.current = false;
  }, []);

  // Fires when user drags a connection onto an existing node
  const onConnect = useCallback((params) => {
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
    async (edgeId, answer, sourceNodeId) => {
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
        setEdges((prev) => {
          const updated = prev.filter((e) => e.id !== edgeId);
          const remaining = updated.filter((e) => e.source === sourceNodeId);
          const hasYes = remaining.some((e) => e.data?.answer === "Yes");
          const hasNo = remaining.some((e) => e.data?.answer === "No");
          const hasQ = !!nodes.find((n) => n.id === sourceNodeId)?.data
            ?.question;
          const newStatus =
            remaining.length === 0
              ? hasQ
                ? "terminal"
                : "empty"
              : hasYes && hasNo
                ? "complete"
                : "partial";
          setNodes((ns) =>
            ns.map((n) =>
              n.id === sourceNodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      linkStatus: newStatus,
                      isTerminal: newStatus === "terminal",
                    },
                  }
                : n,
            ),
          );
          return updated;
        });
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
    [IS_DEV, restUrl, nodes],
  );

  // Creates a node AND immediately connects it to sourceNodeId with the chosen answer
  const confirmDragToNew = async (answer) => {
    if (!pendingDragToNew || !dragNewTitle.trim()) return;
    setDragNewSaving(true);
    const { sourceNodeId } = pendingDragToNew;
    const srcPostId = sourceNodeId.replace("sm-", "");
    try {
      let newPostId, newNodeId;
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
            connect: { answer, target_id: parseInt(newPostId, 10) },
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
          isTerminal: false,
          linkStatus: "empty",
        },
      };
      setNodes((prev) => [...prev, newNode]);
      const newEdge = {
        id: `e-${srcPostId}-${newPostId}-${answer.toLowerCase()}`,
        source: sourceNodeId,
        target: newNodeId,
        type: "decision-edge",
        data: { label: answer, answer },
        markerEnd: { type: "arrowclosed", color: "#999" },
        style: { stroke: "#999", strokeWidth: 1.5 },
      };
      setEdges((prev) => {
        const updated = addEdge(newEdge, prev);
        const outgoing = updated.filter((e) => e.source === sourceNodeId);
        const hasYes = outgoing.some((e) => e.data?.answer === "Yes");
        const hasNo = outgoing.some((e) => e.data?.answer === "No");
        setNodes((ns) =>
          ns.map((nd) =>
            nd.id === sourceNodeId
              ? {
                  ...nd,
                  data: {
                    ...nd.data,
                    linkStatus: hasYes && hasNo ? "complete" : "partial",
                    isTerminal: false,
                  },
                }
              : nd,
          ),
        );
        return updated;
      });
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
    async (nodeId) => {
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
          prev?.id === nodeId
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
    async (nodeId) => {
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
          prev?.id === nodeId
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
    async (nodeId) => {
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
          prev?.id === nodeId
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
    async (nodeId) => {
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
            isTerminal: false,
            linkStatus: "empty",
          },
        };
      } else {
        const reqBody = {
          title: newNodeTitle.trim(),
          module_id: moduleId,
        };
        if (resourceId) {
          reqBody.resource_id = resourceId;
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

  const confirmConnect = async (answer) => {
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
      const newEdgeObj = {
        id: `e-${sourcePostId}-${targetPostId}-${answer.toLowerCase()}`,
        source: pendingConn.source,
        target: pendingConn.target,
        type: "decision-edge",
        data: { label: answer, answer },
        markerEnd: { type: "arrowclosed", color: "#999" },
        style: { stroke: "#999", strokeWidth: 1.5 },
      };
      setEdges((prev) => {
        const updated = addEdge(newEdgeObj, prev);
        // Recompute source node colour immediately
        const outgoing = updated.filter((e) => e.source === pendingConn.source);
        const hasYes = outgoing.some((e) => e.data?.answer === "Yes");
        const hasNo = outgoing.some((e) => e.data?.answer === "No");
        setNodes((ns) =>
          ns.map((nd) =>
            nd.id === pendingConn.source
              ? {
                  ...nd,
                  data: {
                    ...nd.data,
                    linkStatus: hasYes && hasNo ? "complete" : "partial",
                    isTerminal: false,
                  },
                }
              : nd,
          ),
        );
        return updated;
      });
      setPendingConn(null);
    } catch (e) {
      console.error("Connect failed", e);
    } finally {
      setConnSaving(false);
    }
  };

  return {
    // Environment
    IS_DEV,
    restUrl,
    editPostUrl,
    subModulesUrl,
    // Dropdowns
    modules,
    resources,
    resourceId,
    setResourceId,
    fieldGroups,
    fieldGroupId,
    fieldGroupMode,
    loadingFieldGroups,
    moduleId,
    setModuleId,
    handleFieldGroupChange,
    // Graph
    nodes,
    edges,
    onNodesChange,
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
  };
}
