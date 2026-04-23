"use client"

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type StatusCategory = "pending" | "in_progress" | "completed" | "cancelled"

interface Status {
  id: string
  name: string
  category: StatusCategory
  color: string
  position: number
}

export type ConfigScope =
  | { kind: "space"; spaceId: string }
  | { kind: "project"; projectId: string }

interface StatusEditorProps {
  scope: ConfigScope
  statuses: Status[]
}

const CATEGORIES = ["pending", "in_progress", "completed", "cancelled"] as const

function generateId() {
  return `status_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function SortableStatusRow({
  status,
  onUpdate,
  onRemove,
}: {
  status: Status
  onUpdate: (id: string, field: keyof Status, value: string) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-zinc-200 bg-card p-2 dark:border-zinc-700"
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Color dot preview */}
      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />

      {/* Name */}
      <Input
        value={status.name}
        onChange={(e) => onUpdate(status.id, "name", e.target.value)}
        placeholder="Status name"
        className="h-8 flex-1"
      />

      {/* Category */}
      <Select
        value={status.category}
        onValueChange={(value) => onUpdate(status.id, "category", value)}
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Color input */}
      <input
        type="color"
        value={status.color}
        onChange={(e) => onUpdate(status.id, "color", e.target.value)}
        className="size-8 shrink-0 cursor-pointer rounded border border-zinc-200 p-0.5 dark:border-zinc-700"
        title="Status color"
      />

      {/* Remove */}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => onRemove(status.id)}
        title="Remove status"
      >
        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
      </Button>
    </div>
  )
}

export function StatusEditor({ scope, statuses: initialStatuses }: StatusEditorProps) {
  const { apiKeyHash } = useAuth()
  const updateSpaceStatuses = useMutation(api.spaceConfig.updateStatuses)
  const updateProjectStatuses = useMutation(api.projectConfig.updateStatuses)

  const [statuses, setStatuses] = useState<Status[]>(initialStatuses)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setStatuses((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id)
      const newIndex = prev.findIndex((s) => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev

      const next = [...prev]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      // Reassign positions based on new order
      return next.map((s, i) => ({ ...s, position: i }))
    })
  }

  function handleAddStatus() {
    const nextPosition = statuses.length > 0 ? Math.max(...statuses.map((s) => s.position)) + 1 : 0
    setStatuses([
      ...statuses,
      {
        id: generateId(),
        name: "",
        category: "pending" as StatusCategory,
        color: "#6b7280",
        position: nextPosition,
      },
    ])
  }

  function handleRemoveStatus(id: string) {
    const target = statuses.find((s) => s.id === id)
    if (!target) return

    // Ensure at least one status remains per category
    const sameCategoryCount = statuses.filter((s) => s.category === target.category).length
    if (sameCategoryCount <= 1) {
      setError(
        `Cannot remove the last "${target.category}" status. Each category must have at least one.`
      )
      return
    }

    setError(null)
    setStatuses(statuses.filter((s) => s.id !== id))
  }

  function handleUpdateStatus(id: string, field: keyof Status, value: string) {
    setStatuses(
      statuses.map((s) => {
        if (s.id !== id) return s
        if (field === "category") return { ...s, category: value as StatusCategory }
        return { ...s, [field]: value }
      })
    )
    setError(null)
  }

  async function handleSave() {
    if (!apiKeyHash) return

    // Validate: every status needs a name
    const emptyName = statuses.find((s) => !s.name.trim())
    if (emptyName) {
      setError("All statuses must have a name.")
      return
    }

    // Validate: at least one status per category
    for (const category of CATEGORIES) {
      if (!statuses.some((s) => s.category === category)) {
        setError(`At least one status is required for the "${category}" category.`)
        return
      }
    }

    setIsSaving(true)
    setError(null)
    try {
      if (scope.kind === "space") {
        await updateSpaceStatuses({
          apiKeyHash,
          spaceId: scope.spaceId as never,
          statuses,
        })
      } else {
        await updateProjectStatuses({
          apiKeyHash,
          projectId: scope.projectId as never,
          statuses,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save statuses")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Workflow Statuses</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleAddStatus}>
          <Plus className="mr-1 size-4" />
          Add Status
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {statuses.map((status) => (
              <SortableStatusRow
                key={status.id}
                status={status}
                onUpdate={handleUpdateStatus}
                onRemove={handleRemoveStatus}
              />
            ))}

            {statuses.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No statuses defined. Add one to get started.
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Statuses"}
        </Button>
      </div>
    </div>
  )
}
