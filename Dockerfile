# 1. Base stage for shared setup
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# Install only necessary build tools for native modules (removed after build)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 2. Build stage
FROM base AS builder
WORKDIR /app
COPY . .
# We use pnpm install without removing devDeps because we need them for build
RUN pnpm install --frozen-lockfile

# Build both client and server
RUN pnpm --filter @todo-app/server build
RUN pnpm --filter @todo-app/client build

# 3. Deploy stage (Isolate production server)
FROM base AS deployer
WORKDIR /app
COPY --from=builder /app /app
# pnpm deploy creates a standalone package directory with only production dependencies
RUN pnpm --filter @todo-app/server --prod deploy /app/deployed-server

# 4. Final production image (Small & Secure)
FROM node:20-slim AS runner
WORKDIR /app

# Set production context
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/todo.db

# Copy the isolated production server (code + node_modules)
# After deploy, package contents are flat in 'deployed-server'
COPY --from=deployer /app/deployed-server ./server-package

# Copy the frontend built assets to the expected relative path
# "../../client/dist" from "/app/server-package/dist" -> "/app/client/dist"
COPY --from=builder /app/packages/client/dist /app/client/dist

# Create storage for better-sqlite3
RUN mkdir -p /app/data

# better-sqlite3 native bindings are already in server-package/node_modules
# from the deploy stage

EXPOSE 3001

# Start the server from the flattened deploy directory
WORKDIR /app/server-package
CMD ["node", "dist/index.js"]
