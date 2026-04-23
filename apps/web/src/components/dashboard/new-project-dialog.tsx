"use client"

import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface NewProjectDialogProps {
  spaceId: string
  spaceSlug: string | undefined
  /**
   * Where to navigate after a successful create. Defaults to the new project's
   * settings page. Set to `"stay"` to remain on the current page.
   */
  onCreated?: "stay" | "settings"
  /** Optional custom trigger (defaults to a "+ New Project" button). */
  trigger?: React.ReactNode
}

/**
 * Shared dialog for creating a new project inside a space. Renders its own
 * trigger + dialog so any caller just drops it in — no state plumbing needed.
 */
export function NewProjectDialog({
  spaceId,
  spaceSlug,
  onCreated = "settings",
  trigger,
}: NewProjectDialogProps) {
  const { apiKeyHash } = useAuth()
  const router = useRouter()
  const createProject = useMutation(api.projects.create)

  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", slug: "", description: "" })

  function reset() {
    setForm({ name: "", slug: "", description: "" })
    setError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKeyHash || !form.name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const created = (await createProject({
        apiKeyHash,
        spaceId: spaceId as never,
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
      })) as { _id: string } | null

      reset()
      setOpen(false)

      if (created && onCreated === "settings") {
        router.push(`/dashboard/spaces/${spaceId}/projects/${created._id}/settings`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1 size-4" />
            New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Projects snapshot the space&apos;s statuses, labels, and members at creation.
              estimateScale and persona inherit from the space until you override them.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-project-name">Name</Label>
              <Input
                id="new-project-name"
                placeholder="API Service"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-project-slug">Slug (optional)</Label>
              <Input
                id="new-project-slug"
                placeholder="API"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toUpperCase() })}
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Item slugs will be {spaceSlug ?? "SPACE"}-{form.slug || "PROJECT"}-N. Auto-derived
                from name if left blank. Unique within the space.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-project-description">Description (optional)</Label>
              <Textarea
                id="new-project-description"
                placeholder="Short description of this project"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={5000}
                rows={3}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !form.name.trim()}>
              {submitting ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
