import { createRoot } from 'react-dom/client';
import TreeEditor from './TreeEditor';
import 'reactflow/dist/style.css';

const container = document.getElementById('ct-decision-tree-admin');
if (container) {
  const root = createRoot(container);
  root.render(
    <TreeEditor initialModuleId={parseInt(container.dataset.moduleId, 10) || 0} />
  );
}
