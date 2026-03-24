-- Link payment transactions to journal entries for reconciliation.

ALTER TABLE `payment_transactions`
  ADD COLUMN `journal_entry_id` VARCHAR(191) NULL,
  ADD COLUMN `reconciled_at` DATETIME(3) NULL,
  ADD COLUMN `reconciled_by` VARCHAR(191) NULL;

CREATE INDEX `ptx_journal_entry_idx` ON `payment_transactions`(`journal_entry_id`);
CREATE INDEX `ptx_reconciled_at_idx` ON `payment_transactions`(`reconciled_at`);

ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_reconciled_by_fkey`
    FOREIGN KEY (`reconciled_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
