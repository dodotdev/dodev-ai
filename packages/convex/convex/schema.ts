import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
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
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("team")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),

    // Settings
    settings: v.object({
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

    // Global item counter (shared across all tasks, issues, projects)
    itemCounter: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workos_id", ["workosUserId"])
    .index("by_email", ["email"])
    .index("by_api_key_hash", ["apiKeyHash"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  projects: defineTable({
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

    // Project config
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

  tasks: defineTable({
    userId: v.id("users"),
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
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_project_status", ["userId", "projectId", "status"])
    .index("by_user_priority", ["userId", "priority"])
    .index("by_user_due_date", ["userId", "dueDate"])
    .index("by_user_severity", ["userId", "severity"])
    .index("by_user_project_cycle", ["userId", "projectId", "cycleId"])
    .index("by_user_project_statusId", ["userId", "projectId", "statusId"])
    .index("by_user_project_version", ["userId", "projectId", "versionId"])
    .searchIndex("search_title_description", {
      searchField: "title",
      filterFields: ["userId", "projectId", "status"],
    }),

  issues: defineTable({
    userId: v.id("users"),
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
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_project_status", ["userId", "projectId", "status"])
    .index("by_user_priority", ["userId", "priority"])
    .index("by_user_type", ["userId", "type"])
    .index("by_user_severity", ["userId", "severity"])
    .index("by_user_due_date", ["userId", "dueDate"])
    .index("by_user_project_cycle", ["userId", "projectId", "cycleId"])
    .index("by_user_project_statusId", ["userId", "projectId", "statusId"])
    .index("by_user_project_version", ["userId", "projectId", "versionId"])
    .searchIndex("search_title_description", {
      searchField: "title",
      filterFields: ["userId", "projectId", "status"],
    }),

  memories: defineTable({
    userId: v.id("users"),
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
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_created", ["userId", "createdAt"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId", "projectId"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId", "projectId"],
    }),

  cycles: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed")),
    startDate: v.number(),
    endDate: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_project_status", ["userId", "projectId", "status"]),

  versions: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("released")),
    releasedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_project", ["userId", "projectId"])
    .index("by_user_project_status", ["userId", "projectId", "status"]),

  sessions: defineTable({
    userId: v.id("users"),
    agentId: v.string(),
    activeProjectId: v.optional(v.id("projects")),
    lastActiveAt: v.number(),
  }).index("by_user_agent", ["userId", "agentId"]),

  attachments: defineTable({
    userId: v.id("users"),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
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
    .index("by_user_project", ["userId", "projectId"])
    .index("by_storage_id", ["storageId"]),

  comments: defineTable({
    userId: v.id("users"),
    taskId: v.optional(v.id("tasks")),
    issueId: v.optional(v.id("issues")),
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
    .index("by_parent", ["parentId"]),

  usage: defineTable({
    userId: v.id("users"),
    period: v.string(),
    taskCount: v.optional(v.number()),
    memoryCount: v.number(),
    projectCount: v.number(),
    issueCount: v.number(),
    attachmentCount: v.optional(v.number()),
    apiCalls: v.number(),
  }).index("by_user_period", ["userId", "period"]),

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

  oauthClients: defineTable({
    clientId: v.string(),
    clientData: v.string(), // JSON-serialized OAuthClientInformationFull
    createdAt: v.number(),
  }).index("by_client_id", ["clientId"]),

  mcpLogs: defineTable({
    userId: v.id("users"),
    tool: v.string(),
    args: v.optional(v.any()),
    status: v.union(v.literal("ok"), v.literal("error")),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    durationMs: v.number(),
    projectId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_project", ["userId", "projectId"])
    .index("by_created", ["createdAt"]),
})
