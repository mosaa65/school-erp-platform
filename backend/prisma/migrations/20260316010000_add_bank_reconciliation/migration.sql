-- Add bank reconciliation tables.

CREATE TABLE `bank_reconciliation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `bank_account_id` INTEGER NOT NULL,
  `statement_date` DATE NOT NULL,
  `statement_reference` VARCHAR(50) NULL,
  `bank_balance` DECIMAL(18, 2) NOT NULL,
  `book_balance` DECIMAL(18, 2) NOT NULL,
  `difference` DECIMAL(18, 2) NOT NULL,
  `status` ENUM('OPEN','IN_PROGRESS','RECONCILED') NOT NULL DEFAULT 'OPEN',
  `reconciled_by` VARCHAR(191) NULL,
  `reconciled_at` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  INDEX `br_bank_account_idx`(`bank_account_id`),
  INDEX `br_statement_date_idx`(`statement_date`),
  INDEX `br_status_idx`(`status`),
  INDEX `br_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `br_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reconciliation_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `reconciliation_id` INTEGER NOT NULL,
  `transaction_id` VARCHAR(191) NULL,
  `journal_entry_id` VARCHAR(191) NULL,
  `bank_reference` VARCHAR(100) NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `item_type` ENUM('MATCHED','UNMATCHED_BANK','UNMATCHED_BOOK') NOT NULL,
  `matched_at` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  INDEX `ri_reconciliation_idx`(`reconciliation_id`),
  INDEX `ri_transaction_idx`(`transaction_id`),
  INDEX `ri_journal_entry_idx`(`journal_entry_id`),
  INDEX `ri_type_idx`(`item_type`),
  INDEX `ri_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `ri_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `bank_reconciliation`
  ADD CONSTRAINT `bank_reconciliation_bank_account_id_fkey`
    FOREIGN KEY (`bank_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `bank_reconciliation_reconciled_by_fkey`
    FOREIGN KEY (`reconciled_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bank_reconciliation_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `bank_reconciliation_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `reconciliation_items`
  ADD CONSTRAINT `reconciliation_items_reconciliation_id_fkey`
    FOREIGN KEY (`reconciliation_id`) REFERENCES `bank_reconciliation`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_items_transaction_id_fkey`
    FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_items_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_items_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_items_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
