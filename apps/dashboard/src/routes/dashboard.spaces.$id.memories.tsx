import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/spaces/$id/memories")({
  component: () => <StubRoute title="Space Memories" phase="E" />,
})
