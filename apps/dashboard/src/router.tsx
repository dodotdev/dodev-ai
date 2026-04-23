import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Every route opts in to an auth context populated by the root route.
  // This is left `undefined!` here because routeTree.gen is generated at
  // build time; the root route fills it in `beforeLoad`.
  context: undefined!,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
