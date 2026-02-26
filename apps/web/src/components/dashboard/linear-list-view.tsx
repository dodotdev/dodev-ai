"use client"

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { Check, ChevronRight, Circle, Copy, GripVertical, Paperclip } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import { cn, formatRelativeTime } from "@/lib/utils"

type ItemStatus = "pending" | "in_progress" | "completed" | "cancelled"

interface WorkflowStatus {
  id: string
  name: string
  category: ItemStatus
  color: string
  position: number
}

interface ResolvedLabel {
  id: string
  name: string
  color: string
}

interface ResolvedAssignee {
  id: string
  name: string
  avatarUrl?: string
}

export interface ListItem {
  _id: string
  title: string
  description?: string
  status: ItemStatus
  priority: "low" | "medium" | "high" | "urgent"
  type?: "bug" | "feature" | "improvement" | "task"
  severity?: "critical" | "major" | "minor" | "trivial"
  tags: string[]
  dueDate?: number
  number?: number
  statusId?: string
  labelIds?: string[]
  assigneeId?: string
  estimate?: string
  cycleId?: string
  changelog?: boolean
  versionId?: string
  createdAt: number
  updatedAt: number
  issueId?: string
  resolvedLabels?: ResolvedLabel[]
  resolvedAssignee?: ResolvedAssignee
  attachmentCount?: number
}

const priorityIcons: Record<string, string> = {
  urgent: "!!!",
  high: "!!",
  medium: "!",
  low: "-",
}

const priorityColors: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-amber-500",
  low: "text-muted-foreground",
}

interface LinearListViewProps {
  items: ListItem[]
  statuses?: WorkflowStatus[]
  onStatusChange?: (itemId: string, newStatus: ItemStatus, statusId?: string) => void
  onItemClick?: (item: ListItem) => void
  emptyMessage?: string
  storageKey?: string
}

