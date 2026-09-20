# ==========================================
# Multi-Stage Production Dockerfile for MailRadar
# ==========================================

# Stage 1: Build React Frontend
FROM node:20-slim AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Build Express Backend
FROM node:20-slim AS server-builder
WORKDIR /app/server

# Install OpenSSL & certificates for Prisma engine compilation
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./
RUN npm ci

COPY server/prisma/ ./prisma/
RUN npx prisma generate

COPY server/ ./
RUN npm run build

# Stage 3: Minimal Production Image
FROM node:20-slim AS runner
WORKDIR /app

# Install OpenSSL runtime for Prisma Client
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4000

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production

# Copy generated Prisma Client & schema
COPY --from=server-builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=server-builder /app/server/node_modules/@prisma ./node_modules/@prisma
COPY --from=server-builder /app/server/prisma ./prisma

# Copy compiled backend & frontend distribution
COPY --from=server-builder /app/server/dist ./dist
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
