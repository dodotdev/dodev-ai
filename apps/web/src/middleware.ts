import { authkitMiddleware } from "@workos-inc/authkit-nextjs"

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      "/",
      "/auth/sign-in",
      "/auth/sign-in/(.*)",
      "/auth/sign-out",
      "/callback",
      "/api/auth/(.*)",
      "/api/health",
      "/favicon.ico",
      "/robots.txt",
      "/sitemap.xml",
      "/privacy",
      "/terms",
    ],
  },
  redirectUri: process.env.WORKOS_REDIRECT_URI,
  debug: process.env.NODE_ENV === "development",
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