export function LinearListView({
  items,
  statuses,
  onStatusChange,
  onItemClick,
  emptyMessage = "No items yet",
  storageKey,
}: LinearListViewProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`accordion:${storageKey}`)
        if (saved) return new Set(JSON.parse(saved))
      } catch {}
    }
    return new Set()
  })
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Build columns from workflow statuses or fallback
  const columns = useMemo(() => {
    if (statuses && statuses.length > 0) {
      return [...statuses]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          color: s.color,
        }))
    }
    return [
      { id: "pending", name: "Pending", category: "pending" as ItemStatus, color: "#f59e0b" },
      {
        id: "in_progress",
        name: "In Progress",
        category: "in_progress" as ItemStatus,
        color: "#3b82f6",
      },
      { id: "completed", name: "Completed", category: "completed" as ItemStatus, color: "#10b981" },
      { id: "cancelled", name: "Cancelled", category: "cancelled" as ItemStatus, color: "#ef4444" },
    ]
  }, [statuses])

  // Filter tabs: "All" + each status
  const filterTabs = useMemo(() => {
    return [{ id: "all", name: "All", color: undefined }, ...columns]
  }, [columns])

  // Group items by status column
  const grouped = useMemo(() => {
    const groups: Record<string, ListItem[]> = {}
    for (const col of columns) {
      groups[col.id] = []
    }
    for (const item of items) {
      if (statuses && statuses.length > 0) {
        if (item.statusId && groups[item.statusId]) {
          groups[item.statusId].push(item)
        } else {
          const col = columns.find((c) => c.category === item.status)
          if (col) groups[col.id].push(item)
        }
      } else {
        if (groups[item.status]) {
          groups[item.status].push(item)
        }
      }
    }
    return groups
  }, [items, columns, statuses])

  // Visible columns based on active filter
  const visibleColumns = useMemo(() => {
    if (activeFilter === "all") {
      return columns.filter(
        (col) => col.category !== "cancelled" || (grouped[col.id]?.length ?? 0) > 0
      )
    }
    return columns.filter((col) => col.id === activeFilter)
  }, [activeFilter, columns, grouped])

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      if (storageKey) {
        try { localStorage.setItem(`accordion:${storageKey}`, JSON.stringify([...next])) } catch {}
      }
      return next
    })
  }, [storageKey])

  function cycleStatus(item: ListItem) {
    if (!onStatusChange) return
    const isCustom = statuses && statuses.length > 0

    if (isCustom) {
      const currentIdx = columns.findIndex((c) => c.id === item.statusId)
      const nextIdx = currentIdx < columns.length - 1 ? currentIdx + 1 : 0
      const nextCol = columns[nextIdx]
      onStatusChange(item._id, nextCol.category, nextCol.id)
    } else {
      const cycle: ItemStatus[] = ["pending", "in_progress", "completed"]
      const currentIdx = cycle.indexOf(item.status)
      const nextStatus = cycle[(currentIdx + 1) % cycle.length]
      onStatusChange(item._id, nextStatus)
    }
  }

  // -- Drag and drop --

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null)
    const { active, over } = event
    if (!over || !onStatusChange) return

    const itemId = active.id as string
    const item = items.find((i) => i._id === itemId)
    if (!item) return

    const targetId = over.id as string

    // Drop target is a filter button (prefixed) or a group header (column id)
    const dropColId = targetId.startsWith("filter-") ? targetId.replace("filter-", "") : targetId

    // Find the target column
    const targetCol = columns.find((c) => c.id === dropColId)
    if (!targetCol) return

    // Check if actually changed
    const currentColId = item.statusId || item.status
    if (targetCol.id === currentColId) return

    const isCustom = statuses && statuses.length > 0
    onStatusChange(itemId, targetCol.category, isCustom ? targetCol.id : undefined)
  }

  const draggingItem = draggingId ? items.find((i) => i._id === draggingId) : null
  const draggingColor = useMemo(() => {
    if (!draggingItem) return "#6b7280"
    if (draggingItem.statusId) {
      const col = columns.find((c) => c.id === draggingItem.statusId)
      if (col) return col.color
    }
    const col = columns.find((c) => c.category === draggingItem.status)
    return col?.color ?? "#6b7280"
  }, [draggingItem, columns])

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <FilterBar
          tabs={filterTabs}
          activeFilter={activeFilter}
          onFilter={setActiveFilter}
          grouped={grouped}
          isDragging={false}
        />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Circle className="size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <FilterBar
          tabs={filterTabs}
          activeFilter={activeFilter}
          onFilter={setActiveFilter}
          grouped={grouped}
          isDragging={!!draggingId}
        />

        <div className="space-y-2">
          {visibleColumns.map((col) => {
            const colItems = grouped[col.id] ?? []
            const isCollapsed = collapsedGroups.has(col.id)

            return (
              <DroppableGroup
                key={col.id}
                id={col.id}
                color={col.color}
                name={col.name}
                count={colItems.length}
                isCollapsed={isCollapsed}
                isDragging={!!draggingId}
                onToggle={() => toggleGroup(col.id)}
              >
                {!isCollapsed &&
                  colItems.map((item, itemIdx) => (
                    <DraggableItemRow
                      key={item._id}
                      item={item}
                      statusColor={col.color}
                      isFirst={itemIdx === 0}
                      onCycleStatus={() => cycleStatus(item)}
                      onItemClick={onItemClick ? () => onItemClick(item) : undefined}
                    />
                  ))}
              </DroppableGroup>
            )
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {draggingItem ? <ItemRowOverlay item={draggingItem} statusColor={draggingColor} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

// -- Droppable group --

interface DroppableGroupProps {
  id: string
  color: string
  name: string
  count: number
  isCollapsed: boolean
  isDragging: boolean
  onToggle: () => void
  children: React.ReactNode
}

function DroppableGroup({
  id,
  color,
  name,
  count,
  isCollapsed,
  isDragging,
  onToggle,
  children,
}: DroppableGroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn("transition-colors", isOver && isDragging && "bg-accent/20")}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-1.5 text-left transition-colors bg-muted dark:bg-background hover:bg-muted/80 dark:hover:bg-background/80",
          isOver && isDragging && "bg-accent/40"
        )}
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 text-muted-foreground/60 transition-transform",
            !isCollapsed && "rotate-90"
          )}
        />
        <span
          className="inline-block size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium text-muted-foreground">{name}</span>
        <span className="text-xs text-muted-foreground">{count}</span>
      </button>
      {!isCollapsed && count > 0 && (
        <div className="overflow-hidden rounded-lg border border-border dark:border-zinc-800 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)] bg-card dark:bg-muted">{children}</div>
      )}
    </div>
  )
}

// -- Filter bar with droppable buttons --

interface FilterBarProps {
  tabs: Array<{ id: string; name: string; color?: string }>
  activeFilter: string
  onFilter: (id: string) => void
  grouped: Record<string, ListItem[]>
  isDragging: boolean
}

function FilterBar({ tabs, activeFilter, onFilter, grouped, isDragging }: FilterBarProps) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
      {tabs.map((tab) => {
        const count =
          tab.id === "all"
            ? Object.values(grouped).reduce((sum, g) => sum + g.length, 0)
            : (grouped[tab.id]?.length ?? 0)

        if (tab.id === "all") {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilter(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeFilter === tab.id
                  ? "bg-white text-foreground shadow-sm dark:bg-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.name}
              <span className="text-[10px] text-muted-foreground">{count}</span>
            </button>
          )
        }

        return (
          <DroppableFilterButton
            key={tab.id}
            id={tab.id}
            name={tab.name}
            color={tab.color}
            count={count}
            isActive={activeFilter === tab.id}
            isDragging={isDragging}
            onClick={() => onFilter(tab.id)}
          />
        )
      })}
    </div>
  )
}

// -- Droppable filter button --

interface DroppableFilterButtonProps {
  id: string
  name: string
  color?: string
  count: number
  isActive: boolean
  isDragging: boolean
  onClick: () => void
}

