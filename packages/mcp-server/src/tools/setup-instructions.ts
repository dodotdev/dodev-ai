interface SpaceInfo {
  spaceName: string
  spaceSlug: string
  spaceId: string
}

/**
 * Generate a CLAUDE.md section with dodev.ai usage instructions.
 * Pure helper — no Convex calls.
 */
export function generateSetupInstructions(space?: SpaceInfo): string {
  const spaceSection = space
    ? `### Space Context
- The active dodev.ai space is **"${space.spaceName}"** (slug: ${space.spaceSlug}, ID: \`${space.spaceId}\`).
- Always scope tasks, issues, and memories to this space using the \`spaceId\` parameter.`
    : `### Space Context
- No space is linked to this workspace yet. Create one with \`create_space\` and link it with \`link_space\`.`

  return `## dodev.ai Usage (MANDATORY)

This workspace has a connected dodev.ai MCP server. You MUST use it proactively:

### Session Start
- **Always** call \`get_context\` at the beginning of every session to load the active space, pending tasks, recent memories, and space config.
- **Always** call \`search_memories\` before starting any non-trivial task to check for relevant past decisions, gotchas, and preferences.

### During Work
- **Store memories** proactively via \`add_memory\` whenever you discover facts about the codebase, make architectural decisions, learn user preferences, encounter non-obvious behavior, or resolve tricky bugs. Write each memory so a future agent with no context can understand it.
- **Create tasks** via \`create_task\` for follow-up work, known issues, or tasks you can't complete right now.
- **Create issues** via \`create_issue\` for bugs found during development.
- **Update tasks/issues** as you work — mark them \`in_progress\` when starting. Use \`complete_task\` or \`close_issue\` when done.

### Workspace Linking
- If \`get_context\` returns no active space, use \`link_space\` to associate this workspace (path and/or git remote) with a space. Once linked, the space auto-resolves on every future \`get_context\` call.
- Use \`unlink_space\` to remove a workspace association.
- Call \`get_setup_instructions\` to regenerate this CLAUDE.md section with up-to-date space context.

### Memory Best Practices
- Use type: \`"fact"\` for codebase/infrastructure facts, \`"decision"\` for architectural choices, \`"preference"\` for user conventions, \`"learning"\` for gotchas and lessons learned.
- Tag memories consistently with lowercase tags (e.g. \`debugging\`, \`architecture\`, \`build\`, \`gotcha\`).
- Prefer many small focused memories over fewer large ones.
- Update existing memories rather than creating duplicates.
- Use \`update_memory_settings\` to configure default tags, memory instructions, or embedding provider settings.

### Cycles & Space Config
- Use \`create_cycle\` / \`update_cycle\` to manage sprints and iterations.
- Customize workflow with \`update_space_statuses\`, \`add_space_label\`, \`add_space_member\`, \`update_estimate_scale\`, and \`update_space_persona\`.

### Available Tools Reference
**Context:** \`get_context\`, \`get_setup_instructions\`
**Tasks:** \`create_task\`, \`update_task\`, \`complete_task\`, \`list_tasks\`, \`get_task\`, \`delete_task\`
**Issues:** \`create_issue\`, \`update_issue\`, \`close_issue\`, \`list_issues\`, \`get_issue\`, \`delete_issue\`
**Memories:** \`add_memory\`, \`search_memories\`, \`list_memories\`, \`update_memory\`, \`delete_memory\`
**Spaces:** \`create_space\`, \`list_spaces\`, \`get_space\`, \`update_space\`, \`archive_space\`, \`set_active_space\`
**Linking:** \`link_space\`, \`unlink_space\`, \`update_memory_settings\`
**Cycles:** \`create_cycle\`, \`list_cycles\`, \`get_cycle\`, \`update_cycle\`, \`delete_cycle\`
**Config:** \`update_space_statuses\`, \`add_space_label\`, \`remove_space_label\`, \`add_space_member\`, \`remove_space_member\`, \`update_estimate_scale\`, \`update_space_persona\`

${spaceSection}`
}
