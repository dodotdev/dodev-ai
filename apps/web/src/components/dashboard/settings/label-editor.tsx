"use client"

import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TeamLabel {
  id: string
  name: string
  color: string
}

interface LabelEditorProps {
  spaceId: string
  labels: TeamLabel[]
}

export function LabelEditor({ spaceId, labels }: LabelEditorProps) {
  const { apiKeyHash } = useAuth()
  const addLabel = useMutation(api.spaceConfig.addLabel)
  const removeLabel = useMutation(api.spaceConfig.removeLabel)

  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#3b82f6")
  const [isAdding, setIsAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKeyHash) return

    const trimmedName = newName.trim()
    if (!trimmedName) {
      setError("Label name is required.")
      return
    }

    // Check for duplicate name
    if (labels.some((l) => l.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError("A label with this name already exists.")
      return
    }

    setIsAdding(true)
    setError(null)
    try {
      await addLabel({
        apiKeyHash,
        spaceId: spaceId as never,
        name: trimmedName,
        color: newColor,
      })
      setNewName("")
      setNewColor("#3b82f6")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add label")
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(labelId: string) {
    if (!apiKeyHash) return

    setRemovingId(labelId)
    setError(null)
    try {
      await removeLabel({ apiKeyHash, spaceId: spaceId as never, labelId })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove label")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Labels</Label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Existing labels */}
      <div className="space-y-2">
        {labels.map((label) => (
          <div
            key={label.id}
            className="flex items-center gap-3 rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-2"
          >
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            <span className="flex-1 text-sm">{label.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemove(label.id)}
              disabled={removingId === label.id}
              title="Remove label"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}

        {labels.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No labels yet. Add one below.
          </p>
        )}
      </div>

      {/* Add label form */}
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="label-name" className="text-xs">
            Name
          </Label>
          <Input
            id="label-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Label name"
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="label-color" className="text-xs">
            Color
          </Label>
          <input
            id="label-color"
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="size-8 cursor-pointer rounded border border-zinc-200 dark:border-zinc-700 p-0.5"
          />
        </div>
        <Button type="submit" size="sm" disabled={isAdding}>
          <Plus className="mr-1 size-4" />
          {isAdding ? "Adding..." : "Add"}
        </Button>
      </form>
    </div>
  )
}
