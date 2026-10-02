# Multi-stage lightweight Dockerfile for KalyanSetu
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY . .

# Build frontend static files into dist/
RUN npm run build

# Production runtime container
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets and server files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/db.js ./db.js
COPY --from=builder /app/*.html ./
COPY --from=builder /app/css ./css
COPY --from=builder /app/js ./js

# Persistent data directory for SQLite database
RUN mkdir -p /app/data
ENV DB_PATH=/app/data/kalyansetu.db
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server.ts"]
