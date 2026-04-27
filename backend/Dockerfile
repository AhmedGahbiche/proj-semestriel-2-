# Backend container (Fastify + Prisma)
# Builds TS -> dist, then runs `prisma migrate deploy` and starts the server.

FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (better caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy Prisma schema + migrations + TS sources
COPY prisma ./prisma
COPY tsconfig.json ./tsconfig.json
COPY src ./src

# Build
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Only what we need at runtime
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Run migrations then start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
