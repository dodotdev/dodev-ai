# Deploying `apps/dashboard` to Vercel (Phase G)

The dashboard is a Vite SPA that lives at **`app.dodev.ai`**. The marketing
site (`apps/web` → `dodev.ai`) keeps WorkOS AuthKit and owns the sign-in
flow; the dashboard fetches the session cross-origin and renders under its
own domain.

This guide is the manual hand-off — Claude cannot drive Vercel + DNS
without credentials.

---

## 1. Create a new Vercel project

Point it at **this monorepo** with root directory `apps/dashboard`.

Vercel should auto-detect the `vercel.json` already checked in. Defaults:

| Setting | Value |
|---|---|
| Framework | `vite` |
| Root Directory | `apps/dashboard` |
| Build Command | `cd ../.. && pnpm turbo build --filter=@dodev/dashboard` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |
| Output Directory | `dist` |

The build command is already set in `vercel.json`; you should not need to
override anything.

---

## 2. Environment variables

On the Vercel project → Settings → Environment Variables, for
**Production, Preview, and Development**:

```
VITE_CONVEX_URL=https://proficient-buzzard-939.convex.cloud
VITE_MARKETING_ORIGIN=https://dodev.ai
```

Both must be set for every environment that should serve the app (prod +
preview). The dashboard refuses to boot if `VITE_CONVEX_URL` is blank.

---

## 3. Wire the marketing side to trust the new origin

Two env additions on the **existing `@dodev/web` Vercel project**:

```
NEXT_PUBLIC_DASHBOARD_ORIGIN=https://app.dodev.ai
```

(Already allow-listed as a literal in `sanitizeReturnTo()` and in the
`/api/auth/session` CORS list, but setting the env makes preview deploys
work if they pick an alternate preview URL.)

No code change needed.

---

## 4. DNS

Point `app.dodev.ai` at Vercel:

- Add a `CNAME` record for `app` → `cname.vercel-dns.com.`
- Add `app.dodev.ai` as a domain on the dashboard Vercel project.
- Wait for the automatic TLS cert.

---

## 5. Smoke test

Once DNS resolves:

1. Visit `https://app.dodev.ai`. You should be redirected to
   `https://dodev.ai/auth/sign-in?returnTo=https%3A%2F%2Fapp.dodev.ai%2F…`.
2. Sign in (magic link or Google).
3. You should land back on `https://app.dodev.ai/dashboard/…` with the
   real data loaded.
4. `F12 → Network → /api/auth/session` should show a 200 response with
   the user object, CORS headers allowing `https://app.dodev.ai`, and the
   WorkOS cookie flowing via `credentials: include`.

If the session request comes back as CORS-blocked, confirm the cookie
domain is `.dodev.ai` (not bare `dodev.ai`) — WorkOS AuthKit defaults to
the host. Set `WORKOS_COOKIE_DOMAIN=.dodev.ai` on the marketing project
if needed.

---

## 6. Rollback

Nothing here modifies the existing dashboard at `dodev.ai/dashboard`. If
anything breaks, simply don't flip the traffic — the old routes still
serve. Phase H handles the actual cutover (301 redirects) only after this
is verified.
