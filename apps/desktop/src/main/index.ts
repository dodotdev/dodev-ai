import { join } from "node:path"
import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, globalShortcut, shell } from "electron"
import { registerAuthHandlers } from "./ipc/auth"
import { loadWindowState, saveWindowState, type WindowBounds } from "./window-state"

const APP_DISPLAY_NAME = "dodev.ai"
app.setName(APP_DISPLAY_NAME)

// Packaged .app bundles get the About dialog fields from
// electron-builder's productName. Dev mode falls back to the embedded
// Electron runtime unless we set them explicitly.
if (process.platform === "darwin") {
  app.setAboutPanelOptions({
    applicationName: APP_DISPLAY_NAME,
    applicationVersion: app.getVersion(),
    copyright: `© ${new Date().getFullYear()} do.dev`,
  })
}

let mainWindow: BrowserWindow | null = null
let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null

const DEFAULT_BOUNDS: WindowBounds = { width: 1200, height: 820 }

function createWindow(): void {
  // Restore saved bounds, falling back to defaults. Validates that
  // stored coords still intersect a connected display.
  const restored = loadWindowState(DEFAULT_BOUNDS)

  mainWindow = new BrowserWindow({
    x: restored.x,
    y: restored.y,
    width: restored.width,
    height: restored.height,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (restored.isMaximized) {
    mainWindow.maximize()
  }

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
    if (is.dev) {
      // DevTools open automatically in dev so the renderer's console is
      // available without users having to remember Cmd+Option+I.
      mainWindow?.webContents.openDevTools({ mode: "detach" })
    }
  })

  // Persist bounds on move/resize. Debounced so we're not pegging the
  // disk during a drag or live-resize. `getBounds()` returns the
  // pre-maximize bounds, which is what we want — if the user maximizes
  // we record the underlying bounds + a separate flag.
  const persistBounds = () => {
    if (!mainWindow) return
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer)
    saveBoundsTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return
      const bounds = mainWindow.getNormalBounds()
      saveWindowState({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: mainWindow.isMaximized(),
      })
    }, 250)
  }
  mainWindow.on("resize", persistBounds)
  mainWindow.on("move", persistBounds)
  mainWindow.on("maximize", persistBounds)
  mainWindow.on("unmaximize", persistBounds)
  mainWindow.on("close", () => {
    // Flush any pending debounce on close so we don't lose the final
    // resize.
    if (saveBoundsTimer) {
      clearTimeout(saveBoundsTimer)
      saveBoundsTimer = null
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getNormalBounds()
      saveWindowState({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized: mainWindow.isMaximized(),
      })
    }
  })

  // Surface renderer console messages in the main-process terminal too —
  // doubly useful when the renderer hasn't fully rendered yet (e.g. stuck
  // on Loading… because window.dodev didn't expose).
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const tag = ["v", "i", "w", "e"][level] ?? "?"
    console.log(`[renderer:${tag}] ${message}  (${sourceId}:${line})`)
  })

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
    console.error(`[renderer] did-fail-load ${code} ${desc} url=${url}`)
  })

  // Open external links in the user's browser, not a new Electron window.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: "deny" }
  })

  // In dev, load the dashboard's Vite dev server. In prod, load the
  // bundled renderer (wired up in Phase 3.4).
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else if (is.dev) {
    void mainWindow.loadURL("http://localhost:3042")
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.dodev.desktop")

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Phase 3.1: register auth IPC handlers BEFORE the renderer mounts so
  // the dashboard's electron SessionSource can call into them as soon as
  // it boots. Calling registerAuthHandlers more than once would throw, so
  // do it exactly once at app-ready time.
  registerAuthHandlers()

  createWindow()

  // Phase 3.3: global hotkey ⌘⇧D / Ctrl+Shift+D toggles window
  // visibility from anywhere on the desktop. The behavior mirrors
  // Spotlight: hidden -> show + focus, visible+focused -> hide,
  // visible+unfocused -> focus.
  registerGlobalHotkey()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function registerGlobalHotkey(): void {
  const accelerator = process.platform === "darwin" ? "Cmd+Shift+D" : "Ctrl+Shift+D"
  const success = globalShortcut.register(accelerator, () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) {
      createWindow()
      return
    }
    if (!win.isVisible()) {
      win.show()
      win.focus()
      return
    }
    if (win.isFocused()) {
      win.hide()
      return
    }
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  if (!success) {
    // Some other app already grabbed this shortcut. Non-fatal.
    console.warn(`[hotkey] failed to register ${accelerator} (already in use)`)
  }
}

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
