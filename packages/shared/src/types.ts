/** Status of a todo item (base category — always derived from workflow status) */
export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled"

/** Alias for TodoStatus, used in workflow status definitions */
export type StatusCategory = TodoStatus

/** Priority levels for todos */
export type TodoPriority = "low" | "medium" | "high" | "urgent"

/** Severity levels (shared by todos and issues) */
export type Severity = "critical" | "major" | "minor" | "trivial"

/** Issue type categories */
export type IssueType = "bug" | "feature" | "improvement" | "task"

/** Lifecycle status of a project */
export type ProjectLifecycle = "active" | "paused" | "completed" | "archived"

/** @deprecated Use ProjectLifecycle instead */
export type ProjectStatus = ProjectLifecycle

/** Subscription plan tiers */
export type PlanTier = "free" | "pro" | "team"

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

/** Project-level memory settings */
export interface ProjectMemorySettings {
  autoCapture?: boolean
  defaultTags?: string[]
  memoryInstructions?: string
}

/** API key prefix */
export const API_KEY_PREFIX = "domcp_sk_"

/** A custom workflow status within a project */
export interface WorkflowStatus {
  id: string
  name: string
  category: StatusCategory
  color: string
  position: number
}

/** A colored label for categorizing todos */
export interface ProjectLabel {
  id: string
  name: string
  color: string
}

/** A member within a project */
export interface ProjectMember {
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

/** AI persona configuration for a project */
export interface ProjectPersona {
  systemPrompt: string
}

/** Full project configuration (embedded on project document) */
export interface ProjectConfig {
  statuses: WorkflowStatus[]
  labels: ProjectLabel[]
  members: ProjectMember[]
  estimateScale: EstimateScale
  persona?: ProjectPersona
}

/** Cycle status */
export type CycleStatus = "upcoming" | "active" | "completed"

/** A sprint/iteration cycle */
export interface Cycle {
  _id: string
  userId: string
  projectId: string
  name: string
  description?: string
  status: CycleStatus
  startDate: number
  endDate: number
  createdAt: number
  updatedAt: number
}

/** Todo as returned from Convex */
export interface Todo {
  _id: string
  userId: string
  projectId?: string
  number?: number
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
  severity?: Severity
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
  projectId?: string
  number?: number
  title: string
  description?: string
  status: TodoStatus
  priority: TodoPriority
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

/** Memory as returned from Convex */
export interface Memory {
  _id: string
  userId: string
  projectId?: string
  content: string
  summary?: string
  tags: string[]
  source?: MemorySource
  type?: MemoryType
  importance?: number
  embedding?: number[]
  createdAt: number
  updatedAt: number
}

/** Project as returned from Convex */
export interface Project {
  _id: string
  userId: string
  name: string
  stub: string
  description?: string
  status: ProjectLifecycle
  todoCounter: number
  issueCounter: number
  metadata?: Record<string, unknown>
  statuses: WorkflowStatus[]
  labels: ProjectLabel[]
  members: ProjectMember[]
  estimateScale: EstimateScale
  persona?: ProjectPersona
  linkedPaths?: string[]
  linkedRepos?: string[]
  memorySettings?: ProjectMemorySettings
  createdAt: number
  updatedAt: number
}

/** User settings */
export interface UserSettings {
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

/** Session state for active project tracking */
export interface Session {
  _id: string
  userId: string
  agentId: string
  activeProjectId?: string
  lastActiveAt: number
}

/** Usage tracking for quotas */
export interface Usage {
  _id: string
  userId: string
  period: string
  todoCount: number
  memoryCount: number
  projectCount: number
  issueCount: number
  apiCalls: number
}

/** Project with stats (from list_projects with includeStats) */
export interface ProjectWithStats extends Project {
  stats: {
    totalTodos: number
    pendingTodos: number
    inProgressTodos: number
    completedTodos: number
    memoryCount: number
  }
}

/** Context response from get_context */
export interface ContextResponse {
  activeProject: Project | null
  todoSummary: {
    pending: number
    inProgress: number
    topPending: Todo[]
  }
  recentMemories: Memory[]
  memories?: {
    project: Memory[]
    global: Memory[]
  }
  projects: Array<{ id: string; name: string }>
  persona?: ProjectPersona
  projectConfig?: ProjectConfig
  activeCycle?: Cycle
  memorySettings?: ProjectMemorySettings
  workspace?: {
    detectedPath?: string
    detectedRepo?: string
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
