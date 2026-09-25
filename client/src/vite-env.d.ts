/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Socket server origin, e.g. https://bluffsketch-api.onrender.com. Empty = same origin. */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
