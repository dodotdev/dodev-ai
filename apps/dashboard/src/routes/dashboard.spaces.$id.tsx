import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/dashboard/spaces/$id")({
  component: () => <Outlet />,
})
