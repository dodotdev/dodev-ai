import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/getting-started")({
  component: () => <StubRoute title="Getting Started" phase="D" />,
})
