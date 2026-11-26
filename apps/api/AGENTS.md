# AGENTS.md

## NestJS

This app's version of NestJS is likely newer than what you know. https://docs.nestjs.com/llms.txt indexes its documentation, with a markdown page per chapter.

The official NestJS agent skills are installed with `npx @nestjs/skills add --agent all`, which also updates them: the mistakes agents make in Nest apps, with recipes checked on the released packages. An agent loads a skill when a task matches it.

Nest has first-party packages for these, so check them before adding another library or writing your own:

- Databases: [`@nestjs/typeorm`](https://docs.nestjs.com/data/typeorm.md), [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle.md), [`@nestjs/mongoose`](https://docs.nestjs.com/data/mongodb.md), [`@nestjs/sequelize`](https://docs.nestjs.com/data/sequelize.md).
- OpenAPI: [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction.md). GraphQL: [`@nestjs/graphql`](https://docs.nestjs.com/graphql/quick-start.md). WebSockets: [`@nestjs/websockets`](https://docs.nestjs.com/websockets/gateways.md). Microservices: [`@nestjs/microservices`](https://docs.nestjs.com/microservices/basics.md).
- Sign-in: [`@nestjs/authentication`](https://docs.nestjs.com/security/authentication.md). Permissions: [`@nestjs/authorization`](https://docs.nestjs.com/security/authorization.md). Rate limiting: [`@nestjs/throttler`](https://docs.nestjs.com/security/rate-limiting.md).
- Configuration: [`@nestjs/config`](https://docs.nestjs.com/application/configuration.md). Caching: [`@nestjs/cache-manager`](https://docs.nestjs.com/data/caching.md). Health checks: [`@nestjs/terminus`](https://docs.nestjs.com/reliability/terminus.md). Events inside the app: [`@nestjs/event-emitter`](https://docs.nestjs.com/application/events.md).
- Email: [`@nestjs/mail`](https://docs.nestjs.com/application/mail.md). Files, S3 included: [`@nestjs/storage`](https://docs.nestjs.com/application/file-storage.md). Translations: [`@nestjs/i18n`](https://docs.nestjs.com/application/i18n.md).
- Retries, timeouts and circuit breakers: [`@nestjs/resilience`](https://docs.nestjs.com/reliability/resilience.md).
- Idempotency keys: [`@nestjs/idempotency`](https://docs.nestjs.com/reliability/idempotency.md). Transactional outbox: [`@nestjs/outbox`](https://docs.nestjs.com/reliability/outbox.md). Sending and receiving webhooks: [`@nestjs/webhooks`](https://docs.nestjs.com/http/webhooks.md).
- Queues: [`@nestjs/bullmq`](https://docs.nestjs.com/application/queues.md). Scheduled jobs: [`@nestjs/schedule`](https://docs.nestjs.com/application/task-scheduling.md).
- Running a scheduled job on one instance, and locks: [`@nestjs/locks`](https://docs.nestjs.com/reliability/locks.md). Processes that take days: [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows.md).
- Language models, tools and agents: [`@nestjs/ai`](https://docs.nestjs.com/ai/overview.md). MCP servers: [`@nestjs/mcp`](https://docs.nestjs.com/mcp/overview.md).

Validation works with Zod, Valibot, ArkType or any other Standard Schema library, with no classes or decorator metadata: `StandardSchemaValidationPipe` with `@Body({ schema })` or `@Param('id', { schema })` (https://docs.nestjs.com/application/validation.md). `class-validator` still works, through `ValidationPipe`.

`NodeAdapter` from `@nestjs/platform-node` is the fastest HTTP adapter, ahead of Fastify (https://docs.nestjs.com/http/performance.md).

A route handler can return a web `Response`, a `ReadableStream` or an async generator, and Nest streams it as it's produced (https://docs.nestjs.com/http/streaming-responses.md).

Nest's packages are ESM only, and this project is ESM too: relative imports end in `.js`, `__dirname` doesn't exist (use `import.meta.dirname`), and tests run on Vitest, so mocks are `vi.fn()`, not `jest.fn()`.

In this project (`@loopedu/api` in the LoopEdu pnpm monorepo), `src/main.ts` loads the monorepo-root `.env` if present, applies `configureApp` (global prefix `api/v1`, CORS from `CORS_ORIGINS`) and listens on `API_PORT` (4000 by default). `src/app.module.ts` is the root module. Shared Zod schemas and types come from `@loopedu/shared` (`packages/shared`); build it before the API (`pnpm --filter @loopedu/shared build`). The database layer is Drizzle through `@nestjs/drizzle`: tables live in `src/db/schema/` (one file per domain, `index.ts` re-exports), inject with `@InjectDrizzle() private readonly db: Database` (`src/db/database.ts`), generate migrations with `pnpm db:generate` and review the SQL in `drizzle/`, apply them with `pnpm db:migrate`. Unit tests live inside the module they cover, in its own `test/` folder (`src/modules/health/test/health.controller.spec.ts`); the same goes for `src/db/test/`. Tests that span modules are e2e tests in the top-level `test/e2e/*.e2e-spec.ts`. Vitest runs them (`pnpm test`, `pnpm test:e2e`).

The product spec (PRD v2.0, technical tab) is the source of truth for modules, data model and infrastructure: standard PostgreSQL + pgvector, S3-compatible storage, auth implemented in NestJS, configuration only through environment variables (see the root `.env.example`). Error tracking is planned with Sentry; do not add a vendor-specific observability service.

When a task says how to test, follow it. When it says nothing, cover the behaviour you change with focused tests rather than adding broad e2e suites.

## LoopEdu API rules

Derived from the PRD v2.0 technical tab (sections 7, 10–13; an export may sit in `../../../Documents/Technical_LoopEdu_V1.md` and can lag the Claude Doc). Where the spec and this repo disagree, the repo and this file win. Known differences: tests use Vitest (spec says Jest) and validation uses Nest's built-in `StandardSchemaValidationPipe` (spec says nestjs-zod). Rules tagged **(AC-…)** are acceptance criteria from PRD section 8 and need an automated test.

### Structure

- One Nest module per domain in `src/modules/<name>/` (files `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts`, `<name>.repository.ts`): `health`, `auth`, `catalog`, `practice`, `review`, `voice`, `billing-quota`, `privacy`, `content-admin`, `ai`, `learning-aids`, `jobs`, `analytics`. Adding another one needs a reason in the PR.
- Inside a module: controller (HTTP only: parse, call the service, return) → service (business rules, ownership checks) → repository (Drizzle queries). A module uses another module only through its exported service, never through its repository or by querying its tables.
- Cross-cutting guards, pipes, filters and interceptors go in `src/common/`. All tables stay in `src/db/schema/`: identity, catalog, learning (practice, review and voice assessments), usage, audit; a new table goes in the file of its domain, enums in `enums.ts`.
- Queues are pg-boss inside the API process; schedules are `@nestjs/schedule`. No Redis, no BullMQ, no separate worker.

### API contract

- Routes live under the global prefix `api/v1` set in `configure-app.ts`; never repeat it in `@Controller()`. Endpoints follow the table in spec 11.5; call out any new endpoint in the PR.
- Request and response shapes are Zod schemas in `@loopedu/shared`, exported with their inferred types. Validate every body, param and query with them; no class-validator DTOs. Type response bodies with the shared type, as `HealthController` does.
- Error bodies are `ApiError` (`{ code, message }`) with a code from `ERROR_CODES`, mapped to HTTP as: `VALIDATION_FAILED` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `CONSENT_REQUIRED` 403, `AGE_NOT_ELIGIBLE` 403, `NOT_FOUND` 404, `CONFLICT` 409, `QUOTA_EXCEEDED` 429, `AI_UNAVAILABLE` 503. One global exception filter in `src/common/` does the mapping; services throw, controllers never build error bodies.
- A resource owned by another user answers `NOT_FOUND`, so IDs cannot be probed. `POST /auth/magic-link` answers identically whether or not the email exists.
- Retryable writes (complete practice session, complete review task, create assessment, publish) take an idempotency key and return the same result when repeated. A unique constraint provides the guarantee, not a read-then-write check. **(AC-PRACTICE-03, AC-VOICE-03)**

### Auth and permissions

- Every route needs a valid access token unless explicitly marked public. Public routes: `health`, `auth/magic-link`, `auth/verify`. `auth/refresh` and `auth/logout` authenticate with the refresh cookie instead (the access token may have expired) and must check `Origin`.
- Magic link: 32 random bytes, only the hash stored in `auth_tokens`, valid 15 minutes, single use. Access JWT lasts 15 minutes. Refresh token lasts 30 days, is rotated on each use, stored as a hash and revocable; its cookie is `httpOnly`, `Secure`, `SameSite=Lax` on `COOKIE_DOMAIN`. Rate limits: 5 magic links per hour per email, 20 per hour per IP.
- Roles come from `user_roles` through `RolesGuard` and follow the permission matrix in spec 13. The acting user's id always comes from the token, never from the body or path. **(AC-SEC-01, AC-VOICE-08)**
- Learners get only `published` question sets, plus `pending_review` sets they requested themselves (a `topic_requests` row of theirs points to the set). **(AC-PRACTICE-01, AC-ONDEMAND-03)**
- Nobody, admin included, can fetch another user's audio. Editors cannot publish.
- Publish, unpublish, reject, blueprint/framework/rubric changes, AI budget, kill switch and role changes write `admin_audit_logs` in the same transaction. **(AC-ADMIN-02)**

### Data

- Schema changes: edit the file in `src/db/schema/`, run `pnpm db:generate`, read the SQL, commit both. Never edit a migration that has been applied anywhere; add a new one. Migrations are expand/contract (add first, drop in a later deploy) so the previous image still runs.
- The app connects with `DATABASE_URL`, a user without DDL rights; only `migrate.ts` uses `DATABASE_MIGRATION_URL`.
- Timestamps are `timestamptz`. Learner-local calendar days (`anchor_local_date`, `due_on`) are `date` values (`YYYY-MM-DD`) computed in the learner's stored timezone.
- The database enforces the invariants: `UNIQUE(user_id, question_set_version_id)` on `learning_items`, `UNIQUE(learning_item_id, milestone_days)` on `review_tasks`, `UNIQUE(user_id, idempotency_key)` on `speaking_assessments`, `UNIQUE(request_key)` on `credit_ledger`. Write with `ON CONFLICT DO NOTHING` inside a transaction.
- The first completion of a practice session creates its `learning_item` and three `review_tasks` in one transaction, with dates from `reviewDueDates()` in `@loopedu/shared`. Existing schedules are never recalculated: late reviews, timezone changes and new content versions do not move them. **(AC-REVIEW-01, AC-REVIEW-02)**
- Published `question_set_versions`, active `exam_blueprints` and active `frameworks` are immutable; a change creates a new version, and reviews keep pointing at the version that was studied. **(AC-REVIEW-03)** One exception: rejecting a `pending_review` set moves unfinished reviews to the nearest approved version of the same topic (spec 12.4).
- `credit_ledger`, `admin_audit_logs` and `consent_records` are append-only: no UPDATE or DELETE.
- Never hard-delete a question set someone has studied. Account deletion soft-deletes `users` first; a scheduled job purges the data.

### Voice, credits and jobs

- Upload URL: check consent for the current policy version (`CONSENT_REQUIRED`), then quota, then issue a presigned PUT valid 5 minutes. Before reserving a credit, check on the server: MIME, ≤ 5 MB, 5–120 seconds. A rejected recording reserves nothing. **(AC-VOICE-01, AC-VOICE-02)**
- Credits: check the balance (`SUM(amount)` for the period) and insert the `reserve` row in one transaction that serialises per user; `commit` when the job completes, `release` when it fails. Twenty parallel requests with one credit left create exactly one job. **(AC-VOICE-04, AC-VOICE-05)** Limits: 3 running jobs per user, 20 upload URLs per hour per user, 10 pattern attempts per day (not charged to the monthly quota).
- Job handlers can run more than once and must be idempotent. Retry at most twice with backoff, then mark `failed` with an `error_code`; stuck jobs are reclaimed after 5 minutes. Deduplicate with pg-boss `singletonKey` (on-demand generation keys on normalised topic + part, so concurrent requests for one topic share one job). **(AC-ONDEMAND-02)**
- Read-along mode (sample visible when recording started) and TOEIC read-aloud: Azure scripted against the `reference_text` snapshotted at job creation, no OpenAI call. Free mode: Azure unscripted, then OpenAI. A transcript under 10 words finishes early with no OpenAI call and no charge. **(AC-VOICE-11, AC-TOEIC-02)**
- Playback URLs are presigned GETs valid 10 minutes, for the owner only. Audio is deleted after 7 days (bucket lifecycle plus the hourly job). Deleting voice data removes audio, transcripts and results within 24 hours and keeps practice history and schedules. **(AC-VOICE-07, AC-VOICE-10)**

### AI

- Azure and OpenAI are called only through adapters in the `ai` module. Check the monthly budget kill switch before each call and write `ai_usage_events` after it. Timeouts: Azure 60 s, OpenAI 30 s, on-demand generation 25 s.
- Practice, completion and review never call an AI provider and keep working when providers are down or the kill switch is on. **(AC-VOICE-09)**
- LLM output is structured JSON validated with Zod; on a schema failure retry once, then fail. Code checks format and exam rules; the AI reviewer is never the only check. A blocker or failed hard rule blocks publishing. **(AC-ADMIN-01)**
- Feedback carries no band or exam score, and a validator rejects "band" followed by a number. Every improvement has `evidence` that matches the transcript. Pronunciation feedback uses Azure phoneme data only. **(AC-VOICE-06)**
- Text from users (topics, transcripts, names) is data: pass it in its own prompt field, never concatenated into instructions, and never act on instructions a model returns. On-demand topics go through OpenAI Moderation first. **(AC-ONDEMAND-04)**
- Sample personalisation is string replacement with preset English phrases from `@loopedu/shared`, never an LLM call, and never leaves a raw `{{placeholder}}`. In survey or diagram mode the response omits `sample_answer` until the survey is submitted. **(AC-PRACTICE-02, AC-PERSONAL-01, AC-REVIEW-04, AC-DIAGRAM-02)**
- Pattern counting uses a lemmatizer in the API, not an LLM. **(AC-PATTERN-02)**

### Config, logging, privacy

- Configuration comes only from environment variables listed in the root `.env.example`; add a new variable there in the same change. No hard-coded hosts, buckets or keys. Read env inside factories (as `AppModule` does with `forRootAsync`), not at import time, because `main.ts` loads `.env` first.
- Object storage is reached only through the S3 API and the `S3_*` variables; nothing R2-specific.
- Logs are structured and carry the request ID or job ID. Never log, and never put in `product_events`: magic links, tokens, emails, transcripts, audio object keys or URLs, feedback text, personalisation values.

### Tests

- A module's tests go in `<module>/test/`, one `*.spec.ts` per file under test, importing it as `../<file>.js`. Helpers shared by several modules go in `src/common/testing/`. `tsconfig.build.json` leaves every `test/` folder out of the build.
- Every acceptance criterion a change touches gets an automated test. Tests never call real Azure, OpenAI, object storage or email; mock the adapters.
- Test idempotency and quota rules by sending the same request several times and in parallel; test date rules across month end, year end and 29 February.
