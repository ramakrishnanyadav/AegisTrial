# ─── Stage 1: Build frontend ────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY vite.config.ts tsconfig.json index.html ./
COPY src/ ./src/
COPY public/ ./public/
COPY shared/ ./shared/

RUN npm ci --ignore-scripts
RUN npm run build

# ─── Stage 2: Build backend ────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/src/ ./backend/src/
COPY backend/migrations/ ./backend/migrations/
COPY shared/ ./shared/

RUN npm ci --ignore-scripts
RUN npm run build --prefix backend

# ─── Stage 3: Production image ─────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Backend & dependencies
COPY --from=backend-builder --chown=node:node /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=node:node /app/node_modules ./node_modules
COPY --from=backend-builder --chown=node:node /app/backend/package.json ./backend/
COPY --from=backend-builder --chown=node:node /app/package.json ./
COPY --chown=node:node backend/src/db/schema.sql ./backend/src/db/

# Frontend static asset build
COPY --from=frontend-builder --chown=node:node /app/dist ./public

# Agent definitions
COPY --chown=node:node agents/ ./agents/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
  CMD wget -q --spider http://localhost:3000/health || exit 1

USER node

CMD ["node", "backend/dist/server.js"]
