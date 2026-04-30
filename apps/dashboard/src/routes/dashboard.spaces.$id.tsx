import { createFileRoute, Outlet, useParams } from "@tanstack/react-router"
import { RecapBanner } from "@/components/dashboard/recap/recap-banner"

export const Route = createFileRoute("/dashboard/spaces/$id")({
  component: SpaceLayout,
})

function SpaceLayout() {
  const { id } = useParams({ from: "/dashboard/spaces/$id" })
  return (
    <div className="space-y-4 px-3 py-4">
      <RecapBanner spaceId={id} />
      <Outlet />
    </div>
  )
}
