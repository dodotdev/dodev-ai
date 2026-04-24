import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/dashboard/spaces/$id")({
  component: () => (
    <div className="px-3 py-4">
      <Outlet />
    </div>
  ),
})
