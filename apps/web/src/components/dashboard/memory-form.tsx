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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const MEMORY_TYPES = [
  { value: "fact", label: "Fact" },
  { value: "decision", label: "Decision" },
  { value: "preference", label: "Preference" },
  { value: "context", label: "Context" },
  { value: "learning", label: "Learning" },
] as const

interface MemoryFormProps {
  onSubmit: (data: {
    content: string
    tags?: string[]
    source?: string
    type?: string
    importance?: number
  }) => void
}

export function MemoryForm({ onSubmit }: MemoryFormProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")
  const [source, setSource] = useState("")
  const [type, setType] = useState<string>("")
  const [importance, setImportance] = useState<number[]>([0.5])
  const [showImportance, setShowImportance] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    onSubmit({
      content: content.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      source: source.trim() || undefined,
      type: type || undefined,
      importance: showImportance ? importance[0] : undefined,
    })

    setContent("")
    setTags("")
    setSource("")
    setType("")
    setImportance([0.5])
    setShowImportance(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
        >
          <Plus className="mr-1 size-4" />
          Add Memory
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Memory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What should your AI remember?"
              rows={4}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. web-dashboard"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="auth, architecture (comma-separated)"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-importance"
                checked={showImportance}
                onChange={(e) => setShowImportance(e.target.checked)}
                className="size-4 rounded border-gray-300"
              />
              <Label htmlFor="show-importance" className="text-sm font-normal">
                Set importance
              </Label>
            </div>
            {showImportance && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span className="font-medium">{importance[0].toFixed(1)}</span>
                  <span>High</span>
                </div>
                <input
                  type="range"
                  value={importance[0]}
                  onChange={(e) => setImportance([Number.parseFloat(e.target.value)])}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Memory</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
