/**
 * GET /api/auth/session
 *
 * Returns the WorkOS session fields for the currently-authed user. The Vite
 * dashboard at app.dodev.ai fetches this on mount with `credentials: "include"`
 * so it can mirror the Next.js middleware behavior without running inside
 * Next.js itself.
 *
 * CORS is restricted to known dashboard origins. The response carries no
 * secrets — just the WorkOS identity that the existing Convex AuthProvider
 * uses to look up the user record.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const ALLOWED_ORIGINS = [
  "https://app.dodev.ai",
  "http://localhost:3042",
  "http://app.localhost:3041",
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  })
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin")
  const headers = corsHeaders(origin)

  // Self-hosted mode has no WorkOS session; the marketing app normally
  // redirects everything to /dashboard. Return a synthetic "no session" so
  // the dashboard falls through to its self-hosted path.
  const isCloud = !!process.env.WORKOS_CLIENT_ID
  if (!isCloud) {
    return NextResponse.json({ user: null }, { headers })
  }

  const { withAuth } = await import("@workos-inc/authkit-nextjs")
  const { user } = await withAuth()

  if (!user) {
    return NextResponse.json({ user: null }, { headers })
  }

  return NextResponse.json(
    {
      user: {
        workosUserId: user.id,
        email: user.email,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.email ||
          undefined,
        avatarUrl: user.profilePictureUrl ?? undefined,
      },
    },
    { headers }
  )
}
