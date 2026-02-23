"use client"

import { ConvexProvider as BaseConvexProvider, ConvexReactClient } from "convex/react"
import { useMemo } from "react"

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!), [])

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>
}
