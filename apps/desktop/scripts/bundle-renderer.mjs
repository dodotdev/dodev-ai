#!/usr/bin/env node
/**
 * Copy the dashboard's Vite build output into out/renderer/ so the
 * Electron main process can `loadFile(out/renderer/index.html)` in
 * production.
 *
 * Why a script and not just a relative `loadFile(...)` to ../dashboard/dist?
 * electron-builder bundles `out/**` into the packaged .app/.exe; sibling
 * directories outside `out/` are not copied. Bundling the dashboard
 * inside `out/renderer/` keeps everything inside the packaged tree.
 *
 * Run after `electron-vite build` (which produces out/main + out/preload)
 * AND after `dashboard` has been built (`apps/dashboard/dist`).
 */
import { cpSync, existsSync, rmSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const desktopRoot = resolve(here, "..")
const dashboardDist = resolve(desktopRoot, "../dashboard/dist")
const targetDir = resolve(desktopRoot, "out/renderer")

if (!existsSync(dashboardDist)) {
  console.error(
    `[bundle-renderer] Dashboard build not found at ${dashboardDist}. Run 'pnpm --filter @dodev/dashboard build' first.`
  )
  process.exit(1)
}

if (existsSync(targetDir)) {
  rmSync(targetDir, { recursive: true, force: true })
}

cpSync(dashboardDist, targetDir, { recursive: true })
console.log(`[bundle-renderer] Copied ${dashboardDist} -> ${targetDir}`)
