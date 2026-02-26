const SEND_API_URL = "https://api.do.dev/v1/send/emails/send"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

/**
 * Send an email via the send.dev API.
 *
 * Requires SENDDEV_API_KEY in the environment.
 * Optionally reads SENDDEV_FROM_EMAIL and SENDDEV_FROM_NAME for the sender address.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.SENDDEV_API_KEY
  if (!apiKey) {
    console.warn("sendEmail: SENDDEV_API_KEY not set, skipping email send")
    return
  }

  const response = await fetch(SEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: {
        email: process.env.SENDDEV_FROM_EMAIL || "no-reply@dodev.ai",
        name: process.env.SENDDEV_FROM_NAME || "dodev.ai",
      },
      to,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "unknown")
    throw new Error(`sendEmail failed (${response.status}): ${body}`)
  }
}

/**
 * Send the welcome / quick-start email to a newly activated user.
 *
 * Cloud mode: HTTP transport + OAuth 2.1 (no API key needed in MCP config).
 * Auth happens via browser redirect when the MCP client first connects.
 *
 * @param email - recipient address
 * @param name  - optional display name for the greeting
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string,
): Promise<void> {
  const greeting = name ? `Hi ${name},` : "Welcome to dodev.ai!"
  const hasName = Boolean(name)

  const mcpJson = JSON.stringify({
    mcpServers: {
      dodev: {
        type: "http",
        url: "https://cloud.dodev.ai/mcp",
      },
    },
  }, null, 2)

  // Escape for HTML display
  const mcpJsonHtml = mcpJson
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/ /g, "&nbsp;")
    .replace(/\n/g, "<br>")

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

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#18181b;">
                <span style="color:#059669;">dodev.ai</span>
              </h1>
            </td>
          </tr>

          <!-- Greeting & Intro -->
          <tr>
            <td style="padding:0 40px 8px;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#18181b;">
                ${hasName ? greeting : "Welcome to dodev.ai!"}
              </h2>
              ${hasName ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">Welcome to dodev.ai!</p>` : ""}
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
                Your account is ready. dodev.ai gives your AI agents persistent memory, task tracking, and project context across sessions via the Model Context Protocol (MCP).
              </p>
            </td>
          </tr>

          <!-- Quick Start Steps -->
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#18181b;">
                Quick Start Guide
              </p>

              <!-- Step 1: Connect -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="32" valign="top" style="padding-top:2px;">
                    <div style="width:24px;height:24px;border-radius:50%;background-color:#059669;color:#ffffff;font-size:13px;font-weight:700;line-height:24px;text-align:center;">1</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18181b;">Connect your AI tool</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#52525b;">
                      Create a <code style="background-color:#f4f4f5;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:13px;">.mcp.json</code> file in your project root (or home directory for global access):
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#18181b;border-radius:8px;padding:16px;">
                          <code style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:12px;line-height:1.6;color:#a1a1aa;">
                            ${mcpJsonHtml}
                          </code>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#71717a;">
                      <strong>Claude Code alternative:</strong> Run
                      <code style="background-color:#f4f4f5;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px;color:#18181b;">claude mcp add dodev --transport http https://cloud.dodev.ai/mcp</code>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 2: Authenticate -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td width="32" valign="top" style="padding-top:2px;">
                    <div style="width:24px;height:24px;border-radius:50%;background-color:#059669;color:#ffffff;font-size:13px;font-weight:700;line-height:24px;text-align:center;">2</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18181b;">Authenticate</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#52525b;">
                      After adding the server, you need to authenticate. In Claude Code, type
                      <code style="background-color:#f4f4f5;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:13px;">/mcp</code>
                      and select <strong>dodev</strong> to start the connection. A browser window will open for you to sign in with the same account you registered with.
                    </p>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">
                      No API keys or tokens to copy &mdash; authentication is handled via OAuth. You'll stay connected for up to a week before needing to re-authenticate.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 3: Create a project -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="32" valign="top" style="padding-top:2px;">
                    <div style="width:24px;height:24px;border-radius:50%;background-color:#059669;color:#ffffff;font-size:13px;font-weight:700;line-height:24px;text-align:center;">3</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18181b;">Create your first project</p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#52525b;">
                      Once connected, ask your AI agent to create a project for you:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;">
                          <p style="margin:0;font-size:14px;font-style:italic;color:#166534;">
                            &ldquo;Create a dodev project called My Project&rdquo;
                          </p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#71717a;">
                      The agent will call <code style="background-color:#f4f4f5;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px;">create_project</code> via MCP. From there you can track tasks, store memories, manage issues, and more &mdash; all through your AI agent.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://dodev.ai/dashboard/getting-started"
                       target="_blank"
                       style="display:inline-block;padding:12px 32px;background-color:#059669;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;line-height:1;">
                      View Full Setup Guide
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Social Links -->
          <tr>
            <td style="padding:16px 40px 24px;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="padding-right:24px;">
                    <a href="https://x.com/dodotdev" target="_blank" style="font-size:14px;font-weight:500;color:#3f3f46;text-decoration:none;">
                      <img src="https://cdn.simpleicons.org/x/3f3f46" alt="X" width="16" height="16" style="display:inline-block;vertical-align:middle;margin-right:6px;" />@dodotdev
                    </a>
                  </td>
                  <td align="center">
                    <a href="https://github.com/dodotdev/dodev-ai" target="_blank" style="font-size:14px;font-weight:500;color:#3f3f46;text-decoration:none;">
                      <img src="https://cdn.simpleicons.org/github/3f3f46" alt="GitHub" width="16" height="16" style="display:inline-block;vertical-align:middle;margin-right:6px;" />GitHub
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e4e4e7;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                dodev.ai &middot; Open Source &middot; MIT Licensed
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  await sendEmail({
    to: email,
    subject: "Welcome to dodev.ai \u2014 here's how to get started",
    html,
  })
}
