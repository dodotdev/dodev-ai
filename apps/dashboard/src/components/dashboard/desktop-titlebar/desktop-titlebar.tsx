/**
 * Draggable title bar for the Electron window.
 *
 * macOS uses titleBarStyle: "hiddenInset" so the window has traffic
 * lights but no native title bar — without a renderer-side drag region
 * the window can only be moved by the small area immediately around
 * the traffic lights, which is awful UX. This component renders a
 * 40px-tall bar at the top of every screen with -webkit-app-region:
 * drag, leaving an 80px no-drag inset on the left so the traffic
 * lights stay clickable.
 *
 * Any interactive children must explicitly opt out of drag with
 * `style={{ WebkitAppRegion: "no-drag" }}` — buttons inside a drag
 * region are unclickable on macOS unless they do.
 */
import { Sparkles } from "lucide-react"
import type { CSSProperties } from "react"

// React's CSSProperties doesn't ship -webkit-app-region in its types
// even though it's widely supported in Electron renderers. Cast at the
// boundary instead of stuffing `any` everywhere downstream.
const dragStyle: CSSProperties = { WebkitAppRegion: "drag" } as CSSProperties
const noDragStyle: CSSProperties = { WebkitAppRegion: "no-drag" } as CSSProperties

export function DesktopTitleBar({ isMac }: { isMac: boolean }) {
  return (
    <div
      style={dragStyle}
      className="flex h-10 w-full shrink-0 items-center border-b border-border/50 bg-background/95 backdrop-blur-sm"
    >
      {/* macOS traffic lights occupy the left ~78px. Reserve the space
          so titles + content don't collide with the close/min/max
          buttons. On non-mac, no inset needed. */}
      {isMac && <div className="w-20 shrink-0" />}

      <div className="flex flex-1 items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3 text-emerald-500" />
        <span className="font-medium tracking-wide">dodev.ai</span>
      </div>

      {/* Symmetric padding on the right so the title sits visually
          centered. Future: action buttons live here. */}
      {isMac && <div className="w-20 shrink-0" style={noDragStyle} />}
    </div>
  )
}
