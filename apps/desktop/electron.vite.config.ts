import { resolve } from "node:path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"

// The renderer intentionally has no build config here. The desktop app
// loads apps/dashboard verbatim:
//   - dev: http://localhost:3042 (dashboard's vite dev server)
//   - prod: file://<resources>/dashboard/index.html (copied in by
//           electron-builder via extraResources in Phase 3.4)
//
// Building the renderer separately would mean two builds of the same
// code; runtime target detection (window.dodev) lets one Vite bundle
// serve both.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    envPrefix: ["VITE_", "MAIN_"],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/main/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/preload/index.ts"),
        },
      },
    },
  },
})
