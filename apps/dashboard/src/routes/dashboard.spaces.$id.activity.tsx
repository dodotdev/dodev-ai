import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/spaces/$id/activity")({
  component: () => <StubRoute title="Space Activity" phase="E" />,
})
