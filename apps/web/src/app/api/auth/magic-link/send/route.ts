import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { workos } from "@/lib/workos"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    await workos.userManagement.createMagicAuth({ email })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error) {
      const workosError = error as { code: string }
      if (workosError.code === "rate_limit_exceeded") {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        )
      }
    }

    console.error("[Magic Link Send] Error:", error)
    return NextResponse.json(
      { error: "Failed to send magic link. Please try again." },
      { status: 500 }
    )
  }
}