function DroppableFilterButton({
  id,
  name,
  color,
  count,
  isActive,
  isDragging,
  onClick,
}: DroppableFilterButtonProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `filter-${id}` })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
        isActive
          ? "bg-white text-foreground shadow-sm dark:bg-accent"
          : "text-muted-foreground hover:text-foreground",
        isOver && isDragging && "ring-1 ring-primary scale-105"
      )}
    >
      {color && (
        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      {name}
      <span className="text-[10px] text-muted-foreground">{count}</span>
    </button>
  )
}

// -- Draggable item row --

interface DraggableItemRowProps {
  item: ListItem
  statusColor: string
  isFirst?: boolean
  onCycleStatus: () => void
  onItemClick?: () => void
}

function DraggableItemRow({
  item,
  statusColor,
  isFirst,
  onCycleStatus,
  onItemClick,
}: DraggableItemRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item._id,
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ cursor: isDragging ? "grabbing" : undefined }}
      className={cn(
        "group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-accent/30 hover:cursor-grab",
        isDragging && "opacity-30",
        !isFirst && "border-t border-border dark:border-t-zinc-800 dark:shadow-[0_-1px_0_0_rgba(255,255,255,0.04)]"
      )}
    >
      {/* Drag handle icon */}
      <span className="shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/40">
        <GripVertical className="size-3" />
      </span>

      {/* Status dot (clickable to cycle) */}
      <button
        type="button"
        onClick={onCycleStatus}
        className="shrink-0 transition-transform hover:scale-125"
        title="Click to change status"
      >
        <span
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: statusColor }}
        />
      </button>

      <ItemRowContent item={item} onTitleClick={onItemClick} />
    </div>
  )
}

// -- Drag overlay (the ghost you see while dragging) --

function ItemRowOverlay({ item, statusColor }: { item: ListItem; statusColor: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 shadow-lg">
      <span className="shrink-0 text-muted-foreground/40">
        <GripVertical className="size-3" />
      </span>
      <span
        className="inline-block size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: statusColor }}
      />
      <ItemRowContent item={item} />
    </div>
  )
}

// -- Shared item row content (used by both real row and overlay) --

function CopyContextButton({ item }: { item: ListItem }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const toolName = item.type ? "get_issue" : "get_task"
      const displayId = item.issueId ?? `#${item.number}`
      const text = `Review and work on ${displayId}: "${item.title}"\nUse ${toolName} with id: "${item._id}" to get full details.`
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    },
    [item]
  )

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      title="Copy context for agent"
    >
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  )
}

function ItemRowContent({ item, onTitleClick }: { item: ListItem; onTitleClick?: () => void }) {
  const isCompleted = item.status === "completed"

  const initials = item.resolvedAssignee?.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      {/* Priority indicator */}
      <span
        className={cn(
          "w-4 shrink-0 text-center text-[10px] font-bold",
          priorityColors[item.priority]
        )}
        title={item.priority}
      >
        {priorityIcons[item.priority]}
      </span>

      {/* Issue ID */}
      {item.issueId && (
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.issueId}</span>
      )}

      {/* Title */}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          isCompleted && "text-muted-foreground line-through",
          onTitleClick && "cursor-pointer hover:text-foreground hover:underline"
        )}
        onClick={
          onTitleClick
            ? (e) => {
                e.stopPropagation()
                onTitleClick()
              }
            : undefined
        }
        onKeyDown={
          onTitleClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation()
                  onTitleClick()
                }
              }
            : undefined
        }
        role={onTitleClick ? "button" : undefined}
        tabIndex={onTitleClick ? 0 : undefined}
      >
        {item.title}
      </span>

      {/* Labels */}
      {item.resolvedLabels && item.resolvedLabels.length > 0 && (
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          {item.resolvedLabels.map((label) => (
            <span
              key={label.id}
              className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Type badge (for issues) */}
      {item.type && (
        <span className="hidden shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          {item.type}
        </span>
      )}

      {/* Assignee avatar */}
      <div className="hidden w-6 shrink-0 items-center justify-center sm:flex">
        {item.resolvedAssignee && (
          item.resolvedAssignee.avatarUrl ? (
            <img
              src={item.resolvedAssignee.avatarUrl}
              alt={item.resolvedAssignee.name}
              title={item.resolvedAssignee.name}
              className="size-5 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex size-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              title={item.resolvedAssignee.name}
            >
              {initials}
            </div>
          )
        )}
      </div>

      {/* Estimate */}
      {item.estimate && (
        <span className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          {item.estimate}
        </span>
      )}

      {/* Attachment count */}
      {item.attachmentCount != null && item.attachmentCount > 0 && (
        <span className="hidden shrink-0 items-center gap-0.5 text-muted-foreground sm:inline-flex">
          <Paperclip className="size-3" />
          <span className="text-[10px]">{item.attachmentCount}</span>
        </span>
      )}

      {/* Date */}
      <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {formatRelativeTime(item.updatedAt)}
      </span>

      {/* Copy context */}
      <div className="w-5 shrink-0">
        <CopyContextButton item={item} />
      </div>
    </>
  )
}
