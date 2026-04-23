"use client"

import { Check, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProjectOption {
  _id: string
  name: string
  slug: string
}

interface ProjectFilterProps {
  projects: ProjectOption[]
  /** Current filter value: "" = all projects, otherwise a project _id. */
  value: string
  onChange: (next: string) => void
}

/**
 * Small dropdown shown next to the "+ New" action on tasks/issues views.
 * Filters the list to items tagged with the selected project.
 */
export function ProjectFilter({ projects, value, onChange }: ProjectFilterProps) {
  const current = projects.find((p) => p._id === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          title="Filter by project"
        >
          <Layers className="size-3.5" />
          {current ? current.name : "All projects"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel>Filter by project</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange("")} className="gap-2">
          <Layers className="size-3.5 text-muted-foreground/40" />
          All projects
          {value === "" && <Check className="ml-auto size-3.5" />}
        </DropdownMenuItem>
        {projects.length > 0 && <DropdownMenuSeparator />}
        {projects.map((p) => (
          <DropdownMenuItem key={p._id} onClick={() => onChange(p._id)} className="gap-2">
            <Layers className="size-3.5" />
            <span className="flex-1 truncate">{p.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">{p.slug}</span>
            {value === p._id && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
