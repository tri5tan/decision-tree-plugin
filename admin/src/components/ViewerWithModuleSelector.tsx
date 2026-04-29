import { useState } from "react";
import TreeViewer from "./TreeViewer";
import { CHROME } from "../config/theme";
import { DEV_MODULES } from "../dev/devData";

const ViewerWithModuleSelector = ({
  initialModuleId,
  isDev,
}: {
  initialModuleId: number;
  isDev: boolean;
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState(
    isDev ? DEV_MODULES[0].id : initialModuleId,
  );
  const devModules = isDev ? DEV_MODULES : [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: 0,
      }}
    >
      {/* Module selector header — dev only */}
      {isDev && (
        <div
          className="module-selector"
          style={{
            background: CHROME.panelBg,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "Roboto, sans-serif",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          <label
            htmlFor="module-selector"
            style={{
              fontWeight: 600,
              color: CHROME.textStrong,
              whiteSpace: "nowrap",
            }}
          >
            Test Module:
          </label>
          <select
            id="module-selector"
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: `1px solid ${CHROME.panelBorder}`,
              background: CHROME.cardBg,
              fontFamily: "inherit",
              fontSize: "inherit",
              cursor: "pointer",
              flex: 1,
              maxWidth: 400,
            }}
          >
            {devModules.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Viewer */}
      <div className="dev-viewer-container" style={{ flex: 1, overflow: "hidden" }}>
        <TreeViewer
          initialModuleId={selectedModuleId}
          devTreeIndex={isDev ? selectedModuleId : undefined}
        />
      </div>
    </div>
  );
};

export default ViewerWithModuleSelector;
