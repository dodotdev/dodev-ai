/** Status of a task item (base category — always derived from workflow status) */
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled"

/** Alias for TaskStatus, used in workflow status definitions */
export type StatusCategory = TaskStatus

/** Priority levels for tasks */
export type TaskPriority = "low" | "medium" | "high" | "urgent"

/** Severity levels (shared by tasks and issues) */
export type Severity = "critical" | "major" | "minor" | "trivial"

/** Issue type categories */
export type IssueType = "bug" | "feature" | "improvement" | "task"

/** Lifecycle status of a space */
export type SpaceLifecycle = "active" | "paused" | "completed" | "archived"

/** Subscription plan tiers */
export type PlanTier = "free" | "pro" | "team" | "enterprise"

/** Source of a memory (which AI agent created it) */
export type MemorySource = string

/** Memory type classification */
export type MemoryType = "fact" | "decision" | "preference" | "context" | "learning"

/** Search mode for memory queries */
export type MemorySearchMode = "keyword" | "semantic" | "hybrid"

/** User-level memory settings */
export interface UserMemorySettings {
  autoCapture?: boolean
  embeddingProvider?: string
  embeddingModel?: string
  embeddingBaseUrl?: string
  embeddingApiKey?: string
}

/** Space-level memory settings */
export interface SpaceMemorySettings {
  autoCapture?: boolean
  defaultTags?: string[]
  memoryInstructions?: string
}

/** A custom workflow status within a space */
export interface WorkflowStatus {
  id: string
  name: string
  category: StatusCategory
  color: string
  position: number
}

/** A colored label for categorizing tasks */
export interface SpaceLabel {
  id: string
  name: string
  color: string
}

/** A member within a space */
export interface SpaceMember {
  id: string
  name: string
  role: string
  avatarUrl?: string
}

/** Estimate scale type */
export type EstimateScaleType = "points" | "tshirt" | "hours"

/** Estimate scale configuration */
export interface EstimateScale {
  type: EstimateScaleType
  values: string[]
}

/** AI persona configuration for a space */
export interface SpacePersona {
  systemPrompt: string
}

/** Full space configuration (embedded on space document) */
export interface SpaceConfig {
  statuses: WorkflowStatus[]
  labels: SpaceLabel[]
  members: SpaceMember[]
  estimateScale: EstimateScale
  persona?: SpacePersona
}

/** Cycle status */
export type CycleStatus = "upcoming" | "active" | "completed"

/** A sprint/iteration cycle */
export interface Cycle {
  _id: string
  userId: string
  spaceId: string
  /** Optional: cycles can run at space level or inside a single project */
  projectId?: string
  name: string
  description?: string
  status: CycleStatus
  startDate: number
  endDate: number
  createdAt: number
  updatedAt: number
}

/**
 * Project inside a space — a filter scope for segregating items within a
 * space. Tasks, issues, and memories tagged with a `projectId` keep
 * {SPACE}-{N} slugs and inherit all workflow config from the parent space.
 */
export interface Project {
  _id: string
  userId: string
  spaceId: string
  name: string
  slug: string
  description?: string
  status: SpaceLifecycle
  metadata?: Record<string, unknown>
  linkedPaths?: string[]
  linkedRepos?: string[]
  createdAt: number
  updatedAt: number
}

/** Task as returned from Convex */
export interface Task {
  _id: string
  userId: string
  spaceId?: string
  projectId?: string
  number?: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: number
  tags: string[]
  completedAt?: number
  statusId?: string
  labelIds?: string[]
  assigneeId?: string
  estimate?: string
  cycleId?: string
  createdAt: number
  updatedAt: number
}

/** Issue as returned from Convex */
export interface Issue {
  _id: string
  userId: string
  spaceId?: string
  projectId?: string
  number?: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  type: IssueType
  severity: Severity
  dueDate?: number
  tags: string[]
  completedAt?: number
  statusId?: string
  labelIds?: string[]
  assigneeId?: string
  estimate?: string
  cycleId?: string
  createdAt: number
  updatedAt: number
}

/** Lifecycle status for a memory (R1: curation). */
export type MemoryLifecycleStatus = "active" | "deprecated"

/** Memory as returned from Convex */
export interface Memory {
  _id: string
  userId: string
  spaceId?: string
  projectId?: string
  content: string
  summary?: string
  tags: string[]
  source?: MemorySource
  type?: MemoryType
  importance?: number
  /** Times this memory has been reinforced (R1). 0 if never. */
  reinforcements?: number
  /** Memory ID this one replaces. Lifecycle: supersedes -> deprecated. */
  supersedes?: string
  /** When the memory was last reinforced or otherwise validated. */
  lastValidatedAt?: number
  lifecycleStatus?: MemoryLifecycleStatus
  /** Manual override for digest ordering. Higher = surfaces sooner. */
  digestRank?: number
  embedding?: number[]
  createdAt: number
  updatedAt: number
}

/** Trigger that produced a snapshot (R2). */
export type SnapshotTrigger = "manual" | "pre_compact" | "session_end"

/** Frozen state of a scope at a point in time (R2). */
export interface Snapshot {
  _id: string
  userId: string
  spaceId?: string
  projectId?: string
  createdAt: number
  gitHead?: string
  trigger?: SnapshotTrigger
  latestHandoverId?: string
  counts: {
    tasks: {
      total: number
      pending: number
      inProgress: number
      completed: number
      cancelled: number
    }
    issues: {
      total: number
      pending: number
      inProgress: number
      completed: number
      cancelled: number
      critical: number
      major: number
      minor: number
      trivial: number
    }
    memories: {
      total: number
      active: number
      deprecated: number
    }
  }
  taskStatuses: Array<{
    id: string
    statusId?: string
    status: string
    title: string
  }>
  issueStatuses: Array<{
    id: string
    statusId?: string
    status: string
    severity: string
    title: string
  }>
}

