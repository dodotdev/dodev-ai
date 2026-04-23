import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/memories")({
  component: () => <StubRoute title="Memories" phase="D" />,
})
