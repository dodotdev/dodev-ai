"use client"

import { api } from "@dodev/convex/api"
import { useQuery } from "convex/react"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"

/**
 * Header strip shown above a space's work-views (Tasks, Issues).
 * Settings used to live behind a gear icon here; it now lives in the
 * sidebar as a dedicated "Settings" sub-item.
 */
export function SpaceHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { apiKeyHash } = useAuth()

  const space = useQuery(api.spaces.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  useEffect(() => {
    if (space === null) {
      router.replace("/dashboard")
    }
  }, [space, router])

  if (!space) return null

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
    </div>
  )
}
