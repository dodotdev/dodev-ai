import { handleAuth } from "@workos-inc/authkit-nextjs"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getConvexClient } from "@/lib/convex"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)

    const error = url.searchParams.get("error")
    const errorDescription = url.searchParams.get("error_description")
    if (error) {
      console.error("[CALLBACK] OAuth error:", { error, errorDescription })
      return NextResponse.redirect(
        new URL(`/auth/sign-in?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      )
    }

    let returnPathname = "/dashboard"
    const state = url.searchParams.get("state")
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, "base64url").toString())
        if (stateData.returnPathname) {
          returnPathname = stateData.returnPathname
        }
      } catch {
        // Ignore state parsing errors, use default
      }
    }

    const handler = handleAuth({ returnPathname })
    const response = await handler(request)

    // Sync user to Convex in the background (best-effort)
    try {
      const _convex = getConvexClient()
      // Extract user info from the WorkOS callback
      const code = url.searchParams.get("code")
      if (code) {
        // We can't easily get the user details here before handleAuth completes,
        // so the AuthProvider's ensureUser call handles the sync on first dashboard load
      }
    } catch (syncError) {
      console.error("[CALLBACK] Convex user sync error:", syncError)
    }

    return response
  } catch (err: unknown) {
    console.error("[CALLBACK] Exception during auth:", err)
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
