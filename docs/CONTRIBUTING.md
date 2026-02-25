# Contributing to dodev.ai

Thanks for your interest in contributing to dodev.ai! This document covers how to get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- A Convex account (free at [convex.dev](https://convex.dev))

### Getting Started

```bash
# Clone the repo
git clone https://github.com/dodotdev/dodev-ai.git
cd dodev-ai

# Install dependencies
pnpm install

# Set up Convex for development
cd packages/convex
npx convex dev  # This starts the Convex dev server
# In another terminal...

# Start the MCP server in dev mode
cd packages/mcp-server
pnpm dev
```

### Monorepo Structure (Phase 1)

```
dodev-ai/
├── packages/
│   ├── mcp-server/        # MCP server (npm-publishable + Dockerfile)
│   ├── convex/            # Convex schema + functions
│   └── shared/            # Shared types and validators
├── docker/                # Docker Compose for self-hosting
├── docs/                  # Design docs (architecture, schema, tool specs)
├── turbo.json             # Turborepo config
├── biome.json             # Biome linter/formatter config
└── package.json           # Root workspace
```

## Making Changes

### Branch Naming

- `feat/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation
- `refactor/description` — Code refactoring

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add vector search for memories
fix: handle missing project in list_todos
docs: update self-hosting guide for ARM
refactor: extract auth middleware
```

### Pull Requests

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Add tests if applicable
4. Ensure `pnpm check` and `pnpm test` pass
5. Open a PR with a clear description of the change

## Code Style

- TypeScript strict mode
- Biome (configured in biome.json)
- Prefer explicit types over inference for function signatures
- Use Convex validators (`v.string()`, etc.) for all function args

## Linting and Formatting

```bash
# Check for lint and formatting issues
pnpm check

# Auto-fix lint and formatting issues
pnpm check:fix
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @dodev/mcp-server test

# Run Convex function tests
cd packages/convex
npx convex test
```

## Documentation

If your change affects the MCP tools or API, update:
- `docs/MCP_TOOLS.md` — Tool specifications
- `docs/CONVEX_SCHEMA.md` — Schema changes
- `README.md` — If user-facing behavior changes

## Reporting Issues

Open an issue on GitHub with:
- A clear title and description
- Steps to reproduce (for bugs)
- Your environment (OS, Node version, MCP client)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
