"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ProjectSettingsRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/dashboard/projects/${id}`)
  }, [id, router])

  return null
}
