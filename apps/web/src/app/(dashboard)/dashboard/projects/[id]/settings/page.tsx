"use client"

import { api } from "@domcp/convex/api"
import { useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { useParams } from "next/navigation"
import { CycleEditor } from "@/components/dashboard/settings/cycle-editor"
import { EstimateEditor } from "@/components/dashboard/settings/estimate-editor"
import { LabelEditor } from "@/components/dashboard/settings/label-editor"
import { MemberEditor } from "@/components/dashboard/settings/member-editor"
import { PersonaEditor } from "@/components/dashboard/settings/persona-editor"
import { StatusEditor } from "@/components/dashboard/settings/status-editor"
import { useAuth } from "@/components/providers/auth-provider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const { apiKeyHash, isLoading: authLoading } = useAuth()

  const project = useQuery(api.projects.get, apiKeyHash ? { apiKeyHash, id: id as never } : "skip")

  const cycles = useQuery(
    api.cycles.list,
    apiKeyHash ? { apiKeyHash, projectId: id as never } : "skip"
  )

  if (authLoading || !apiKeyHash) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (project === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-xl font-semibold">Project Settings</h2>

      <Tabs defaultValue="workflow">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="persona">AI Persona</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="mt-6">
          <StatusEditor projectId={id} statuses={project.statuses ?? []} />
        </TabsContent>

        <TabsContent value="labels" className="mt-6">
          <LabelEditor projectId={id} labels={project.labels ?? []} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MemberEditor projectId={id} members={project.members ?? []} />
        </TabsContent>

        <TabsContent value="estimates" className="mt-6">
          <EstimateEditor
            projectId={id}
            estimateScale={project.estimateScale ?? { type: "points", values: [] }}
          />
        </TabsContent>

        <TabsContent value="cycles" className="mt-6">
          <CycleEditor
            projectId={id}
            cycles={(cycles ?? []).map((c) => ({
              _id: c._id as string,
              name: c.name,
              status: c.status,
              startDate: c.startDate,
              endDate: c.endDate,
              description: c.description,
            }))}
          />
        </TabsContent>

        <TabsContent value="persona" className="mt-6">
          <PersonaEditor projectId={id} persona={project.persona} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
