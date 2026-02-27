interface WorkflowStatus {
  id: string
  name: string
  category: string
}

/**
 * Build a workflow hint for a task or issue based on its current status
 * and the project's configured statuses.
 *
 * Returns actionable instructions with actual status IDs so the agent
 * can call update_task/update_issue directly.
 */
export function buildWorkflowHint(
  itemType: "task" | "issue",
  currentStatus: string,
  currentStatusId: string | undefined,
  statuses: WorkflowStatus[]
): string {
  const inProgress = statuses.find((s) => s.name === "In Progress")
  const inReview = statuses.find((s) => s.name === "In Review")

  const updateTool = itemType === "task" ? "update_task" : "update_issue"
  const lines: string[] = []

  // Determine current state and give appropriate next-step guidance
  const resolvedCategory = currentStatusId
    ? statuses.find((s) => s.id === currentStatusId)?.category
    : currentStatus

  if (resolvedCategory === "pending" || currentStatus === "pending") {
    // Item is in backlog or pending — agent should move to In Progress when starting
    if (inProgress) {
      lines.push(
        `When you start working on this ${itemType}, move it to "In Progress" by calling ${updateTool} with statusId: "${inProgress.id}".`
      )
    }
    if (inReview) {
      lines.push(
        `When your work is done, move it to "In Review" (statusId: "${inReview.id}") — not directly to Done.`
      )
    }
  } else if (resolvedCategory === "in_progress" && currentStatusId !== inReview?.id) {
    // Item is In Progress — agent should move to In Review when done
    if (inReview) {
      lines.push(
        `This ${itemType} is in progress. When your work is complete, move it to "In Review" by calling ${updateTool} with statusId: "${inReview.id}".`
      )
    }
  } else if (currentStatusId === inReview?.id) {
    // Item is In Review — no action needed from the agent, the user will move to Done
    lines.push(
      `This ${itemType} is in review. The project owner will move it to Done after review.`
    )
  } else if (resolvedCategory === "completed") {
    // Already done
    lines.push(`This ${itemType} is already completed.`)
  }

  // Always remind to comment
  if (resolvedCategory !== "completed" && resolvedCategory !== "cancelled") {
    lines.push(
      `Always add a comment (create_comment) documenting what you did, any decisions made, and blockers encountered.`
    )
  }

  return lines.join(" ")
}

/**
 * Build a compact workflow hint for list responses.
 * Included once in the response envelope so agents see it
 * regardless of whether they use list or get to find items.
 */
export function buildListWorkflowHint(
  itemType: "task" | "issue",
  statuses: WorkflowStatus[]
): string {
  const inProgress = statuses.find((s) => s.name === "In Progress")
  const inReview = statuses.find((s) => s.name === "In Review")
  const updateTool = itemType === "task" ? "update_task" : "update_issue"

  const parts: string[] = []
  if (inProgress) {
    parts.push(
      `Move to "In Progress" (${updateTool} statusId: "${inProgress.id}") when starting work.`
    )
  }
  if (inReview) {
    parts.push(`Move to "In Review" (statusId: "${inReview.id}") when done — not directly to Done.`)
  }
  parts.push("Always add a comment (create_comment) documenting your work.")

  return parts.join(" ")
}

/**
 * Build a general workflow section for get_context responses.
 * This gives agents an overview of the expected workflow without
 * item-specific status IDs.
 */
export function buildContextWorkflowHint(statuses: WorkflowStatus[]): string {
  const inProgress = statuses.find((s) => s.name === "In Progress")
  const inReview = statuses.find((s) => s.name === "In Review")

  const lines: string[] = ["Workflow guidelines for tasks and issues:"]

  if (inProgress) {
    lines.push(
      `- When you START working on a task or issue, move it to "In Progress" (statusId: "${inProgress.id}").`
    )
  }

  if (inReview) {
    lines.push(
      `- When your work is COMPLETE, move it to "In Review" (statusId: "${inReview.id}") — do NOT move directly to Done.`
    )
  }

  lines.push(
    "- Always add a comment (create_comment) documenting what you did, decisions made, and any blockers.",
    "- The project owner will review and move items to Done."
  )

  return lines.join("\n")
}
