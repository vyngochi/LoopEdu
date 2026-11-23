-- Invariants that column constraints cannot express (PRD tech 11, AGENTS.md "Data"):
--   1. credit_ledger, admin_audit_logs, consent_records are append-only.
--   2. Active exam_blueprints and frameworks are immutable; the only allowed change is retiring them.
--   3. A published question_set_version is immutable.
-- Account purge may delete append-only rows: the purge transaction runs `SET LOCAL app.allow_purge = 'on'`.
CREATE FUNCTION forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.allow_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% on % is not allowed: the table is append-only', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation';
END
$$;--> statement-breakpoint
CREATE TRIGGER credit_ledger_append_only BEFORE UPDATE OR DELETE ON credit_ledger
  FOR EACH ROW EXECUTE FUNCTION forbid_change();--> statement-breakpoint
CREATE TRIGGER admin_audit_logs_append_only BEFORE UPDATE OR DELETE ON admin_audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_change();--> statement-breakpoint
CREATE TRIGGER consent_records_append_only BEFORE UPDATE OR DELETE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION forbid_change();--> statement-breakpoint
CREATE FUNCTION forbid_change_when_active() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'active' THEN
    IF TG_OP = 'DELETE'
       OR NEW.status NOT IN ('active', 'retired')
       OR (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
      RAISE EXCEPTION 'An active row in % is immutable; create a new version instead', TG_TABLE_NAME
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER exam_blueprints_immutable_when_active BEFORE UPDATE OR DELETE ON exam_blueprints
  FOR EACH ROW EXECUTE FUNCTION forbid_change_when_active();--> statement-breakpoint
CREATE TRIGGER frameworks_immutable_when_active BEFORE UPDATE OR DELETE ON frameworks
  FOR EACH ROW EXECUTE FUNCTION forbid_change_when_active();--> statement-breakpoint
CREATE FUNCTION forbid_change_when_published() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'A published question_set_version is immutable; create a new version instead'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER question_set_versions_immutable_when_published BEFORE UPDATE OR DELETE ON question_set_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_change_when_published();
