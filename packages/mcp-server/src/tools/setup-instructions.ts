interface ProjectInfo {
  projectName: string
  projectStub: string
  projectId: string
}

/**
 * Generate a CLAUDE.md section with dodev.ai usage instructions.
 * Pure helper — no Convex calls.
 */
export function generateSetupInstructions(project?: ProjectInfo): string {
  const projectSection = project
    ? `### Project Context
- The active dodev.ai project is **"${project.projectName}"** (stub: ${project.projectStub}, ID: \`${project.projectId}\`).
- Always scope todos, issues, and memories to this project using the \`projectId\` parameter.`
    : `### Project Context
- No project is linked to this workspace yet. Create one with \`create_project\` and link it with \`link_project\`.`

  return `## dodev.ai Usage (MANDATORY)

This project has a connected dodev.ai MCP server. You MUST use it proactively:

### Session Start
- **Always** call \`get_context\` at the beginning of every session to load the active project, pending todos, recent memories, and project config.
- **Always** call \`search_memories\` before starting any non-trivial task to check for relevant past decisions, gotchas, and preferences.

### During Work
- **Store memories** proactively via \`add_memory\` whenever you discover facts about the codebase, make architectural decisions, learn user preferences, encounter non-obvious behavior, or resolve tricky bugs. Write each memory so a future agent with no context can understand it.
- **Create todos** via \`create_todo\` for follow-up work, known issues, or tasks you can't complete right now.
- **Create issues** via \`create_issue\` for bugs found during development.
- **Update todos/issues** as you work — mark them \`in_progress\` when starting. Use \`complete_todo\` or \`close_issue\` when done.

### Workspace Linking
- If \`get_context\` returns no active project, use \`link_project\` to associate this workspace (path and/or git remote) with a project. Once linked, the project auto-resolves on every future \`get_context\` call.
- Use \`unlink_project\` to remove a workspace association.
- Call \`get_setup_instructions\` to regenerate this CLAUDE.md section with up-to-date project context.

### Memory Best Practices
- Use type: \`"fact"\` for codebase/infrastructure facts, \`"decision"\` for architectural choices, \`"preference"\` for user conventions, \`"learning"\` for gotchas and lessons learned.
- Tag memories consistently with lowercase tags (e.g. \`debugging\`, \`architecture\`, \`build\`, \`gotcha\`).
- Prefer many small focused memories over fewer large ones.
- Update existing memories rather than creating duplicates.
- Use \`update_memory_settings\` to configure default tags, memory instructions, or embedding provider settings.

### Cycles & Project Config
- Use \`create_cycle\` / \`update_cycle\` to manage sprints and iterations.
- Customize workflow with \`update_project_statuses\`, \`add_project_label\`, \`add_project_member\`, \`update_estimate_scale\`, and \`update_project_persona\`.

### Available Tools Reference
**Context:** \`get_context\`, \`get_setup_instructions\`
**Todos:** \`create_todo\`, \`update_todo\`, \`complete_todo\`, \`list_todos\`, \`get_todo\`, \`delete_todo\`
**Issues:** \`create_issue\`, \`update_issue\`, \`close_issue\`, \`list_issues\`, \`get_issue\`, \`delete_issue\`
**Memories:** \`add_memory\`, \`search_memories\`, \`list_memories\`, \`update_memory\`, \`delete_memory\`
**Projects:** \`create_project\`, \`list_projects\`, \`get_project\`, \`update_project\`, \`archive_project\`, \`set_active_project\`
**Linking:** \`link_project\`, \`unlink_project\`, \`update_memory_settings\`
**Cycles:** \`create_cycle\`, \`list_cycles\`, \`get_cycle\`, \`update_cycle\`, \`delete_cycle\`
**Config:** \`update_project_statuses\`, \`add_project_label\`, \`remove_project_label\`, \`add_project_member\`, \`remove_project_member\`, \`update_estimate_scale\`, \`update_project_persona\`

${projectSection}`
}
