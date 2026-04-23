import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/activity")({
  component: () => <StubRoute title="Activity" phase="D" />,
})
