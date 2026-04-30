/**
 * Persistent desktop auth state, encrypted at rest when the OS supports it.
 *
 * Format on disk (`<userData>/auth-state.json`, mode 0600):
 *
 *   {
 *     "v": 1,
 *     "encrypted": true | false,
 *     "payload": "<base64 ciphertext>" | "<plain JSON string>"
 *   }
 *
 * - macOS: safeStorage uses a per-user key derived without UI prompt.
 * - Windows: safeStorage uses DPAPI (silent).
 * - Linux: safeStorage falls through to libsecret; if no D-Bus session
 *   is available (headless / SSH / minimal containers), we fall back to
 *   plain JSON. The file is still chmod 0600 so it's user-private.
 *
 * Sign-out simply unlinks the file.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { app, safeStorage } from "electron"

export interface DesktopSession {
  workosUserId: string
  email: string
  name?: string
  avatarUrl?: string
  /** When this session was persisted, for diagnostics. */
  persistedAt: number
}

interface AuthFileV1 {
  v: 1
  encrypted: boolean
  payload: string
}

function authStatePath(): string {
  return join(app.getPath("userData"), "auth-state.json")
}

function ensureUserDataDir(): void {
  const dir = dirname(authStatePath())
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function canEncrypt(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function loadSession(): DesktopSession | null {
  const file = authStatePath()
  if (!existsSync(file)) return null

  let raw: string
  try {
    raw = readFileSync(file, "utf-8")
  } catch {
    return null
  }

  let wrapper: AuthFileV1
  try {
    wrapper = JSON.parse(raw) as AuthFileV1
  } catch {
    // Legacy / corrupt file. Wipe and force re-auth.
    try {
      unlinkSync(file)
    } catch {
      // best-effort
    }
    return null
  }

  if (wrapper.v !== 1 || typeof wrapper.payload !== "string") return null

  let decoded: string
  if (wrapper.encrypted) {
    if (!canEncrypt()) {
      // Encrypted file but the OS no longer can decrypt (e.g. user
      // moved profile). Wipe so the next sign-in writes a clean file.
      try {
        unlinkSync(file)
      } catch {
        // best-effort
      }
      return null
    }
    try {
      decoded = safeStorage.decryptString(Buffer.from(wrapper.payload, "base64"))
    } catch {
      try {
        unlinkSync(file)
      } catch {
        // best-effort
      }
      return null
    }
  } else {
    decoded = wrapper.payload
  }

  try {
    return JSON.parse(decoded) as DesktopSession
  } catch {
    return null
  }
}

export function saveSession(session: DesktopSession): void {
  ensureUserDataDir()
  const file = authStatePath()
  const json = JSON.stringify(session)

  let wrapper: AuthFileV1
  if (canEncrypt()) {
    const ciphertext = safeStorage.encryptString(json)
    wrapper = {
      v: 1,
      encrypted: true,
      payload: ciphertext.toString("base64"),
    }
  } else {
    wrapper = {
      v: 1,
      encrypted: false,
      payload: json,
    }
  }

  writeFileSync(file, JSON.stringify(wrapper), { mode: 0o600 })
  // writeFileSync's mode is only honored on create; chmod explicitly in
  // case the file already existed with a wider mask.
  try {
    chmodSync(file, 0o600)
  } catch {
    // best-effort
  }
}

export function clearSession(): void {
  const file = authStatePath()
  if (existsSync(file)) {
    try {
      unlinkSync(file)
    } catch {
      // best-effort
    }
  }
}

/** Diagnostic — only used in dev logs. Don't surface to the renderer. */
export function authStateMeta(): {
  path: string
  exists: boolean
  encryptionAvailable: boolean
} {
  return {
    path: authStatePath(),
    exists: existsSync(authStatePath()),
    encryptionAvailable: canEncrypt(),
  }
}
