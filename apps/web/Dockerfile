FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @lumbung/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S lumbung && adduser -S lumbung -G lumbung
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
USER lumbung
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
