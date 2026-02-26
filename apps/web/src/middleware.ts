import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server"
import { NextResponse } from "next/server"

const isCloud = !!process.env.WORKOS_CLIENT_ID

let cachedCloudMiddleware: NextMiddleware | null = null

async function getCloudMiddleware() {
  if (cachedCloudMiddleware) return cachedCloudMiddleware
  const { authkitMiddleware } = await import("@workos-inc/authkit-nextjs")
  cachedCloudMiddleware = authkitMiddleware({
    middlewareAuth: {
      enabled: true,
      unauthenticatedPaths: [
        "/",
        "/auth/sign-in",
        "/auth/sign-in/(.*)",
        "/auth/sign-out",
        "/auth/mcp",
        "/callback",
        "/api/auth/(.*)",
        "/api/health",
        "/waitlisted",
        "/favicon.ico",
        "/robots.txt",
        "/sitemap.xml",
        "/docs",
        "/docs/(.*)",
        "/privacy",
        "/terms",
      ],
    },
    redirectUri: process.env.WORKOS_REDIRECT_URI,
    debug: process.env.NODE_ENV === "development",
  })
  return cachedCloudMiddleware
}

function selfHostedMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === "/" || pathname.startsWith("/auth") || pathname === "/waitlisted") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return NextResponse.next()
}

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!isCloud) {
    return selfHostedMiddleware(request)
  }
  const handler = await getCloudMiddleware()
  const response = await handler!(request, event)

  // Intercept authkit redirects to WorkOS hosted sign-in page
  // and redirect to our custom sign-in page instead
  if (response && response instanceof Response && response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location")
    if (location && location.includes("authkit.app")) {
      return NextResponse.redirect(new URL("/auth/sign-in", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
