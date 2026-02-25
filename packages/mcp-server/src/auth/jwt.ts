import { createHmac, randomBytes } from "node:crypto"

const ALG = "HS256"
const ACCESS_TOKEN_TTL = 15 * 60 // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 days

interface JwtPayload {
  sub: string // workosUserId
  email?: string
  aud: string // issuer URL
  iat: number
  exp: number
  type: "access" | "refresh"
  clientId: string
}

function getSecret(): string {
  const secret = process.env.DODEV_JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("DODEV_JWT_SECRET must be at least 32 characters")
  }
  return secret
}

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data
  return buf.toString("base64url")
}

function sign(payload: JwtPayload): string {
  const header = base64url(JSON.stringify({ alg: ALG, typ: "JWT" }))
  const body = base64url(JSON.stringify(payload))
  const sig = createHmac("sha256", getSecret())
    .update(`${header}.${body}`)
    .digest()
  return `${header}.${body}.${base64url(sig)}`
}

function verify(token: string): JwtPayload {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT format")

  const [header, body, sig] = parts
  const expected = createHmac("sha256", getSecret())
    .update(`${header}.${body}`)
    .digest("base64url")

  if (sig !== expected) throw new Error("Invalid JWT signature")

  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as JwtPayload

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired")
  }

  return payload
}

export function signAccessToken(opts: {
  workosUserId: string
  email?: string
  clientId: string
  audience: string
}): string {
  const now = Math.floor(Date.now() / 1000)
  return sign({
    sub: opts.workosUserId,
    email: opts.email,
    aud: opts.audience,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL,
    type: "access",
    clientId: opts.clientId,
  })
}

export function signRefreshToken(opts: {
  workosUserId: string
  clientId: string
  audience: string
}): string {
  const now = Math.floor(Date.now() / 1000)
  return sign({
    sub: opts.workosUserId,
    aud: opts.audience,
    iat: now,
    exp: now + REFRESH_TOKEN_TTL,
    type: "refresh",
    clientId: opts.clientId,
  })
}

export function verifyAccessToken(token: string): JwtPayload {
  const payload = verify(token)
  if (payload.type !== "access") throw new Error("Not an access token")
  return payload
}

export function verifyRefreshToken(token: string): JwtPayload {
  const payload = verify(token)
  if (payload.type !== "refresh") throw new Error("Not a refresh token")
  return payload
}

export function generateAuthorizationCode(): string {
  return randomBytes(32).toString("hex")
}
