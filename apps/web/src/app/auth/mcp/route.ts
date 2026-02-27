import { createHmac } from "node:crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/**
 * MCP OAuth bridge route.
 *
 * The MCP cloud server redirects here instead of directly to WorkOS.
 * If the user has a valid WorkOS session, we sign a token with their
 * user info and redirect back to the MCP server's /callback.
 * If not, we redirect to sign-in and return here after auth.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mcpSession = url.searchParams.get("session")
  const mcpCallback = url.searchParams.get("callback_url")

  if (!mcpSession || !mcpCallback) {
    return NextResponse.json(
      { error: "Missing session or callback_url parameter" },
      { status: 400 }
    )
  }

  // Check if user has a valid WorkOS session
  try {
    const { withAuth } = await import("@workos-inc/authkit-nextjs")
    const { user } = await withAuth()

    if (!user) {
      // Not authenticated — redirect to sign-in, then back here
      const returnTo = `/auth/mcp?session=${encodeURIComponent(mcpSession)}&callback_url=${encodeURIComponent(mcpCallback)}`
      return NextResponse.redirect(
        new URL(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`, request.url)
      )
    }

    // User is authenticated — create a signed token for the MCP server
    const secret = process.env.DODEV_JWT_SECRET
    if (!secret) {
      console.error("[MCP Auth] DODEV_JWT_SECRET not set")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      avatarUrl: user.profilePictureUrl ?? undefined,
      session: mcpSession,
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minute expiry
    }

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
    const signature = createHmac("sha256", secret).update(payloadB64).digest("base64url")
    const token = `${payloadB64}.${signature}`

    // Redirect to MCP server callback with signed token
    const callbackUrl = new URL(mcpCallback)
    callbackUrl.searchParams.set("token", token)
    callbackUrl.searchParams.set("session", mcpSession)

    return NextResponse.redirect(callbackUrl.toString())
  } catch (error) {
    console.error("[MCP Auth] Error:", error)
    // Auth check failed — redirect to sign-in
    const returnTo = `/auth/mcp?session=${encodeURIComponent(mcpSession)}&callback_url=${encodeURIComponent(mcpCallback)}`
    return NextResponse.redirect(
      new URL(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`, request.url)
    )
  }
}
