"use client"

import { FileIcon, Paperclip, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/** A file queued for upload, managed locally before form submission. */
export interface PendingFile {
  /** Unique ID for React keys */
  id: string
  /** The actual File object */
  file: File
  /** Data URL for image thumbnails (created via URL.createObjectURL) */
  preview?: string
}

interface AttachmentDropzoneProps {
  files: PendingFile[]
  onFilesChange: (files: PendingFile[]) => void
  /** Maximum number of files allowed. Default 20. */
  maxFiles?: number
  /** Maximum size per file in bytes. Default 10 MB. */
  maxSize?: number
  className?: string
}

const DEFAULT_MAX_FILES = 20
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10 MB

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function AttachmentDropzone({
  files,
  onFilesChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxSize = DEFAULT_MAX_SIZE,
  className,
}: AttachmentDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up object URLs on unmount only -- we revoke individually on remove
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run on unmount only
  useEffect(() => {
    return () => {
      for (const f of files) {
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      }
    }
  }, [])

  // Auto-clear error after 4 seconds
  useEffect(() => {
    if (error) {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = setTimeout(() => setError(null), 4000)
    }
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    }
  }, [error])

  const showError = useCallback((message: string) => {
    setError(message)
  }, [])

  const addFiles = useCallback(
    (incoming: File[]) => {
      setError(null)

      // Validate count
      const available = maxFiles - files.length
      if (available <= 0) {
        showError(`Maximum of ${maxFiles} files allowed`)
        return
      }

      const toAdd: PendingFile[] = []
      for (const file of incoming) {
        if (toAdd.length >= available) {
          showError(`Only ${available} more file${available === 1 ? "" : "s"} allowed`)
          break
        }

        // Validate size
        if (file.size > maxSize) {
          showError(`"${file.name}" exceeds ${formatFileSize(maxSize)} limit`)
          continue
        }

        const pending: PendingFile = {
          id: generateId(),
          file,
          preview: isImageFile(file) ? URL.createObjectURL(file) : undefined,
        }
        toAdd.push(pending)
      }

      if (toAdd.length > 0) {
        onFilesChange([...files, ...toAdd])
      }
    },
    [files, maxFiles, maxSize, onFilesChange, showError]
  )

  const removeFile = useCallback(
    (id: string) => {
      const target = files.find((f) => f.id === id)
      if (target?.preview) {
        URL.revokeObjectURL(target.preview)
      }
      onFilesChange(files.filter((f) => f.id !== id))
    },
    [files, onFilesChange]
  )

  // -- Drag handlers --

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragOver(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) {
        addFiles(droppedFiles)
      }
    },
    [addFiles]
  )

  // -- Paste handler --

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.files
      if (!clipboardItems || clipboardItems.length === 0) return

      // Only intercept paste if it contains files (don't block text paste)
      e.preventDefault()
      addFiles(Array.from(clipboardItems))
    },
    [addFiles]
  )

  // -- File picker --

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files
      if (!selected || selected.length === 0) return
      addFiles(Array.from(selected))
      // Reset input so the same file can be re-selected
      e.target.value = ""
    },
    [addFiles]
  )

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const hasFiles = files.length > 0

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-primary/50 bg-primary/5">
          <p className="text-sm font-medium text-primary/70">Drop files here</p>
        </div>
      )}

      {/* Inline error */}
      {error && (
        <div className="mb-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* File thumbnails */}
      {hasFiles && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((pf) => (
            <div
              key={pf.id}
              className="group/card relative flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2 py-1.5"
            >
              {/* Thumbnail or icon */}
              {pf.preview ? (
                <img src={pf.preview} alt={pf.file.name} className="size-8 rounded object-cover" />
              ) : (
                <FileIcon className="size-5 text-muted-foreground/60" />
              )}

              {/* Name + size */}
              <div className="flex flex-col">
                <span className="max-w-[120px] truncate text-xs text-foreground">
                  {pf.file.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatFileSize(pf.file.size)}
                </span>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeFile(pf.id)}
                className="ml-1 rounded-full p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${pf.file.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attach button / trigger */}
      <button
        type="button"
        onClick={openFilePicker}
        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Paperclip className="size-3.5" />
        {hasFiles ? `${files.length} file${files.length === 1 ? "" : "s"}` : "Attach files"}
      </button>
    </div>
  )
}
