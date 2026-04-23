"use client"

import { api } from "@dodev/convex/api"
import { useMutation } from "convex/react"
import { Plus, Trash2 } from "lucide-react"
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

interface EstimateScale {
  type: string
  values: string[]
}

import type { ConfigScope } from "./status-editor"

interface EstimateEditorProps {
  scope: ConfigScope
  estimateScale: EstimateScale
  /**
   * When scope is a project and this editor is showing the inherited (space)
   * value, set this true so Save knows to push an override. When the project
   * already has its own value, the UI may offer a "Revert to inherited"
   * action which calls updateProjectEstimateScale with null.
   */
  inheritedFromSpace?: boolean
  onRevertToInherit?: () => void
}

const SCALE_TYPES = [
  { value: "points", label: "Points (1, 2, 3, 5, 8, 13...)" },
  { value: "tshirt", label: "T-Shirt (XS, S, M, L, XL)" },
  { value: "hours", label: "Hours (1h, 2h, 4h, 8h...)" },
] as const

const DEFAULT_VALUES: Record<string, string[]> = {
  points: ["1", "2", "3", "5", "8", "13", "21"],
  tshirt: ["XS", "S", "M", "L", "XL"],
  hours: ["1h", "2h", "4h", "8h", "16h", "24h"],
}

export function EstimateEditor({
  scope,
  estimateScale,
  inheritedFromSpace,
  onRevertToInherit,
}: EstimateEditorProps) {
  const { apiKeyHash } = useAuth()
  const updateSpaceEstimateScale = useMutation(api.spaceConfig.updateEstimateScale)
  const updateProjectEstimateScale = useMutation(api.projectConfig.updateEstimateScale)

  const [type, setType] = useState(estimateScale.type)
  const [values, setValues] = useState<string[]>(estimateScale.values)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleTypeChange(newType: string) {
    setType(newType)
    // Pre-fill with defaults when switching type
    setValues(DEFAULT_VALUES[newType] ?? [])
    setError(null)
  }

  function handleValueChange(index: number, value: string) {
    const updated = [...values]
    updated[index] = value
    setValues(updated)
    setError(null)
  }

  function handleAddValue() {
    setValues([...values, ""])
  }

  function handleRemoveValue(index: number) {
    if (values.length <= 1) {
      setError("At least one scale value is required.")
      return
    }
    setValues(values.filter((_, i) => i !== index))
    setError(null)
  }

  async function handleSave() {
    if (!apiKeyHash) return

    // Validate: no empty values
    const trimmedValues = values.map((v) => v.trim()).filter(Boolean)
    if (trimmedValues.length === 0) {
      setError("At least one scale value is required.")
      return
    }

    // Check for duplicates
    const uniqueValues = new Set(trimmedValues)
    if (uniqueValues.size !== trimmedValues.length) {
      setError("Duplicate values are not allowed.")
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      if (scope.kind === "space") {
        await updateSpaceEstimateScale({
          apiKeyHash,
          spaceId: scope.spaceId as never,
          type: type as "points" | "tshirt" | "hours",
          values: trimmedValues,
        })
      } else {
        await updateProjectEstimateScale({
          apiKeyHash,
          projectId: scope.projectId as never,
          scale: {
            type: type as "points" | "tshirt" | "hours",
            values: trimmedValues,
          },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save estimate scale")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRevert() {
    if (!apiKeyHash || scope.kind !== "project") return
    setIsSaving(true)
    setError(null)
    try {
      await updateProjectEstimateScale({
        apiKeyHash,
        projectId: scope.projectId as never,
        scale: null,
      })
      onRevertToInherit?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revert")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Estimate Scale</Label>
        {scope.kind === "project" && inheritedFromSpace ? (
          <span className="text-xs text-muted-foreground">
            Inherited from space — editing creates an override
          </span>
        ) : scope.kind === "project" ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleRevert}
            disabled={isSaving}
          >
            Revert to inherited
          </Button>
        ) : null}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Scale type selector */}
      <div className="space-y-1">
        <Label htmlFor="scale-type" className="text-xs">
          Scale Type
        </Label>
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCALE_TYPES.map((st) => (
              <SelectItem key={st.value} value={st.value}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scale values */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Scale Values</Label>
          <Button type="button" variant="outline" size="xs" onClick={handleAddValue}>
            <Plus className="mr-1 size-3" />
            Add Value
          </Button>
        </div>

        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => handleValueChange(index, e.target.value)}
              placeholder="Value"
              className="h-8 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleRemoveValue(index)}
              title="Remove value"
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}

        {values.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            No values defined. Add one above.
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Scale"}
        </Button>
      </div>
    </div>
  )
}
