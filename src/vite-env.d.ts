/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_URL?: string;
  readonly VITE_ENABLE_DEMO_HOOKS?: string;
  readonly VITE_DEFAULT_LOCALE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
