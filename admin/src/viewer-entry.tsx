import { createRoot } from 'react-dom/client';
import 'reactflow/dist/style.css';
import TreeViewer from './components/TreeViewer';
import ViewerWithModuleSelector from './components/ViewerWithModuleSelector';

// Support multiple viewer instances on the same page
// Each instance has a unique ID but shares the 'decision-tree-viewer' class
const containers = document.querySelectorAll<HTMLElement>('.decision-tree-viewer');
containers.forEach((container) => {
  const root = createRoot(container);
  const moduleId = parseInt(container.dataset.moduleId ?? '0', 10) || 0;
  const IS_DEV = !window.dtViewer?.restUrl;
  const restUrl = window.dtViewer?.restUrl || '';

  // Dev mode or API mode with selector: show module dropdown
  root.render(
    IS_DEV || restUrl ? (
      <ViewerWithModuleSelector 
        initialModuleId={moduleId}
        isDev={IS_DEV}
        restUrl={restUrl ? restUrl.replace(/\/?$/, '/') : null}
      />
    ) : (
      <TreeViewer 
        initialModuleId={moduleId} 
      />
    )
  );
});
