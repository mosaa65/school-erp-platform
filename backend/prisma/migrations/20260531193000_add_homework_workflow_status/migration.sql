ALTER TABLE `homeworks`
  ADD COLUMN `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN `is_locked` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `approved_at` DATETIME(3) NULL,
  ADD COLUMN `locked_at` DATETIME(3) NULL,
  ADD COLUMN `approved_by` VARCHAR(191) NULL;

CREATE INDEX `hw_status_del_idx` ON `homeworks`(`status`, `deleted_at`);
CREATE INDEX `hw_locked_del_idx` ON `homeworks`(`is_locked`, `deleted_at`);
CREATE INDEX `hw_approved_by_idx` ON `homeworks`(`approved_by`);

ALTER TABLE `homeworks`
  ADD CONSTRAINT `homeworks_approved_by_fkey`
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
