CREATE INDEX audit_logs_resource_resource_id_occurred_at_idx
ON audit_logs(resource, resource_id, occurred_at);
