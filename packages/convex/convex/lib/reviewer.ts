/**
 * Reviewer prompt + Anthropic API call (R4).
 *
 * Single "general" lens for now. R4.5 will add specialized lenses
 * (security, accessibility, performance, etc.) that all share this same
 * structured-output schema.
 */

declare const process: { env: Record<string, string | undefined> }
declare function fetch(
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
): Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>

export type ReviewStage = "plan" | "code" | "ad_hoc"

export type Verdict =
  | "approve"
  | "approve_with_suggestions"
  | "needs_revision"
  | "blocker"
  | "error"

export type Severity = "critical" | "major" | "minor" | "suggestion"

export interface Finding {
  category: string
  severity: Severity
  title: string
  description: string
  location?: string
}

export interface ReviewResult {
  verdict: Verdict
  summary: string
  findings: Finding[]
}

const SYSTEM_PROMPT = `You are a senior software engineer running a structured review pass on a peer's plan or code change. You return a single JSON object with: verdict, summary, findings[].

You are skeptical and concrete. Bias toward letting work move forward unless you see a real defect. A good reviewer surfaces real risks; a bad reviewer pads findings to look thorough.

VERDICT (pick exactly one):
- "approve" — no blocking issues, no suggestions worth raising.
- "approve_with_suggestions" — no blockers, but one or more minor/suggestion findings.
- "needs_revision" — major findings that should be addressed before this lands. Not blocking, but the reviewer would push back in a real PR.
- "blocker" — a critical issue that must be fixed. Reserve for real safety/correctness/security defects.
- "error" — the reviewer was unable to evaluate (use only when the artifact is missing or malformed).

SEVERITY:
- critical: data loss, security defect, broken contract, infinite loop, dropped error, wrong-by-default.
- major: real bug, missing test for a risky path, misleading API, scalability issue.
- minor: code-smell with measurable cost, naming that will mislead, narrow edge case.
- suggestion: optional improvement, style, alt approach.

FINDING FIELDS:
- category: short stable token (e.g. "correctness", "security", "performance", "api", "tests", "naming", "error-handling").
- title: one sentence, specific.
- description: one paragraph max. Cite the relevant code/plan section.
- location: optional file path (and line if known) within the artifact, or a plan section heading.

Return ONLY valid JSON, no prose, no markdown fences.`

interface ReviewerOptions {
  stage: ReviewStage
  artifact: string
  context?: string
  reviewerModel: string
  apiKey: string
  baseUrl?: string
}

/**
 * Call Anthropic's Messages API and parse the structured verdict.
 * Throws on transport / auth failures; returns verdict="error" on
 * parse failures so the caller can store the row and surface a useful
 * message to the agent.
 */
export async function runReview(opts: ReviewerOptions): Promise<ReviewResult> {
  const baseUrl = opts.baseUrl ?? "https://api.anthropic.com"
  const stageLabel =
    opts.stage === "plan" ? "implementation plan" : opts.stage === "code" ? "code diff" : "artifact"

  const userMessage = [
    `Review the following ${stageLabel}.`,
    "",
    opts.context ? `## Reviewer context\n\n${opts.context}\n` : null,
    `## Artifact (${stageLabel})`,
    "",
    opts.artifact.slice(0, 200_000), // hard cap — Anthropic limit + cost guard
  ]
    .filter(Boolean)
    .join("\n")

  const body = {
    model: opts.reviewerModel,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  }

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": opts.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Reviewer API error (${response.status}): ${text}`)
  }

  const json = (await response.json()) as {
    content: Array<{ type: string; text?: string }>
  }

  const textBlock = json.content.find((c) => c.type === "text")?.text ?? ""
  return parseReviewResult(textBlock)
}

function parseReviewResult(raw: string): ReviewResult {
  const trimmed = raw.trim()
  // Strip ```json fences if the model added them anyway.
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(stripped)
  } catch {
    return {
      verdict: "error",
      summary: `Reviewer returned non-JSON output: ${trimmed.slice(0, 500)}`,
      findings: [],
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return { verdict: "error", summary: "Reviewer output was not an object.", findings: [] }
  }

  const obj = parsed as Record<string, unknown>
  const verdict = normalizeVerdict(obj.verdict)
  const summary = typeof obj.summary === "string" ? obj.summary : ""
  const findings = Array.isArray(obj.findings)
    ? obj.findings.map(normalizeFinding).filter((f): f is Finding => f !== null)
    : []

  return { verdict, summary, findings }
}

function normalizeVerdict(input: unknown): Verdict {
  const allowed: Verdict[] = [
    "approve",
    "approve_with_suggestions",
    "needs_revision",
    "blocker",
    "error",
  ]
  if (typeof input === "string" && allowed.includes(input as Verdict)) {
    return input as Verdict
  }
  return "needs_revision"
}

function normalizeFinding(input: unknown): Finding | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>
  const sevAllowed: Severity[] = ["critical", "major", "minor", "suggestion"]
  const severity =
    typeof obj.severity === "string" && sevAllowed.includes(obj.severity as Severity)
      ? (obj.severity as Severity)
      : "minor"
  return {
    category: typeof obj.category === "string" ? obj.category : "general",
    severity,
    title: typeof obj.title === "string" ? obj.title : "(untitled finding)",
    description: typeof obj.description === "string" ? obj.description : "",
    location: typeof obj.location === "string" ? obj.location : undefined,
  }
}

/** Read the reviewer API key + default model from process.env. */
export function getReviewerConfig(): {
  apiKey: string | undefined
  defaultModel: string
  baseUrl: string | undefined
} {
  return {
    apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.REVIEWER_API_KEY,
    defaultModel: process.env.REVIEWER_MODEL ?? "claude-sonnet-4-6",
    baseUrl: process.env.REVIEWER_BASE_URL,
  }
}
