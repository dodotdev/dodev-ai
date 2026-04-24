import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { sanitizeReturnTo } from "@/lib/return-to"
import { workos } from "@/lib/workos"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const returnTo = sanitizeReturnTo(searchParams.get("returnTo"))

    const stateData = JSON.stringify({ returnPathname: returnTo })
    const state = Buffer.from(stateData).toString("base64url")

    const redirectUri = (process.env.WORKOS_REDIRECT_URI || "http://localhost:3041/callback").trim()

    const authorizationUrl = workos.userManagement.getAuthorizationUrl({
      clientId: process.env.WORKOS_CLIENT_ID!,
      redirectUri,
      provider: "GoogleOAuth",
      state,
    })

    return NextResponse.redirect(authorizationUrl)
  } catch (error: unknown) {
    console.error("[Google OAuth] Error:", error)
    const message = error instanceof Error ? error.message : "Failed to initiate Google sign-in"
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
