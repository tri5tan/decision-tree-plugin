import { useState } from "react";
import type { Topic, Module } from "../types";
import type { LayoutSettings, NodeWidth } from "../config/tree-layout-config";
import { STATUS_COLORS, STATUS_COLORS_BUTTON, STATUS_META, CHROME, FD } from "../config/theme";

// ─── Status chip (used in sidebar legend only) ───────────────────────────────
function StatusChip({ status }: { status: string }) {
  const s = STATUS_META[status as keyof typeof STATUS_META] || STATUS_META.empty;
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.empty;
  return (
    <span
      style={{
        fontSize: 11,
        background: CHROME.cardBg,
        color: color.text,
        borderRadius: 3,
        padding: "4px 8px",
        fontWeight: 600,
        borderTop: `1px solid ${CHROME.cardBorderSubtle}`,
        borderRight: `1px solid ${CHROME.cardBorderSubtle}`,
        borderBottom: `1px solid ${CHROME.cardBorderSubtle}`,
        borderLeft: `4px solid ${color.border}`,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          paddingBottom: 2,
        }}
      >{s.icon}</span>
      <span>{s.label}</span>
    </span>
  );
}

// ─── Sidebar component ────────────────────────────────────────────────────────
interface EditorControlPanelProps {
  IS_DEV: boolean;
  subModulesUrl: string | undefined;
  moduleId: number;
  setModuleId: (id: number) => void;
  topics: Topic[];
  topicId: number | null;
  handleTopicChange: (id: number | null) => void;
  treeModules: Module[];
  filteredTTreeModules: Module[];
  treeModuleId: number;
  setTreeModuleId: (id: number) => void;
  addingNode: boolean;
  setAddingNode: (val: boolean) => void;
  newNodeTitle: string;
  setNewNodeTitle: (val: string) => void;
  creatingNode: boolean;
  createNode: () => void;
  layoutSettings: LayoutSettings;
  handleLayoutSettingChange: (patch: Partial<LayoutSettings>) => void;
  showA4Guide: boolean;
  setShowA4Guide: (v: boolean) => void;
}

