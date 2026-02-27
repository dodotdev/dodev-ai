import { createHmac, randomBytes } from "node:crypto"
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js"
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js"
import type { Response } from "express"
import { api, getConvexClient } from "../convex-client.js"
import { consumeAuthCode, getCodeChallenge, storeAuthCode } from "./auth-code-store.js"
import { ConvexClientStore } from "./client-store.js"
import {
  generateAuthorizationCode,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
} from "./jwt.js"
import { consumePendingAuth, storePendingAuth } from "./pending-auth-store.js"

function getBaseUrl(): string {
  const url = process.env.DODEV_BASE_URL
  if (!url) throw new Error("DODEV_BASE_URL environment variable is required")
  return url
}

function getWebUrl(): string {
  const url = process.env.DODEV_WEB_URL
  if (!url) throw new Error("DODEV_WEB_URL environment variable is required")
  return url
}

function getJwtSecret(): string {
  const secret = process.env.DODEV_JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("DODEV_JWT_SECRET must be at least 32 characters")
  }
  return secret
}

/**
 * OAuthServerProvider implementation that uses the dodev.ai web app for login.
 *
 * Flow:
 * 1. MCP client calls /authorize
 * 2. We stash PKCE params and redirect to web app /auth/mcp
 * 3. Web app authenticates user (via WorkOS AuthKit), signs a token, redirects to /callback
 * 4. We verify the signed token, create/update user in Convex, issue our own auth code
 * 5. MCP client exchanges our auth code for access/refresh tokens via /token
 * 6. Access tokens are JWTs containing workosUserId, verified on each request
 */
export class WorkOSOAuthProvider implements OAuthServerProvider {
  private _clientsStore = new ConvexClientStore()

  get clientsStore(): ConvexClientStore {
    return this._clientsStore
  }

  /**
   * Step 1: Redirect to the dodev.ai web app for login.
   *
   * We generate a session token to correlate the callback with the
   * original MCP /authorize request parameters (PKCE challenge, redirect_uri, state).
   */
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const sessionToken = randomBytes(32).toString("hex")

    // Stash the MCP client's authorization params
    storePendingAuth(sessionToken, {
      codeChallenge: params.codeChallenge,
      redirectUri: params.redirectUri,
      state: params.state,
      clientId: client.client_id,
    })

    // Redirect to web app's MCP auth route
    const webUrl = getWebUrl()
    const callbackUrl = `${getBaseUrl()}/callback`
    const authUrl = `${webUrl}/auth/mcp?session=${encodeURIComponent(sessionToken)}&callback_url=${encodeURIComponent(callbackUrl)}`

