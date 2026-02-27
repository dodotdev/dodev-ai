import type { NextFetchEvent, NextRequest } from "next/server"
import { NextResponse } from "next/server"

const isCloud = !!process.env.WORKOS_CLIENT_ID

const publicPaths = new Set([
  "/",
  "/auth/sign-in",
  "/auth/sign-out",
  "/auth/mcp",
  "/callback",
  "/waitlisted",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/privacy",
  "/terms",
])

const publicPrefixes = ["/auth/sign-in/", "/api/auth/", "/api/health", "/docs"]

function isPublicPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return true
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
}

function selfHostedMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === "/" || pathname.startsWith("/auth") || pathname === "/waitlisted") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return NextResponse.next()
}

export default async function middleware(request: NextRequest, _event: NextFetchEvent) {
  if (!isCloud) {
    return selfHostedMiddleware(request)
  }

  const { authkit, handleAuthkitHeaders } = await import("@workos-inc/authkit-nextjs")
  const { session, headers } = await authkit(request, {
    debug: process.env.NODE_ENV === "development",
  })

  const { pathname } = request.nextUrl

  // Protected route with no session → redirect to our custom sign-in (never to WorkOS hosted page)
  if (!session.user && !isPublicPath(pathname)) {
    return handleAuthkitHeaders(request, headers, { redirect: "/auth/sign-in" })
  }

  // Continue with authkit headers (session cookies, internal headers for withAuth())
  return handleAuthkitHeaders(request, headers)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
