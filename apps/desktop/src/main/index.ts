import { join } from "node:path"
import { electronApp, is, optimizer } from "@electron-toolkit/utils"
import { app, BrowserWindow, shell } from "electron"
import { registerAuthHandlers } from "./ipc/auth"

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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
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

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
