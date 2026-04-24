# Electron Shell — Phase 3 plan

**Status:** Draft, starts after Phase F of the Vite conversion (now complete).
**Supersedes:** The vague "Phase 3 — Electron shell" bullet in `docs/PRD_DESKTOP.md`.
**Depends on:** `apps/dashboard` (Vite SPA, already ported).

---

## 0. What we're actually shipping first

A minimum Electron binary that:

1. Loads the existing `apps/dashboard` Vite bundle.
2. Signs in against WorkOS without the browser cookie trick — using a
   **loopback OAuth flow** that drops the session JWT into the OS keychain.
3. Talks to Convex as the signed-in user (same Convex deployment the web
   dashboard would use).
4. Has a single global hotkey (`⌘⇧D`) that shows/hides the window.

**Explicit non-goals for this first slice:**

- Spawning the MCP server subprocess (comes next).
- Ambient capture, quick-capture UI, supervisor chat, execution trace
  (all subsequent phases).
- Auto-update, code signing, notarization (ship-gate, not build-gate).
- Packaged installers — `pnpm dev:desktop` running under Electron is the
  exit criterion.

---

## 1. Why the auth pattern is different from web

The web dashboard plan used WorkOS AuthKit's browser cookie. Electron
has no browser cookie jar we can share with `dodev.ai`, and forcing the
user to sign into a web page just to use a desktop app is hostile.

**What actually works for native apps with WorkOS** (the same pattern
`transcribe-dev` uses for its "desktop auth" route):

1. User clicks "Sign in" in the Electron window.
2. Main process opens the system browser to
   `https://dodev.ai/auth/desktop-start?port=<loopback>`.
3. Marketing app runs the existing WorkOS sign-in, then redirects back
   to `http://localhost:<port>/callback?token=<signed-JWT>` — a
   short-lived JWT carrying `{ workosUserId, email, name, avatarUrl }`.
4. Electron's main process is running a one-shot HTTP server on that
   loopback port, receives the JWT, verifies its signature, and writes
   it into the OS keychain.
5. Renderer reads the JWT (via preload IPC) and uses it as its
   `SessionSource`.

This leaves all WorkOS knowledge in `apps/web` — exactly where it lives
today — and gives the desktop app a portable, refreshable credential
that does not depend on cookies.

The HMAC signing already exists (`DODEV_JWT_SECRET` in the MCP OAuth
bridge). We reuse it.

---

## 2. New code boundaries

### New package: `apps/desktop`

```
apps/desktop/
├── package.json               # private workspace package
├── tsconfig.json
├── electron.vite.config.ts    # or plain electron-builder + tsc
├── src/
│   ├── main/
│   │   ├── index.ts           # app ready, window lifecycle, hotkey
│   │   ├── auth-flow.ts       # loopback server, deeplink handling
│   │   ├── keychain.ts        # keytar wrapper (get/set/delete)
│   │   └── ipc.ts             # typed IPC handlers
│   ├── preload/
│   │   └── index.ts           # contextBridge.exposeInMainWorld("dodev", {...})
│   └── types.ts               # shared IPC contract (imported by renderer)
└── resources/
    └── icon.png
```

The **renderer** is the existing `apps/dashboard` Vite build — we do
not copy it. `electron.vite.config.ts` points at
`apps/dashboard/dist/index.html` for production and at the dev server
`http://localhost:3042` for development.

### New file in `apps/dashboard`

`src/lib/session-source-desktop.ts` — a `SessionSource` implementation
that reads the JWT from `window.dodev.getSession()` (the preload IPC
bridge). Selected at runtime via a `window.dodev ? desktop : web` check
in `main.tsx`.

### New route in `apps/web`

`apps/web/src/app/auth/desktop-start/route.ts` — kicks off the WorkOS
sign-in with `returnPathname` pointing at a small server-side handler
that mints the JWT and redirects to the loopback URL. One file. No UI.

---

## 3. Execution phases

| Phase | Scope | Exit criterion |
|---|---|---|
| **3.0** | Scaffold `apps/desktop` (Electron + electron-vite + pnpm workspace wiring). Blank window loads `http://localhost:3042` in dev. | `pnpm dev:desktop` opens a window showing the dashboard's sign-in redirect. |
| **3.1** | Loopback auth flow — marketing route + desktop one-shot server + JWT in keychain. | Click "Sign in" in Electron → browser opens → sign in → window reloads authed. |
| **3.2** | Desktop `SessionSource` in `apps/dashboard`. Runtime selector in `main.tsx`. | Same dashboard code serves both web and desktop; tests pass in both. |
| **3.3** | Global hotkey `⌘⇧D` toggles window. | Hotkey works while another app is focused. |
| **3.4** | Production bundle via `electron-builder` (macOS `.dmg` unsigned is fine). | A friend downloads the `.dmg` and gets to a signed-in dashboard in < 2 min. |

Phase 3.0 through 3.3 is what I'll code now. 3.4 is a release task.

---

## 4. Dependencies to add (apps/desktop only)

```
electron              ^35
electron-vite         ^2        # or plain esbuild + tsc
electron-builder      ^25
keytar                ^7        # OS keychain
```

All devDependencies except `keytar` (shipped in the installer).

---

## 5. What the MCP server subprocess looks like later

Out of scope for this doc, but recording the contract so we don't paint
ourselves in a corner:

- Main process spawns `node packages/mcp-server/dist/cloud-server.js`
  with env carrying the keychain-retrieved API key.
- Listens on an ephemeral localhost port.
- Main process writes `~/.config/dodev/mcp-port.json` so `.mcp.json`
  templates we hand users can reference it.
- Renderer gets a status light ("MCP running on port 12345") in the
  settings pane.

Nothing in Phase 3.0–3.3 should prevent this.

---

## 6. Open questions (decide before writing code)

1. **Runtime selector in the renderer.** Hard-coded check on
   `window.dodev` is fine; the alternative is a Vite env flag
   (`VITE_TARGET=desktop`). Pick the check — simpler and lets one
   Vite build serve both targets.
2. **Keychain schema.** `service="dodev.ai"`, `account="session"`, value
   is the signed JWT. Accept.
3. **JWT TTL.** 90 days, with a rotation endpoint the desktop hits on
   app start if it's within 7 days of expiry.
4. **Multiple profiles.** Out of scope for v1. One user per desktop
   install.
