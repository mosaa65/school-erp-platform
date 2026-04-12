CREATE INDEX audit_logs_deleted_at_occurred_at_idx
ON audit_logs(deleted_at, occurred_at);
