CREATE TABLE `user_webauthn_credentials` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `credential_id` VARCHAR(255) NOT NULL,
  `public_key` TEXT NOT NULL,
  `counter` INT NOT NULL DEFAULT 0,
  `device_type` VARCHAR(40) NOT NULL,
  `backed_up` BOOLEAN NOT NULL DEFAULT false,
  `transports` VARCHAR(255) NULL,
  `credential_name` VARCHAR(120) NULL,
  `last_used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `user_webauthn_credentials_credential_id_key`(`credential_id`),
  INDEX `uwc_user_deleted_idx`(`user_id`, `deleted_at`),
  INDEX `uwc_last_used_idx`(`last_used_at`),
  INDEX `uwc_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_webauthn_credentials`
  ADD CONSTRAINT `user_webauthn_credentials_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `auth_webauthn_challenges` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NULL,
  `flow` ENUM('REGISTRATION', 'AUTHENTICATION') NOT NULL,
  `challenge` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  INDEX `awc_flow_exp_used_idx`(`flow`, `expires_at`, `used_at`),
  INDEX `awc_user_flow_deleted_idx`(`user_id`, `flow`, `deleted_at`),
  INDEX `awc_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `auth_webauthn_challenges`
  ADD CONSTRAINT `auth_webauthn_challenges_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;