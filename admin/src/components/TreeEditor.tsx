import { useState, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useViewport,
  type OnConnect,
  type OnConnectStart,
  type Node as FlowNode,
} from "reactflow";
import EditorNodePanel from "./EditorNodePanel";
import EditorControlPanel from "./EditorControlPanel";
import DTNode, { NodeCallbacks } from "./DTNode";
import DecisionEdge, { EdgeCallbacks } from "./DecisionEdge";
import { STATUS_COLORS_BUTTON, CHROME, getNodeMinimapColor } from "../config/theme";
import { getZoomBounds } from "../config/tree-layout-config";
import useTreeEditor from "../hooks/useTreeEditor";


const nodeTypes = { "kb-node": DTNode };
const edgeTypes = { "decision-edge": DecisionEdge };

// ─── A4 guide overlay ─────────────────────────────────────────────────────────
// A4 portrait with 10mm margins = 190mm usable = ~719 CSS px at 96dpi.
// Rendered inside <ReactFlow> so useViewport() has access to the canvas transform.
const A4_GUIDE_W = 719;

function A4GuideOverlay() {
  const { x, zoom } = useViewport();
  return (
    <div
      style={{
        position: "absolute",
        pointerEvents: "none",
        zIndex: 4,
        left: x,
        top: 0,
        height: "100%",
        width: A4_GUIDE_W * zoom,
        borderRight: "2px dashed rgba(255, 140, 0, 0.75)",
        background: "rgba(255, 180, 0, 0.04)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 0,
          transform: "translateX(50%)",
          background: "rgba(200, 110, 0, 0.88)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 7px",
          borderRadius: 3,
          whiteSpace: "nowrap",
          letterSpacing: "0.02em",
        }}
      >
        A4 width
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TreeEditor() {
  const [adminBarHeight, setAdminBarHeight] = useState(33); // Default to 33px, which is the typical height of the WP admin bar. This is used to set the editor's height so it doesn't get hidden behind the bar. We measure it on mount in case it's a different height (e.g. due to custom admin bar items or responsive layout).
  const [showA4Guide, setShowA4Guide] = useState(false);

  useEffect(() => {
    const adminBar = document.getElementById("wpadminbar");
    if (adminBar) {
      setAdminBarHeight(adminBar.offsetHeight);
    }
  }, []);

  const {
    IS_DEV, editPostUrl, subModulesUrl,
    topics, topicId, treeModules, treeModuleId, setTreeModuleId,
    filteredTTreeModules, topicGroups, handleTopicChange,
    moduleId, setModuleId,
    selectedModuleTitle, layoutSettings, handleLayoutSettingChange,
    nodes, edges, onNodesChange, onEdgesChange,
    selectedNode, setSelectedNode,
    reactFlowInstance, setReactFlowInstance,
    loading, error,
    addingNode, setAddingNode, newNodeTitle, setNewNodeTitle, creatingNode,
    pendingConn, setPendingConn, connSaving,
    pendingDragToNew, setPendingDragToNew, dragNewTitle, setDragNewTitle, dragNewSaving,
    onNodeClick, onUpdateNode, onUpdateEdge, selectNodeById,
    onConnectStart, onConnect, onConnectEnd,
    deleteEdge, confirmDragToNew, confirmConnect,
    clearStart, setAsStart, markAsTerminal, unmarkTerminal,
    deleteNode, createNode,
    layoutLocked, layoutDirty, saveLayout, resetLayout,
    fitForPrint,
  } = useTreeEditor();

  // ── Print handler: keep a stable ref to the latest fitForPrint so the
  //    beforeprint listener doesn't need to be re-registered on every render.
  const fitForPrintRef = useRef(fitForPrint);
  useEffect(() => { fitForPrintRef.current = fitForPrint; });
  useEffect(() => {
    const handler = () => fitForPrintRef.current?.();
    window.addEventListener("beforeprint", handler);
    return () => window.removeEventListener("beforeprint", handler);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <EdgeCallbacks.Provider value={{ onDeleteEdge: deleteEdge }}>
    <NodeCallbacks.Provider
      value={{
        onMarkTerminal: markAsTerminal,
        onSetStart: setAsStart,
        onUnmarkTerminal: unmarkTerminal,
        onClearStart: clearStart,
      }}
    >
      {/* ── Print styles ── */}
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          /* Hide WP chrome and all panels — only canvas goes to paper */
          #wpadminbar,
          #adminmenuwrap,
          #adminmenuback,
          #wpfooter,
          .left-panel,
          .react-flow__controls,
          .react-flow__minimap,
          .react-flow__panel { display: none !important; }

          /* Let the canvas fill the full printable area */
          .tree-editor-window {
            height: 100vh !important;
            max-height: 100vh !important;
          }
        }
      `}</style>
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
        <EditorControlPanel
          IS_DEV={IS_DEV}
          subModulesUrl={subModulesUrl}
          moduleId={moduleId}
          setModuleId={setModuleId}
          topics={topics}
          topicId={topicId}
          handleTopicChange={handleTopicChange}
          treeModules={treeModules}
          filteredTTreeModules={filteredTTreeModules}
          treeModuleId={treeModuleId}
          setTreeModuleId={setTreeModuleId}
          addingNode={addingNode}
          setAddingNode={setAddingNode}
          newNodeTitle={newNodeTitle}
          setNewNodeTitle={setNewNodeTitle}
          creatingNode={creatingNode}
          createNode={createNode}
          layoutSettings={layoutSettings}
          handleLayoutSettingChange={handleLayoutSettingChange}
          showA4Guide={showA4Guide}
          setShowA4Guide={setShowA4Guide}
        />

        {/* ── Main canvas ── */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Module title overlay — top-left of canvas, no background */}
          {moduleId > 0 && selectedModuleTitle && (
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 16,
                fontSize: 15,
                fontWeight: 700,
                color: CHROME.textStrong,
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              {selectedModuleTitle}
            </div>
          )}
          {!moduleId && !loading && (
            <>
              <style>{`@keyframes dt-placeholder-show { to { opacity: 1 } }`}</style>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: CHROME.textPlaceholder,
                  fontSize: 13,
                  opacity: 0,
                  animation: "dt-placeholder-show 0ms 400ms forwards",
                }}
              >
                Select a module on the left to view its decision tree.
              </div>
            </>
          )}
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
                color: STATUS_COLORS_BUTTON.orphan,
                fontSize: 13,
                zIndex: 10,
              }}
            >
              {error}
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
              nodeColor={(n: FlowNode) => getNodeMinimapColor(n.data)}
              style={{ background: CHROME.textSubtle }}
            />
            {/* ── A4 guide overlay ── */}
            {showA4Guide && <A4GuideOverlay />}
            {/* ── Layout lock panel ── */}
            {moduleId > 0 && (
              <Panel position="top-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {layoutLocked && !layoutDirty && (
                  <span style={{ fontSize: 11, color: CHROME.textMuted, padding: '4px 0' }}>Layout saved</span>
                )}
                {(layoutDirty || !layoutLocked) && (
                  <button
                    onClick={saveLayout}
                    style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 4,
                      background: layoutDirty ? STATUS_COLORS_BUTTON.complete : CHROME.btnNeutralBg,
                      color: layoutDirty ? '#fff' : CHROME.btnNeutralText,
                      border: 'none', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    Save layout
                  </button>
                )}
                {layoutLocked && (
                  <button
                    onClick={resetLayout}
                    style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 4,
                      background: CHROME.btnNeutralBg, color: CHROME.btnNeutralText,
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Auto-layout
                  </button>
                )}
              </Panel>
            )}
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
                    background: STATUS_COLORS_BUTTON.start,
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
                    background: STATUS_COLORS_BUTTON.orphan,
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
                    background: STATUS_COLORS_BUTTON.start,
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
                    background: STATUS_COLORS_BUTTON.orphan,
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
          <EditorNodePanel
            node={selectedNode}
            outgoingEdges={selectedNode.outgoingEdges || []}
            onClose={() => setSelectedNode(null)}
            editPostUrl={editPostUrl}
            onUpdateNode={onUpdateNode}
            onUpdateEdge={onUpdateEdge}
            onDeleteEdge={deleteEdge}
            onDeleteNode={deleteNode}
            onSelectNode={selectNodeById}
            onMarkTerminal={markAsTerminal}
            onSetStart={setAsStart}
            onUnmarkTerminal={unmarkTerminal}
            onClearStart={clearStart}
          />
        )}
      </div>
    </NodeCallbacks.Provider>
    </EdgeCallbacks.Provider>
  );
}
