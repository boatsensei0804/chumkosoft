# syntax=docker/dockerfile:1

# ---- Base image ----
# node 24 (npm 11) matches the npm that generates package-lock.json locally, so
# `npm ci` stays in sync; it also runs the TypeScript seed natively.
FROM node:24-alpine AS base
# libc6-compat is occasionally required by native deps on Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- Install dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate the Prisma client (musl engine, matches this Alpine base) before building.
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy the standalone server, static assets, and public files only.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Next's file tracer can miss Prisma's native query engine binary; copy the
# generated client explicitly so the standalone server can reach the database.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
