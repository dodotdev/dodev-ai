import { AsyncLocalStorage } from "node:async_hooks"

interface AuthContext {
  /** Pre-resolved apiKeyHash for this request (cloud mode) */
  apiKeyHash: string
  /** WorkOS user ID from the JWT */
  workosUserId: string
}

const authStore = new AsyncLocalStorage<AuthContext>()

/** Run a function within a cloud auth context */
export function runWithAuthContext<T>(ctx: AuthContext, fn: () => T | Promise<T>): T | Promise<T> {
  return authStore.run(ctx, fn)
}

/** Get the current auth context (returns undefined in stdio mode) */
export function getAuthContext(): AuthContext | undefined {
  return authStore.getStore()
}
