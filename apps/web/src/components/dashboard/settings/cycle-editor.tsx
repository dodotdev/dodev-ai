"use client"

import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"
import { Calendar, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
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

interface Cycle {
  _id: string
  name: string
  status: string
  startDate: number
  endDate: number
  description?: string
}

interface CycleEditorProps {
  projectId: string
  cycles: Cycle[]
}

const CYCLE_STATUSES = ["planned", "active", "completed", "cancelled"] as const

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function _toDateInputValue(timestamp: number): string {
  return new Date(timestamp).toISOString().split("T")[0]
}

function _statusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    case "completed":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    case "cancelled":
      return "bg-red-500/10 text-red-600 dark:text-red-400"
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400"
  }
}

export function CycleEditor({ projectId, cycles }: CycleEditorProps) {
  const { apiKeyHash } = useAuth()
  const createCycle = useMutation(api.cycles.create)
  const updateCycle = useMutation(api.cycles.update)
  const removeCycle = useMutation(api.cycles.remove)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [newEndDate, setNewEndDate] = useState("")
  const [newStatus, setNewStatus] = useState<string>("planned")
  const [isCreating, setIsCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setNewName("")
    setNewStartDate("")
    setNewEndDate("")
    setNewStatus("planned")
    setError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKeyHash) return

    const trimmedName = newName.trim()
    if (!trimmedName) {
      setError("Cycle name is required.")
      return
    }

    if (!newStartDate || !newEndDate) {
      setError("Start and end dates are required.")
      return
    }

    const startTimestamp = new Date(newStartDate).getTime()
    const endTimestamp = new Date(newEndDate).getTime()

    if (endTimestamp <= startTimestamp) {
      setError("End date must be after start date.")
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      await createCycle({
        apiKeyHash,
        projectId: projectId as never,
        name: trimmedName,
        startDate: startTimestamp,
        endDate: endTimestamp,
        status: newStatus as "upcoming" | "active" | "completed",
      })
      resetForm()
      setDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cycle")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleUpdateStatus(cycleId: string, newStatusValue: string) {
    if (!apiKeyHash) return

    setUpdatingId(cycleId)
    setError(null)
    try {
      await updateCycle({
        apiKeyHash,
        id: cycleId as never,
        status: newStatusValue as "upcoming" | "active" | "completed",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cycle")
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleRemove(cycleId: string) {
    if (!apiKeyHash) return

    setRemovingId(cycleId)
    setError(null)
    try {
      await removeCycle({ apiKeyHash, id: cycleId as never })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove cycle")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Cycles</Label>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
              <Plus className="mr-1 size-4" />
              Add Cycle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Cycle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && dialogOpen && <p className="text-sm text-destructive">{error}</p>}
              <div className="space-y-1">
                <Label htmlFor="cycle-name">Name</Label>
                <Input
                  id="cycle-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Sprint 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="cycle-start">Start Date</Label>
                  <Input
                    id="cycle-start"
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cycle-end">End Date</Label>
                  <Input
                    id="cycle-end"
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cycle-status">Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CYCLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Cycle"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && !dialogOpen && <p className="text-sm text-destructive">{error}</p>}

      {/* Existing cycles */}
      <div className="space-y-2">
        {cycles.map((cycle) => (
          <div
            key={cycle._id}
            className="flex items-center gap-3 rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-3"
          >
            <Calendar className="size-4 shrink-0 text-muted-foreground" />

            <div className="flex-1">
              <p className="text-sm font-medium">{cycle.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
              </p>
            </div>

            {/* Status selector */}
            <Select
              value={cycle.status}
              onValueChange={(value) => handleUpdateStatus(cycle._id, value)}
              disabled={updatingId === cycle._id}
            >
              <SelectTrigger size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Remove */}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemove(cycle._id)}
              disabled={removingId === cycle._id}
              title="Remove cycle"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}

        {cycles.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No cycles defined. Create one to start tracking sprints.
          </p>
        )}
      </div>
    </div>
  )
}
