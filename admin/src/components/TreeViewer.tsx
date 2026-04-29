import { useState, useEffect, useRef, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  getNodesBounds,
  type Node as FlowNode,
} from 'reactflow';
import { toPng } from 'html-to-image';
import ViewerNode from './ViewerNode';
import ViewerNodePanel from './ViewerNodePanel';
import DecisionEdge from './DecisionEdge';
import Icon from './Icon';
import { STATUS_COLORS, CHROME, FD, getNodeMinimapColor } from '../config/theme';
import { getZoomBounds, getFitLevels, getLayoutConfig, getNodeWidth, getNodeHeight, PRINT_MAX_LEVELS } from '../config/tree-layout-config';
import { getNodesInFirstNLevels } from '../utils/graphUtils';
import useTreeViewerLoader from '../hooks/useTreeViewerLoader';
import type { Node } from 'reactflow';
import type { StepData } from '../types';

// ─── Print / export constants ─────────────────────────────────────────────────
// A4 portrait at 96 dpi with 10 mm margins:
//   printable width  = 190 mm × (96/25.4) ≈ 719 px
//   printable height = 277 mm × (96/25.4) ≈ 1047 px
const A4_W    = 719;   // capture width  = printable A4 width in CSS px
const PAGE_H  = 1047;  // capture height = printable A4 height in CSS px
const PAD_PX  = 30;    // whitespace padding around tree content in the capture
const OVERLAP = 60;    // px of repeated content at each page cut (overlap context)
const HDR_H   = 52;    // px reserved for header baked into canvas 1

// Slices a full-height PNG into page-sized canvases — one per A4 page.
// ALL measurements are derived from img.naturalWidth so the logic is correct
// regardless of pixelRatio. Canvases are output at the same resolution as the
// source image (e.g. 1438×2094 at 2× pixelRatio) so jsPDF gets full-resolution
// pages when it places each image into the PDF at 190×277 mm.
function sliceForPrint(dataUrl: string, title: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const imgW  = img.naturalWidth;          // A4_W × pixelRatio
      const imgH  = img.naturalHeight;         // captureH × pixelRatio
      const scale = imgW / A4_W;               // pixelRatio (1 or 2)

      // All heights in source (natural) pixels
      const hdrH_src     = Math.round(HDR_H            * scale);
      const pageH_src    = Math.round(PAGE_H            * scale);
      const overlap_src  = Math.round(OVERLAP           * scale);
      const p1TreeH_src  = pageH_src - hdrH_src;

      const makeCanvas = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
        const c = document.createElement('canvas');
        c.width  = imgW;
        c.height = pageH_src;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = FD.cardBg;
        ctx.fillRect(0, 0, imgW, pageH_src);
        return [c, ctx];
      };

      const drawHeader = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = CHROME.textSubtle;
        ctx.font = `${Math.round(10 * scale)}px Arial`;
        ctx.fillText('TAITUARĀ - COUNCIL TOOLKIT', Math.round(6 * scale), Math.round(14 * scale));
        ctx.fillStyle = CHROME.textStrong;
        ctx.font = `bold ${Math.round(15 * scale)}px Arial`;
        ctx.fillText(title.length > 80 ? title.slice(0, 77) + '...' : title, Math.round(6 * scale), Math.round(36 * scale));
        ctx.strokeStyle = CHROME.panelBorder;
        ctx.lineWidth = scale;
        ctx.beginPath();
        ctx.moveTo(0, Math.round((HDR_H - 4) * scale));
        ctx.lineTo(imgW, Math.round((HDR_H - 4) * scale));
        ctx.stroke();
      };

      const slices: string[] = [];
      let srcY = 0;

      while (srcY < imgH) {
        const [canvas, ctx] = makeCanvas();
        const isFirst = slices.length === 0;
        const destY   = isFirst ? hdrH_src : 0;
        const avail   = isFirst ? p1TreeH_src : pageH_src;

        if (isFirst) drawHeader(ctx);

        const drawH = Math.min(imgH - srcY, avail);
        // Only push this slice if it has meaningful content (> 10% of a page).
        // A near-zero drawH means srcY landed just past the last real pixel —
        // the while condition passed but there's nothing left to draw.
        if (drawH > pageH_src * 0.1) {
          ctx.drawImage(img, 0, srcY, imgW, drawH, 0, destY, imgW, drawH);
          slices.push(canvas.toDataURL('image/png'));
        }

        srcY += avail - overlap_src;
        if (srcY >= imgH) break;
      }

      resolve(slices.length > 0 ? slices : [dataUrl]);
    };
    img.onerror = () => resolve([dataUrl]);
    img.src = dataUrl;
  });
}

