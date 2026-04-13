import { createRoot } from 'react-dom/client';
import TreeEditor from './components/TreeEditor';
import 'reactflow/dist/style.css';

const container = document.getElementById('decision-tree-admin');
if (container) {
  const root = createRoot(container);
  root.render(
    <TreeEditor />
  );
}
