import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/tasks")({
  component: () => <StubRoute title="Tasks" phase="D" />,
})
