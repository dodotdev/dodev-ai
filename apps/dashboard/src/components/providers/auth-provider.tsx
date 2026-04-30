import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { SessionSource, SessionUser } from "@/lib/session-source"

/**
 * Same shape as apps/web's useAuth() so ported components don't know the
 * difference. The flow differs: the web app's AuthProvider received WorkOS
 * fields from Next.js server context; here we fetch them on mount from a
 * SessionSource (cross-subdomain cookie in web, IPC + keychain in Electron).
 */
interface AuthContextValue {
  user: {
    _id: string
    workosUserId: string
    email: string
    name?: string
    avatarUrl?: string
    apiKey: string
    apiKeyHash: string
    plan: string
  } | null
  apiKeyHash: string | null
  isLoading: boolean
  signOutUrl: string
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  apiKeyHash: null,
  isLoading: true,
  signOutUrl: "",
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({
  sessionSource,
  children,
  fallback,
  unauthedFallback,
  onUnauthenticated,
  /**
   * Optional subscription. The Electron source uses this to push session
   * changes from the main process (after a loopback callback completes,
   * or after sign-out clears the file). Default: noop.
   */
  subscribe,
}: {
  sessionSource: SessionSource
  children: React.ReactNode
  /** Rendered while the session is still being resolved (undefined). */
  fallback: React.ReactNode
  /**
   * Rendered when the session is explicitly absent (null). Defaults to
   * `fallback` so the web flow can keep using a single shell. The
   * Electron path passes a real sign-in screen here so users see a
   * branded prompt instead of an indefinite spinner.
   */
  unauthedFallback?: React.ReactNode
  /**
   * Called once when `fetchSession()` returns null. The web path
   * implementation redirects to `sessionSource.signInUrl(...)`. The
   * Electron path uses an in-window sign-in screen and doesn't need
   * this callback to fire — pass a noop.
   */
  onUnauthenticated: () => void
  subscribe?: (cb: (session: SessionUser | null) => void) => () => void
}) {
  const [session, setSession] = useState<SessionUser | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    sessionSource
      .fetchSession()
      .then((s) => {
        if (cancelled) return
        setSession(s)
        if (s === null) onUnauthenticated()
      })
      .catch((err) => {
        console.error("fetchSession failed", err)
        if (!cancelled) {
          setSession(null)
          onUnauthenticated()
        }
      })
    return () => {
      cancelled = true
    }
  }, [sessionSource, onUnauthenticated])

  // Push-based session updates (Electron). Web uses pull-only via fetchSession.
  useEffect(() => {
    if (!subscribe) return
    return subscribe((s) => {
      setSession(s)
      if (s === null) onUnauthenticated()
    })
  }, [subscribe, onUnauthenticated])

  if (session === undefined) return <>{fallback}</>
  if (session === null) return <>{unauthedFallback ?? fallback}</>
  return (
    <SessionAttachedProvider session={session} signOutUrl={sessionSource.signOutUrl()}>
      {children}
    </SessionAttachedProvider>
  )
}

function SessionAttachedProvider({
  session,
  signOutUrl,
  children,
}: {
  session: SessionUser
  signOutUrl: string
  children: React.ReactNode
}) {
  const ensureUser = useMutation(api.users.createOrUpdateFromWorkOS)
  const user = useQuery(api.users.getByWorkosId, { workosUserId: session.workosUserId })
  const ensuredRef = useRef(false)

  useEffect(() => {
    if (!ensuredRef.current) {
      ensuredRef.current = true
      ensureUser({
        workosUserId: session.workosUserId,
        email: session.email,
        name: session.name,
        avatarUrl: session.avatarUrl,
      }).catch(console.error)
    }
  }, [ensureUser, session])

  const isLoading = user === undefined
  const apiKeyHash = user?.apiKeyHash ?? null

  return (
    <AuthContext.Provider
      value={{
        user: user
          ? {
              _id: user._id as string,
              workosUserId: user.workosUserId,
              email: user.email,
              name: user.name,
              avatarUrl: user.avatarUrl,
              apiKey: user.apiKey,
              apiKeyHash: user.apiKeyHash,
              plan: user.plan,
            }
          : null,
        apiKeyHash,
        isLoading,
        signOutUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
