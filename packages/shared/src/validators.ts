import { VALIDATION } from "./constants.js"

/** Validate a task title */
export function validateTitle(title: string): string | null {
  if (!title || title.trim().length === 0) {
    return "Title is required"
  }
  if (title.length > VALIDATION.MAX_TITLE_LENGTH) {
    return `Title must be ${VALIDATION.MAX_TITLE_LENGTH} characters or less`
  }
  return null
}

/** Validate a description */
export function validateDescription(description: string): string | null {
  if (description.length > VALIDATION.MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${VALIDATION.MAX_DESCRIPTION_LENGTH} characters or less`
  }
  return null
}

/** Validate memory content */
export function validateMemoryContent(content: string): string | null {
  if (!content || content.trim().length === 0) {
    return "Content is required"
  }
  if (content.length > VALIDATION.MAX_MEMORY_CONTENT_LENGTH) {
    return `Content must be ${VALIDATION.MAX_MEMORY_CONTENT_LENGTH} characters or less`
  }
  return null
}

/** Validate a project name */
export function validateProjectName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Project name is required"
  }
  if (name.length > VALIDATION.MAX_PROJECT_NAME_LENGTH) {
    return `Project name must be ${VALIDATION.MAX_PROJECT_NAME_LENGTH} characters or less`
  }
  return null
}

/** Validate tags array */
export function validateTags(tags: string[]): string | null {
  if (tags.length > VALIDATION.MAX_TAGS) {
    return `Maximum ${VALIDATION.MAX_TAGS} tags allowed`
  }
  for (const tag of tags) {
    if (tag.length > VALIDATION.MAX_TAG_LENGTH) {
      return `Tag "${tag}" exceeds ${VALIDATION.MAX_TAG_LENGTH} characters`
    }
    if (tag.trim().length === 0) {
      return "Empty tags are not allowed"
    }
  }
  return null
}

/** Validate a query limit */
export function validateLimit(limit: number, max = VALIDATION.MAX_QUERY_LIMIT): number {
  return Math.max(1, Math.min(limit, max))
}
