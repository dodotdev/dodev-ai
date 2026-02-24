"use client"

import { ProjectHeader } from "@/components/dashboard/project-header"

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ProjectHeader />
      <div className="p-6">{children}</div>
    </div>
  )
}
