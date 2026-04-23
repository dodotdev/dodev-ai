# Conversion Plan: Next.js App Router → Vite + TanStack (+ split marketing/dashboard)

**Status:** Draft
**Blocks:** `docs/PRD_DESKTOP.md` Phase 0
**Last updated:** 2026-04-23

---

## 1. Goal

Move the dashboard surface of `apps/web` off Next.js App Router onto **Vite + TanStack Router + TanStack Query** so the same codebase can ship inside the Electron desktop shell. Preserve SEO on marketing pages by keeping them on a server-rendered stack.

Explicit non-goals:
- Not rewriting any components. Every existing `components/dashboard/*` file should port 1:1 (they're already pure client components).
- Not changing auth behavior or data flows.
- Not doing a big-bang cutover — parallel routes during the cut, then flip.

---

## 2. The big decision: one app or two?

**Recommendation: split into two apps.**

- `apps/marketing` — Next.js (stays as-is). Owns `/`, `/docs`, `/waitlisted`, `/privacy`, `/terms`, and all auth-adjacent routes (`/auth/sign-in`, `/callback`, `/auth/mcp`, `/api/auth/*`). SSR for SEO. Wraps WorkOS AuthKit middleware (which is Next.js-specific).
- `apps/dashboard` — Vite SPA. Owns `/dashboard/**`. Renders the same components you already have. Gets wrapped in Electron for the desktop app.

**Why split:**
- WorkOS AuthKit is deeply Next.js-coupled (middleware, server components, server actions). Trying to port it to a Vite SPA is a rabbit hole. Keep the auth dance on Next.js and hand the dashboard a session token.
- Marketing pages need SSR for SEO and social-share meta; the dashboard doesn't.
- Desktop only ever wants the dashboard shell. Splitting makes the Electron build trivially scope to the right assets.

**Deployment topology on Vercel (cloud):**
- `dodev.ai` → marketing Next.js app
- `app.dodev.ai` → dashboard Vite SPA (static, CDN-served)
- Sign-in on `dodev.ai/auth/sign-in` sets a cookie, redirects to `app.dodev.ai/dashboard`. Dashboard reads the WorkOS session cookie (cross-subdomain) or gets a token via the redirect.

**Self-hosted** still runs a single Next.js binary (marketing + simple redirect to dashboard). The dashboard still builds as a standalone SPA that can be served from `/dashboard/*` or embedded in Electron.

---

## 3. Current inventory

### Pages
- **`(marketing)/`** — home, docs, waitlisted. SEO-sensitive. Stay on Next.js.
- **`(dashboard)/dashboard/`** — the whole app surface. Move to Vite.
- **`auth/sign-in`** — custom sign-in page (not WorkOS hosted). Has useEffect/useState; already client-heavy. Stay on Next.js (lives next to the auth API routes).
- **`auth/mcp`** — server-side OAuth bridge for MCP clients. Next.js API route. Stay on Next.js.
- **`auth/sign-out`** — calls WorkOS signOut. Stay on Next.js.
- **`callback/route.ts`** — WorkOS OAuth callback. Stay on Next.js.

### API routes
- `/api/health` → Convex-side alternative exists? Move to Convex HTTP action or keep small Next.js handler.
- `/api/auth/oauth/google` → WorkOS-specific, stays on Next.js.
- `/api/auth/magic-link/send` + `/verify` → WorkOS-specific, stay on Next.js.

### Middleware
- `middleware.ts` — WorkOS session validation and redirect-to-sign-in for protected routes. Stays on Next.js, but its matcher shrinks: only guards marketing + auth-adjacent routes now that the dashboard lives at `app.dodev.ai`.

### Shared dependencies
- Convex React client — works identically in Vite. No changes.
- `@workos-inc/authkit-nextjs` — stays only on Next.js marketing app.
- `use-upload-attachments` hook — pure client logic, ports.
- Tailwind, shadcn/ui, Radix — all framework-agnostic.
- `next/link`, `next/navigation` → TanStack Router equivalents.
- `next/font/google` → `@fontsource/geist-sans` + `geist-mono` packages.
- `next/image` → plain `<img>` or `unpic` for responsive.

### What doesn't port cleanly
- `notFound()` from `next/navigation` → TanStack Router `notFound()` or redirect.
- `(dashboard)/layout.tsx` if it uses server components → becomes a regular React route layout.

---

## 4. Target architecture

```
apps/
├── marketing/                    # Next.js (was apps/web)
│   ├── src/app/
│   │   ├── page.tsx              # /
│   │   ├── (marketing)/docs/...
│   │   ├── (marketing)/waitlisted/
│   │   ├── auth/sign-in/
│   │   ├── auth/mcp/
│   │   ├── auth/sign-out/
│   │   ├── callback/
│   │   └── api/auth/...
│   └── src/middleware.ts         # Narrowed matcher — marketing-only
│
├── dashboard/                    # Vite + TanStack (NEW)
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── router.tsx            # TanStack routeTree
│   │   ├── routes/
│   │   │   ├── __root.tsx        # shell: sidebar + auth gate
│   │   │   ├── dashboard.tsx     # overview
│   │   │   ├── dashboard.tasks.tsx
│   │   │   ├── dashboard.issues.tsx
│   │   │   ├── dashboard.memories.tsx
│   │   │   ├── dashboard.activity.tsx
│   │   │   ├── dashboard.settings.tsx
│   │   │   ├── dashboard.spaces.tsx
│   │   │   ├── dashboard.spaces.$id.tsx
│   │   │   ├── dashboard.spaces.$id.projects.tsx
│   │   │   ├── dashboard.spaces.$id.projects.$projectId.settings.tsx
│   │   │   └── ... (remaining pages)
│   │   ├── lib/
│   │   │   ├── auth.ts           # fetch /api/auth/session from marketing app
│   │   │   └── convex.ts
│   │   └── components/           # MOVED from apps/web/src/components
│   └── tsconfig.json
│
└── desktop/                      # Electron (NEW, Phase 3)
    ├── main/                     # main process (TypeScript, built with tsup or esbuild)
    ├── preload/
    └── package.json              # deps: electron, electron-builder, keytar, chokidar
```

Shared code (components, hooks, utilities) lives in `apps/dashboard/src/components/**` for now. A future refactor can promote truly framework-agnostic components to `packages/ui`, but that's not required for the conversion.

---

## 5. Migration phases

Ten phases. Each one lands on `main` and ships to production before the next starts, so the conversion never has a "everything is broken" middle state. Estimated at **2–3 weeks single-engineer**, most of which is router config and auth plumbing.

### Phase A — Scaffold `apps/dashboard` (½ day)

- `pnpm create vite apps/dashboard --template react-ts`
- Install `@tanstack/react-router`, `@tanstack/router-devtools`, `@tanstack/router-vite-plugin`, `convex`, Tailwind, shadcn deps, Biome config extension.
- Add Tailwind v4 config, copy `globals.css` from `apps/web`.
- Empty shell renders "hello dashboard" at `http://localhost:3042`.
- `turbo.json`: add `dev:dashboard` and `build:dashboard` scripts.
- **Exit criteria:** `pnpm dev:dashboard` boots, Tailwind works, Convex provider mounted.

### Phase B — Session + Convex auth in Vite (1 day)

- **Problem:** dashboard no longer runs inside Next.js middleware, so it can't read WorkOS session cookies the way the current code does.
- **Solution:** add a tiny API on the marketing Next.js app, `/api/auth/session`, that returns `{ user, apiKeyHash } | { user: null }` based on the current WorkOS cookie. Dashboard fetches this once on mount.
- In dev, `app.localhost:3041` uses `credentials: "include"` against `localhost:3041/api/auth/session` — cookies are scoped to the same domain.
- In production, `app.dodev.ai` fetches `dodev.ai/api/auth/session` with `credentials: "include"`. Cookie must be set with `Domain=.dodev.ai` (check WorkOS AuthKit config).
- In Electron, the dashboard ships with no cookie flow — app initializes with an API key stored in keychain. Session resolution is local.
- Build an `<AuthProvider>` that wraps the router; gate `/dashboard/**` on authenticated session; redirect unauth'd users to `dodev.ai/auth/sign-in?next=...`.
- **Exit criteria:** dashboard loads, reads your real session, gates to sign-in when missing.

### Phase C — Router + one real route (½ day)

- Wire TanStack Router with file-based routes in `src/routes/`.
- Port `(dashboard)/layout.tsx` to `__root.tsx` — renders `<DashboardSidebar>` and an `<Outlet />`.
- Port the overview page (`dashboard.tsx` → `/dashboard/page.tsx`) as the first real route.
- Copy `DashboardSidebar` component unchanged. Only swap `next/link` → TanStack `<Link>` and `usePathname()` → `useLocation()`.
- **Exit criteria:** `/dashboard` renders with working sidebar nav stubs.

### Phase D — Port the flat routes (1 day)

Port in order, one per commit:
1. `/dashboard/tasks` (global tasks)
2. `/dashboard/issues` (global issues)
3. `/dashboard/memories`
4. `/dashboard/activity`
5. `/dashboard/spaces` (list)
6. `/dashboard/settings`
7. `/dashboard/getting-started`

Each commit is "copy the page file, change imports, verify in browser." Components don't change.

**Per-file delta:**
- `import Link from "next/link"` → `import { Link } from "@tanstack/react-router"`
- `useParams<{ id: string }>()` → TanStack's `useParams({ from: '/dashboard/spaces/$id' })`
- `useRouter()` + `router.push` → TanStack's `useNavigate()`
- `useSearchParams()` + `router.replace(?...)` → TanStack's `useSearch()` + `navigate({ search })`
- Remove `"use client"` directive (noop in Vite, but cleaner).

**Exit criteria:** every flat dashboard route renders and is clickable through the sidebar.

### Phase E — Port the dynamic space routes (1 day)

1. `/dashboard/spaces/$id` (tasks)
2. `/dashboard/spaces/$id/issues`
3. `/dashboard/spaces/$id/memories`
4. `/dashboard/spaces/$id/activity`
5. `/dashboard/spaces/$id/projects`
6. `/dashboard/spaces/$id/settings`
7. `/dashboard/spaces/$id/projects/$projectId/settings`

Trickier because URL search params + route params mix (e.g., `?project=<id>` filter). TanStack's typed `useSearch` shines here.

**Exit criteria:** parity with Next.js dashboard; URL filter state preserved.

### Phase F — Auth-redirect integration (½ day)

- Update Next.js middleware matcher to exclude `/dashboard/**` (they live on a different app now).
- Sign-in page on `dodev.ai/auth/sign-in` gets a `?next=` param; after successful sign-in, redirect to `app.dodev.ai${next}` instead of `/dashboard/${next}`.
- Sign-out on the dashboard calls `dodev.ai/api/auth/sign-out` (CORS-configured) and redirects to `dodev.ai`.
- Verify callback flow still works end-to-end.
- **Exit criteria:** sign-in and sign-out work from both apps.

### Phase G — Deploy both apps to Vercel, wire DNS (½ day)

- Add `apps/dashboard` as a separate Vercel project.
- Set `app.dodev.ai` CNAME, issue cert.
- Smoke test the full flow on preview deployments first.
- **Exit criteria:** prod session flow works; both apps reachable from real DNS.

### Phase H — Shadow cutover (½ day)

- Keep the old Next.js `/dashboard/**` routes in place, but redirect them to `app.dodev.ai/dashboard/**` (301).
- Monitor for a few days: no one should hit the old routes directly after the redirect.
- **Exit criteria:** zero traffic on the old dashboard paths.

### Phase I — Delete old dashboard routes (½ day)

- Remove `apps/marketing/src/app/(dashboard)/**`.
- Remove any dashboard-only components from `apps/marketing` that now live in `apps/dashboard`.
- Prune unused Next.js middleware branches that dealt with dashboard auth.
- Shrink `apps/marketing` dependencies.
- **Exit criteria:** `apps/marketing` is lean and dashboard-free.

### Phase J — Rename `apps/web` → `apps/marketing` (bonus)

Cosmetic but worth it. Update `turbo.json`, `package.json`, Vercel config, and any docs. Git supports moves cleanly; blame is preserved.

---

## 6. Code-level mechanics

### TanStack Router setup

```ts
// apps/dashboard/src/router.tsx
import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: { auth: undefined! },  // typed, filled at runtime
})

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}
```

File-based routes use the `@tanstack/router-vite-plugin` to generate `routeTree.gen.ts` at build time. Flat file names like `dashboard.spaces.$id.tsx` map cleanly to the existing Next.js structure.

### Port map for `next/*` APIs

| Next.js | TanStack equivalent |
|---|---|
| `import Link from "next/link"` | `import { Link } from "@tanstack/react-router"` |
| `usePathname()` | `useLocation().pathname` |
| `useRouter()` + `router.push` | `useNavigate()` + `navigate({ to, params, search })` |
| `useParams<{ id }>()` | `useParams({ from: '/route' })` |
| `useSearchParams()` / `router.replace('?...')` | `useSearch({ from })` + `navigate({ search })` |
| `notFound()` from `next/navigation` | `throw notFound()` from `@tanstack/react-router` |
| `redirect()` | `throw redirect({ to })` |
| Dynamic segment `[id]` → `$id`, `[...slug]` → `$` splat. | |

### Auth gate in the root route

```tsx
// apps/dashboard/src/routes/__root.tsx
import { createRootRouteWithContext, Outlet, redirect } from "@tanstack/react-router"

export const Route = createRootRouteWithContext<{ auth: AuthContext }>()({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.user) {
      throw redirect({
        href: `${MARKETING_ORIGIN}/auth/sign-in?next=${encodeURIComponent(location.href)}`,
      })
    }
  },
  component: () => (
    <div className="flex h-screen">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  ),
})
```

### Convex provider

Ports unchanged. Same `<ConvexProvider>` wrapping the router.

### Session fetch

```ts
// apps/dashboard/src/lib/auth.ts
export async function fetchSession(): Promise<Session | null> {
  const res = await fetch(`${MARKETING_ORIGIN}/api/auth/session`, {
    credentials: "include",
  })
  if (!res.ok) return null
  const body = (await res.json()) as { user: User | null; apiKeyHash: string | null }
  return body.user ? body : null
}
```

Marketing app gets a new tiny handler at `/api/auth/session/route.ts`:

```ts
import { withAuth } from "@workos-inc/authkit-nextjs"
import { NextResponse } from "next/server"

export async function GET() {
  const { user } = await withAuth()
  if (!user) return NextResponse.json({ user: null, apiKeyHash: null })
  // fetch user's apiKeyHash from Convex (or cache in the AuthKit session)
  return NextResponse.json({ user, apiKeyHash })
}
```

CORS: marketing app responds with `Access-Control-Allow-Origin: https://app.dodev.ai` and `Access-Control-Allow-Credentials: true` on that one route.

### Environment handling

Vite uses `import.meta.env.VITE_*` prefix. Port:

| Next.js `process.env` | Vite `import.meta.env` |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `VITE_CONVEX_URL` |
| `NEXT_PUBLIC_WORKOS_CLIENT_ID` | (not needed in dashboard — marketing handles WorkOS) |
| — | `VITE_MARKETING_ORIGIN` (new: where to fetch session) |

Server-only env vars stay on the Next.js side.

### Fonts

- Install `@fontsource-variable/geist` + `@fontsource-variable/geist-mono` (no Next-specific loader).
- Import in `main.tsx`.

### Images

- Zero images in the dashboard right now (checked the components). No port needed.

---

## 7. Desktop-specific divergence

When the Electron shell wraps this app (Phase 3 of the PRD), only two things change:

1. **Session resolution.** Instead of fetching from `dodev.ai/api/auth/session`, the preload script exposes `window.dodev.getSession()` which reads the API key from keychain and returns a synthetic session. `fetchSession()` gets an Electron-aware implementation.
2. **Convex URL.** In desktop-self-hosted mode, the user may point at their own Convex deployment. An onboarding screen collects the URL and stores it in keychain.

The SPA itself is identical.

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| WorkOS session cookie domain story breaks across subdomains | Medium | Test in a staging env with real DNS *before* production cutover. Document the exact `Domain=.dodev.ai` + `SameSite=Lax` + `Secure` config. |
| CORS misconfiguration on `/api/auth/session` locks the dashboard out | Medium | Phase G includes explicit CORS verification + `credentials: "include"` smoke test. |
| TanStack file-based routes disagree with current Next.js URL shape | Low | Manual mapping table built during Phase D/E; validated by clicking through every sidebar link. |
| Convex React hooks behave differently in a non-Next SPA | Low | Convex's React client has no Next.js dependency; tested widely in Vite apps. |
| Self-hosted users running the single-binary Next.js app break when dashboard moves | Medium | Keep a redirect shim on Next.js `/dashboard/*` → `app.dodev.ai/dashboard/*` for cloud; self-hosted users bundle marketing + dashboard together in Electron later. |
| SEO regression on marketing | None | Marketing stays on Next.js. |
| Auth state out of sync between tabs (browser) | Low | TanStack Query invalidation on `focus`; Convex is realtime anyway. |
| Forgotten `"use client"` directive in ported files | None | It's a no-op in Vite. |

---

## 9. Dependencies to add / remove

**Add to `apps/dashboard`:**
- `@tanstack/react-router`, `@tanstack/router-devtools`, `@tanstack/router-vite-plugin`
- `@tanstack/react-query` (optional — Convex hooks alone may suffice; add only if we need for the marketing session fetch caching)
- `convex` (pinned to the same version as elsewhere)
- `react`, `react-dom`, `tailwindcss@4`, `@tailwindcss/vite`
- `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`
- `vite`, `@vitejs/plugin-react`
- All shadcn/ui Radix primitives already installed (port `package.json` entries)

**Remove from `apps/marketing` (once Phase I ships):**
- No `next/*` dependency changes — marketing still needs them all.
- Dashboard-only components move out of `apps/marketing/src/components/dashboard/**`.

---

## 10. Ballpark timeline

Sequential, single engineer. Assume no blocked reviewing.

| Phase | Effort | Running total |
|---|---|---|
| A Scaffold | 0.5 d | 0.5 d |
| B Session + Convex | 1 d | 1.5 d |
| C Router + one route | 0.5 d | 2 d |
| D Flat routes | 1 d | 3 d |
| E Space dynamic routes | 1 d | 4 d |
| F Auth-redirect | 0.5 d | 4.5 d |
| G Vercel + DNS | 0.5 d | 5 d |
| H Shadow cutover (wait period) | — (3–5 calendar days) | ~8 d calendar |
| I Delete old routes | 0.5 d | ~8.5 d |
| J Rename (bonus) | 0.5 d | ~9 d |

**Realistic calendar time:** 2 working weeks for the hands-on bits, plus the shadow-cutover window.

---

## 11. Validation checklist

Before declaring Phase I done:

- [ ] All sidebar links route correctly
- [ ] URL filter state (`?project=<id>`) persists across refresh
- [ ] Sign-in → redirect back to the originally-intended dashboard URL
- [ ] Sign-out clears the session on both apps
- [ ] Dark-mode toggle / theme persists
- [ ] All existing Convex queries/mutations fire
- [ ] MCP-authored updates still live-refresh the dashboard in real time
- [ ] Keyboard shortcuts (if any) still work
- [ ] Task/issue create form submits successfully
- [ ] Project filter persists in URL
- [ ] Settings page (general, statuses, labels, members, estimates, versions, persona, projects tab) all load and save
- [ ] Project settings page loads and saves
- [ ] Space detail / project detail linkage works
- [ ] Memory search returns results
- [ ] Dev tooling: `pnpm check` clean, `pnpm typecheck` clean
- [ ] Build size reasonable (budget: < 500 KB gzipped initial bundle for dashboard)

---

## 12. Open questions

1. **Session fetch frequency.** Do we poll, or trust the initial fetch + invalidate on 401? Recommend the latter — every Convex query carries the `apiKeyHash`, so a stale session reveals itself immediately.
2. **Magic-link flow.** Today `/auth/magic-link/verify` sets a cookie and redirects. Confirm the redirect lands on `app.dodev.ai/dashboard` after the subdomain split.
3. **Cookie config.** Exact `Domain` / `SameSite` / `Secure` values on the WorkOS session cookie — needs a quick read of WorkOS docs + one staging test.
4. **Shadcn CLI.** New alias target. Confirm the shadcn CLI can target `apps/dashboard/src/components/ui` during installs so future `pnpm ui:add button` still works.
5. **Preview deployments.** Vercel preview URLs: `https://dashboard-git-<branch>.vercel.app` can't share cookies with the marketing preview URL. Need a rewrite rule or use `marketing-git-<branch>.dodev.ai` previews via Vercel's preview aliases. Might need Phase G to split preview infrastructure.
6. **Convex deploy keys.** No change needed, but remember to add `VITE_CONVEX_URL` to the dashboard Vercel project.
7. **Analytics.** If there's any PostHog / Plausible wiring in marketing, decide whether dashboard needs its own analytics pipeline or shares via a reverse-proxy.

---

## 13. Decision log

- **2026-04-23**: Split into `apps/marketing` (Next.js) + `apps/dashboard` (Vite) rather than converting the whole monolith. Auth stays Next-side; dashboard is auth-consuming only.
- **2026-04-23**: TanStack Router with file-based routes. Drops code-first config complexity; file structure mirrors Next.js.
- **2026-04-23**: No TanStack Query at first — Convex hooks are enough. Add later only if the session fetch needs caching policy finer than `useEffect`-driven.
- **2026-04-23**: Use `@fontsource-variable/geist` instead of `next/font`. Same font; no Next coupling.
- **2026-04-23**: `app.dodev.ai` as the dashboard subdomain in production. Self-hosted can keep `/dashboard/*` on the single-Next binary via reverse proxy.
- **2026-04-23**: Rename `apps/web` → `apps/marketing` is bonus scope, not on the critical path.
