FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod

# Copy source
COPY packages/mcp-server/ ./packages/mcp-server/
COPY packages/shared/ ./packages/shared/

# Build
RUN pnpm --filter @todomcp/mcp-server build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/packages/mcp-server/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/mcp-server/package.json ./

EXPOSE 3100

ENTRYPOINT ["node", "dist/index.js"]
