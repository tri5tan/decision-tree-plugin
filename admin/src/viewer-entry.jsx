import { createRoot } from 'react-dom/client';
import TreeViewer from './TreeViewer';
import 'reactflow/dist/style.css';

const container = document.getElementById('decision-tree-viewer');
if (container) {
  const root = createRoot(container);
  root.render(
    <TreeViewer 
      initialModuleId={parseInt(container.dataset.moduleId, 10) || 0} 
    />
  );
}
