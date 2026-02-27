"use client"

import { ArrowRight, ListTodo, LogOut, Menu, Settings, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#pricing", label: "Pricing" },
]

interface NavbarProps {
  user?: { email: string; name?: string; isApproved?: boolean } | null
}

export function Navbar({ user }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [starCount, setStarCount] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    fetch("https://api.github.com/repos/dodotdev/dodev-ai")
      .then((r) => r.json())
      .then((data) => {
        if (data.stargazers_count != null) {
          const count = data.stargazers_count
          setStarCount(count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count))
        }
      })
      .catch(() => {})
  }, [])

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?")

  const githubLink = (
    <a
      href="https://github.com/dodotdev/dodev-ai"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      GitHub
      {starCount && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
          <Star className="mr-0.5 size-2.5 fill-current" />
          {starCount}
        </Badge>
      )}
    </a>
  )

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border bg-white/80 backdrop-blur-xl dark:bg-background/80"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
            <ListTodo className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight">dodev.ai</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {githubLink}
        </div>

        <div className="hidden items-center gap-1 md:flex">
          <a
            href="https://x.com/dodotdev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="sr-only">Follow @dodotdev on X</span>
          </a>
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    {user.name && <p className="text-sm font-medium">{user.name}</p>}
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.isApproved ? (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <Settings className="mr-2 size-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href="/waitlisted">
                      <Settings className="mr-2 size-4" />
                      Waitlist Status
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/auth/sign-out">
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                asChild
              >
                <Link href="/auth/sign-in">Join Waitlist</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button type="button" className="md:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
          </SheetTrigger>

          <SheetContent side="right" className="w-[280px] p-0" showCloseButton={false}>
            <SheetHeader className="border-b border-border px-6 py-5">
              <div className="flex items-center justify-between">
                <SheetTitle asChild>
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                      <ListTodo className="size-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-base font-semibold tracking-tight">dodev.ai</span>
                  </Link>
                </SheetTitle>
                <ThemeToggle />
              </div>
            </SheetHeader>

            <nav className="flex flex-col px-6 py-4">
              {navLinks.map((link) => (
                <SheetClose key={link.href} asChild>
                  <Link
                    href={link.href}
                    className="flex items-center py-3 text-sm font-medium text-foreground transition-colors hover:text-emerald-500"
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}

              <div className="my-2 border-t border-border" />

              <SheetClose asChild>
                <a
                  href="https://github.com/dodotdev/dodev-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-3 text-sm font-medium text-foreground transition-colors hover:text-emerald-500"
                >
                  GitHub
                  {starCount && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
                      <Star className="mr-0.5 size-2.5 fill-current" />
                      {starCount}
                    </Badge>
                  )}
                </a>
              </SheetClose>

              <SheetClose asChild>
                <a
                  href="https://x.com/dodotdev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-3 text-sm font-medium text-foreground transition-colors hover:text-emerald-500"
                >
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Follow on X
                </a>
              </SheetClose>
            </nav>

            <div className="mt-auto border-t border-border px-6 py-5">
              {user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      {user.name && <p className="truncate text-sm font-medium">{user.name}</p>}
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <Link
                        href={user.isApproved ? "/dashboard" : "/waitlisted"}
                        onClick={() => setMobileOpen(false)}
                      >
                        {user.isApproved ? "Dashboard" : "Waitlist Status"}
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/auth/sign-out" onClick={() => setMobileOpen(false)}>
                        Sign out
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <SheetClose asChild>
                    <Button
                      className="w-full bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
                      asChild
                    >
                      <Link href="/auth/sign-in">
                        Get Started
                        <ArrowRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/auth/sign-in">Sign In</Link>
                    </Button>
                  </SheetClose>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
