# Multi-stage Dockerfile for ITSM Next.js App

# Stage 1: Dependencies and Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install system dependencies for native modules (prisma, better-sqlite3, bcryptjs)
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm ci --ignore-scripts
# Ensure Prisma version 7.5.0 to avoid schema validation issues
RUN npm install prisma@7.5.0 @prisma/client@7.5.0

# Copy source code
COPY . .

# Remove .env files to avoid overriding environment variables
RUN rm -f .env .env.local .env.docker

# Set environment variables for build (use dummy database to avoid connection errors)
ENV DATABASE_URL="postgresql://postgres:D090799t@postgres:5432/itsm?schema=public&connect_timeout=1"
ENV SKIP_DB_INIT="true"
ENV IS_BUILD="true"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="dummy-secret-for-build-only"

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN IS_BUILD=true SKIP_DB_INIT=true npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install system dependencies for native modules (better-sqlite3) and curl for healthcheck
RUN apk add --no-cache libc6-compat python3 make g++ curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files for dependencies
COPY package.json package-lock.json* ./

# Install all dependencies (including dev for prisma and seeding)
RUN npm ci --ignore-scripts

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib/generated ./lib/generated

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory and set permissions
RUN mkdir -p /app/.data && chown -R nextjs:nodejs /app/.data

# Set correct permissions for app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables (should be overridden at runtime)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV="production"
ENV DATABASE_URL="postgresql://postgres:D090799t@postgres:5432/itsm?schema=public"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="change-this-in-production"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
