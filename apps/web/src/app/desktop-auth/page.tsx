/**
 * /desktop-auth — handoff route for the Electron sign-in loop.
 *
 * Flow:
 *   1. Electron main opens system browser to:
 *        /auth/sign-in?returnTo=/desktop-auth?callbackPort=<port>
 *   2. Middleware bounces unauthed users to /auth/sign-in, which on
 *      success redirects back here.
 *   3. We read the WorkOS session via withAuth(), package the user
 *      identity, and the client component redirects to:
 *        http://127.0.0.1:<port>/auth/callback?payload=<base64>
 *   4. The Electron main process loopback receives the redirect,
 *      writes the encrypted auth-state.json, fires
 *      `auth:session-changed` on the renderer.
 *
 * No access/refresh JWT — dodev's dashboard derives all access from
 * apiKeyHash looked up by workosUserId in Convex, so identity is the
 * only thing the desktop app needs to persist.
 */
import { redirect } from "next/navigation"
import { DesktopAuthRedirect } from "./DesktopAuthRedirect"

export const dynamic = "force-dynamic"

interface DesktopAuthSearchParams {
  callbackPort?: string
}

export default async function DesktopAuthPage({
  searchParams,
}: {
  searchParams: Promise<DesktopAuthSearchParams>
}) {
  const params = await searchParams

  // In self-hosted (no WorkOS env), there's no sign-in flow to honor.
  // Bounce to dashboard, which has its own self-hosted handling.
  const isCloud = !!process.env.WORKOS_CLIENT_ID
  if (!isCloud) {
    redirect("/dashboard")
  }

  const { withAuth } = await import("@workos-inc/authkit-nextjs")
  const { user } = await withAuth()

  if (!user) {
    // Middleware should have caught this, but if a stale link landed
    // here without auth, bounce back to sign-in with returnTo intact.
    const returnTo = `/desktop-auth${
      params.callbackPort ? `?callbackPort=${encodeURIComponent(params.callbackPort)}` : ""
    }`
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const payload = {
    workosUserId: user.id,
    email: user.email,
    name:
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email || undefined,
    avatarUrl: user.profilePictureUrl ?? undefined,
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64")

  // callbackPort is required in dev; in prod we'll add a `dodev://` deep
  // link path later (Phase 3.2). For now, all flows use loopback HTTP
  // since the desktop is dev-only until packaging lands.
  if (!params.callbackPort) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Missing callback port</h1>
          <p className="text-sm text-muted-foreground">
            The dodev.ai desktop app should have included a callbackPort query parameter. Try
            signing out of the desktop app and signing in again.
          </p>
        </div>
      </main>
    )
  }

  return <DesktopAuthRedirect encoded={encoded} callbackPort={params.callbackPort} />
}
