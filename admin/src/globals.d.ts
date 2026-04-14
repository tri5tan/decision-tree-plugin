/// <reference types="vite/client" />

// Declares window globals injected by the PHP plugin (wp_localize_script / wp_add_inline_script).

interface DtWindowData {
  restUrl: string;
  nonce: string;
  editPostUrl: string;
  subModulesUrl: string;
}

declare global {
  interface Window {
    dt?: DtWindowData;
    dtViewer?: {
      restUrl: string;
      nonce?: string;
    };
  }
}

// Allow CSS side-effect imports (handled by Vite at build time).
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

export {};
