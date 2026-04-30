/**
 * Sign-in screen rendered inside the Electron window when no auth state
 * exists yet. Replaces the indefinite "Loading…" shell. Same renderer
 * code that powers the rest of the dashboard, just gated by a
 * runtime-target check at the top of main.tsx.
 *
 * Three visible states, driven by local component state:
 *
 *   1. idle          — initial. "Sign in" button.
 *   2. waiting       — sign-in IPC fired, browser is open, we're
 *                      listening for the loopback callback to land.
 *                      Shows the loopback port + an "open browser
 *                      again" affordance for users who accidentally
 *                      closed the tab.
 *   3. error         — IPC failed (rare; usually means main process
 *                      isn't listening). Allow retry.
 *
 * The transition from waiting → authed happens above us: the
 * AuthProvider subscribes to session changes from the main process and
 * remounts the tree once a session lands. We just have to look pretty
 * while the user signs in elsewhere.
 */
import { Bot, ExternalLink, Loader2, Lock, Sparkles } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

type SignInState =
  | { kind: "idle" }
  | { kind: "waiting"; port: number; firedAt: number }
  | { kind: "error"; message: string }

export function DesktopSignInScreen() {
  const [state, setState] = useState<SignInState>({ kind: "idle" })

  async function fireSignIn() {
    setState({ kind: "idle" })
    try {
      // The signIn IPC opens the system browser and starts a one-shot
      // loopback HTTP listener on a random 127.0.0.1 port. Once the
      // user completes WorkOS sign-in, /desktop-auth posts the
      // identity payload to that loopback, which writes the encrypted
      // auth-state.json and broadcasts auth:session-changed to all
      // renderers. The AuthProvider above us picks the new session up
      // and remounts the tree authenticated — we never have to
      // re-render this screen ourselves.
      const result = await window.dodev?.auth.signIn()
      if (!result) throw new Error("dodev bridge missing")
      setState({ kind: "waiting", port: result.port, firedAt: Date.now() })
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Sign-in failed",
      })
    }
  }

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30">
            <Sparkles className="size-6 text-emerald-500" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">dodev.ai</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cross-session memory and tasks for your AI agents.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-surface">
          {state.kind === "idle" && <IdlePane onSignIn={fireSignIn} />}
          {state.kind === "waiting" && <WaitingPane port={state.port} onResend={fireSignIn} />}
          {state.kind === "error" && <ErrorPane message={state.message} onRetry={fireSignIn} />}
        </div>

        {/* Footnote */}
        <div className="text-center text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" />
            Your session lives on this device only — encrypted at rest when your OS supports it. We
            never store your Anthropic key.
          </span>
        </div>
      </div>
    </div>
  )
}

function IdlePane({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="px-6 py-7">
      <h2 className="text-base font-medium">Sign in to continue</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We'll open your browser for sign-in. The desktop app refreshes automatically once you're
        done.
      </p>
      <button
        type="button"
        onClick={onSignIn}
        className={cn(
          "mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md",
          "bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90"
        )}
      >
        <ExternalLink className="size-4" />
        Sign in with browser
      </button>
      <ul className="mt-5 space-y-1.5 text-[11px] text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-1 rounded-full bg-emerald-500" />
          One sign-in across web + desktop
        </li>
        <li className="flex items-center gap-2">
          <span className="size-1 rounded-full bg-emerald-500" />
          Live session monitoring once authed
        </li>
        <li className="flex items-center gap-2">
          <span className="size-1 rounded-full bg-emerald-500" />
          ⌘⇧D toggles the window from anywhere
        </li>
      </ul>
    </div>
  )
}

function WaitingPane({ port, onResend }: { port: number; onResend: () => void }) {
  return (
    <div className="px-6 py-7">
      <div className="flex items-center gap-3">
        <div className="relative flex size-9 items-center justify-center">
          <Bot className="size-5 text-emerald-500" />
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Browser opened — waiting for sign-in</p>
          <p className="text-[11px] text-muted-foreground">
            Loopback listening on <code className="font-mono">127.0.0.1:{port}</code>
          </p>
        </div>
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>

      <div className="mt-5 rounded-md border border-dashed border-border/60 bg-background px-3 py-2.5 text-[12px] text-muted-foreground">
        <p className="text-foreground">Don't see the browser tab?</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>Make sure the marketing dev server is running on :3041.</li>
          <li>Use the button below to retry.</li>
        </ol>
      </div>

      <button
        type="button"
        onClick={onResend}
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        <ExternalLink className="size-3.5" />
        Open browser again
      </button>
    </div>
  )
}

function ErrorPane({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-6 py-7">
      <h2 className="text-base font-medium text-red-600 dark:text-red-400">Sign-in failed</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        Retry
      </button>
    </div>
  )
}
