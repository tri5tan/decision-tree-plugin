import { createRoot } from 'react-dom/client';
import TreeEditor from './components/TreeEditor';
import 'reactflow/dist/style.css';

// Scoped CSS reset for HTML content rendered inside node card body snippets.
// WP admin's stylesheet sets large margins/padding on ul/ol/li by default;
// these resets keep the compact node card appearance intact.
const style = document.createElement('style');
style.textContent = [
  '.body-content ul, .body-content ol { margin: 0; padding: 0 0 0 14px; }',
  '.body-content li { margin: 0; padding: 0; }',
  '.body-content p  { margin: 0; }',
].join(' ');
document.head.appendChild(style);

const container = document.getElementById('decision-tree-admin');
if (container) {
  const root = createRoot(container);
  root.render(
    <TreeEditor />
  );
}
