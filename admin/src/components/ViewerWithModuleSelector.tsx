import { useState, useEffect } from 'react';
import TreeViewer from './TreeViewer';
import { CHROME } from '../config/theme';

interface Module {
  id: number;
  title: string;
}

const ViewerWithModuleSelector = ({ 
  initialModuleId,
  isDev,
  restUrl,
}: { 
  initialModuleId: number;
  isDev: boolean;
  restUrl: string | null;
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState(initialModuleId);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(!isDev); // auto-loaded if not dev
  const [error, setError] = useState<string | null>(null);

  // Dev mode: provide options to switch between dev trees
  useEffect(() => {
    if (isDev) {
      const devTrees = [
        { id: 1, title: 'Dog Control — Request for Service' },
        { id: 2, title: 'Food Act Compliance' },
        { id: 3, title: 'Building Consent' },
        { id: 4, title: 'Liquor Licensing' },
        { id: 5, title: 'Planning Compliance' },
      ];
      setModules(devTrees);
      setSelectedModuleId(1);
      return;
    }

    // API mode: fetch from device REST API
    const fetchModules = async () => {
      if (!restUrl) {
        setError('No REST URL provided');
        setLoadingModules(false);
        return;
      }

      try {
        const response = await fetch(restUrl + 'modules');
        if (!response.ok) throw new Error('Failed to fetch modules');
        const data = await response.json();
        setModules(Array.isArray(data) ? data : []);
        
        // If initialModuleId is not in the list, use the first one
        if (initialModuleId && Array.isArray(data) && !data.find(m => m.id === initialModuleId)) {
          if (data.length > 0) {
            setSelectedModuleId(data[0].id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading modules');
        console.error('[ViewerWithModuleSelector] Error fetching modules:', err);
      } finally {
        setLoadingModules(false);
      }
    };

    if (restUrl) {
      fetchModules();
    }
  }, [isDev, restUrl, initialModuleId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Module selector header */}
      <div
        style={{
          background: CHROME.panelBg,
          borderBottom: `1px solid ${CHROME.panelBorder}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: 'Roboto, sans-serif',
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        <label
          htmlFor="module-selector"
          style={{
            fontWeight: 600,
            color: CHROME.textStrong,
            whiteSpace: 'nowrap',
          }}
        >
          {isDev ? 'Test Module:' : 'Module:'}
        </label>
        {loadingModules ? (
          <div style={{ color: CHROME.textMuted, fontStyle: 'italic' }}>Loading modules…</div>
        ) : error ? (
          <div style={{ color: '#d32f2f', fontSize: 12 }}>{error}</div>
        ) : (
          <select
            id="module-selector"
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              borderRadius: 4,
              border: `1px solid ${CHROME.panelBorder}`,
              background: '#ffffff',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              cursor: 'pointer',
              flex: 1,
              maxWidth: 400,
            }}
          >
            {modules.map((mod) => (
              <option key={mod.id} value={mod.id}>
                {mod.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TreeViewer 
          initialModuleId={selectedModuleId}
          devTreeIndex={isDev ? selectedModuleId : undefined}
        />
      </div>
    </div>
  );
};

export default ViewerWithModuleSelector;
