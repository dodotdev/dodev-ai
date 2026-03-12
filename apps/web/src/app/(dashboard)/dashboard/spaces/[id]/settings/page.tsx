"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SpaceSettingsRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/dashboard/spaces/${id}`)
  }, [id, router])

  return null
}
