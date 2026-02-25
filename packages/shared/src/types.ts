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

/** Lifecycle status of a project */
export type ProjectLifecycle = "active" | "paused" | "completed" | "archived"


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


/** A custom workflow status within a project */
export interface WorkflowStatus {
  id: string
  name: string
  category: StatusCategory
  color: string
  position: number
}

/** A colored label for categorizing tasks */
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

/** Task as returned from Convex */
export interface Task {
  _id: string
  userId: string
  projectId?: string
  number?: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
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

/** File attachment linked to a task or issue */
export interface Attachment {
  _id: string
  userId: string
  taskId?: string
  issueId?: string
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
  projectId?: string
  parentId?: string
  body: string
  authorName?: string
  authorType?: "user" | "agent"
  createdAt: number
  updatedAt: number
}

/** Project as returned from Convex */
export interface Project {
  _id: string
  userId: string
  name: string
  slug: string
  description?: string
  status: ProjectLifecycle
  taskCounter: number
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
  taskCount: number
  memoryCount: number
  projectCount: number
  issueCount: number
  apiCalls: number
}

/** Project with stats (from list_projects with includeStats) */
export interface ProjectWithStats extends Project {
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
  activeProject: Project | null
  taskSummary: {
    pending: number
    inProgress: number
    topPending: Task[]
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
