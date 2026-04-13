# 1. Base stage for shared setup
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 2. Build & Deploy stage
FROM base AS builder
WORKDIR /app

# Copy lockfile and workspace config first for better caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy all package.json files
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

# Install ALL dependencies (for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build assets
RUN pnpm --filter @todo-app/server build
RUN pnpm --filter @todo-app/client build

# Isolate production server into a separate directory using pnpm deploy
# This will ONLY contain the server code and its production node_modules
RUN pnpm --filter @todo-app/server deploy --prod --legacy /app/prod-server

# 3. Final production image
FROM node:20-slim AS runner
WORKDIR /app

# Set production context
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/todo.db

# Copy ONLY the isolated production server
COPY --from=builder /app/prod-server ./server

# Copy ONLY the compiled frontend assets to the expected relative path
# path.join(__dirname, '../../client/dist') from /app/server/dist/index.js -> /app/client/dist
COPY --from=builder /app/packages/client/dist /app/client/dist

# Create storage for better-sqlite3
RUN mkdir -p /app/data

EXPOSE 3001

# The binary path is now /app/server/dist/index.js
WORKDIR /app/server
CMD ["node", "dist/index.js"]
