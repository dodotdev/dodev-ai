import type { EstimateScale, PlanTier, StatusCategory } from "./types.js"

/** API key prefix for dodev.ai keys */
export const API_KEY_PREFIX = "dodev_sk_"

/** API key length (excluding prefix) */
export const API_KEY_LENGTH = 32

/** Plan limits per tier. `projectsPerSpace` is introduced in v0.1.0. */
export const PLAN_LIMITS: Record<
  PlanTier,
  {
    tasks: number
    memories: number
    spaces: number
    projectsPerSpace: number
    issues: number
    attachments: number
  }
> = {
  free: {
    tasks: 100,
    memories: 50,
    spaces: 1,
    projectsPerSpace: 3,
    issues: 200,
    attachments: 50,
  },
  pro: {
    tasks: Infinity,
    memories: Infinity,
    spaces: 3,
    projectsPerSpace: 10,
    issues: Infinity,
    attachments: Infinity,
  },
  team: {
    tasks: Infinity,
    memories: Infinity,
    spaces: 5,
    projectsPerSpace: 10,
    issues: Infinity,
    attachments: Infinity,
  },
  enterprise: {
    tasks: Infinity,
    memories: Infinity,
    spaces: Infinity,
    projectsPerSpace: Infinity,
    issues: Infinity,
    attachments: Infinity,
  },
}

/** Rate limits per plan (requests per minute) */
export const RATE_LIMITS: Record<PlanTier, { windowMs: number; maxRequests: number }> = {
  free: { windowMs: 60_000, maxRequests: 60 },
  pro: { windowMs: 60_000, maxRequests: 600 },
  team: { windowMs: 60_000, maxRequests: 2000 },
  enterprise: { windowMs: 60_000, maxRequests: 10_000 },
}

/** Validation limits */
export const VALIDATION = {
  /** Maximum length for task titles */
  MAX_TITLE_LENGTH: 200,
  /** Maximum length for task/space descriptions */
  MAX_DESCRIPTION_LENGTH: 5000,
  /** Maximum length for memory content */
  MAX_MEMORY_CONTENT_LENGTH: 10_000,
  /** Maximum length for space names */
  MAX_SPACE_NAME_LENGTH: 100,
  /** Maximum number of tags per item */
  MAX_TAGS: 20,
  /** Maximum length for a single tag */
  MAX_TAG_LENGTH: 50,
  /** Maximum results per query */
  MAX_QUERY_LIMIT: 100,
  /** Default results per query */
  DEFAULT_QUERY_LIMIT: 20,
  /** Default memory search limit */
  DEFAULT_MEMORY_SEARCH_LIMIT: 10,
  /** Maximum memory search limit */
  MAX_MEMORY_SEARCH_LIMIT: 50,
  /** Maximum attachment file size in bytes (10 MB) */
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024,
  /** Maximum number of attachments per task or issue */
  MAX_ATTACHMENTS_PER_ITEM: 20,
  /** Maximum length for attachment filenames */
  MAX_ATTACHMENT_FILENAME: 255,
} as const

/** Default workflow statuses for new spaces */
export const DEFAULT_STATUSES: {
  name: string
  category: StatusCategory
  color: string
  position: number
}[] = [
  { name: "Backlog", category: "pending", color: "#6b7280", position: 0 },
  { name: "Task", category: "pending", color: "#f59e0b", position: 1 },
  { name: "In Progress", category: "in_progress", color: "#3b82f6", position: 2 },
  { name: "In Review", category: "in_progress", color: "#8b5cf6", position: 3 },
  { name: "Done", category: "completed", color: "#10b981", position: 4 },
  { name: "Cancelled", category: "cancelled", color: "#ef4444", position: 5 },
]

/** Default estimate scale for new spaces */
export const DEFAULT_ESTIMATE_SCALE: EstimateScale = {
  type: "points",
  values: ["1", "2", "3", "5", "8", "13", "21"],
}

/** Configuration limits */
export const CONFIG_LIMITS = {
  MAX_STATUSES: 20,
  MAX_LABELS: 50,
  MAX_MEMBERS: 50,
  MAX_STATUS_NAME: 40,
  MAX_LABEL_NAME: 40,
  MAX_MEMBER_NAME: 100,
  MAX_PERSONA_LENGTH: 10_000,
  MAX_CYCLE_NAME: 100,
} as const

/** MCP server default port for HTTP transport */
export const DEFAULT_HTTP_PORT = 3100

/** Error codes */
export const ERROR_CODES = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const