// Popup print approach — no extra dependency.
// Each slice is exactly imgW × pageH_src px. In the popup we set
//   img { width: 190mm; height: 277mm }
// inside a div that is also 190×277mm with page-break-after:always.
// This works correctly because each canvas is already the right A4 proportions —
// the browser only needs to map mm → paper, which it does reliably at 1:1.
// Note: slices are at pixelRatio resolution (e.g. 1438×2094 at 2×) — setting an
// explicit px size on the img would re-introduce the scaling problem, so we use mm.
function buildPopupHtml(slices: string[], title: string): string {
  // No wrapper divs — images go directly in body.
  // Fixed-height container divs + page-break-after:always triggers Chrome's
  // double-break bug: the block fills the page (implicit break) AND the rule
  // fires (explicit break) → blank page inserted between every content page.
  //
  // Fix: height:auto on <img> (aspect ratio computes to ~277mm = one A4 page),
  // break-after:page on every img except the last. Natural flow + one explicit
  // break = exactly one page per image, no phantom blanks.
  const imgs = slices.map((src, i) => {
    const isLast = i === slices.length - 1;
    const style  = isLast ? 'display:block;width:190mm;height:auto;'
                          : 'display:block;width:190mm;height:auto;break-after:page;';
    return `<img src="${src}" style="${style}" alt=""/>`;
  }).join('\n');

  const printScript = `
(function() {
  var imgs = document.querySelectorAll('img'), total = imgs.length, done = 0;
  function tryPrint() { if (++done >= total) { requestAnimationFrame(function() { window.print(); window.addEventListener('afterprint', function() { window.close(); }); }); } }
  if (!total) { window.print(); return; }
  imgs.forEach(function(img) { if (img.complete) tryPrint(); else { img.addEventListener('load', tryPrint); img.addEventListener('error', tryPrint); } });
})();`.trim();

  return (
    `<!DOCTYPE html><html><head>\n` +
    `<meta charset="utf-8"><title>${title}</title>\n` +
    `<style>\n` +
    `  @page { size:A4 portrait; margin:10mm; }\n` +
    `  * { margin:0; padding:0; box-sizing:border-box; }\n` +
    `  body { background:${CHROME.cardBg}; }\n` +
    `</style>\n` +
    `</head><body>\n${imgs}\n` +
    `<script>${printScript}<\/script>\n` +
    `</body></html>`
  );
}

const nodeTypes = { 'viewer-node': ViewerNode };
const edgeTypes = { 'decision-edge': DecisionEdge };

