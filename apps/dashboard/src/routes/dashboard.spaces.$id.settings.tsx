import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/spaces/$id/settings")({
  component: () => <StubRoute title="Space Settings" phase="E" />,
})
