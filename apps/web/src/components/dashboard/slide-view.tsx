"use client"

import { cn } from "@/lib/utils"

interface SlideViewProps {
  showDetail: boolean
  listContent: React.ReactNode
  detailContent: React.ReactNode
}

export function SlideView({ showDetail, listContent, detailContent }: SlideViewProps) {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: "calc(100vh - 200px)" }}>
      {/* List panel — no transform when visible so position:fixed children (DragOverlay) work */}
      <div
        className={cn(
          showDetail
            ? "pointer-events-none absolute inset-0 -translate-x-[30%] opacity-0 transition-all duration-300 ease-out"
            : "opacity-100"
        )}
      >
        {listContent}
      </div>

      {/* Detail panel */}
      <div
        className={cn(
          showDetail
            ? "translate-x-0 opacity-100 transition-all duration-300 ease-out"
            : "pointer-events-none absolute inset-0 translate-x-full opacity-0 transition-all duration-300 ease-out"
        )}
      >
        {detailContent}
      </div>
    </div>
  )
}
