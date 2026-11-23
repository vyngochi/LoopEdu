# syntax=docker/dockerfile:1
# Build context là gốc repo (monorepo), không phải apps/api:
#   docker build -f apps/api/Dockerfile -t loopedu-api .
# Mặc định ảnh tự chạy migration rồi mới khởi động API (xem CMD cuối file); compose staging vẫn có service migrate riêng, chạy lại thì vô hại.
# Ảnh không giữ trạng thái trên đĩa; người dùng không phải root.

FROM node:24-alpine AS base
# Phiên bản pnpm lấy từ "packageManager" trong package.json gốc.
RUN corepack enable
WORKDIR /repo

# Chỉ chép manifest để lớp cài package được cache khi mã nguồn đổi.
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

FROM manifests AS build
RUN pnpm install --frozen-lockfile --filter @loopedu/api...
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @loopedu/shared build && pnpm --filter @loopedu/api build

FROM manifests AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter @loopedu/api...

FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=node:node /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build --chown=node:node /repo/packages/shared/package.json ./packages/shared/
COPY --from=build --chown=node:node /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=node:node /repo/apps/api/package.json ./apps/api/
COPY --from=build --chown=node:node /repo/apps/api/dist ./apps/api/dist
# migrate.ts chạy thẳng bằng Node (bỏ kiểu), cần cùng thư mục drizzle/ với bản build.
COPY --from=build --chown=node:node /repo/apps/api/drizzle ./apps/api/drizzle
COPY --from=build --chown=node:node /repo/apps/api/src/db/migrate.ts ./apps/api/src/db/migrate.ts
USER node
ENV API_PORT=4000
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO /dev/null http://127.0.0.1:4000/api/v1/health || exit 1
# Migrate first, then start the API (exec so SIGTERM reaches node). A failed migration stops the container.
# DATABASE_MIGRATION_URL falls back to DATABASE_URL for hosts that set only one; production should set both (app user without DDL).
CMD ["sh", "-c", "DATABASE_MIGRATION_URL=${DATABASE_MIGRATION_URL:-$DATABASE_URL} node apps/api/src/db/migrate.ts && exec node apps/api/dist/main.js"]
