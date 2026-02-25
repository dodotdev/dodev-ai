"use client"

import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Member {
  id: string
  name: string
  role: string
  avatarUrl?: string
}

interface MemberEditorProps {
  projectId: string
  members: Member[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function MemberEditor({ projectId, members }: MemberEditorProps) {
  const { apiKeyHash } = useAuth()
  const addMember = useMutation(api.projectConfig.addMember)
  const removeMember = useMutation(api.projectConfig.removeMember)

  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKeyHash) return

    const trimmedName = newName.trim()
    const trimmedRole = newRole.trim()

    if (!trimmedName) {
      setError("Member name is required.")
      return
    }

    if (!trimmedRole) {
      setError("Member role is required.")
      return
    }

    setIsAdding(true)
    setError(null)
    try {
      await addMember({
        apiKeyHash,
        projectId: projectId as never,
        name: trimmedName,
        role: trimmedRole,
      })
      setNewName("")
      setNewRole("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member")
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(memberId: string) {
    if (!apiKeyHash) return

    setRemovingId(memberId)
    setError(null)
    try {
      await removeMember({ apiKeyHash, projectId: projectId as never, memberId })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Members</Label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Existing members */}
      <div className="space-y-2">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
            {/* Avatar */}
            {member.avatarUrl ? (
              <img
                src={member.avatarUrl}
                alt={member.name}
                className="size-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {getInitials(member.name)}
              </div>
            )}

            {/* Name and role */}
            <div className="flex-1">
              <p className="text-sm font-medium">{member.name}</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              {member.role}
            </Badge>

            {/* Remove */}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemove(member.id)}
              disabled={removingId === member.id}
              title="Remove member"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}

        {members.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">No members added yet.</p>
        )}
      </div>

      {/* Add member form */}
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="member-name" className="text-xs">
            Name
          </Label>
          <Input
            id="member-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Member name"
            className="h-8"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="member-role" className="text-xs">
            Role
          </Label>
          <Input
            id="member-role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="e.g. Developer, Designer"
            className="h-8"
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
