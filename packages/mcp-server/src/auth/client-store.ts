import { randomBytes, randomUUID } from "node:crypto"
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js"
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js"
import { api, getConvexClient } from "../convex-client.js"

/**
 * Convex-backed store for dynamically registered OAuth clients.
 *
 * MCP clients (Claude Code, Cursor, etc.) use RFC 7591 Dynamic Client Registration
 * to register themselves before starting the OAuth flow. Previously these were
 * stored in-memory and lost on every server restart, forcing full re-authentication.
 *
 * Now persisted to Convex so client registrations survive deploys and restarts.
 * An in-memory LRU cache avoids hitting Convex on every token refresh.
 */
export class ConvexClientStore implements OAuthRegisteredClientsStore {
  private cache = new Map<string, OAuthClientInformationFull>()

  async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
    // Check cache first
    const cached = this.cache.get(clientId)
    if (cached) return cached

    // Query Convex
    try {
      const convex = getConvexClient()
      const record = await convex.query(api.oauthClients.get, { clientId })

      if (!record) {
        console.error(`[auth] Client lookup miss: ${clientId} — not in Convex`)
        return undefined
      }

      const client = JSON.parse(record.clientData) as OAuthClientInformationFull
      this.cache.set(clientId, client)
      console.error(`[auth] Client loaded from Convex: ${clientId}`)
      return client
    } catch (err) {
      console.error(
        `[auth] Client lookup error for ${clientId}:`,
        err instanceof Error ? err.message : err
      )
      return undefined
    }
  }

  async registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): Promise<OAuthClientInformationFull> {
    const clientId = randomUUID()
    const clientSecret = randomBytes(32).toString("hex")

    const full: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    }

    // Persist to Convex
    try {
      const convex = getConvexClient()
      await convex.mutation(api.oauthClients.register, {
        clientId,
        clientData: JSON.stringify(full),
      })
      console.error(
        `[auth] Client registered and persisted: ${clientId} (name: ${client.client_name ?? "unknown"})`
      )
    } catch (err) {
      // Log but don't fail — client still works for this session via cache
      console.error(
        `[auth] Failed to persist client ${clientId} to Convex:`,
        err instanceof Error ? err.message : err
      )
    }

    // Cache locally
    this.cache.set(clientId, full)
    return full
  }
}
