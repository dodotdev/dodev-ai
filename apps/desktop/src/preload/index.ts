import { contextBridge } from "electron"

// Phase 3.0 stub. The `dodev` object expands in Phase 3.1 to include
// getSession / signIn / signOut / refreshSession, at which point the
// renderer's runtime target check (`if (window.dodev) …`) picks the
// desktop SessionSource.
const dodev = {
  isDesktop: true as const,
}

try {
  contextBridge.exposeInMainWorld("dodev", dodev)
} catch (error) {
  console.error("[preload] failed to expose dodev API:", error)
}

export type DodevBridge = typeof dodev
