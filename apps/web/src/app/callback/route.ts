import { handleAuth } from "@workos-inc/authkit-nextjs"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getConvexClient } from "@/lib/convex"
import { sanitizeReturnTo } from "@/lib/return-to"

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
        returnPathname = sanitizeReturnTo(stateData.returnPathname)
      } catch {
        // Ignore state parsing errors, use default
      }
    }

    // authkit's handleAuth only understands same-origin pathnames. If the
    // caller asked us to return to a different origin (e.g. app.dodev.ai),
    // let handleAuth set its session cookies against a throwaway pathname
    // and then override the Location header ourselves.
    const isAbsoluteReturn = /^https?:\/\//.test(returnPathname)
    const handler = handleAuth({
      returnPathname: isAbsoluteReturn ? "/dashboard" : returnPathname,
    })
    const response = await handler(request)
    if (isAbsoluteReturn && response.status >= 300 && response.status < 400) {
      response.headers.set("Location", returnPathname)
    }

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
