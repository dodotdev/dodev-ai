import type { Tool } from "@modelcontextprotocol/sdk/types.js"
import { getApiKeyHash } from "../auth/api-key.js"
import { api, getConvexClient } from "../convex-client.js"

/** Map file extensions to MIME types for auto-detection */
const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
}

/** Extract file extension from a filename (lowercase, with leading dot) */
function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".")
  if (dot === -1) return ""
  return filename.slice(dot).toLowerCase()
}

export const attachmentTools: Tool[] = [
  {
    name: "attach_file",
    description:
      "Attach a file to a todo or issue. The file content must be base64-encoded. Supports images, PDFs, text files, and more. Either todoId or issueId must be provided.",
    inputSchema: {
      type: "object" as const,
      properties: {
        todoId: {
          type: "string",
          description: "Todo ID to attach the file to",
        },
        issueId: {
          type: "string",
          description: "Issue ID to attach the file to",
        },
        filename: {
          type: "string",
          description: "Original filename with extension (e.g. 'screenshot.png', 'report.pdf')",
        },
        content: {
          type: "string",
          description: "Base64-encoded file content",
        },
        mimeType: {
          type: "string",
          description:
            "MIME type of the file (e.g. 'image/png', 'application/pdf'). Auto-detected from file extension if omitted.",
        },
        description: {
          type: "string",
          description: "Human-readable description of the file",
        },
      },
      required: ["filename", "content"],
    },
  },
  {
    name: "list_attachments",
    description:
      "List all file attachments for a todo or issue. Either todoId or issueId must be provided.",
    inputSchema: {
      type: "object" as const,
      properties: {
        todoId: {
          type: "string",
          description: "Todo ID to list attachments for",
        },
        issueId: {
          type: "string",
          description: "Issue ID to list attachments for",
        },
      },
    },
  },
  {
    name: "delete_attachment",
    description: "Permanently delete a file attachment.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "The attachment ID" },
      },
      required: ["id"],
    },
  },
]

export async function handleAttachmentTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = getConvexClient()
  const apiKeyHash = getApiKeyHash()

  switch (name) {
    case "attach_file": {
      const filename = args.filename as string
      const content = args.content as string

      // Auto-detect MIME type from extension if not provided
      const mimeType =
        (args.mimeType as string | undefined) ??
        MIME_MAP[getExtension(filename)] ??
        "application/octet-stream"

      // Calculate approximate file size from base64 content
      const size = Math.ceil((content.length * 3) / 4)

      return await client.action(api.attachmentsInternal.uploadFromBase64, {
        apiKeyHash,
        todoId: args.todoId as string | undefined,
        issueId: args.issueId as string | undefined,
        filename,
        base64Content: content,
        mimeType,
        description: args.description as string | undefined,
        size,
      })
    }

    case "list_attachments":
      return await client.query(api.attachments.list, {
        apiKeyHash,
        todoId: args.todoId as string | undefined,
        issueId: args.issueId as string | undefined,
      })

    case "delete_attachment":
      return await client.mutation(api.attachments.remove, {
        apiKeyHash,
        id: args.id as string,
      })

    default:
      throw new Error(`Unknown attachment tool: ${name}`)
  }
}
