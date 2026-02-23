import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { getConvexClient } from "@/lib/convex"
import { api } from "@domcp/convex/api"

export const metadata = {
  title: "You're on the Waitlist - DoMCP",
}

async function sendWaitlistEmail(email: string, name?: string) {
  const apiKey = process.env.SENDDEV_API_KEY

  if (!apiKey) return

  const greeting = name ? `Hi ${name},` : "Hi there,"

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#18181b;">
                <span style="color:#059669;">DoMCP</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b;">
                You're on the list!
              </h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
                ${greeting}
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
                Thanks for signing up for early access to DoMCP &mdash; the open-source AI task and memory management system built on the Model Context Protocol.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
                We're setting things up and will let you know when your account is ready. In the meantime, follow us on X to stay in the loop.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="padding-right:24px;">
                    <a href="https://x.com/dodotdev" target="_blank" style="font-size:14px;font-weight:500;color:#3f3f46;text-decoration:none;">
                      <img src="https://cdn.simpleicons.org/x/3f3f46" alt="X" width="16" height="16" style="display:inline-block;vertical-align:middle;margin-right:6px;" />@dodotdev
                    </a>
                  </td>
                  <td align="center">
                    <a href="https://github.com/dodotdev/domcp-ai" target="_blank" style="font-size:14px;font-weight:500;color:#3f3f46;text-decoration:none;">
                      <img src="https://cdn.simpleicons.org/github/3f3f46" alt="GitHub" width="16" height="16" style="display:inline-block;vertical-align:middle;margin-right:6px;" />GitHub
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                domcp.ai &middot; Open Source &middot; MIT Licensed
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    await fetch("https://api.do.dev/v1/send/emails/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: {
          email: process.env.SENDDEV_FROM_EMAIL || "no-reply@domcp.ai",
          name: process.env.SENDDEV_FROM_NAME || "No Reply",
        },
        to: email,
        subject: "You're on the DoMCP waitlist!",
        html,
      }),
    })
  } catch (error) {
    console.error("Failed to send waitlist email:", error)
  }
}

export default async function WaitlistedPage() {
  const user = await getUser()

  if (!user) {
    redirect("/auth/sign-in")
  }

  const convex = getConvexClient()
  const convexUser = await convex.query(api.users.getByWorkosId, {
    workosUserId: user.id,
  })

  // If already approved, send them to the dashboard
  if (convexUser?.role === "approved" || convexUser?.role === "admin") {
    redirect("/dashboard")
  }

  // Send welcome email if not already sent
  if (convexUser && !convexUser.waitlistEmailSentAt) {
    await sendWaitlistEmail(user.email, user.name)
    await convex.mutation(api.users.markWaitlistEmailSent, {
      workosUserId: user.id,
    })
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6 pt-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full border border-border bg-muted/50 text-2xl">
          &#9203;
        </div>

        <h1 className="text-3xl font-bold tracking-tight">You're on the waitlist!</h1>

        <p className="mt-4 text-lg text-muted-foreground">
          We're setting things up and will let you know when your account is ready.
        </p>

        <p className="mt-2 text-sm text-muted-foreground/70">
          Check your email for a confirmation from us.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <a
            href="https://x.com/dodotdev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:from-emerald-500 hover:to-emerald-700"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Follow @dodotdev on X
          </a>
        </div>
      </div>
    </div>
  )
}
