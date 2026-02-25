import { randomUUID, randomBytes } from "node:crypto"
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js"
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js"

/**
 * In-memory store for dynamically registered OAuth clients.
 *
 * MCP clients (Claude Code, Cursor, etc.) use RFC 7591 Dynamic Client Registration
 * to register themselves before starting the OAuth flow. Registrations are ephemeral
 * and lost on server restart — clients simply re-register.
 */
export class InMemoryClientStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>()

  getClient(clientId: string): OAuthClientInformationFull | undefined {
    return this.clients.get(clientId)
  }

  registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): OAuthClientInformationFull {
    const clientId = randomUUID()
    const clientSecret = randomBytes(32).toString("hex")

    const full: OAuthClientInformationFull = {
      ...client,
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
    }

    this.clients.set(clientId, full)
    return full
  }
}
