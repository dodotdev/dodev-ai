import { Github, ListTodo } from "lucide-react"
import Link from "next/link"

const links = {
  Product: [
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#how-it-works", label: "How It Works" },
  ],
  Resources: [
    { href: "https://github.com/dodotdev/dodev-ai", label: "Documentation" },
    { href: "https://github.com/dodotdev/dodev-ai", label: "GitHub" },
    { href: "https://x.com/dodotdev", label: "X / Twitter" },
    { href: "https://www.npmjs.com/package/@dodev/mcp-server", label: "npm" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-emerald-800/20 bg-emerald-950 py-12 dark:border-border dark:bg-background">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                <ListTodo className="size-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-semibold tracking-tight text-white dark:text-foreground">
                dodev.ai
              </span>
            </div>
            <p className="mt-3 text-sm text-emerald-300/70 dark:text-muted-foreground">
              AI-native task & memory management via the Model Context Protocol.
            </p>
            <p className="mt-4 text-xs text-emerald-400/50 dark:text-muted-foreground/80">
              Built by{" "}
              <a
                href="https://do.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-300/60 hover:text-emerald-200 dark:text-muted-foreground dark:hover:text-foreground"
              >
                do.dev
              </a>
            </p>
          </div>

          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="mb-3 text-sm font-medium text-white dark:text-foreground">{group}</p>
              <ul className="space-y-2">
                {items.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-emerald-300/70 transition-colors hover:text-white dark:text-muted-foreground dark:hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-emerald-800/30 pt-8 dark:border-border">
          <p className="text-xs text-emerald-400/50 dark:text-muted-foreground">
            &copy; {new Date().getFullYear()} dodev.ai. MIT License.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/dodotdev/dodev-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400/50 transition-colors hover:text-emerald-300 dark:text-muted-foreground dark:hover:text-foreground"
                aria-label="GitHub"
              >
                <Github className="size-4" />
              </a>
              <a
                href="https://x.com/dodotdev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400/50 transition-colors hover:text-emerald-300 dark:text-muted-foreground dark:hover:text-foreground"
                aria-label="X / Twitter"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="sr-only">X / Twitter</span>
              </a>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-emerald-700/40 bg-emerald-900/50 px-3 py-1 text-xs text-emerald-300/80 dark:border-border dark:bg-muted/50 dark:text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-emerald-400" />
              Open Source
            </div>
            {process.env.NEXT_PUBLIC_APP_VERSION && (
              <span className="text-xs text-emerald-400/50 dark:text-muted-foreground">
                v{process.env.NEXT_PUBLIC_APP_VERSION}
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
