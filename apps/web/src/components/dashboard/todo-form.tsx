"use client"

import { Plus } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

interface ProjectConfig {
  statuses?: Array<{ id: string; name: string; category: string; color: string; position: number }>
  labels?: Array<{ id: string; name: string; color: string }>
  members?: Array<{ id: string; name: string; role: string }>
  estimateScale?: { type: string; values: string[] }
}

interface TodoFormData {
  title: string
  description?: string
  priority: string
  severity?: string
  tags?: string[]
  statusId?: string
  labelIds?: string[]
  assigneeId?: string
  estimate?: string
}

interface TodoFormProps {
  onSubmit: (data: TodoFormData) => void
  projectConfig?: ProjectConfig
}

export function TodoForm({ onSubmit, projectConfig }: TodoFormProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [severity, setSeverity] = useState("")
  const [tags, setTags] = useState("")
  const [statusId, setStatusId] = useState("")
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [assigneeId, setAssigneeId] = useState("")
  const [estimate, setEstimate] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      severity: severity || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      statusId: statusId || undefined,
      labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      assigneeId: assigneeId || undefined,
      estimate: estimate || undefined,
    })

    setTitle("")
    setDescription("")
    setPriority("medium")
    setSeverity("")
    setTags("")
    setStatusId("")
    setSelectedLabelIds([])
    setAssigneeId("")
    setEstimate("")
    setOpen(false)
  }

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
  }

  const sortedStatuses = projectConfig?.statuses
    ? [...projectConfig.statuses].sort((a, b) => a.position - b.position)
    : []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white hover:from-emerald-500 hover:to-emerald-700"
        >
          <Plus className="mr-1 size-4" />
          New Todo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Todo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="trivial">Trivial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {sortedStatuses.length > 0 && (
              <div>
                <Label>Status</Label>
                <Select value={statusId} onValueChange={setStatusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedStatuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {projectConfig?.members && projectConfig.members.length > 0 && (
            <div>
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {projectConfig.members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {projectConfig?.estimateScale && (
            <div>
              <Label>Estimate</Label>
              <Select value={estimate} onValueChange={setEstimate}>
                <SelectTrigger>
                  <SelectValue placeholder="No estimate" />
                </SelectTrigger>
                <SelectContent>
                  {projectConfig.estimateScale.values.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {projectConfig?.labels && projectConfig.labels.length > 0 && (
            <div>
              <Label>Labels</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {projectConfig.labels.map((l) => (
                  <button key={l.id} type="button" onClick={() => toggleLabel(l.id)}>
                    <Badge
                      variant={selectedLabelIds.includes(l.id) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer gap-1 text-xs",
                        selectedLabelIds.includes(l.id) && "ring-2 ring-offset-1"
                      )}
                    >
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      {l.name}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="auth, backend, bug (comma-separated)"
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