// ─── View-only Tree Component ─────────────────────────────────────────────────
export default function TreeViewer({ 
  initialModuleId,
  devTreeIndex,
}: { 
  initialModuleId: number;
  devTreeIndex?: number;
}) {
  const IS_DEV  = !window.dtViewer?.restUrl;
  const { restUrl = '' } = window.dtViewer || {};

  const { nodes, setNodes, edges, loading, error, moduleTitle } = useTreeViewerLoader({
    moduleId: initialModuleId,
    IS_DEV,
    devTreeIndex,
    restUrl: restUrl ? restUrl.replace(/\/?$/, '/') : '',
  });

  const [selectedNode, setSelectedNode] = useState<Node<StepData> | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Track whether we've already fitted view for this module to avoid repeated resets
  const hasFittedRef = useRef(false);
  const fittedModuleRef = useRef<string | null>(null);

  // ── beforeprint: fit first PRINT_MAX_LEVELS levels (A4-friendly) ──────────
  const rootNodeRef = useRef<Node<StepData> | null>(null);
  const nodesRef    = useRef(nodes);
  const edgesRef    = useRef(edges);
  const rfRef       = useRef<any>(null);
  // Keep refs fresh on every render
  useEffect(() => { nodesRef.current = nodes; });
  useEffect(() => { edgesRef.current = edges; });
  useEffect(() => { rfRef.current = reactFlowInstance; });
  useEffect(() => {
    rootNodeRef.current = nodes.find((n) => (n as any).data?.isRoot) ?? null;
  }, [nodes]);

  // ── Image capture (html-to-image) ──────────────────────────────────────────
  const captureTreePng = useCallback((): Promise<string> => {
    const rf = rfRef.current;
    if (!rf) return Promise.reject(new Error('React Flow not ready'));

    // rf.getNodes() has measured dimensions (written by RF after first render).
    // Fall back to configured sizes for any node not yet measured.
    const fallbackW = getNodeWidth();
    const fallbackH = getNodeHeight();
    const allNodes  = (rf.getNodes() as FlowNode[]).map(n => ({
      ...n,
      width:  n.width  ?? fallbackW,
      height: n.height ?? fallbackH,
    }));
    if (allNodes.length === 0) return Promise.reject(new Error('No nodes'));

    // Use ALL nodes for bounds — do NOT filter by PRINT_MAX_LEVELS here.
    // Filtering caused captureH to be computed from a fraction of the tree,
    // so lower nodes fell outside the canvas and vanished from the output.
    const bounds    = getNodesBounds(allNodes);
    const availW    = A4_W - 2 * PAD_PX;
    const zoom      = Math.min(availW / bounds.width, 1.0); // never scale up
    const captureH  = Math.ceil(bounds.height * zoom + 2 * PAD_PX);
    const x = PAD_PX + Math.max(0, (availW - bounds.width * zoom) / 2) - bounds.x * zoom;
    const y = PAD_PX - bounds.y * zoom;

    const el = document.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!el) return Promise.reject(new Error('Viewport element not found'));

    return toPng(el, {
      backgroundColor: FD.cardBg,
      width: A4_W,
      height: captureH,
      pixelRatio: 2,
      // Declare Arial as the capture font so all text elements use consistent,
      // predictable glyph metrics. skipFonts:true falls back to DejaVu/system
      // default which has different character widths — edge labels and callout
      // text overflow their containers because the browser sized the boxes for
      // Roboto but the canvas renderer used a wider font.
      // fontEmbedCSS is injected into the SVG before rasterisation, NOT loaded
      // from a URL — no CORS issues, no async fetching.
      fontEmbedCSS: `* { font-family: Arial, Helvetica, sans-serif !important; }`,
      style: {
        width:     `${A4_W}px`,
        height:    `${captureH}px`,
        transform: `translate(${x}px, ${y}px) scale(${zoom})`,
      },
    });
  }, []);

  const fitAndPrint = useCallback(() => {
    setSelectedNode(null);
    requestAnimationFrame(() => {
      const title = moduleTitle ?? 'Decision Tree';
      captureTreePng()
        .then((dataUrl) => sliceForPrint(dataUrl, title))
        .then((slices) => {
          const popup = window.open('', '_blank', `width=800,height=1000`);
          if (!popup) { alert('Pop-up blocked — please allow pop-ups for this page.'); return; }
          popup.document.write(buildPopupHtml(slices, title));
          popup.document.close();
        })
        .catch((err) => { console.error('[TreeViewer] Print capture failed:', err); });
    });
  }, [captureTreePng, moduleTitle]);

  const downloadPng = useCallback(() => {
    setSelectedNode(null);
    requestAnimationFrame(() => {
      const title = moduleTitle ?? 'Decision Tree';
      captureTreePng()
        .then((dataUrl) => {
          // Composite the branding header onto the raw capture before downloading.
          // Reuses drawHeader logic from sliceForPrint so the output matches print.
          const img = new Image();
          img.onload = () => {
            const scale  = img.naturalWidth / A4_W;
            const hdrPx  = Math.round(HDR_H * scale);
            const c      = document.createElement('canvas');
            c.width  = img.naturalWidth;
            c.height = img.naturalHeight + hdrPx;
            const ctx = c.getContext('2d')!;
            ctx.fillStyle = FD.cardBg;
            ctx.fillRect(0, 0, c.width, c.height);
            // header
            ctx.fillStyle = CHROME.textSubtle;
            ctx.font = `${Math.round(10 * scale)}px Arial`;
            ctx.fillText('TAITUARĀ – COUNCIL TOOLKIT', Math.round(6 * scale), Math.round(14 * scale));
            ctx.fillStyle = CHROME.textStrong;
            ctx.font = `bold ${Math.round(15 * scale)}px Arial`;
            ctx.fillText(title.length > 80 ? title.slice(0, 77) + '...' : title, Math.round(6 * scale), Math.round(36 * scale));
            ctx.strokeStyle = CHROME.panelBorder;
            ctx.lineWidth = scale;
            ctx.beginPath();
            ctx.moveTo(0, Math.round((HDR_H - 4) * scale));
            ctx.lineTo(c.width, Math.round((HDR_H - 4) * scale));
            ctx.stroke();
            // tree
            ctx.drawImage(img, 0, hdrPx);
            const a = document.createElement('a');
            a.href = c.toDataURL('image/png');
            a.download = `${title.replace(/\s+/g, '-')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };
          img.src = dataUrl;
        })
        .catch((err) => { console.error('[TreeViewer] PNG download failed:', err); });
    });
  }, [captureTreePng, moduleTitle]);

  useEffect(() => {
    (window as any).dtFitAndPrint = fitAndPrint;
    (window as any).dtDownloadPng = downloadPng;
    return () => {
      delete (window as any).dtFitAndPrint;
      delete (window as any).dtDownloadPng;
    };
  }, [fitAndPrint, downloadPng]); // re-register when title loads so closures capture the fresh value

  // Auto fitView on first load per module — same as editor
  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0) return;

    const rootNode = nodes.find((n) => (n as any).data?.isRoot);
    if (!rootNode) return;

    const treeKey = `viewer-${initialModuleId}`;
    if (fittedModuleRef.current !== treeKey) {
      hasFittedRef.current = false;
      fittedModuleRef.current = treeKey;
    }

    if (hasFittedRef.current) return;
    hasFittedRef.current = true;

    const levels = getFitLevels();
    const subset = getNodesInFirstNLevels(nodes, edges, rootNode.id, levels);

    setTimeout(() => {
      reactFlowInstance.fitView({
        nodes: subset.length > 0 ? subset : undefined,
        padding: 0.25,
        minZoom: getZoomBounds().fitMinZoom,
        maxZoom: getZoomBounds().fitMaxZoom,
        duration: 350,
      });
    }, 80);
  }, [reactFlowInstance, nodes, edges, initialModuleId]);

  const handleNodeClick = (_event: React.MouseEvent, node: Node<StepData>) => {
    setSelectedNode(node);
  };

  // Navigate sidebar to a node by ID (used by DecisionPathCards click).
  // Mirrors the editor's selectNodeById — updates canvas selection state, pans, nudges zoom.
  const selectNodeById = (nodeId: string) => {
    setNodes((prev) => {
      const target = prev.find((n) => n.id === nodeId);
      if (target) setSelectedNode(target);
      return prev.map((n) => ({ ...n, selected: n.id === nodeId }));
    });
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;
    if (reactFlowInstance) {
      const cfg   = getLayoutConfig();
      const nodeW = (cfg.nodeWidthMin + cfg.nodeWidthMax) / 2;
      const cx    = (target.position?.x ?? 0) + nodeW / 2;
      const cy    = (target.position?.y ?? 0);

      const MIN_ZOOM    = 0.45;
      const MAX_ZOOM    = 1.2;
      const TARGET_LOW  = 0.65;
      const TARGET_HIGH = 0.85;

      const current = reactFlowInstance.getZoom?.() ?? 0.75;
      const zoom =
        current < MIN_ZOOM ? TARGET_LOW  :
        current > MAX_ZOOM ? TARGET_HIGH :
        current;

      reactFlowInstance.setCenter(cx, cy, { zoom, duration: 420 });
    }
  };

  const outgoingEdges = selectedNode 
    ? edges.filter(e => e.source === selectedNode.id)
    : [];

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      minHeight: 500,
      background: CHROME.panelBg,
      fontFamily: 'Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      border: `1px solid ${CHROME.panelBorder}`,
      borderRadius: 4,
      boxShadow: CHROME.cardShadow,
      overflow: 'hidden',
    }}>
      {/* No @media print styles needed — printing is done via a captured-image pop-up window */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '16px 16px 8px',
      }}>
        {moduleTitle && (
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: CHROME.textStrong,
            }}
          >
            {moduleTitle}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={fitAndPrint}
            title="Print the decision tree"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              borderRadius: 5,
              background: FD.btnActionBg,
              color: FD.btnActionText,
              padding: '7px 12px',
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <Icon name="print" size={16} />
            Print
          </button>
        </div>
      </div>
      {loading && (
        <div style={{
          position: 'absolute', 
          inset: 0, 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(250,250,250,0.9)', 
          zIndex: 10, 
          fontSize: 14,
          color: CHROME.textMuted,
        }}>
          Loading decision tree…
        </div>
      )}
      
      {error && (
        <div style={{
          position: 'absolute', 
          top: 20, 
          left: '50%',
          transform: 'translateX(-50%)',
          background: CHROME.errorBg, 
          padding: '12px 20px', 
          borderRadius: 6,
          color: STATUS_COLORS.orphan.base, 
          fontSize: 14, 
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          {error}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={getZoomBounds().minZoom}
        maxZoom={getZoomBounds().maxZoom}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={handleNodeClick}
        onInit={(instance: any) => { setReactFlowInstance(instance); rfRef.current = instance; }}
        style={{ 
          flex: 1,
        }}
      >
        <Background color={CHROME.canvasGrid} gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n: FlowNode) => getNodeMinimapColor(n.data)}
          style={{ background: CHROME.cardBg, border: `1px solid ${CHROME.panelBorder}` }}
        />
      </ReactFlow>

      {/* Sidebar panel */}
      {selectedNode && (
        <ViewerNodePanel
          node={selectedNode}
          outgoingEdges={outgoingEdges}
          onClose={() => setSelectedNode(null)}
          onSelectNode={selectNodeById}
        />
      )}
    </div>
  );
}
