import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/issues")({
  component: () => <StubRoute title="Issues" phase="D" />,
})
