# ─── Stage 1: Build frontend ────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/

RUN npm ci --ignore-scripts
RUN npm run build

# ─── Stage 2: Build backend ────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package.json ./
COPY backend/package-lock.json* ./
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/

RUN npm ci --ignore-scripts
RUN npm run build

# ─── Stage 3: Production image ─────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/
COPY backend/src/db/schema.sql ./backend/src/db/

# Frontend (served as static files by backend)
COPY --from=frontend-builder /app/dist ./public

# Agent definitions
COPY agents/ ./agents/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["node", "backend/dist/server.js"]
