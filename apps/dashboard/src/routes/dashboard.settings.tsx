import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/settings")({
  component: () => <StubRoute title="Settings" phase="D" />,
})
