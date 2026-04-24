import { api } from "@dodev/convex/api"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { useEffect } from "react"
import { useAuth } from "@/components/providers/auth-provider"

/**
 * Header strip shown above a space's work-views (Tasks, Issues).
 * Settings used to live behind a gear icon here; it now lives in the
 * sidebar as a dedicated "Settings" sub-item.
 */
export function SpaceHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const { apiKeyHash } = useAuth()

  const space = useQuery(api.spaces.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  useEffect(() => {
    if (space === null) {
      navigate({ to: "/dashboard" })
    }
  }, [space, navigate])

  if (!space) return null

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
    </div>
  )
}
