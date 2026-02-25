import { createHash, randomBytes } from "node:crypto"
import { API_KEY_LENGTH, API_KEY_PREFIX } from "@dodev/shared"

/** Cached hash for the current session's API key */
let cachedHash: string | null = null
let cachedKey: string | null = null

/** Generate a new API key */
export function generateApiKey(): string {
  const bytes = randomBytes(API_KEY_LENGTH)
  return `${API_KEY_PREFIX}${bytes.toString("hex").slice(0, API_KEY_LENGTH)}`
}

/** Hash an API key using SHA-256 */
export function hashApiKey(apiKey: string): string {
  // Return cached hash if the key hasn't changed
  if (cachedKey === apiKey && cachedHash) {
    return cachedHash
  }

  const hash = createHash("sha256").update(apiKey).digest("hex")
  cachedKey = apiKey
  cachedHash = hash
  return hash
}

/** Get the API key from environment and return its hash */
export function getApiKeyHash(): string {
  const apiKey = process.env.DODEV_API_KEY
  if (!apiKey) {
    throw new Error("DODEV_API_KEY environment variable is required")
  }
  return hashApiKey(apiKey)
}
