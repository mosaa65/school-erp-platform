CREATE TABLE `user_notification_preferences` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `in_app_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `action_required_only` TINYINT(1) NOT NULL DEFAULT 0,
  `leave_notifications_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `contract_notifications_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `document_notifications_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `lifecycle_notifications_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `user_notification_preferences_user_id_key`(`user_id`),
  INDEX `unp_updated_at_idx`(`updated_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_notification_preferences`
  ADD CONSTRAINT `user_notification_preferences_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
