FROM node:20-alpine
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --frozen-lockfile --filter @lumbung/api...
EXPOSE 4000
CMD ["pnpm", "--filter", "@lumbung/api", "start"]
