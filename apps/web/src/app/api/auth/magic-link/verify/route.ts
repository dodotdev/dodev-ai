import { api } from "@domcp/convex/api"
import { saveSession } from "@workos-inc/authkit-nextjs"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getConvexClient } from "@/lib/convex"
import { workos } from "@/lib/workos"

export async function POST(request: NextRequest) {
  try {
    const { code, email } = await request.json()

    if (!code || !email) {
      return NextResponse.json({ error: "Code and email required" }, { status: 400 })
    }

    const authResponse = await workos.userManagement.authenticateWithMagicAuth({
      clientId: process.env.WORKOS_CLIENT_ID!,
      code,
      email,
    })

    const { user } = authResponse

    await saveSession(authResponse, request)

    // Sync user to Convex
    try {
      const convex = getConvexClient()
      await convex.mutation(api.users.createOrUpdateFromWorkOS, {
        workosUserId: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
      })
    } catch (syncError) {
      console.error("[Magic Link Verify] Convex user sync error:", syncError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
      },
    })
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      const workosError = error as { code: string }

      if (workosError.code === "invalid_code") {
        return NextResponse.json(
          { error: "Invalid or expired verification code. Please request a new one." },
          { status: 400 }
        )
      }

      if (workosError.code === "code_expired") {
        return NextResponse.json(
          { error: "Verification code has expired. Please request a new one." },
          { status: 400 }
        )
      }
    }

    console.error("[Magic Link Verify] Error:", error)
    return NextResponse.json({ error: "Failed to verify code. Please try again." }, { status: 500 })
  }
}
