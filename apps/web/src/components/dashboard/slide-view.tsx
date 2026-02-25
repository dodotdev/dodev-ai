"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface SlideViewProps {
  showDetail: boolean
  listContent: React.ReactNode
  detailContent: React.ReactNode
}

export function SlideView({ showDetail, listContent, detailContent }: SlideViewProps) {
  // Keep last content in a ref so it stays visible during close animation
  const lastContent = useRef<React.ReactNode>(null)
  // mounted = DOM element exists; open = translate position
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  if (showDetail && detailContent) {
    lastContent.current = detailContent
  }

  useEffect(() => {
    if (showDetail) {
      // Mount first, then animate open on next frame
      setMounted(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpen(true)
        })
      })
    } else {
      // Slide out first, then unmount after animation
      setOpen(false)
      const timer = setTimeout(() => {
        setMounted(false)
        lastContent.current = null
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [showDetail])

  const renderContent = showDetail ? detailContent : lastContent.current

  return (
    <div className="relative" style={{ minHeight: "calc(100vh - 200px)" }}>
      {/* List — always rendered, never transformed */}
      <div>{listContent}</div>

      {/* Detail drawer — slides in from right on top of the list */}
      {mounted && (
        <div
          className={cn(
            "absolute inset-0 z-10 bg-background transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "pointer-events-none translate-x-full"
          )}
        >
          {renderContent}
        </div>
      )}
    </div>
  )
}
