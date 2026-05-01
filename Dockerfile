FROM node:20-slim AS frontend
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/client/package.json packages/client/
RUN pnpm install --frozen-lockfile

COPY packages/client packages/client
RUN pnpm --filter @todo-app/client build

FROM rust:1.85-bookworm AS backend
WORKDIR /app

COPY src-tauri src-tauri
RUN cargo build --release --no-default-features --manifest-path src-tauri/Cargo.toml --example gtd-server

FROM debian:bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates wget \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data

ENV GTD_MODE=server
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/todo.db
ENV CLIENT_DIST_PATH=/app/client/dist

COPY --from=backend /app/src-tauri/target/release/examples/gtd-server /app/gtd-server
COPY --from=frontend /app/packages/client/dist /app/client/dist

EXPOSE 3001
CMD ["/app/gtd-server"]
