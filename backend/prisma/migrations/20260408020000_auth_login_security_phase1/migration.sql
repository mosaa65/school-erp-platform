ALTER TABLE `users`
  ADD COLUMN `phone_country_code` VARCHAR(8) NULL,
  ADD COLUMN `phone_national_number` VARCHAR(32) NULL,
  ADD COLUMN `phone_e164` VARCHAR(20) NULL;

CREATE UNIQUE INDEX `users_phone_e164_key` ON `users`(`phone_e164`);

ALTER TABLE `sessions`
  ADD COLUMN `device_id` VARCHAR(191) NULL,
  ADD COLUMN `device_label` VARCHAR(191) NULL,
  ADD COLUMN `refresh_token_hash` VARCHAR(255) NULL,
  ADD COLUMN `is_revoked` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `revoked_at` DATETIME(3) NULL,
  ADD COLUMN `revoked_reason` VARCHAR(255) NULL,
  ADD COLUMN `rotated_from_session_id` VARCHAR(128) NULL;

CREATE INDEX `session_refresh_token_hash_idx` ON `sessions`(`refresh_token_hash`);
CREATE INDEX `session_device_id_idx` ON `sessions`(`device_id`);
CREATE INDEX `session_revoked_deleted_idx` ON `sessions`(`is_revoked`, `deleted_at`);