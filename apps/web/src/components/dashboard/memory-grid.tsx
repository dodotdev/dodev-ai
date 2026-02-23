"use client"

import { Brain, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatRelativeTime } from "@/lib/utils"

interface MemoryItem {
  _id: string
  content: string
  summary?: string
  tags: string[]
  source?: string
  createdAt: number
  updatedAt: number
}

interface MemoryGridProps {
  memories: MemoryItem[]
}

export function MemoryGrid({ memories }: MemoryGridProps) {
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {memories.map((memory) => (
        <div
          key={memory._id}
          className="group rounded-2xl border border-border bg-white p-4 transition-colors hover:bg-surface dark:bg-card dark:hover:bg-accent"
        >
          <p className="text-sm leading-relaxed text-foreground line-clamp-4">{memory.content}</p>

          {memory.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memory.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            {memory.source && (
              <span className="flex items-center gap-1">
                <Tag className="size-3" />
                {memory.source}
              </span>
            )}
            <span>{formatRelativeTime(memory.updatedAt)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
