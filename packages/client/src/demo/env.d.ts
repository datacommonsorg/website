/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
