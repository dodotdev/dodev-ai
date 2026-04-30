/**
 * Persist window bounds across launches. Stored at
 * `<userData>/window-state.json`. Restored on createWindow; written on
 * close (and best-effort on every move/resize via debounced save).
 *
 * If the persisted bounds reference a display that's no longer
 * connected (e.g. external monitor unplugged), we fall back to the
 * defaults so the window doesn't open offscreen.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { app, screen } from "electron"

export interface WindowBounds {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
}

function statePath(): string {
  return join(app.getPath("userData"), "window-state.json")
}

export function loadWindowState(defaults: WindowBounds): WindowBounds {
  if (!existsSync(statePath())) return defaults
  let stored: WindowBounds
  try {
    stored = JSON.parse(readFileSync(statePath(), "utf-8")) as WindowBounds
  } catch {
    return defaults
  }

  // Sanity-check the bounds before trusting them.
  if (
    typeof stored.width !== "number" ||
    typeof stored.height !== "number" ||
    stored.width < 400 ||
    stored.height < 300
  ) {
    return defaults
  }

  // If x/y are set, make sure they intersect a connected display so we
  // don't restore a window onto a monitor that no longer exists.
  if (stored.x !== undefined && stored.y !== undefined) {
    const visible = screen.getAllDisplays().some((d) => {
      const w = stored.width
      const h = stored.height
      const x = stored.x ?? 0
      const y = stored.y ?? 0
      // Require at least 100x100 of the window to be on-screen.
      const r = d.workArea
      const overlapX = Math.max(0, Math.min(x + w, r.x + r.width) - Math.max(x, r.x))
      const overlapY = Math.max(0, Math.min(y + h, r.y + r.height) - Math.max(y, r.y))
      return overlapX >= 100 && overlapY >= 100
    })
    if (!visible) {
      return { width: stored.width, height: stored.height }
    }
  }

  return stored
}

export function saveWindowState(bounds: WindowBounds): void {
  try {
    writeFileSync(statePath(), JSON.stringify(bounds))
  } catch {
    // best-effort
  }
}
