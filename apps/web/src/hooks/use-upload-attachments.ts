"use client"

import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"

export function useUploadAttachments(apiKeyHash: string | null) {
  const generateUploadUrl = useMutation(api.attachments.generateUploadUrl)
  const saveAttachment = useMutation(api.attachments.save)

  async function uploadAttachments(
    files: File[],
    parent: { taskId: string } | { issueId: string }
  ) {
    if (!apiKeyHash || files.length === 0) return

    const results = await Promise.allSettled(
      files.map(async (file) => {
        // Step 1: Get upload URL
        const uploadUrl = await generateUploadUrl({ apiKeyHash })

        // Step 2: POST file to storage
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        })
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
        const { storageId } = await res.json()

        // Step 3: Save attachment record
        return saveAttachment({
          apiKeyHash,
          storageId,
          ...("taskId" in parent
            ? { taskId: parent.taskId as never }
            : { issueId: parent.issueId as never }),
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        })
      })
    )

    const failed = results.filter((r) => r.status === "rejected")
    if (failed.length > 0) {
      console.error(`${failed.length}/${files.length} attachment uploads failed`, failed)
    }
  }

  return uploadAttachments
}
