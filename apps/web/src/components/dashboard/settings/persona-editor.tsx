"use client"

import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"
import { Bot, RotateCcw } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const MAX_PROMPT_LENGTH = 10_000

interface PersonaEditorProps {
  spaceId: string
  persona?: { systemPrompt: string }
}

export function PersonaEditor({ spaceId, persona }: PersonaEditorProps) {
  const { apiKeyHash } = useAuth()
  const updatePersona = useMutation(api.spaceConfig.updatePersona)

  const [systemPrompt, setSystemPrompt] = useState(persona?.systemPrompt ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const characterCount = systemPrompt.length
  const isOverLimit = characterCount > MAX_PROMPT_LENGTH
  const hasChanges = systemPrompt !== (persona?.systemPrompt ?? "")

  async function handleSave() {
    if (!apiKeyHash) return

    if (isOverLimit) {
      setError(`System prompt exceeds the ${MAX_PROMPT_LENGTH.toLocaleString()} character limit.`)
      return
    }

    const trimmed = systemPrompt.trim()
    if (!trimmed) {
      setError("System prompt cannot be empty. Use the Clear button to remove it.")
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await updatePersona({ apiKeyHash, spaceId: spaceId as never, systemPrompt: trimmed })
      setSuccessMessage("Persona saved.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save persona")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClear() {
    if (!apiKeyHash) return

    setIsClearing(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await updatePersona({ apiKeyHash, spaceId: spaceId as never, systemPrompt: null })
      setSystemPrompt("")
      setSuccessMessage("Persona cleared.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear persona")
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="size-5 text-muted-foreground" />
        <Label className="text-base font-semibold">AI Persona</Label>
      </div>

      <p className="text-sm text-muted-foreground">
        Define a system prompt to customize how the AI agent behaves when working in this space.
        This prompt is injected into every tool call context.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {successMessage && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>
      )}

      <div className="space-y-2">
        <Textarea
          value={systemPrompt}
          onChange={(e) => {
            setSystemPrompt(e.target.value)
            setError(null)
            setSuccessMessage(null)
          }}
          placeholder="You are a senior backend engineer focused on TypeScript and Convex. Prioritize type safety, write thorough tests, and prefer functional patterns..."
          rows={10}
          className="min-h-[200px] resize-y font-mono text-sm"
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${
              isOverLimit ? "font-medium text-destructive" : "text-muted-foreground"
            }`}
          >
            {characterCount.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()} characters
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isClearing || (!persona?.systemPrompt && !systemPrompt)}
        >
          <RotateCcw className="mr-1 size-4" />
          {isClearing ? "Clearing..." : "Clear"}
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isOverLimit || !hasChanges}>
          {isSaving ? "Saving..." : "Save Persona"}
        </Button>
      </div>
    </div>
  )
}
