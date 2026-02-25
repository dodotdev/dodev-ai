"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import type { LucideIcon } from "lucide-react"
import { Plus } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { KanbanCard, type KanbanTask } from "./kanban-card"

interface KanbanColumnProps {
  id: string
  title: string
  icon: LucideIcon
  color?: string
  hexColor?: string
  tasks: KanbanTask[]
  onQuickAdd?: (title: string) => void
}

export function KanbanColumn({
  id,
  title,
  icon: Icon,
  color,
  hexColor,
  tasks,
  onQuickAdd,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [quickAddValue, setQuickAddValue] = useState("")

  function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = quickAddValue.trim()
    if (!trimmed) return
    onQuickAdd?.(trimmed)
    setQuickAddValue("")
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-border bg-white transition-all dark:bg-card",
        isOver && "ring-2 ring-emerald-500/50"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Icon className={cn("size-4", color)} style={hexColor ? { color: hexColor } : undefined} />
        <span className="text-sm font-semibold">{title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {tasks.length}
        </Badge>
      </div>

      {/* Card list */}
      <ScrollArea className="flex-1">
        <div ref={setNodeRef} className="min-h-[120px] space-y-2 p-2">
          <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <KanbanCard key={task._id} task={task} />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>

      {/* Quick-add input */}
      {onQuickAdd && (
        <form onSubmit={handleQuickAdd} className="border-t border-border p-2">
          <div className="flex items-center gap-1.5">
            <Plus className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              placeholder="Add a task..."
              className="h-7 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
        </form>
      )}
    </div>
  )
}
