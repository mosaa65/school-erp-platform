CREATE TABLE `user_auth_factors` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `type` ENUM('TOTP') NOT NULL DEFAULT 'TOTP',
  `secret_encrypted` TEXT NOT NULL,
  `is_enabled` BOOLEAN NOT NULL DEFAULT false,
  `verified_at` DATETIME(3) NULL,
  `last_used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `uaf_user_type_uq`(`user_id`, `type`),
  INDEX `uaf_user_enabled_del_idx`(`user_id`, `is_enabled`, `deleted_at`),
  INDEX `uaf_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_auth_factors`
  ADD CONSTRAINT `user_auth_factors_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `auth_mfa_challenges` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `factor_type` ENUM('TOTP') NOT NULL DEFAULT 'TOTP',
  `login_id` VARCHAR(191) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `device_id` VARCHAR(191) NULL,
  `device_label` VARCHAR(191) NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `consumed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  INDEX `amc_user_exp_idx`(`user_id`, `expires_at`),
  INDEX `amc_exp_cons_idx`(`expires_at`, `consumed_at`),
  INDEX `amc_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `auth_mfa_challenges`
  ADD CONSTRAINT `auth_mfa_challenges_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;