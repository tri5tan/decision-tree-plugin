import { createRoot } from 'react-dom/client';
import 'reactflow/dist/style.css';
import TreeViewer from './components/TreeViewer';

// Support multiple viewer instances on the same page
const containers = document.querySelectorAll<HTMLElement>('.decision-tree-viewer');
containers.forEach((container) => {
  const moduleId = parseInt(container.dataset.moduleId ?? '0', 10) || 0;
  createRoot(container).render(<TreeViewer initialModuleId={moduleId} />);
});
