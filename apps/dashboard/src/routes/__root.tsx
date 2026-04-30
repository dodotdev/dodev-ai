import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { DesktopTitleBar } from "@/components/dashboard/desktop-titlebar/desktop-titlebar"
import { NotFoundPage } from "@/components/dashboard/not-found/not-found-page"
import { isElectron } from "@/lib/session-source-electron"

export const Route = createRootRoute({
  component: RootShell,
  notFoundComponent: NotFoundPage,
})

function RootShell() {
  // isElectron() is a runtime check on window.dodev — safe to compute
  // once at mount. Platform detection only matters on Electron (Mac
  // gets the traffic-light inset).
  const [chrome, setChrome] = useState<{ electron: boolean; mac: boolean }>(() => ({
    electron: false,
    mac: false,
  }))

  useEffect(() => {
    setChrome({
      electron: isElectron(),
      mac: typeof navigator !== "undefined" && /Mac/.test(navigator.platform),
    })
  }, [])

  return (
    <div className="flex h-full flex-col">
      {chrome.electron && <DesktopTitleBar isMac={chrome.mac} />}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
