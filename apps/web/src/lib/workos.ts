import { WorkOS } from "@workos-inc/node"

let _workos: WorkOS | null = null

function getWorkOS(): WorkOS {
  if (!_workos) {
    _workos = new WorkOS(process.env.WORKOS_API_KEY)
  }
  return _workos
}

export const workos = new Proxy({} as WorkOS, {
  get(_, prop) {
    return (getWorkOS() as unknown as Record<string, unknown>)[prop as string]
  },
})
