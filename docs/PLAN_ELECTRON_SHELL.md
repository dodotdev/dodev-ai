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
askjubal's desktop client uses):

1. User clicks "Sign in" in the Electron window.
2. Main process opens the system browser to
   `https://dodev.ai/sign-in?returnTo=/desktop-auth?callbackPort=<port>`.
   A short-lived `http://127.0.0.1:<port>/auth/callback` server runs in
   the main process to receive the redirect.
3. Marketing app runs the existing WorkOS sign-in, then hits a new
   `/desktop-auth` route that exchanges the WorkOS session for the
   access + refresh token pair and redirects to the loopback URL with
   both in the query string.
4. Main process writes the tokens to
   `<userData>/auth-state.json`, **chmod 0600**, and closes the
   callback server.
5. Renderer reads the access token via preload IPC
   (`window.dodev.getSession()`) and uses it as its `SessionSource`.

### Token pair

- **Access token**: short-lived WorkOS access JWT. Used on every Convex
  request. ~1h TTL per WorkOS defaults.
- **Refresh token**: long-lived WorkOS refresh token. Stored alongside
  the access token; swapped for a fresh pair via
  `workos.userManagement.authenticateWithRefreshToken()` on the
  marketing side.

### Storage: plain JSON file, not keychain

**Do not use `keytar` or Electron's `safeStorage`.** Both resolve to
the macOS Keychain, which surfaces a password prompt on first launch
per app — a UX deal-breaker for a desktop tool users install to be
helpful, not to interrogate them.

Tokens live at:

```
<app.getPath('userData')>/auth-state.json   mode 0600
```

`userData` is already user-private on macOS; `0600` is a
belt-and-suspenders guard against other accounts on the same machine.
Sign-out = `fs.unlinkSync` on that file. The tradeoff is that
root-on-machine can read the file — true of nearly every on-disk
credential store, and acceptable given the refresh token is revocable.

### Refresh loop

Renderer's desktop `SessionSource` decodes the access token's `exp`
claim on mount and schedules `setTimeout(refresh,
clamp(remainingMs × 0.8, 30s, 10min))`. On fire:

1. Renderer calls `window.dodev.refreshSession()`.
2. Main process POSTs `{ refreshToken }` to
   `https://dodev.ai/api/auth/desktop/refresh`.
3. Marketing route calls WorkOS, gets a fresh access + refresh pair,
   returns them.
4. Main process overwrites `auth-state.json` (still 0600), returns the
   new access token to the renderer.
5. Renderer re-reads `exp`, reschedules.

On refresh failure (401, 403, network dies for > 1 min): wipe
`auth-state.json` and route the renderer to sign-in.

Main process also runs one refresh on boot if the stored access token
is within 5 min of expiry — covers "laptop closed for a week" cold
starts cleanly.

---

## 2. New code boundaries

### New package: `apps/desktop`

```
apps/desktop/
├── package.json               # private workspace package
├── tsconfig.json
├── electron.vite.config.ts
├── electron-builder.yml       # packaging config (Phase 3.4)
├── src/
│   ├── main/
│   │   ├── index.ts           # app ready, window lifecycle, hotkey
│   │   ├── ipc/
│   │   │   ├── auth.ts        # loopback server, store/get/clear tokens
│   │   │   └── index.ts       # register all IPC handlers
│   │   ├── auth-store.ts      # JSON-file auth state (chmod 0600)
│   │   └── refresh.ts         # periodic refresh calls to marketing
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

### New routes in `apps/web`

- **`apps/web/src/app/desktop-auth/page.tsx`** — after WorkOS sign-in,
  reads `callbackPort` from query, pulls the access + refresh token
  pair out of the current authkit session, and client-side redirects
  to `http://127.0.0.1:<port>/auth/callback?accessToken=…&refreshToken=…`.
  One short page, no form.
- **`apps/web/src/app/api/auth/desktop/refresh/route.ts`** — POST
  `{ refreshToken }` → `workos.userManagement.authenticateWithRefreshToken(…)`
  → returns new `{ accessToken, refreshToken, expiresAt }`. No session
  cookie touched; this is desktop-only.

---

## 3. Execution phases

| Phase | Scope | Exit criterion |
|---|---|---|
| **3.0** | Scaffold `apps/desktop` (Electron + electron-vite + pnpm workspace wiring). Blank window loads `http://localhost:3042` in dev. | `pnpm dev:desktop` opens a window showing the dashboard's sign-in redirect. |
| **3.1** | Loopback auth flow — `/desktop-auth` + `/api/auth/desktop/refresh` on marketing, one-shot HTTP server on main, tokens in `<userData>/auth-state.json` (0600). | Click "Sign in" in Electron → browser opens → sign in → window reloads authed. |
| **3.2** | Desktop `SessionSource` in `apps/dashboard`. Runtime selector in `main.tsx`. Renderer + main proactive refresh loop. | Same dashboard code serves both web and desktop. Leaving the app open overnight stays authed; no refresh prompts. |
| **3.3** | Global hotkey `⌘⇧D` toggles window. | Hotkey works while another app is focused. |
| **3.4** | Production bundle via `electron-builder` (macOS `.dmg` unsigned is fine). | A friend downloads the `.dmg` and gets to a signed-in dashboard in < 2 min. |
| **3.5** | `electron-updater` against GitHub Releases. Menu item "Check for updates". | Landing a new release bumps the installed app silently on next launch. |

Phase 3.0 through 3.3 is what I'll code now. 3.4 and 3.5 are release tasks,
but 3.5 follows 3.4 within days per user request.

---

## 4. Dependencies to add (apps/desktop only)

```
electron              ^35      # runtime
electron-vite         ^2       # dev server + build (same tool askjubal uses)
electron-builder      ^25      # Phase 3.4
electron-updater      ^6       # Phase 3.5
```

All devDependencies. No native modules — token storage is plain JSON,
which means no `keytar` compilation dance and no Keychain prompts on
first launch.

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

## 6. Decisions locked in

1. **Renderer target detection**: runtime check for `window.dodev`.
   One Vite build serves both web and desktop.
2. **Token storage**: `<userData>/auth-state.json`, `chmod 0600`. No
   OS Keychain, no `keytar`, no `safeStorage` (all would trigger a
   password prompt).
3. **Token shape**: WorkOS access + refresh token pair. No custom
   HMAC JWTs.
4. **Refresh cadence**: renderer schedules `clamp(exp × 0.8, 30s,
   10min)`. Main refreshes on boot if within 5 min of expiry.
5. **Sign-in UX**: click → system browser opens → sign in → loopback
   HTTP callback → tokens written → window reloads authed. No custom
   protocol (`dodev://`) until we've sorted the macOS shared-bundle
   gotcha; plain HTTP loopback is robust enough for dev and first
   public beta.
6. **Multiple profiles**: out of scope. One user per desktop install.
