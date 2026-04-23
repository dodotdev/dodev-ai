import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/spaces")({
  component: () => <StubRoute title="Spaces" phase="D" />,
})
