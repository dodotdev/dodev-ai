import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

// =============================================================================
// v0.1.0 — Projects inside Spaces
//
// Hierarchy:  user -> space -> project (optional) -> tasks/issues/memories/cycles
//
// Earlier deploys renamed the legacy `projects` concept to `spaces`. v0.1.0
// introduces a NEW concept also called `projects`, now nested inside spaces.
// All legacy projectId references were cleared via
// `migrations:purgeLegacyProjects` before this schema was pushed.
//
// Config inheritance:
//   - `statuses`, `labels`, `members`: copied from parent space at project
//     creation, then independently editable on the project.
//   - `estimateScale`, `persona`: live-inherit; undefined on the project
//     means "use the space's value."
// =============================================================================

export default defineSchema({
  // ---------------------------------------------------------------------------
  // users
  // ---------------------------------------------------------------------------
  users: defineTable({
    // Identity
    workosUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),

    // API access
    apiKey: v.string(),
    apiKeyHash: v.string(),

    // Access control
    role: v.optional(v.union(v.literal("waitlisted"), v.literal("approved"), v.literal("admin"))),
    waitlistEmailSentAt: v.optional(v.number()),
    welcomeEmailSentAt: v.optional(v.number()),

    // Billing
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("team"), v.literal("enterprise")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),

    // Settings
    settings: v.object({
      defaultSpaceId: v.optional(v.id("spaces")),
      /** Preferred project within the default space. v0.1.0+ */
      defaultProjectId: v.optional(v.id("projects")),
      timezone: v.optional(v.string()),
    }),

    // Memory settings (user-level defaults)
    memorySettings: v.optional(
      v.object({
        autoCapture: v.optional(v.boolean()),
        embeddingProvider: v.optional(v.string()),
        embeddingModel: v.optional(v.string()),
        embeddingBaseUrl: v.optional(v.string()),
        embeddingApiKey: v.optional(v.string()),
      })
    ),

    // Global item counter (shared across all tasks, issues, spaces)
    itemCounter: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workos_id", ["workosUserId"])
    .index("by_email", ["email"])
    .index("by_api_key_hash", ["apiKeyHash"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  // ---------------------------------------------------------------------------
  // spaces
  // ---------------------------------------------------------------------------
  spaces: defineTable({
    userId: v.id("users"),
    name: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("archived")
    ),
    itemCounter: v.optional(v.number()),
    taskCounter: v.optional(v.number()),
    issueCounter: v.optional(v.number()),
    metadata: v.optional(v.any()),

    // Space config
    statuses: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        category: v.union(
          v.literal("pending"),
          v.literal("in_progress"),
          v.literal("completed"),
          v.literal("cancelled")
        ),
        color: v.string(),
        position: v.number(),
      })
    ),
    labels: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        color: v.string(),
      })
    ),
    members: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        role: v.string(),
        avatarUrl: v.optional(v.string()),
      })
    ),
    estimateScale: v.object({
      type: v.union(v.literal("points"), v.literal("tshirt"), v.literal("hours")),
      values: v.array(v.string()),
    }),
    persona: v.optional(
      v.object({
        systemPrompt: v.string(),
      })
    ),

    // Workspace linking for auto-detection
    linkedPaths: v.optional(v.array(v.string())),
    linkedRepos: v.optional(v.array(v.string())),

    // Memory settings
    memorySettings: v.optional(
      v.object({
        autoCapture: v.optional(v.boolean()),
        defaultTags: v.optional(v.array(v.string())),
        memoryInstructions: v.optional(v.string()),
      })
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_slug", ["userId", "slug"])
    .index("by_slug", ["slug"]),

  // ---------------------------------------------------------------------------
  // projects (v0.1.0+) — nested inside a space
  //
  // Slug: unique within a space. Item slugs for tasks/issues inside a project
  // take the form {SPACE_SLUG}-{PROJECT_SLUG}-{N}. Items without a projectId
  // continue to use {SPACE_SLUG}-{N}.
  // ---------------------------------------------------------------------------
  projects: defineTable({
    userId: v.id("users"),
    spaceId: v.id("spaces"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("archived")
    ),
    metadata: v.optional(v.any()),

    // Per-project counters (for contiguous numbering within the project)
    taskCounter: v.optional(v.number()),
    issueCounter: v.optional(v.number()),

    // Config — copied from space at creation, then independently editable
    statuses: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        category: v.union(
          v.literal("pending"),
          v.literal("in_progress"),
          v.literal("completed"),
          v.literal("cancelled")
        ),
        color: v.string(),
        position: v.number(),
      })
    ),
    labels: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        color: v.string(),
      })
    ),
    members: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        role: v.string(),
        avatarUrl: v.optional(v.string()),
      })
    ),

    // Config — live-inherit when undefined (uses space's value)
    estimateScale: v.optional(
      v.object({
        type: v.union(v.literal("points"), v.literal("tshirt"), v.literal("hours")),
        values: v.array(v.string()),
      })
    ),
    persona: v.optional(
      v.object({
        systemPrompt: v.string(),
      })
    ),

    // Workspace linking (project-level, optional)
    linkedPaths: v.optional(v.array(v.string())),
    linkedRepos: v.optional(v.array(v.string())),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_space", ["spaceId"])
    .index("by_user_space", ["userId", "spaceId"])
    .index("by_user_space_status", ["userId", "spaceId", "status"])
    .index("by_space_slug", ["spaceId", "slug"]),

  // ---------------------------------------------------------------------------
  // tasks
  // ---------------------------------------------------------------------------
  tasks: defineTable({
    userId: v.id("users"),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    number: v.optional(v.number()),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    severity: v.optional(
      v.union(v.literal("critical"), v.literal("major"), v.literal("minor"), v.literal("trivial"))
    ),
    dueDate: v.optional(v.number()),
    tags: v.array(v.string()),
    completedAt: v.optional(v.number()),

    // Linear-like fields
    statusId: v.optional(v.string()),
    labelIds: v.optional(v.array(v.string())),
    assigneeId: v.optional(v.string()),
    estimate: v.optional(v.string()),
    cycleId: v.optional(v.id("cycles")),
    changelog: v.optional(v.boolean()),
    versionId: v.optional(v.id("versions")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_priority", ["userId", "priority"])
    .index("by_user_due_date", ["userId", "dueDate"])
    .index("by_user_severity", ["userId", "severity"])
    // Space-scoped indexes
    .index("by_user_space", ["userId", "spaceId"])
    .index("by_user_space_status", ["userId", "spaceId", "status"])
    .index("by_user_space_cycle", ["userId", "spaceId", "cycleId"])
    .index("by_user_space_statusId", ["userId", "spaceId", "statusId"])
    .index("by_user_space_version", ["userId", "spaceId", "versionId"])
    // Project-scoped indexes (v0.1.0+)
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_project_status", ["userId", "projectId", "status"])
    .index("by_user_project_statusId", ["userId", "projectId", "statusId"])
    .index("by_user_project_cycle", ["userId", "projectId", "cycleId"])
    .index("by_user_project_version", ["userId", "projectId", "versionId"])
    .index("by_user_space_project", ["userId", "spaceId", "projectId"])
    // Search index
    .searchIndex("search_title_description", {
      searchField: "title",
      filterFields: ["userId", "spaceId", "projectId", "status"],
    }),

  // ---------------------------------------------------------------------------
  // issues
  // ---------------------------------------------------------------------------
  issues: defineTable({
    userId: v.id("users"),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    number: v.optional(v.number()),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    type: v.union(
      v.literal("bug"),
      v.literal("feature"),
      v.literal("improvement"),
      v.literal("task")
    ),
    severity: v.union(
      v.literal("critical"),
      v.literal("major"),
      v.literal("minor"),
      v.literal("trivial")
    ),
    dueDate: v.optional(v.number()),
    tags: v.array(v.string()),
    completedAt: v.optional(v.number()),

    // Linear-like fields
    statusId: v.optional(v.string()),
    labelIds: v.optional(v.array(v.string())),
    assigneeId: v.optional(v.string()),
    estimate: v.optional(v.string()),
    cycleId: v.optional(v.id("cycles")),
    changelog: v.optional(v.boolean()),
    versionId: v.optional(v.id("versions")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_priority", ["userId", "priority"])
    .index("by_user_type", ["userId", "type"])
    .index("by_user_severity", ["userId", "severity"])
    .index("by_user_due_date", ["userId", "dueDate"])
    // Space-scoped indexes
    .index("by_user_space", ["userId", "spaceId"])
    .index("by_user_space_status", ["userId", "spaceId", "status"])
    .index("by_user_space_cycle", ["userId", "spaceId", "cycleId"])
    .index("by_user_space_statusId", ["userId", "spaceId", "statusId"])
    .index("by_user_space_version", ["userId", "spaceId", "versionId"])
    // Project-scoped indexes (v0.1.0+)
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_project_status", ["userId", "projectId", "status"])
    .index("by_user_project_statusId", ["userId", "projectId", "statusId"])
    .index("by_user_project_cycle", ["userId", "projectId", "cycleId"])
    .index("by_user_project_version", ["userId", "projectId", "versionId"])
    .index("by_user_space_project", ["userId", "spaceId", "projectId"])
    // Search index
    .searchIndex("search_title_description", {
      searchField: "title",
      filterFields: ["userId", "spaceId", "projectId", "status"],
    }),

  // ---------------------------------------------------------------------------
  // memories
  //
  // Scope is a 3-tier hierarchy: global (no ids) -> space -> project.
  // Searches bubble up: a project-scoped search sees project + space + global;
  // a space-scoped search sees space + all its projects + global.
  // ---------------------------------------------------------------------------
  memories: defineTable({
    userId: v.id("users"),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    content: v.string(),
    summary: v.optional(v.string()),
    tags: v.array(v.string()),
    source: v.optional(v.string()),

    // Memory classification
    type: v.optional(
      v.union(
        v.literal("fact"),
        v.literal("decision"),
        v.literal("preference"),
        v.literal("context"),
        v.literal("learning")
      )
    ),
    importance: v.optional(v.number()), // 0.0-1.0

    // Vector embedding for semantic search
    embedding: v.optional(v.array(v.float64())),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_space", ["userId", "spaceId"])
    .index("by_user_project", ["userId", "projectId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "spaceId", "projectId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "spaceId", "projectId"],
    }),

  // ---------------------------------------------------------------------------
  // cycles  (spaceId required; projectId optional — cycles can run at either level)
  // ---------------------------------------------------------------------------
  cycles: defineTable({
    userId: v.id("users"),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed")),
    startDate: v.number(),
    endDate: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_space", ["userId", "spaceId"])
    .index("by_user_space_status", ["userId", "spaceId", "status"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_project_status", ["userId", "projectId", "status"]),

  // ---------------------------------------------------------------------------
  // versions
  // ---------------------------------------------------------------------------
  versions: defineTable({
    userId: v.id("users"),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("released")),
    releasedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_space", ["userId", "spaceId"])
    .index("by_user_space_status", ["userId", "spaceId", "status"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_project_status", ["userId", "projectId", "status"]),

  // ---------------------------------------------------------------------------
  // sessions
  // ---------------------------------------------------------------------------
  sessions: defineTable({
    userId: v.id("users"),
    agentId: v.string(),
    activeSpaceId: v.optional(v.id("spaces")),
    /** v0.1.0+ — cleared automatically when activeSpaceId changes */
    activeProjectId: v.optional(v.id("projects")),
    lastActiveAt: v.number(),
  }).index("by_user_agent", ["userId", "agentId"]),

  // ---------------------------------------------------------------------------
  // attachments
  // ---------------------------------------------------------------------------
  attachments: defineTable({
    userId: v.id("users"),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    description: v.optional(v.string()),
    aiDescription: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_task", ["taskId"])
    .index("by_issue", ["issueId"])
    .index("by_user_space", ["userId", "spaceId"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_storage_id", ["storageId"]),

  // ---------------------------------------------------------------------------
  // comments
  // ---------------------------------------------------------------------------
  comments: defineTable({
    userId: v.id("users"),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
    spaceId: v.optional(v.id("spaces")),
    projectId: v.optional(v.id("projects")),
    parentId: v.optional(v.id("comments")),
    body: v.string(),
    authorName: v.optional(v.string()),
    authorType: v.optional(v.union(v.literal("user"), v.literal("agent"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_issue", ["issueId"])
    .index("by_user", ["userId"])
    .index("by_parent", ["parentId"])
    .index("by_user_space", ["userId", "spaceId"]),

  // ---------------------------------------------------------------------------
  // usage
  // ---------------------------------------------------------------------------
  usage: defineTable({
    userId: v.id("users"),
    period: v.string(),
    taskCount: v.optional(v.number()),
    memoryCount: v.number(),
    spaceCount: v.optional(v.number()),
    /** Total projects across all spaces (v0.1.0+) */
    projectCount: v.optional(v.number()),
    issueCount: v.number(),
    attachmentCount: v.optional(v.number()),
    apiCalls: v.number(),
  }).index("by_user_period", ["userId", "period"]),

  // ---------------------------------------------------------------------------
  // agentSessions
  // ---------------------------------------------------------------------------
  agentSessions: defineTable({
    userId: v.id("users"),
    sessionId: v.string(),
    clientId: v.string(),
    clientName: v.optional(v.string()),
    /** Unique per OAuth authorization — stable across reconnections and token refreshes */
    agentId: v.optional(v.string()),
    status: v.union(v.literal("connected"), v.literal("disconnected"), v.literal("expired")),
    connectedAt: v.number(),
    lastActivityAt: v.number(),
    disconnectedAt: v.optional(v.number()),
    toolCallCount: v.number(),
    lastTool: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_session_id", ["sessionId"])
    .index("by_agent_id", ["agentId"])
    .index("by_last_activity", ["lastActivityAt"]),

  // ---------------------------------------------------------------------------
  // oauthClients
  // ---------------------------------------------------------------------------
  oauthClients: defineTable({
    clientId: v.string(),
    clientData: v.string(), // JSON-serialized OAuthClientInformationFull
    createdAt: v.number(),
  }).index("by_client_id", ["clientId"]),

  // ---------------------------------------------------------------------------
  // mcpLogs
  // ---------------------------------------------------------------------------
  mcpLogs: defineTable({
    userId: v.id("users"),
    tool: v.string(),
    args: v.optional(v.any()),
    status: v.union(v.literal("ok"), v.literal("error")),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    durationMs: v.number(),
    spaceId: v.optional(v.string()),
    projectId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_space", ["userId", "spaceId"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_created", ["createdAt"]),
})
