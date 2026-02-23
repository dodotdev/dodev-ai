"use client"

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { CheckCircle2, Circle, Clock, X } from "lucide-react"
import { useMemo, useState } from "react"
import { KanbanCard, type KanbanTodo } from "./kanban-card"
import { KanbanColumn } from "./kanban-column"

type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled"

interface WorkflowStatus {
  id: string
  name: string
  category: TodoStatus
  color: string
  position: number
}

const fallbackColumns: {
  id: string
  title: string
  icon: typeof Circle
  color: string
  category: TodoStatus
}[] = [
  { id: "pending", title: "Pending", icon: Circle, color: "text-amber-500 dark:text-amber-400", category: "pending" },
  { id: "in_progress", title: "In Progress", icon: Clock, color: "text-blue-500 dark:text-cyan-400", category: "in_progress" },
  { id: "completed", title: "Completed", icon: CheckCircle2, color: "text-emerald-500 dark:text-emerald-400", category: "completed" },
  { id: "cancelled", title: "Cancelled", icon: X, color: "text-zinc-400 dark:text-red-400", category: "cancelled" },
]

const categoryIcons: Record<TodoStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: X,
}

interface KanbanBoardProps {
  todos: KanbanTodo[]
  statuses?: WorkflowStatus[]
  onStatusChange: (todoId: string, newStatus: TodoStatus, statusId?: string) => void
  onQuickAdd?: (title: string, status: TodoStatus, statusId?: string) => void
}

export function KanbanBoard({ todos, statuses, onStatusChange, onQuickAdd }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Build columns from workflow statuses or fallback to hardcoded
  const columns = useMemo(() => {
    if (statuses && statuses.length > 0) {
      return [...statuses].sort((a, b) => a.position - b.position).map((s) => ({
        id: s.id,
        title: s.name,
        icon: categoryIcons[s.category],
        hexColor: s.color,
        category: s.category,
      }))
    }
    return fallbackColumns.map((col) => ({
      id: col.id,
      title: col.title,
      icon: col.icon,
      hexColor: undefined as string | undefined,
      category: col.category,
    }))
  }, [statuses])

  // Group todos by statusId (when using custom statuses) or by base status
  const grouped = useMemo(() => {
    const groups: Record<string, KanbanTodo[]> = {}
    for (const col of columns) {
      groups[col.id] = []
    }

    for (const todo of todos) {
      if (statuses && statuses.length > 0) {
        // Match by statusId first, then fallback to category match
        if (todo.statusId && groups[todo.statusId]) {
          groups[todo.statusId].push(todo)
        } else {
          // Find first column matching this category
          const col = columns.find((c) => c.category === todo.status)
          if (col) groups[col.id].push(todo)
        }
      } else {
        if (groups[todo.status]) {
          groups[todo.status].push(todo)
        }
      }
    }
    return groups
  }, [todos, columns, statuses])

  // Hide cancelled-category columns if empty
  const visibleColumns = columns.filter(
    (col) => col.category !== "cancelled" || (grouped[col.id]?.length ?? 0) > 0
  )

  const activeTodo = activeId ? todos.find((t) => t._id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const todoId = active.id as string
    const todo = todos.find((t) => t._id === todoId)
    if (!todo) return

    // Determine target column
    let targetCol = columns.find((col) => col.id === over.id)
    if (!targetCol) {
      const overTodo = todos.find((t) => t._id === over.id)
      if (overTodo) {
        // Find which column this card belongs to
        if (statuses && statuses.length > 0 && overTodo.statusId) {
          targetCol = columns.find((c) => c.id === overTodo.statusId)
        }
        if (!targetCol) {
          targetCol = columns.find((c) => c.category === overTodo.status)
        }
      }
    }

    if (!targetCol) return

    // Check if actually changed
    const currentColId = todo.statusId || todo.status
    if (targetCol.id === currentColId) return

    const isCustom = statuses && statuses.length > 0
    onStatusChange(
      todoId,
      targetCol.category,
      isCustom ? targetCol.id : undefined
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 pb-4" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}>
        {visibleColumns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            icon={col.icon}
            color={col.hexColor ? undefined : undefined}
            hexColor={col.hexColor}
            todos={grouped[col.id] ?? []}
            onQuickAdd={
              onQuickAdd
                ? (title) => {
                    const isCustom = statuses && statuses.length > 0
                    onQuickAdd(title, col.category, isCustom ? col.id : undefined)
                  }
                : undefined
            }
          />
        ))}
      </div>

      <DragOverlay>
        {activeTodo ? <KanbanCard todo={activeTodo} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
