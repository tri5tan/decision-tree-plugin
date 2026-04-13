import { useState, useEffect } from "react";
import type { Topic, Module, TopicGroup, FieldGroup, FieldGroupMode } from "../types";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type OnConnect,
  type OnConnectStart,
  type Node as FlowNode,
} from "reactflow";
import NodeSidebar from "./NodeSidebar";
import DTNode, { NodeCallbacks } from "./DTNode";
import DecisionEdge from "./DecisionEdge";
import { STATUS_COLORS, STATUS_META, CHROME } from "../config/theme";
import { getZoomBounds } from "../config/tree-layout-config";
import useTreeEditor from "../hooks/useTreeEditor";







// ─── Status chip (used in sidebar legend only) ───────────────────────────────
function StatusChip({ status }: { status: string }) {
  const s = STATUS_META[status as keyof typeof STATUS_META] || STATUS_META.empty;
  return (
    <span
      style={{
        fontSize: 10,
        background: s.bg,
        color: s.color,
        borderRadius: 10,
        padding: "2px 8px",
        fontWeight: 700,
        border: `1px solid ${s.color}44`,
        whiteSpace: "nowrap",
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

// ─── Field group picker ───────────────────────────────────────────────────────
// Shows as a small "auto-detected" indicator when a schema-matching group is
// active. Clicking it expands to a full dropdown for manual override.
interface FieldGroupPickerProps {
  fieldGroups: FieldGroup[];
  fieldGroupId: string;
  loadingFieldGroups: boolean;
  onChange: (id: string) => void;
}
function FieldGroupPicker({ fieldGroups, fieldGroupId, loadingFieldGroups, onChange }: FieldGroupPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const active = fieldGroups.find((g) => g.id === fieldGroupId);

  if (loadingFieldGroups) {
    return (
      <p style={{ fontSize: 11, color: CHROME.textSubtle, marginBottom: 16 }}>
        Detecting field group…
      </p>
    );
  }

  const modeLabel = (mode: string) =>
    mode === "resource" ? "tree source" : mode === "submodule" ? "tree steps" : null;

  if (!expanded && active) {
    return (
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: CHROME.textSubtle }}>
          Field group:{" "}
          <strong style={{ color: CHROME.textStrong }}>{active.title}</strong>
          {active.mode && active.mode !== "unknown" && (
            <span style={{ color: CHROME.textSubtle }}> ({modeLabel(active.mode)})</span>
          )}
        </span>
        <button
          onClick={() => setExpanded(true)}
          style={{
            marginLeft: 6,
            fontSize: 10,
            color: CHROME.textSubtle,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          change
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 11 }}>
        ACF Field Group
      </label>
      <select
        value={fieldGroupId}
        onChange={(e) => { onChange(e.target.value); setExpanded(false); }}
        autoFocus
        style={{ width: "100%", padding: "5px 6px", fontSize: 12 }}
      >
        <option value="">— Select field group —</option>
        {fieldGroups.map((fg) => (
          <option key={fg.id} value={fg.id}>
            {fg.title}{fg.mode && fg.mode !== "unknown" ? ` (${modeLabel(fg.mode)})` : ""}
          </option>
        ))}
      </select>
      {active && (
        <button
          onClick={() => setExpanded(false)}
          style={{ marginTop: 4, fontSize: 10, color: CHROME.textSubtle, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
        >
          cancel
        </button>
      )}
    </div>
  );
}










const nodeTypes = { "kb-node": DTNode };
const edgeTypes = { "decision-edge": DecisionEdge };

// ─── Component ────────────────────────────────────────────────────────────────
export default function TreeEditor() {
  const [adminBarHeight, setAdminBarHeight] = useState(33); // Default to 33px, which is the typical height of the WP admin bar. This is used to set the editor's height so it doesn't get hidden behind the bar. We measure it on mount in case it's a different height (e.g. due to custom admin bar items or responsive layout).

  useEffect(() => {
    const adminBar = document.getElementById("wpadminbar");
    if (adminBar) {
      setAdminBarHeight(adminBar.offsetHeight);
    }
  }, []);

  const {
    IS_DEV, editPostUrl, subModulesUrl,
    modules, topics, topicId, treeModules, treeModuleId, setTreeModuleId,
    filteredTTreeModules, topicGroups, handleTopicChange,
    fieldGroups, fieldGroupId, fieldGroupMode, loadingFieldGroups,
    moduleId, setModuleId, handleFieldGroupChange,
    nodes, edges, onNodesChange, onEdgesChange,
    selectedNode, setSelectedNode,
    reactFlowInstance, setReactFlowInstance,
    loading, error,
    addingNode, setAddingNode, newNodeTitle, setNewNodeTitle, creatingNode,
    pendingConn, setPendingConn, connSaving,
    pendingDragToNew, setPendingDragToNew, dragNewTitle, setDragNewTitle, dragNewSaving,
    onNodeClick, onUpdateNode, onUpdateEdge,
    onConnectStart, onConnect, onConnectEnd,
    deleteEdge, confirmDragToNew, confirmConnect,
    clearStart, setAsStart, markAsTerminal, unmarkTerminal,
    deleteNode, createNode,
  } = useTreeEditor();

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <NodeCallbacks.Provider
      value={{
        onMarkTerminal: markAsTerminal,
        onSetStart: setAsStart,
        onUnmarkTerminal: unmarkTerminal,
        onClearStart: clearStart,
      }}
    >
      <div
      className="tree-editor-window"
        style={{
          display: "flex",
          height: `calc(100vh - ${adminBarHeight}px)`,
          maxHeight: `calc(100vh - ${adminBarHeight}px)`,
          background: CHROME.canvasBg,
          overflow: "hidden",
        }}
      >



        {/* ── Left panel: module selector + legend ── */}
        <div
          className="left-panel"
          style={{
            width: 240,
            padding: 16,
            borderRight: `1px solid ${CHROME.panelBorder}`,
            background: CHROME.panelBg,
            flexShrink: 0,
            // overflowY: "auto",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 14, fontWeight: 700 }}>
            Decision Tree Editor
          </h2>

          {/* Field group: auto-detected, collapsed by default */}
          <FieldGroupPicker
            fieldGroups={fieldGroups}
            fieldGroupId={fieldGroupId}
            loadingFieldGroups={loadingFieldGroups}
            onChange={handleFieldGroupChange}
          />

          {fieldGroupId === "" ? (
            <div style={{ marginBottom: 16, fontSize: 11, color: STATUS_COLORS.orphan, background: CHROME.errorBg, padding: 8, borderRadius: 3 }}>
              Detecting field group…
            </div>
          ) : fieldGroupMode === "resource" ? (
            // Resource mode: a module post IS the tree — pick a topic then a module.
            <>
              {treeModules.length === 0 ? (
                <div style={{ marginBottom: 16, fontSize: 11, color: CHROME.textSubtle, background: CHROME.infoBg, padding: 8, borderRadius: 4 }}>
                  No decision trees found. Make sure "Resource Decision Tree Enabled" is ticked on a module in WP Admin.
                </div>
              ) : (
                <>
                  {/* Topic filter — only shown when the API returned topics */}
                  {topics.length > 0 && (
                    <>
                      <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 12 }}>
                        Select topic
                      </label>
                      <select
                        value={topicId ?? ""}
                        onChange={(e) => handleTopicChange(e.target.value === "" ? null : Number(e.target.value))}
                        style={{ width: "100%", padding: "5px 6px", fontSize: 12, marginBottom: 12 }}
                      >
                        <option value="">— All topics —</option>
                        {topics.map((t) => (
                          <option key={t.id ?? "none"} value={t.id ?? ""}>{t.title}</option>
                        ))}
                      </select>
                    </>
                  )}

                  {/* Module select — filtered by topic when one is selected */}
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 12 }}>
                    Select module
                  </label>
                  {filteredTTreeModules.length === 0 && topicId !== null ? (
                    <div style={{ marginBottom: 16, fontSize: 11, color: CHROME.textSubtle, fontStyle: "italic" }}>
                      No modules under this topic.
                    </div>
                  ) : (
                    <select
                      value={treeModuleId}
                      onChange={(e) => setTreeModuleId(Number(e.target.value))}
                      style={{ width: "100%", padding: "5px 6px", fontSize: 12, marginBottom: 16 }}
                    >
                      <option value={0}>— Select a module —</option>
                      {(topics.length > 0 ? filteredTTreeModules : treeModules).map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </>
          ) : fieldGroupMode === "submodule" ? (
            // Submodule mode: pick the module directly; tree loads from its linked steps.
            <>
              <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: 12 }}>
                Select module
              </label>
              <select
                value={moduleId}
                onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  setModuleId(selectedId);
                  if (!IS_DEV) localStorage.setItem("decision_tree_default_module_id", String(selectedId));
                }}
                style={{ width: "100%", padding: "5px 6px", fontSize: 12, marginBottom: 16 }}
              >
                <option value={0}>— Select a module —</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </>
          ) : null}

          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            Node status
          </p>
          {["start", "complete", "partial", "empty", "terminal", "orphan"].map(
            (key) => (
              <div
                className="chip-box"
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 5,
                }}
              >
                <StatusChip status={key} />
              </div>
            ),
          )}

          <hr style={{ margin: "16px 0", borderColor: CHROME.panelBorder }} />
          <p style={{ fontSize: 11, color: CHROME.textSubtle, marginBottom: 6 }}>
            Click a node to inspect it. Fix issues by editing resources directly.
          </p>
          {subModulesUrl && (
            <a
              href={subModulesUrl}
              style={{
                fontSize: 12,
                color: STATUS_COLORS.start,
                display: "block",
                marginBottom: 8,
              }}
            >
              ↗ All resources
            </a>
          )}
          {(moduleId > 0 || treeModuleId > 0) && (
            <button
              onClick={() => {
                if (fieldGroupMode === "resource") {
                  const cur = treeModuleId;
                  setTreeModuleId(0);
                  setTimeout(() => setTreeModuleId(cur), 50);
                } else {
                  const cur = moduleId;
                  setModuleId(0);
                  setTimeout(() => setModuleId(cur), 50);
                }
              }}
              style={{
                fontSize: 11,
                color: CHROME.textSubtle,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              ↺ Reload tree
            </button>
          )}

          <hr style={{ margin: "16px 0", borderColor: CHROME.panelBorder }} />
          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            Add a step
          </p>
          {!addingNode ? (
            <button
              onClick={() => setAddingNode(true)}
              disabled={fieldGroupMode === "resource" ? !treeModuleId : !moduleId}
              style={{
                width: "100%",
                padding: "6px 0",
                background: STATUS_COLORS.start,
                color: "#fff",
                border: "none",
                borderRadius: 4,
                fontSize: 12,
                cursor: (fieldGroupMode === "resource" ? treeModuleId : moduleId) ? "pointer" : "not-allowed",
                opacity: (fieldGroupMode === "resource" ? treeModuleId : moduleId) ? 1 : 0.5,
              }}
            >
              + New step
            </button>
          ) : (
            <div>
              <input
                value={newNodeTitle}
                onChange={(e) => setNewNodeTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createNode()}
                placeholder="Step title…"
                autoFocus
                style={{
                  width: "100%",
                  fontSize: 12,
                  padding: "5px 6px",
                  borderRadius: 3,
                  border: `1px solid ${CHROME.inputBorder}`,
                  boxSizing: "border-box",
                  marginBottom: 6,
                }}
              />
              <div style={{ display: "flex", gap: 5 }}>
                <button
                  onClick={createNode}
                  disabled={creatingNode || !newNodeTitle.trim()}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    background: STATUS_COLORS.start,
                    color: "#fff",
                    border: "none",
                    borderRadius: 3,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {creatingNode ? "Creating…" : "Create"}
                </button>
                <button
                  onClick={() => {
                    setAddingNode(false);
                    setNewNodeTitle("");
                  }}
                  style={{
                    padding: "5px 8px",
                    background: CHROME.btnNeutralBg,
                    color: CHROME.btnNeutralText,
                    border: "none",
                    borderRadius: 3,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Main canvas ── */}
        <div style={{ flex: 1, position: "relative" }}>
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: CHROME.canvasBgOverlay,
                zIndex: 10,
                fontSize: 13,
              }}
            >
              Loading tree…
            </div>
          )}
          {error && (
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                right: selectedNode ? 312 : 12,
                background: CHROME.errorBg,
                padding: "10px 14px",
                borderRadius: 4,
                color: STATUS_COLORS.orphan,
                fontSize: 13,
                zIndex: 10,
              }}
            >
              {error}
            </div>
          )}
          {!moduleId && !loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: CHROME.textPlaceholder,
                fontSize: 13,
              }}
            >
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

            minZoom={getZoomBounds().minZoom}
            maxZoom={getZoomBounds().maxZoom}
            nodesDraggable={true}
            nodesConnectable={true}
            deleteKeyCode={null}
            onInit={(instance) => setReactFlowInstance(instance)}
            onPaneClick={() => setSelectedNode(null)}
            onConnect={onConnect as OnConnect}
            onConnectStart={onConnectStart as OnConnectStart}
            onConnectEnd={onConnectEnd}
            elementsSelectable={true}
          >
            <Background color={CHROME.canvasGrid} gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(n: FlowNode) =>
                STATUS_COLORS[
                  (n.data?.isOrphan
                    ? "orphan"
                    : n.data?.isRoot
                      ? "start"
                      : n.data?.linkStatus) as keyof typeof STATUS_COLORS
                ] || "#888"
              }
              style={{ background: CHROME.textSubtle }}
            />
          </ReactFlow>
        </div>

        {/* ── Right panel: node detail ── */}

        {/* Drag-to-blank-space → create + connect dialog */}
        {pendingDragToNew && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: CHROME.overlay,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: CHROME.modalBg,
                borderRadius: 8,
                padding: 24,
                width: 320,
                boxShadow: CHROME.modalShadow,
              }}
            >
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14 }}>
                Create &amp; connect new step
              </p>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: CHROME.textMuted }}>
                Name the new step, then choose which branch links to it.
              </p>
              <input
                value={dragNewTitle}
                onChange={(e) => setDragNewTitle(e.target.value)}
                placeholder="Step title…"
                autoFocus
                style={{
                  width: "100%",
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 4,
                  border: `1px solid ${CHROME.inputBorder}`,
                  boxSizing: "border-box",
                  marginBottom: 14,
                }}
              />
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => confirmDragToNew("Yes")}
                  disabled={dragNewSaving || !dragNewTitle.trim()}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    background: STATUS_COLORS.start,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: dragNewTitle.trim() ? 1 : 0.5,
                  }}
                >
                  Yes branch
                </button>
                <button
                  onClick={() => confirmDragToNew("No")}
                  disabled={dragNewSaving || !dragNewTitle.trim()}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    background: STATUS_COLORS.orphan,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    opacity: dragNewTitle.trim() ? 1 : 0.5,
                  }}
                >
                  No branch
                </button>
              </div>
              <button
                onClick={() => {
                  setPendingDragToNew(null);
                  setDragNewTitle("");
                }}
                disabled={dragNewSaving}
                style={{
                  width: "100%",
                  padding: "6px 0",
                  background: CHROME.btnNeutralBg,
                  color: CHROME.textSecondary,
                  border: "none",
                  borderRadius: 4,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              {dragNewSaving && (
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 12,
                    color: CHROME.textSubtle,
                    textAlign: "center",
                  }}
                >
                  Creating…
                </p>
              )}
            </div>
          </div>
        )}

        {/* Yes / No connection dialog — node to existing node */}
        {pendingConn && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: CHROME.overlay,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: CHROME.modalBg,
                borderRadius: 8,
                padding: 24,
                width: 300,
                boxShadow: CHROME.modalShadow,
              }}
            >
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 14 }}>
                New connection
              </p>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: CHROME.textSecondary }}>
                Is this the <strong>Yes</strong> or <strong>No</strong> branch?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => confirmConnect("Yes")}
                  disabled={connSaving}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    background: STATUS_COLORS.start,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Yes
                </button>
                <button
                  onClick={() => confirmConnect("No")}
                  disabled={connSaving}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    background: STATUS_COLORS.orphan,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  No
                </button>
                <button
                  onClick={() => setPendingConn(null)}
                  disabled={connSaving}
                  style={{
                    padding: "8px 12px",
                    background: CHROME.btnNeutralBg,
                    color: CHROME.btnNeutralText,
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
              {connSaving && (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: CHROME.textSubtle }}>
                  Saving…
                </p>
              )}
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
