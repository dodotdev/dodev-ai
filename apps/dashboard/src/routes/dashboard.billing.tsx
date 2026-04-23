import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/billing")({
  component: () => <StubRoute title="Billing" phase="D" />,
})