export default function EditorControlPanel({
  IS_DEV,
  subModulesUrl,
  moduleId,
  setModuleId,
  topics,
  topicId,
  handleTopicChange,
  treeModules,
  filteredTTreeModules,
  treeModuleId,
  setTreeModuleId,
  addingNode,
  setAddingNode,
  newNodeTitle,
  setNewNodeTitle,
  creatingNode,
  createNode,
  layoutSettings,
  handleLayoutSettingChange,
  showA4Guide,
  setShowA4Guide,
}: EditorControlPanelProps) {
  return (
    <div
      className="left-panel"
      style={{
        width: 240,
        padding: 16,
        borderRight: `1px solid ${CHROME.panelBorder}`,
        background: CHROME.panelBg,
        flexShrink: 0,
        overflowX: "hidden",
        overflowY: "auto",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 14, fontWeight: 700 }}>
        Flow Diagram Editor
      </h2>

      {/* Topic filter — only shown when topics are available */}
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
      {treeModules.length === 0 ? (
        <div style={{ marginBottom: 16, fontSize: 11, color: CHROME.textSubtle, fontStyle: "italic" }}>
          No decision trees found.
        </div>
      ) : filteredTTreeModules.length === 0 && topicId !== null ? (
        <div style={{ marginBottom: 16, fontSize: 11, color: CHROME.textSubtle, fontStyle: "italic" }}>
          No modules under this topic.
        </div>
      ) : (
        <select
          value={moduleId}
          onChange={(e) => {
            const id = Number(e.target.value);
            setModuleId(id);
            setTreeModuleId(id);
            if (!IS_DEV) localStorage.setItem("decision_tree_default_module_id", String(id));
          }}
          style={{ width: "100%", padding: "5px 6px", fontSize: 12, marginBottom: 16 }}
        >
          <option value={0}>— Select a module —</option>
          {(topics.length > 0 ? filteredTTreeModules : treeModules).map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
      )}

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
            color: STATUS_COLORS_BUTTON.start,
            display: "block",
            marginBottom: 8,
          }}
        >
          ↗ All resources
        </a>
      )}
      {(moduleId > 0) && (
        <button
          onClick={() => {
            const cur = moduleId;
            setModuleId(0);
            setTimeout(() => setModuleId(cur), 50);
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
          disabled={!moduleId}
          style={{
            width: "100%",
            padding: "6px 0",
            background: STATUS_COLORS_BUTTON.start,
            color: FD.btnActionText,
            border: "none",
            borderRadius: 4,
            fontSize: 12,
            cursor: moduleId ? "pointer" : "not-allowed",
            opacity: moduleId ? 1 : 0.5,
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
                background: STATUS_COLORS_BUTTON.start,
                color: FD.btnActionText,
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
      {/* ── Settings ─────────────────────────────────────────────────── */}
      <hr style={{ margin: "16px 0", borderColor: CHROME.panelBorder }} />
      <details>
        <summary
          style={{
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 0,
          }}
        >
          ⚙ Settings
        </summary>
        <p style={{ fontSize: 10, color: CHROME.textSubtle, margin: "8px 0 12px" }}>
          Adjust the layout of the tree. Changes here also apply to the Flow Diagram Viewer.
        </p>
        <div style={{ marginTop: 10 }}>
          {/* Node width */}
          <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 5px", color: CHROME.textPrimary }}>Node width</p>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {(["narrow", "normal", "wide"] as NodeWidth[]).map((w) => (
              <button
                key={w}
                onClick={() => handleLayoutSettingChange({ nodeWidth: w })}
                style={{
                  flex: 1,
                  padding: "4px 0",
                  fontSize: 10,
                  border: `1px solid ${layoutSettings.nodeWidth === w ? STATUS_COLORS_BUTTON.start : CHROME.panelBorder}`,
                  background: layoutSettings.nodeWidth === w ? STATUS_COLORS_BUTTON.start : CHROME.cardBg,
                  color: layoutSettings.nodeWidth === w ? FD.btnActionText : CHROME.textPrimary,
                  cursor: "pointer",
                  borderRadius: 3,
                  textTransform: "capitalize",
                }}
              >
                {w}
              </button>
            ))}
          </div>
          {/* Node spacing */}
          <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 5px", color: CHROME.textPrimary }}>Node spacing</p>
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {(["compact", "normal", "relaxed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleLayoutSettingChange({ spacing: s })}
                style={{
                  flex: 1,
                  padding: "4px 0",
                  fontSize: 10,
                  border: `1px solid ${layoutSettings.spacing === s ? STATUS_COLORS_BUTTON.start : CHROME.panelBorder}`,
                  background: layoutSettings.spacing === s ? STATUS_COLORS_BUTTON.start : CHROME.cardBg,
                  color: layoutSettings.spacing === s ? FD.btnActionText : CHROME.textPrimary,
                  cursor: "pointer",
                  borderRadius: 3,
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Fit depth */}
          <p style={{ fontSize: 11, fontWeight: 600, margin: "0 0 5px", color: CHROME.textPrimary }}>Initial fit depth</p>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {/* {([1, 2, 3, 4, 99] as const).map((d) => { */}
            {([2, 3, 4, 99] as const).map((d) => {
              const isActive = d === 2
                ? layoutSettings.fitDepth === 2 || layoutSettings.fitDepth === null
                : layoutSettings.fitDepth === d;
              return (
                <button
                  key={d}
                  onClick={() => handleLayoutSettingChange({ fitDepth: d })}
                  style={{
                    flex: 1,
                    padding: "4px 0",
                    fontSize: 10,
                    border: `1px solid ${isActive ? STATUS_COLORS_BUTTON.start : CHROME.panelBorder}`,
                    background: isActive ? STATUS_COLORS_BUTTON.start : CHROME.cardBg,
                    color: isActive ? FD.btnActionText : CHROME.textPrimary,
                    cursor: "pointer",
                    borderRadius: 3,
                  }}
                >
                  {d === 99 ? "All" : String(d)}
                </button>
              );
            })}
          </div>
          {/* <p style={{ fontSize: 10, color: CHROME.textSubtle, margin: 0 }}>Applied on next reload</p> */}
        </div>
        {/* A4 guide toggle */}
        {/* <div className="a4-guide-toggle" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <input
            id="a4-guide-toggle"
            type="checkbox"
            checked={showA4Guide}
            onChange={(e) => setShowA4Guide(e.target.checked)}
            style={{ cursor: "pointer", margin: 0 }}
          />
          <label
            htmlFor="a4-guide-toggle"
            style={{ fontSize: 11, color: CHROME.textPrimary, cursor: "pointer", userSelect: "none" }}
          >
            Show A4 width guide
          </label>
        </div>
        <p style={{ fontSize: 10, color: CHROME.textSubtle, margin: "4px 0 0 22px" }}>
          Dashed line = A4 page width at 100% zoom
        </p> */}
      </details>
    </div>
  );
}
