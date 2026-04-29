import { createRoot } from 'react-dom/client';
import 'reactflow/dist/style.css';
import ViewerWithModuleSelector from './components/ViewerWithModuleSelector';

// Dev harness only — not part of the production build.
// Mounts the viewer with the dev module selector.
const container = document.getElementById('viewer-dev');
if (container) {
  const moduleId = parseInt(container.dataset.moduleId ?? '1', 10) || 1;
  createRoot(container).render(
    <ViewerWithModuleSelector
      initialModuleId={moduleId}
      isDev={true}
    />
  );
}
