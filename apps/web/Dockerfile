# syntax=docker/dockerfile:1
# Build context là gốc repo (monorepo), không phải apps/web:
#   docker build -f apps/web/Dockerfile -t loopedu-web .
# Ảnh chạy Next.js ở chế độ standalone (chỉ gồm file cần cho production), người dùng không phải root.

FROM node:24-alpine AS base
# Phiên bản pnpm lấy từ "packageManager" trong package.json gốc.
RUN corepack enable
WORKDIR /repo

# Chỉ chép manifest để lớp cài package được cache khi mã nguồn đổi.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @loopedu/web...

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
# NEXT_OUTPUT bật output: "standalone" trong next.config.ts (tắt ở máy dev Windows vì cần symlink).
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @loopedu/shared build && pnpm --filter @loopedu/web build

FROM node:24-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
# Chưa có thư mục public/. Khi có, thêm: COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["node", "apps/web/server.js"]
