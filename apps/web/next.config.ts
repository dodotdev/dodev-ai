import { readFileSync } from "fs"
import { resolve } from "path"
import type { NextConfig } from "next"

const rootPkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../package.json"), "utf-8")
) as { version: string }

const nextConfig: NextConfig = {
  transpilePackages: ["@domcp/shared", "@domcp/convex"],
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: rootPkg.version,
  },
}

export default nextConfig
