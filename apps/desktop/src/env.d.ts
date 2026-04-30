/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  /** Marketing site origin used for sign-in (Phase 3.1+). Falls back to
   *  http://localhost:3041 in dev and https://dodev.ai in prod. */
  readonly MAIN_WEB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
