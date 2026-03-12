import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { NextConfig } from "next"

const rootPkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../package.json"), "utf-8")
) as { version: string }

const nextConfig: NextConfig = {
  transpilePackages: ["@dodev/shared", "@dodev/convex"],
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: rootPkg.version,
    NEXT_PUBLIC_DODEV_MODE:
      process.env.NEXT_PUBLIC_DODEV_MODE ||
      (process.env.WORKOS_CLIENT_ID ? "cloud" : "self-hosted"),
  },
  async redirects() {
    return [
      {
        source: "/dashboard/projects/:path*",
        destination: "/dashboard/spaces/:path*",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
