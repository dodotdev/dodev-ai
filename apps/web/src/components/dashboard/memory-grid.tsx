"use client"

import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"
import { Brain, Pencil, Sparkles, Tag, Trash2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { formatDate, formatRelativeTime } from "@/lib/utils"

const TYPE_CONFIG: Record<string, { color: string; border: string; label: string }> = {
  fact: {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    border: "border-l-blue-500",
    label: "Fact",
  },
  decision: {
    color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    border: "border-l-purple-500",
    label: "Decision",
  },
  preference: {
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    border: "border-l-amber-500",
    label: "Preference",
  },
  context: {
    color: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    border: "border-l-green-500",
    label: "Context",
  },
  learning: {
    color: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    border: "border-l-rose-500",
    label: "Learning",
  },
}

const MEMORY_TYPES = [
  { value: "fact", label: "Fact" },
  { value: "decision", label: "Decision" },
  { value: "preference", label: "Preference" },
  { value: "context", label: "Context" },
  { value: "learning", label: "Learning" },
] as const

interface MemoryItem {
  _id: string
  content: string
  summary?: string
  tags: string[]
  source?: string
  type?: string
  importance?: number
  embedding?: number[]
  createdAt: number
  updatedAt: number
}

interface MemoryGridProps {
  memories: MemoryItem[]
}

export function MemoryGrid({ memories }: MemoryGridProps) {
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (memories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No memories yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Your AI agent will store memories here</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memories.map((memory) => {
          const typeConfig = memory.type ? TYPE_CONFIG[memory.type] : null
          return (
            <button
              type="button"
              key={memory._id}
              onClick={() => setSelectedMemory(memory)}
              className="group cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-shadow duration-150 hover:shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                {typeConfig && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${typeConfig.color}`}
                  >
                    {typeConfig.label}
                  </span>
                )}
                {memory.importance !== undefined && (
                  <span className="ml-auto text-[10px] font-medium text-muted-foreground">
                    {Math.round(memory.importance * 100)}%
                  </span>
                )}
                {memory.embedding && (
                  <span title="Embedding generated">
                    <Sparkles
                      className={`size-3 text-emerald-500 ${memory.importance !== undefined ? "" : "ml-auto"}`}
                    />
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed text-foreground line-clamp-4">
                {memory.content}
              </p>

              {memory.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {memory.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                  {memory.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{memory.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                {memory.source && (
                  <span className="flex items-center gap-1">
                    <Tag className="size-3" />
                    {memory.source}
                  </span>
                )}
                <span className="ml-auto">{formatRelativeTime(memory.updatedAt)}</span>
              </div>
            </button>
          )
        })}
      </div>

      {selectedMemory && (
        <MemoryDetailDialog
          memory={selectedMemory}
          open={!!selectedMemory}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedMemory(null)
              setIsEditing(false)
              setIsDeleting(false)
            }
          }}
          isEditing={isEditing}
          onEditToggle={() => setIsEditing(!isEditing)}
          isDeleting={isDeleting}
          onDeleteToggle={() => setIsDeleting(!isDeleting)}
          onUpdated={(updated) => setSelectedMemory(updated)}
        />
      )}
    </>
  )
}

function MemoryDetailDialog({
  memory,
  open,
  onOpenChange,
  isEditing,
  onEditToggle,
  isDeleting,
  onDeleteToggle,
  onUpdated,
}: {
  memory: MemoryItem
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  onEditToggle: () => void
  isDeleting: boolean
  onDeleteToggle: () => void
  onUpdated: (memory: MemoryItem) => void
}) {
  const { apiKeyHash } = useAuth()
  const updateMemory = useMutation(api.memories.update)
  const deleteMemory = useMutation(api.memories.remove)

  const [editContent, setEditContent] = useState(memory.content)
  const [editTags, setEditTags] = useState(memory.tags.join(", "))
  const [editType, setEditType] = useState(memory.type ?? "")
  const [editImportance, setEditImportance] = useState(memory.importance ?? 0.5)
  const [saving, setSaving] = useState(false)

  const typeConfig = memory.type ? TYPE_CONFIG[memory.type] : null

  async function handleSave() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      const result = await updateMemory({
        apiKeyHash,
        id: memory._id as any,
        content: editContent,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        type: (editType || undefined) as any,
        importance: editImportance,
      })
      if (result) {
        onUpdated({
          ...memory,
          content: editContent,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          type: editType || undefined,
          importance: editImportance,
          updatedAt: Date.now(),
        })
      }
      onEditToggle()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!apiKeyHash) return
    setSaving(true)
    try {
      await deleteMemory({ apiKeyHash, id: memory._id as any })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  // Reset edit state when memory changes
  const memoryId = memory._id
  const [lastMemoryId, setLastMemoryId] = useState(memoryId)
  if (memoryId !== lastMemoryId) {
    setLastMemoryId(memoryId)
    setEditContent(memory.content)
    setEditTags(memory.tags.join(", "))
    setEditType(memory.type ?? "")
    setEditImportance(memory.importance ?? 0.5)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {typeConfig && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeConfig.color}`}
              >
                {typeConfig.label}
              </span>
            )}
            {memory.embedding && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <Sparkles className="size-3" />
                Embedded
              </span>
            )}
          </div>
          <DialogTitle className="sr-only">Memory Detail</DialogTitle>
          <DialogDescription className="sr-only">View and manage memory details</DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select value={editType} onValueChange={setEditType}>
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
                <Label htmlFor="edit-importance">
                  Importance: {Math.round(editImportance * 100)}%
                </Label>
                <input
                  type="range"
                  value={editImportance}
                  onChange={(e) => setEditImportance(Number.parseFloat(e.target.value))}
                  min={0}
                  max={1}
                  step={0.1}
                  className="mt-2 w-full"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="auth, architecture (comma-separated)"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onEditToggle} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : isDeleting ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this memory? This action cannot be undone.
            </p>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm line-clamp-3">{memory.content}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onDeleteToggle} disabled={saving}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting..." : "Delete Memory"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{memory.content}</p>

            {memory.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {memory.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {!isEditing && !isDeleting && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDeleteToggle}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={onEditToggle}>
                <Pencil className="mr-1.5 size-3.5" />
                Edit
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-[11px] text-muted-foreground">
              {memory.source && <span>{memory.source}</span>}
              {memory.importance !== undefined && (
                <span>{Math.round(memory.importance * 100)}% importance</span>
              )}
              <span>{formatDate(memory.createdAt)}</span>
              <span className="ml-auto">{formatRelativeTime(memory.updatedAt)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
