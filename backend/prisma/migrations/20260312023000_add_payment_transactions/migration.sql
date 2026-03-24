-- Add finance payment transactions for internal simulation and offline payments.

CREATE TABLE `payment_transactions` (
  `id` VARCHAR(191) NOT NULL,
  `transaction_number` VARCHAR(30) NOT NULL,
  `gateway_id` INTEGER NOT NULL,
  `student_enrollment_id` VARCHAR(191) NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `payment_method` ENUM('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_WALLET', 'CHEQUE') NOT NULL,
  `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paid_at` DATETIME(3) NULL,
  `receipt_number` VARCHAR(50) NULL,
  `payer_name` VARCHAR(150) NULL,
  `payer_phone` VARCHAR(20) NULL,
  `reference_type` VARCHAR(30) NULL,
  `reference_id` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `payment_transactions_transaction_number_key`(`transaction_number`),
  INDEX `ptx_gateway_del_idx`(`gateway_id`, `deleted_at`),
  INDEX `ptx_status_del_idx`(`status`, `deleted_at`),
  INDEX `ptx_paid_at_idx`(`paid_at`),
  INDEX `ptx_enrollment_del_idx`(`student_enrollment_id`, `deleted_at`),
  INDEX `ptx_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `ptx_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_gateway_id_fkey`
    FOREIGN KEY (`gateway_id`) REFERENCES `payment_gateways`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_student_enrollment_id_fkey`
    FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
