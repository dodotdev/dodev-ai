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

# Build both packages, then create a production deploy bundle
RUN pnpm --filter @dodev/shared build && \
    pnpm --filter @dodev/mcp-server build && \
    pnpm --filter @dodev/mcp-server --prod deploy --legacy /app/deploy

# Production image
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=base /app/deploy ./

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3100/health || exit 1

ENTRYPOINT ["node", "dist/index.js"]
