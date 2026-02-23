"use client"

import { Check, Copy, Eye, EyeOff, RefreshCw } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ApiKeyDisplayProps {
  apiKey: string
  onRegenerate?: () => void
}

export function ApiKeyDisplay({ apiKey, onRegenerate }: ApiKeyDisplayProps) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const masked = `${apiKey.slice(0, 11)}...${apiKey.slice(-4)}`

  return (
    <div className="rounded-2xl border border-border bg-white p-5 dark:bg-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">API Key</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Use this key in your MCP server configuration
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Input readOnly value={visible ? apiKey : masked} className="font-mono text-sm" />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide API key" : "Show API key"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy API key">
          {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
        </Button>
      </div>

      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 text-xs text-muted-foreground"
          onClick={onRegenerate}
        >
          <RefreshCw className="mr-1 size-3" />
          Regenerate Key
        </Button>
      )}

      <div className="mt-4 rounded-lg border border-border bg-background p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Usage in Claude Code config:
        </p>
        <pre className="font-mono text-xs text-muted-foreground">
          {`"env": { "DOMCP_API_KEY": "${visible ? apiKey : "domcp_sk_..."}" }`}
        </pre>
      </div>
    </div>
  )
}
