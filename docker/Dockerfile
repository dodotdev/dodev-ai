FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY packages/mcp-server/ ./packages/mcp-server/
COPY packages/shared/ ./packages/shared/

# Build
RUN pnpm --filter @domcp/shared build && pnpm --filter @domcp/mcp-server build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/packages/mcp-server/dist ./dist
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/mcp-server/package.json ./

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

ENTRYPOINT ["node", "dist/index.js"]
