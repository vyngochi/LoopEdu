# LoopEdu

Ứng dụng luyện nói tiếng Anh: luyện theo dạng đề IELTS hoặc TOEIC, nhận phản hồi từng từ, ôn lại sau 3, 7, 21 ngày.
Đặc tả sản phẩm và kỹ thuật: PRD v2.0 (Claude Doc, tab chính và tab Kỹ thuật). Bản xuất trong `../Documents` có thể cũ hơn.

## Cấu trúc

```
apps/
  web/        Next.js 16 – giao diện (cổng 3000)
  api/        NestJS 12 – backend duy nhất, REST /api/v1 (cổng 4000)
    src/db/   Drizzle: schema.ts (nguồn sự thật của DB), migrate.ts
    drizzle/  file migration SQL do drizzle-kit sinh, commit cùng code
packages/
  shared/     Zod schema, type, hằng số dùng chung cho web và api
infra/
  docker-compose.dev.yml   Postgres 16 + pgvector, Mailpit cho máy dev
```

## Yêu cầu

- Node 24 (`.nvmrc`), pnpm 11
- Docker Desktop (cho Postgres, Mailpit)
- Tài khoản Cloudflare có bật R2 (lưu audio)

## Chạy lần đầu

```bash
cp .env.example .env      # đổi mật khẩu, điền khóa R2 (xem mục dưới)
pnpm install
pnpm infra:up             # Postgres :5432, Mailpit :8025
pnpm --filter @loopedu/api db:migrate   # tạo bảng, bật pgvector
pnpm dev                  # build shared, rồi chạy shared (watch), api và web
```

### Cloudflare R2 (lưu audio)

Mọi môi trường dùng R2 qua S3 API, mỗi môi trường một bucket private: `loopedu-voice-dev`, `loopedu-voice-staging`, `loopedu-voice-prod`. Làm một lần cho mỗi bucket, trong Cloudflare Dashboard → R2:

1. **Create bucket**, giữ nguyên chế độ private (không bật Public access hay r2.dev).
2. **Settings → Object lifecycle rules:** thêm rule xóa object sau 7 ngày (PRD 7.7).
3. **Settings → CORS policy:** chỉ cho domain web của môi trường đó upload trực tiếp qua presigned URL. Với dev:
   ```json
   [{ "AllowedOrigins": ["http://localhost:3000"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
   ```
4. **Manage API tokens → Create API token:** quyền *Object Read & Write*, chỉ áp dụng cho đúng bucket đó. Chép Access Key ID và Secret Access Key vào `S3_ACCESS_KEY`, `S3_SECRET_KEY`; thay `<ACCOUNT_ID>` trong `S3_ENDPOINT` bằng Account ID của Cloudflare.

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1/health
- Hộp thư email thử: http://localhost:8025

### Chạy web bằng Docker (ảnh production)

Build từ gốc repo, ảnh dùng Next standalone, chạy bằng user `node`:

```bash
docker build -f apps/web/Dockerfile -t loopedu-web .
docker run --rm -p 3000:3000 loopedu-web
# hoặc qua compose (profile web, không chạy mặc định): 
docker compose -f infra/docker-compose.dev.yml --env-file .env --profile web up -d --build web
```

## Lệnh thường dùng

| Lệnh | Việc |
| --- | --- |
| `pnpm build` | Build theo thứ tự phụ thuộc (shared → api, web) |
| `pnpm test` | Unit test mọi package |
| `pnpm --filter @loopedu/api test:e2e` | E2E test của API |
| `pnpm lint` / `pnpm typecheck` | Lint / kiểm tra kiểu toàn repo |
| `pnpm infra:down` | Tắt các service Docker |
| `pnpm db:check` | Thử kết nối `DATABASE_URL`: in `OK` hoặc `FAIL` kèm lý do (exit code 0 / 1) |
| `pnpm --filter @loopedu/api db:generate` | Sinh file migration SQL từ thay đổi trong `src/db/schema.ts` (đọc lại SQL trước khi commit) |
| `pnpm --filter @loopedu/api db:migrate` | Chạy migration còn thiếu, dùng `DATABASE_MIGRATION_URL` |
| `pnpm --filter @loopedu/api db:studio` | Mở Drizzle Studio để xem dữ liệu |

## Quy ước

- Mọi khác biệt giữa local, staging (server tại nhà) và production nằm trong biến môi trường; xem `.env.example`. Không hard-code host hay khóa.
- Chỉ dùng chuẩn mở: PostgreSQL + pgvector, S3 API, SMTP. Không thêm dịch vụ chỉ có ở một nhà cung cấp. R2 chỉ được gọi qua S3 API, nên đổi sang S3 hay storage khác chỉ cần sửa biến `S3_*`.
- Kiểu dữ liệu và schema API dùng chung đặt trong `packages/shared`; sửa ở đó rồi web và api cùng nhận.
- Không commit `.env`.
- Schema chỉ đổi qua migration, viết theo kiểu chỉ thêm (expand/contract): thêm cột hoặc bảng trước, xóa cái cũ ở bản deploy sau.
