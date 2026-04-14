import { createRoot } from 'react-dom/client';
import 'reactflow/dist/style.css';
import TreeViewer from './components/TreeViewer';

// Support multiple viewer instances on the same page
// Each instance has a unique ID but shares the 'decision-tree-viewer' class
const containers = document.querySelectorAll<HTMLElement>('.decision-tree-viewer');
containers.forEach((container) => {
  const root = createRoot(container);
  root.render(
    <TreeViewer 
      initialModuleId={parseInt(container.dataset.moduleId ?? '0', 10) || 0} 
    />
  );
});
