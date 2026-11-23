CREATE TYPE "public"."assessment_mode" AS ENUM('read_along', 'free');--> statement-breakpoint
CREATE TYPE "public"."assessment_status" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."credit_entry_type" AS ENUM('grant', 'reserve', 'commit', 'release');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."practice_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."question_set_status" AS ENUM('draft', 'pending_review', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_kind" AS ENUM('scheduled', 'extra');--> statement-breakpoint
CREATE TYPE "public"."section_code" AS ENUM('ielts_p1', 'ielts_p2', 'toeic_read_aloud', 'toeic_respond', 'toeic_respond_info', 'toeic_opinion');--> statement-breakpoint
CREATE TYPE "public"."self_rating" AS ENUM('not_yet', 'partial', 'good');--> statement-breakpoint
CREATE TYPE "public"."support_level" AS ENUM('sample', 'diagram', 'none');--> statement-breakpoint
CREATE TYPE "public"."topic_origin" AS ENUM('admin', 'on_demand');--> statement-breakpoint
CREATE TYPE "public"."topic_request_outcome" AS ENUM('matched', 'suggested', 'generated', 'failed', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."topic_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('pending', 'uploaded', 'failed');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"changes_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by" uuid,
	"config_json" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"provider" text,
	"model" text,
	"prompt_version" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_estimate" numeric(12, 6),
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"operation" text NOT NULL,
	"request_id" text,
	"ref_type" text,
	"ref_id" uuid,
	"audio_seconds" numeric(10, 2),
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_events_cost_nonneg" CHECK ("ai_usage_events"."cost_usd" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assessment_results" (
	"assessment_id" uuid PRIMARY KEY NOT NULL,
	"transcript_json" jsonb,
	"azure_scores_json" jsonb,
	"feedback_json" jsonb,
	"flags_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "audio_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer,
	"duration_ms" integer,
	"upload_status" "upload_status" DEFAULT 'pending' NOT NULL,
	"delete_after" timestamp with time zone DEFAULT now() + interval '7 days' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audio_assets_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "audio_assets_size_positive" CHECK ("audio_assets"."size_bytes" is null or "audio_assets"."size_bytes" > 0),
	CONSTRAINT "audio_assets_duration_positive" CHECK ("audio_assets"."duration_ms" is null or "audio_assets"."duration_ms" > 0)
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"policy_version" text NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "consent_records_one_event" CHECK (num_nonnulls("consent_records"."granted_at", "consent_records"."revoked_at") = 1)
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"entry_type" "credit_entry_type" NOT NULL,
	"amount" integer NOT NULL,
	"request_key" text NOT NULL,
	"assessment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_request_key_unique" UNIQUE("request_key"),
	CONSTRAINT "credit_ledger_period_format" CHECK ("credit_ledger"."period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
CREATE TABLE "exam_blueprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_type" "exam_track" NOT NULL,
	"version" integer NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"rules_json" jsonb NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_blueprints_type_version_unique" UNIQUE("exam_type","version"),
	CONSTRAINT "exam_blueprints_active_approved" CHECK ("exam_blueprints"."status" <> 'active' or "exam_blueprints"."approved_by" is not null),
	CONSTRAINT "exam_blueprints_version_positive" CHECK ("exam_blueprints"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "feedback_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"reviewer_id" uuid,
	"verdict" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"version" integer NOT NULL,
	"part_scope" text NOT NULL,
	"node_schema_json" jsonb NOT NULL,
	"min_nodes" integer NOT NULL,
	"max_nodes" integer NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "frameworks_key_version_unique" UNIQUE("key","version"),
	CONSTRAINT "frameworks_active_approved" CHECK ("frameworks"."status" <> 'active' or "frameworks"."approved_by" is not null),
	CONSTRAINT "frameworks_node_range" CHECK ("frameworks"."min_nodes" >= 1 and "frameworks"."max_nodes" >= "frameworks"."min_nodes"),
	CONSTRAINT "frameworks_version_positive" CHECK ("frameworks"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "learning_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_set_version_id" uuid NOT NULL,
	"anchor_local_date" date NOT NULL,
	"anchor_timezone" text NOT NULL,
	"first_session_id" uuid NOT NULL,
	CONSTRAINT "learning_items_user_version_unique" UNIQUE("user_id","question_set_version_id")
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_set_version_id" uuid NOT NULL,
	"status" "practice_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"self_rating" "self_rating",
	"support_level" "support_level" DEFAULT 'sample' NOT NULL,
	"recorded" boolean DEFAULT false NOT NULL,
	CONSTRAINT "practice_sessions_completed_fields" CHECK ("practice_sessions"."status" <> 'completed' or ("practice_sessions"."completed_at" is not null and "practice_sessions"."self_rating" is not null))
);
--> statement-breakpoint
CREATE TABLE "product_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_name" text NOT NULL,
	"properties_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_set_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_set_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"blueprint_id" uuid NOT NULL,
	"content_json" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_set_versions_set_version_unique" UNIQUE("question_set_id","version_no"),
	CONSTRAINT "question_set_versions_version_positive" CHECK ("question_set_versions"."version_no" > 0)
);
--> statement-breakpoint
CREATE TABLE "question_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"exam_type" "exam_track" NOT NULL,
	"section_code" "section_code" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"current_version_id" uuid,
	"status" "question_set_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_sets_section_matches_exam" CHECK (("question_sets"."exam_type" = 'ielts' and starts_with("question_sets"."section_code"::text, 'ielts_')) or ("question_sets"."exam_type" = 'toeic' and starts_with("question_sets"."section_code"::text, 'toeic_'))),
	CONSTRAINT "question_sets_published_has_version" CHECK ("question_sets"."status" <> 'published' or "question_sets"."current_version_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "review_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_item_id" uuid NOT NULL,
	"kind" "review_kind" NOT NULL,
	"milestone_days" integer,
	"due_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"self_rating" "self_rating",
	"assessment_id" uuid,
	"support_level" "support_level",
	"survey_json" jsonb,
	"source_ref" uuid,
	CONSTRAINT "review_tasks_item_milestone_unique" UNIQUE("learning_item_id","milestone_days"),
	CONSTRAINT "review_tasks_kind_milestone" CHECK (("review_tasks"."kind" = 'scheduled' and "review_tasks"."milestone_days" in (3, 7, 21)) or ("review_tasks"."kind" = 'extra' and "review_tasks"."milestone_days" is null))
);
--> statement-breakpoint
CREATE TABLE "speaking_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"practice_session_id" uuid,
	"review_task_id" uuid,
	"audio_asset_id" uuid,
	"mode" "assessment_mode" NOT NULL,
	"reference_text" text,
	"status" "assessment_status" DEFAULT 'queued' NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_versions" jsonb,
	"rubric_version" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "speaking_assessments_user_key_unique" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "speaking_assessments_attempts_nonneg" CHECK ("speaking_assessments"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "topic_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"raw_text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"part_no" integer,
	"matched_topic_id" uuid,
	"similarity" real,
	"outcome" "topic_request_outcome" NOT NULL,
	"question_set_id" uuid,
	"job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_requests_part_no_positive" CHECK ("topic_requests"."part_no" is null or "topic_requests"."part_no" > 0)
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "topic_status" DEFAULT 'draft' NOT NULL,
	"origin" "topic_origin" DEFAULT 'admin' NOT NULL,
	"embedding" vector(1536),
	"request_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug"),
	CONSTRAINT "topics_slug_format" CHECK ("topics"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "topics_request_count_nonneg" CHECK ("topics"."request_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "validation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"rule_result" jsonb NOT NULL,
	"ai_result" jsonb,
	"issues_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewer_id" uuid,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "birth_year" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "guardian_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_jobs" ADD CONSTRAINT "ai_generation_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_speaking_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."speaking_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_assessment_id_speaking_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."speaking_assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_blueprints" ADD CONSTRAINT "exam_blueprints_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_assessment_id_speaking_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."speaking_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frameworks" ADD CONSTRAINT "frameworks_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_question_set_version_id_question_set_versions_id_fk" FOREIGN KEY ("question_set_version_id") REFERENCES "public"."question_set_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_first_session_id_practice_sessions_id_fk" FOREIGN KEY ("first_session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_question_set_version_id_question_set_versions_id_fk" FOREIGN KEY ("question_set_version_id") REFERENCES "public"."question_set_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_set_versions" ADD CONSTRAINT "question_set_versions_question_set_id_question_sets_id_fk" FOREIGN KEY ("question_set_id") REFERENCES "public"."question_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_set_versions" ADD CONSTRAINT "question_set_versions_blueprint_id_exam_blueprints_id_fk" FOREIGN KEY ("blueprint_id") REFERENCES "public"."exam_blueprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_current_version_id_question_set_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."question_set_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_learning_item_id_learning_items_id_fk" FOREIGN KEY ("learning_item_id") REFERENCES "public"."learning_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_tasks" ADD CONSTRAINT "review_tasks_assessment_id_speaking_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."speaking_assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_assessments" ADD CONSTRAINT "speaking_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_assessments" ADD CONSTRAINT "speaking_assessments_practice_session_id_practice_sessions_id_fk" FOREIGN KEY ("practice_session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_assessments" ADD CONSTRAINT "speaking_assessments_review_task_id_review_tasks_id_fk" FOREIGN KEY ("review_task_id") REFERENCES "public"."review_tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_assessments" ADD CONSTRAINT "speaking_assessments_audio_asset_id_audio_assets_id_fk" FOREIGN KEY ("audio_asset_id") REFERENCES "public"."audio_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_requests" ADD CONSTRAINT "topic_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_requests" ADD CONSTRAINT "topic_requests_matched_topic_id_topics_id_fk" FOREIGN KEY ("matched_topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_requests" ADD CONSTRAINT "topic_requests_question_set_id_question_sets_id_fk" FOREIGN KEY ("question_set_id") REFERENCES "public"."question_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_requests" ADD CONSTRAINT "topic_requests_job_id_ai_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_generation_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_reports" ADD CONSTRAINT "validation_reports_version_id_question_set_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."question_set_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validation_reports" ADD CONSTRAINT "validation_reports_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_idx" ON "admin_audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_actor_idx" ON "admin_audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_generation_jobs_status_idx" ON "ai_generation_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ai_generation_jobs_requested_by_idx" ON "ai_generation_jobs" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "ai_usage_events_created_idx" ON "ai_usage_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_ref_idx" ON "ai_usage_events" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "audio_assets_user_id_idx" ON "audio_assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audio_assets_delete_after_idx" ON "audio_assets" USING btree ("delete_after") WHERE "audio_assets"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "consent_records_user_type_idx" ON "consent_records" USING btree ("user_id","consent_type");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_period_idx" ON "credit_ledger" USING btree ("user_id","period");--> statement-breakpoint
CREATE INDEX "credit_ledger_assessment_id_idx" ON "credit_ledger" USING btree ("assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_blueprints_one_active" ON "exam_blueprints" USING btree ("exam_type") WHERE "exam_blueprints"."status" = 'active';--> statement-breakpoint
CREATE INDEX "feedback_reports_assessment_id_idx" ON "feedback_reports" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "feedback_reports_reporter_id_idx" ON "feedback_reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "frameworks_one_active" ON "frameworks" USING btree ("key") WHERE "frameworks"."status" = 'active';--> statement-breakpoint
CREATE INDEX "learning_items_first_session_id_idx" ON "learning_items" USING btree ("first_session_id");--> statement-breakpoint
CREATE INDEX "learning_items_version_id_idx" ON "learning_items" USING btree ("question_set_version_id");--> statement-breakpoint
CREATE INDEX "practice_sessions_user_completed_idx" ON "practice_sessions" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX "practice_sessions_version_id_idx" ON "practice_sessions" USING btree ("question_set_version_id");--> statement-breakpoint
CREATE INDEX "product_events_name_created_idx" ON "product_events" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "product_events_user_id_idx" ON "product_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "question_set_versions_blueprint_id_idx" ON "question_set_versions" USING btree ("blueprint_id");--> statement-breakpoint
CREATE INDEX "question_sets_topic_id_idx" ON "question_sets" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "question_sets_catalog_idx" ON "question_sets" USING btree ("status","exam_type","section_code");--> statement-breakpoint
CREATE INDEX "question_sets_current_version_id_idx" ON "question_sets" USING btree ("current_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "review_tasks_one_pending_extra" ON "review_tasks" USING btree ("learning_item_id") WHERE "review_tasks"."kind" = 'extra' and "review_tasks"."completed_at" is null;--> statement-breakpoint
CREATE INDEX "review_tasks_item_due_idx" ON "review_tasks" USING btree ("learning_item_id","due_on");--> statement-breakpoint
CREATE INDEX "review_tasks_extra_created_idx" ON "review_tasks" USING btree ("kind","created_at") WHERE "review_tasks"."kind" = 'extra';--> statement-breakpoint
CREATE INDEX "review_tasks_assessment_id_idx" ON "review_tasks" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "speaking_assessments_status_created_idx" ON "speaking_assessments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "speaking_assessments_practice_session_id_idx" ON "speaking_assessments" USING btree ("practice_session_id");--> statement-breakpoint
CREATE INDEX "speaking_assessments_review_task_id_idx" ON "speaking_assessments" USING btree ("review_task_id");--> statement-breakpoint
CREATE INDEX "speaking_assessments_audio_asset_id_idx" ON "speaking_assessments" USING btree ("audio_asset_id");--> statement-breakpoint
CREATE INDEX "topic_requests_user_created_idx" ON "topic_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "topic_requests_normalized_text_idx" ON "topic_requests" USING btree ("normalized_text");--> statement-breakpoint
CREATE INDEX "topic_requests_matched_topic_id_idx" ON "topic_requests" USING btree ("matched_topic_id");--> statement-breakpoint
CREATE INDEX "topics_embedding_hnsw" ON "topics" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "validation_reports_version_id_idx" ON "validation_reports" USING btree ("version_id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_birth_year_range" CHECK ("profiles"."birth_year" between 1900 and 2100);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_daily_goal_positive" CHECK ("profiles"."daily_goal_minutes" > 0);