/** A single diff entry in a recap result. */
export interface RecapDiffEntry {
  id: string
  title: string
  from?: string
  to?: string
}

/** Result of recap() — what changed since the last snapshot (R2). */
export interface Recap {
  hasBaseline: boolean
  baselineSnapshotId: string | null
  baselineCreatedAt: number | null
  baselineGitHead: string | null
  currentGitHead: string | null
  scope: { spaceId?: string; projectId?: string }
  tasks: {
    added: RecapDiffEntry[]
    removed: RecapDiffEntry[]
    statusChanged: RecapDiffEntry[]
  }
  issues: {
    added: RecapDiffEntry[]
    resolved: RecapDiffEntry[]
    statusChanged: RecapDiffEntry[]
    severityChanged: RecapDiffEntry[]
  }
  memories: {
    addedCount: number
    deprecatedCount: number
  }
  debt: {
    previousOpenIssues: number
    currentOpenIssues: number
    delta: number
    growthRatio: number
  }
  markdown: string
}

/** Append-only narrative session document (R3 schema, lands in R2). */
export interface Handover {
  _id: string
  userId: string
  spaceId?: string
  projectId?: string
  title: string
  slug?: string
  author?: string
  tldr: string
  markdown: string
  decisions?: string[]
  blockers?: string[]
  nextSteps?: string[]
  referencedTaskIds?: string[]
  referencedIssueIds?: string[]
  gitHead?: string
  createdAt: number
}

/** Compact digest entry for prompt injection (R1). */
export interface MemoryDigestEntry {
  _id: string
  content: string
  summary?: string
  tags: string[]
  type?: MemoryType
  reinforcements: number
  lastValidatedAt: number
  lifecycleStatus: MemoryLifecycleStatus
  digestRank?: number
  spaceId?: string
  projectId?: string
  /** Computed score used for ranking. Higher = more relevant. */
  score: number
}

/** File attachment linked to a task or issue */
export interface Attachment {
  _id: string
  userId: string
  taskId?: string
  issueId?: string
  spaceId?: string
  projectId?: string
  storageId: string
  filename: string
  mimeType: string
  size: number
  description?: string
  aiDescription?: string
  url?: string
  createdAt: number
}

/** Comment on a task or issue */
export interface Comment {
  _id: string
  userId: string
  taskId?: string
  issueId?: string
  spaceId?: string
  projectId?: string
  parentId?: string
  body: string
  authorName?: string
  authorType?: "user" | "agent"
  createdAt: number
  updatedAt: number
}

/** Space as returned from Convex */
export interface Space {
  _id: string
  userId: string
  name: string
  slug: string
  description?: string
  status: SpaceLifecycle
  taskCounter: number
  issueCounter: number
  metadata?: Record<string, unknown>
  statuses: WorkflowStatus[]
  labels: SpaceLabel[]
  members: SpaceMember[]
  estimateScale: EstimateScale
  persona?: SpacePersona
  linkedPaths?: string[]
  linkedRepos?: string[]
  memorySettings?: SpaceMemorySettings
  createdAt: number
  updatedAt: number
}

/** User settings */
export interface UserSettings {
  defaultSpaceId?: string
  /** Preferred project within the default space (v0.1.0+) */
  defaultProjectId?: string
  timezone?: string
}

/** User as returned from Convex */
export interface User {
  _id: string
  workosUserId: string
  email: string
  name?: string
  apiKey: string
  apiKeyHash: string
  plan: PlanTier
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  settings: UserSettings
  memorySettings?: UserMemorySettings
  itemCounter?: number
  createdAt: number
  updatedAt: number
}

/** Session state for active space / project tracking */
export interface Session {
  _id: string
  userId: string
  agentId: string
  activeSpaceId?: string
  /** Active project within activeSpaceId (v0.1.0+). Always cleared when activeSpaceId changes. */
  activeProjectId?: string
  lastActiveAt: number
}

/** Usage tracking for quotas */
export interface Usage {
  _id: string
  userId: string
  period: string
  taskCount: number
  memoryCount: number
  spaceCount: number
  /** Total projects across all spaces (v0.1.0+) */
  projectCount?: number
  issueCount: number
  apiCalls: number
}

/** Space with stats (from list_spaces with includeStats) */
export interface SpaceWithStats extends Space {
  stats: {
    totalTasks: number
    pendingTasks: number
    inProgressTasks: number
    completedTasks: number
    memoryCount: number
  }
}

/** Context response from get_context */
export interface ContextResponse {
  activeSpace: Space | null
  /**
   * Minimal active-project reference (filter scope). Workflow config still
   * comes from activeSpace — projects don't have their own statuses/labels/
   * members/estimates/persona.
   */
  activeProject?: {
    _id: string
    name: string
    slug: string
    description?: string
    status: SpaceLifecycle
  } | null
  taskSummary: {
    pending: number
    inProgress: number
    topPending: Task[]
  }
  recentMemories: Memory[]
  memories?: {
    project?: Memory[]
    space: Memory[]
    global: Memory[]
  }
  spaces: Array<{ id: string; name: string }>
  /** Projects inside activeSpace */
  projects?: Array<{ id: string; name: string; slug: string }>
  persona?: SpacePersona
  spaceConfig?: SpaceConfig
  activeCycle?: Cycle
  memorySettings?: SpaceMemorySettings
  workspace?: {
    detectedPath?: string
    detectedRepo?: string
    resolvedSpaceId?: string
    resolvedProjectId?: string
  }
}

/** Standard error response */
export interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
  }
}

/** Error codes */
export type ErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "INTERNAL_ERROR"
