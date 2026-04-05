ALTER TABLE `file_attachments`
  ADD COLUMN `expires_at` DATETIME(3) NULL;

CREATE INDEX `fat_expires_del_idx`
  ON `file_attachments`(`expires_at`, `deleted_at`);
