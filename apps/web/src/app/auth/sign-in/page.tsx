"use client"

import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  CheckSquare,
  FolderOpen,
  ListTodo,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Step = "email" | "code" | "success"
const RESEND_COOLDOWN = 30

export default function SignInPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus()
  }, [step])

  const handleSendMagicLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/magic-link/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send code")

      setStep("code")
      setResendCooldown(RESEND_COOLDOWN)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = useCallback(
    async (codeValue: string) => {
      if (codeValue.length !== 6) return
      setError("")
      setIsLoading(true)

      try {
        const res = await fetch("/api/auth/magic-link/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeValue, email }),
          credentials: "include",
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to verify code")

        setStep("success")
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
        setCode("")
      } finally {
        setIsLoading(false)
      }
    },
    [email]
  )

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6)
    setCode(digits)
    if (digits.length === 6) verifyCode(digits)
  }

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/oauth/google?returnTo=/dashboard"
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="mb-8 inline-flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                <ListTodo className="size-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-semibold tracking-tight">DoMCP.ai</span>
            </Link>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">Get on the waitlist</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign up to reserve your spot. Already approved? Sign in below.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            {/* Email Step */}
            {step === "email" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-border/40 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                      Email address with magic link
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="mr-2 size-4" />
                        Continue with email
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}

            {/* Code Step */}
            {step === "code" && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium">Check your email</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
                  </p>
                </div>

                <Input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  maxLength={6}
                  className="text-center font-mono text-lg tracking-[0.5em]"
                  autoComplete="one-time-code"
                />

                {isLoading && (
                  <div className="flex justify-center">
                    <Loader2 className="size-5 animate-spin text-emerald-500" />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setStep("email")
                      setCode("")
                      setError("")
                    }}
                  >
                    <ArrowLeft className="mr-1 inline size-3" />
                    Change email
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    className="text-emerald-600 hover:text-emerald-700 disabled:text-muted-foreground"
                    onClick={() => handleSendMagicLink()}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}

            {/* Success Step */}
            {step === "success" && (
              <div className="space-y-3 text-center">
                <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
                <p className="text-sm font-medium">You&apos;re signed in!</p>
                <p className="text-xs text-muted-foreground">Redirecting to dashboard...</p>
                <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && <p className="mt-3 text-center text-xs text-destructive">{error}</p>}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              &larr; Back to home
            </Link>
          </p>
        </div>
      </div>

      {/* Right — Chalkboard panel */}
      <div className="relative hidden overflow-hidden bg-emerald-950 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center">
        {/* Chalk-dust texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Subtle gradient glow */}
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-emerald-400/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 max-w-md px-12">
          {/* Chalk-style headline */}
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-emerald-400/60">
            AI-Native Task Management
          </p>
          <h2 className="text-3xl font-bold leading-tight text-white">
            Give your AI agents
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              persistent memory.
            </span>
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-emerald-200/50">
            DoMCP connects your AI tools to a shared task and memory system via the Model Context
            Protocol.
          </p>

          {/* Feature checklist */}
          <div className="mt-10 space-y-5">
            {[
              {
                icon: CheckSquare,
                title: "Todos that persist",
                desc: "Tasks survive sessions, restarts, and context windows.",
              },
              {
                icon: Brain,
                title: "Memories your AI recalls",
                desc: "Store decisions, patterns, and learnings across projects.",
              },
              {
                icon: FolderOpen,
                title: "Project-scoped context",
                desc: "Organize everything by project with smart filtering.",
              },
              {
                icon: Sparkles,
                title: "Works with any MCP client",
                desc: "Claude Code, Cursor, Windsurf, VS Code, and more.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-700/30 bg-emerald-900/40">
                  <item.icon className="size-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-100">{item.title}</p>
                  <p className="mt-0.5 text-xs text-emerald-300/40">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chalk line divider */}
          <div className="mt-10 border-t border-emerald-700/20" />

          {/* Social proof */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-emerald-700/30 bg-emerald-900/30 px-3 py-1 text-xs text-emerald-400/70">
              <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
              Open Source
            </div>
            <span className="text-xs text-emerald-400/30">MIT Licensed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