    res.redirect(authUrl)
  }

  /**
   * Return the PKCE code_challenge for a given authorization code.
   */
  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const challenge = getCodeChallenge(authorizationCode)
    if (!challenge) {
      throw new Error("Authorization code not found or expired")
    }
    return challenge
  }

  /**
   * Step 3: Exchange authorization code for tokens.
   */
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<OAuthTokens> {
    const entry = consumeAuthCode(authorizationCode)
    if (!entry) {
      throw new Error("Invalid or expired authorization code")
    }

    // Ensure the user exists in Convex
    const convex = getConvexClient()
    const user = await convex.query(api.users.getByWorkosId, {
      workosUserId: entry.workosUserId,
    })

    if (!user) {
      throw new Error("User not found")
    }

    const baseUrl = getBaseUrl()

    const accessToken = signAccessToken({
      workosUserId: entry.workosUserId,
      email: entry.email,
      clientId: client.client_id,
      audience: baseUrl,
    })

    const refreshToken = signRefreshToken({
      workosUserId: entry.workosUserId,
      clientId: client.client_id,
      audience: baseUrl,
    })

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 7 * 24 * 60 * 60,
      refresh_token: refreshToken,
    }
  }

  /**
   * Exchange a refresh token for a new access token.
   */
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const { verifyRefreshToken } = await import("./jwt.js")

    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch (err) {
      console.error(
        "[auth] Refresh token verification failed:",
        err instanceof Error ? err.message : err
      )
      throw err
    }

    console.error(`[auth] Token refresh for user ${payload.sub}, client ${client.client_id}`)

    const baseUrl = getBaseUrl()

    const newAccessToken = signAccessToken({
      workosUserId: payload.sub,
      email: payload.email,
      clientId: client.client_id,
      audience: baseUrl,
    })

    const newRefreshToken = signRefreshToken({
      workosUserId: payload.sub,
      clientId: client.client_id,
      audience: baseUrl,
    })

    return {
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: 7 * 24 * 60 * 60,
      refresh_token: newRefreshToken,
    }
  }

  /**
   * Verify an access token and return AuthInfo for the MCP request.
   */
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    let payload
    try {
      payload = verifyAccessToken(token)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[auth] Access token verification failed: ${msg}`)
      throw err
    }

    return {
      token,
      clientId: payload.clientId,
      scopes: [],
      expiresAt: payload.exp,
      extra: {
        workosUserId: payload.sub,
        email: payload.email,
      },
    }
  }

  /**
   * Revoke a token (optional).
   */
  async revokeToken(
    _client: OAuthClientInformationFull,
    _request: OAuthTokenRevocationRequest
  ): Promise<void> {
    // No-op: tokens are short-lived JWTs
  }
}

/**
 * Verify a signed token from the web app.
 * The web app signs: base64url(payload).hmac_signature
 * using the shared DODEV_JWT_SECRET.
 */
function verifyWebAppToken(token: string): {
  sub: string
  email: string
  name?: string
  avatarUrl?: string
  session: string
  exp: number
} {
  const parts = token.split(".")
  if (parts.length !== 2) throw new Error("Invalid token format")

  const [payloadB64, signature] = parts
  const secret = getJwtSecret()

  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url")
  if (signature !== expected) throw new Error("Invalid token signature")

  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString())

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired")
  }

  return payload
}

/**
 * Express route handler for the auth callback.
 *
 * The web app redirects here after the user authenticates.
 * We verify the signed token, create/update the user in Convex,
 * issue our own authorization code, and redirect back to the MCP client.
 */
export async function handleAuthCallback(
  req: { query: Record<string, string> },
  res: Response
): Promise<void> {
  const { token, session: sessionToken } = req.query

  if (!token || !sessionToken) {
    res.status(400).json({ error: "Missing token or session parameter" })
    return
  }

  // Retrieve the pending authorization request
  const pending = consumePendingAuth(sessionToken)
  if (!pending) {
    res.status(400).json({ error: "Invalid or expired session" })
    return
  }

  try {
    // Verify the signed token from the web app
    const userData = verifyWebAppToken(token)

    // Ensure session tokens match
    if (userData.session !== sessionToken) {
      throw new Error("Session mismatch")
    }

    // Create or update user in Convex
    const convex = getConvexClient()
    await convex.mutation(api.users.createOrUpdateFromWorkOS, {
      workosUserId: userData.sub,
      email: userData.email,
      name: userData.name,
      avatarUrl: userData.avatarUrl,
    })

    // Issue our own authorization code
    const authCode = generateAuthorizationCode()
    storeAuthCode({
      code: authCode,
      codeChallenge: pending.codeChallenge,
      clientId: pending.clientId,
      redirectUri: pending.redirectUri,
      workosUserId: userData.sub,
      email: userData.email,
    })

    // Redirect back to the MCP client with our auth code
    const redirectUrl = new URL(pending.redirectUri)
    redirectUrl.searchParams.set("code", authCode)
    if (pending.state) {
      redirectUrl.searchParams.set("state", pending.state)
    }

    res.redirect(redirectUrl.toString())
  } catch (error) {
    console.error("Auth callback error:", error)

    // Redirect back with error
    const redirectUrl = new URL(pending.redirectUri)
    redirectUrl.searchParams.set("error", "server_error")
    redirectUrl.searchParams.set(
      "error_description",
      error instanceof Error ? error.message : "Authentication failed"
    )
    if (pending.state) {
      redirectUrl.searchParams.set("state", pending.state)
    }

    res.redirect(redirectUrl.toString())
  }
}

/**
 * Resolve apiKeyHash for a WorkOS user ID.
 * Used by the cloud server to set up AsyncLocalStorage auth context.
 */
export async function resolveApiKeyHash(workosUserId: string): Promise<string> {
  const convex = getConvexClient()
  const user = await convex.query(api.users.getByWorkosId, { workosUserId })

  if (!user) {
    throw new Error("User not found")
  }

  if (!user.apiKeyHash) {
    throw new Error("User has no API key — regenerate from dashboard")
  }

  return user.apiKeyHash as string
}
