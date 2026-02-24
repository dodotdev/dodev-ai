/**
 * Embedding generation utility for semantic memory search.
 * Uses OpenRouter (or any OpenAI-compatible API) to generate embeddings.
 *
 * This module is called from Convex actions which have access to `fetch`.
 */

// Convex actions provide fetch and process.env at runtime
declare const process: { env: Record<string, string | undefined> }
declare function fetch(
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
): Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>

export async function generateEmbedding(content: string): Promise<number[] | null> {
  const apiKey = process.env.EMBEDDING_API_KEY
  if (!apiKey) {
    // No API key configured — skip embedding silently
    return null
  }

  const baseUrl = process.env.EMBEDDING_BASE_URL || "https://openrouter.ai/api/v1"
  const model = process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small"

  // Truncate content to avoid token limits (roughly 8k tokens ~ 32k chars)
  const truncated = content.slice(0, 32_000)

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: truncated,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Embedding API error (${response.status}): ${text}`)
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[] }>
  }

  return json.data[0].embedding
}
