import { createFileRoute } from "@tanstack/react-router"
import { StubRoute } from "@/components/dashboard/stub-route"

export const Route = createFileRoute("/dashboard/spaces/$id/issues")({
  component: () => <StubRoute title="Space Issues" phase="E" />,
})
