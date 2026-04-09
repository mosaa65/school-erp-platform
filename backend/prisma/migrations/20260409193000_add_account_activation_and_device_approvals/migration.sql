-- Add lifecycle columns for first-time activation
ALTER TABLE `users`
  ADD COLUMN `activation_status` ENUM('ACTIVE', 'PENDING_INITIAL_PASSWORD', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER `password_hash`,
  ADD COLUMN `password_set_at` DATETIME(3) NULL AFTER `activation_status`,
  ADD COLUMN `initial_password_issued_at` DATETIME(3) NULL AFTER `password_set_at`,
  ADD COLUMN `initial_password_expires_at` DATETIME(3) NULL AFTER `initial_password_issued_at`;

ALTER TABLE `users`
  ADD COLUMN `guardian_id` VARCHAR(191) NULL AFTER `employee_id`,
  ADD UNIQUE INDEX `users_guardian_id_key` (`guardian_id`);

ALTER TABLE `users`
  ADD CONSTRAINT `users_guardian_id_fkey`
    FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create approval requests for first password setup and new-device login
CREATE TABLE `account_approval_requests` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `purpose` ENUM('FIRST_PASSWORD_SETUP', 'NEW_DEVICE_LOGIN') NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
  `login_id` VARCHAR(191) NULL,
  `pending_password_hash` VARCHAR(255) NULL,
  `approval_code_hash` VARCHAR(255) NOT NULL,
  `device_id` VARCHAR(191) NULL,
  `device_label` VARCHAR(191) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `approved_by_user_id` VARCHAR(191) NULL,
  `approved_at` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `rejected_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `acct_approval_user_status_del_idx`
  ON `account_approval_requests`(`user_id`, `status`, `deleted_at`);

CREATE INDEX `acct_approval_purpose_status_del_idx`
  ON `account_approval_requests`(`purpose`, `status`, `deleted_at`);

CREATE INDEX `acct_approval_expires_at_idx`
  ON `account_approval_requests`(`expires_at`);

CREATE INDEX `acct_approval_device_id_idx`
  ON `account_approval_requests`(`device_id`);

ALTER TABLE `account_approval_requests`
  ADD CONSTRAINT `account_approval_requests_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `account_approval_requests_approved_by_user_id_fkey`
    FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
