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

interface ProjectFormProps {
  onSubmit: (data: { name: string; stub?: string; description?: string }) => void
}

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [stub, setStub] = useState("")
  const [description, setDescription] = useState("")

  function deriveStub(projectName: string): string {
    const words = projectName.trim().split(/\s+/)
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
      stub: stub.trim().toUpperCase() || undefined,
      description: description.trim() || undefined,
    })

    setName("")
    setStub("")
    setDescription("")
    setOpen(false)
  }

  const previewStub = stub.trim().toUpperCase() || deriveStub(name)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
        >
          <Plus className="mr-1 size-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-visible">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stub">Identifier</Label>
              <Input
                id="stub"
                value={stub}
                onChange={(e) =>
                  setStub(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 5)
                  )
                }
                placeholder={deriveStub(name) || "ABC"}
                className="w-20 text-center font-mono uppercase"
                maxLength={5}
              />
            </div>
          </div>
          {previewStub && (
            <p className="text-xs text-muted-foreground">
              Issues will be numbered{" "}
              <span className="font-mono font-medium text-foreground">{previewStub}-1</span>,{" "}
              <span className="font-mono font-medium text-foreground">{previewStub}-2</span>, ...
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
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
