"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface SpaceFormProps {
  onSubmit: (data: { name: string; slug?: string; description?: string }) => void
}

export function SpaceForm({ onSubmit }: SpaceFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")

  function deriveSlug(spaceName: string): string {
    const words = spaceName.trim().split(/\s+/)
    if (words.length >= 2) {
      return words
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5)
    }
    return words[0]?.toUpperCase().slice(0, 5) ?? ""
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    onSubmit({
      name: name.trim(),
      slug: slug.trim().toUpperCase() || undefined,
      description: description.trim() || undefined,
    })

    setName("")
    setSlug("")
    setDescription("")
    setOpen(false)
  }

  const previewSlug = slug.trim().toUpperCase() || deriveSlug(name)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
        >
          <Plus className="mr-1 size-4" />
          New Space
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-visible">
        <DialogHeader>
          <DialogTitle>Create Space</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Space name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 5)
                  )
                }
                placeholder={deriveSlug(name) || "ABC"}
                className="w-20 text-center font-mono uppercase"
                maxLength={5}
              />
            </div>
          </div>
          {previewSlug && (
            <p className="text-xs text-muted-foreground">
              Tasks and issues will be numbered{" "}
              <span className="font-mono font-medium text-foreground">{previewSlug}-1</span>,{" "}
              <span className="font-mono font-medium text-foreground">{previewSlug}-2</span>, ...
              <br />
              Slugs must be unique across all users.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space about?"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
