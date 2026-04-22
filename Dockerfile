# Multi-stage build: compile the SvelteKit app, then ship a slim Node runtime.

# ---- builder ----
FROM node:20-bookworm-slim AS builder

# better-sqlite3 needs a build toolchain on bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first for build-cache friendliness
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build
COPY . .
RUN npm run build \
 && npm prune --omit=dev

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime

# Keep compiled native addons' runtime deps minimal; better-sqlite3 doesn't
# need the toolchain at runtime — the prebuilt .node binary is copied via
# the builder's pruned node_modules.

RUN groupadd --system --gid 2001 otrev \
 && useradd  --system --uid 2001 --gid otrev --home-dir /app --shell /usr/sbin/nologin otrev

WORKDIR /app

# Bring over only what the runtime needs
COPY --from=builder --chown=otrev:otrev /app/build         ./build
COPY --from=builder --chown=otrev:otrev /app/node_modules  ./node_modules
COPY --from=builder --chown=otrev:otrev /app/drizzle       ./drizzle
COPY --from=builder --chown=otrev:otrev /app/package.json  ./package.json

# Data dir — mounted as a volume in compose. Owned by the app user so the
# first startup can create the SQLite file.
RUN mkdir -p /data && chown otrev:otrev /data

USER otrev

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=file:/data/game.db \
    DRIZZLE_MIGRATIONS_DIR=/app/drizzle

EXPOSE 3000

CMD ["node", "build/index.js"]
