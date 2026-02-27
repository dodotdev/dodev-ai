import { BookOpen, Github, MessageSquare } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Documentation",
  description: "dodev.ai documentation — coming soon.",
}

export default function DocsPage() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
        <BookOpen className="size-8 text-emerald-600 dark:text-emerald-400" />
      </div>

      <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">Documentation</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        We&apos;re writing comprehensive guides, API references, and tutorials. Check back soon.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/dashboard/getting-started"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Getting Started Guide
        </Link>
        <a
          href="https://github.com/dodotdev/dodev-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <Github className="size-4" />
          View on GitHub
        </a>
      </div>

      <div className="mt-16 w-full max-w-lg rounded-xl border border-border bg-zinc-50 p-6 dark:bg-zinc-900/50">
        <div className="flex items-center justify-center gap-2">
          <MessageSquare className="size-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold">Need help now?</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Join the community on{" "}
          <a
            href="https://github.com/dodotdev/dodev-ai/discussions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline dark:text-emerald-400"
          >
            GitHub Discussions
          </a>{" "}
          or reach out on{" "}
          <a
            href="https://x.com/dodotdev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:underline dark:text-emerald-400"
          >
            X @dodotdev
          </a>
          .
        </p>
      </div>
    </section>
  )
}
