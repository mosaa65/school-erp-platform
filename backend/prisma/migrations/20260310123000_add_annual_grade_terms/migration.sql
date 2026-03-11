-- Add annual grade term breakdowns to support flexible number of academic terms.

CREATE TABLE `annual_grade_terms` (
  `id` VARCHAR(191) NOT NULL,
  `annual_grade_id` VARCHAR(191) NOT NULL,
  `academic_term_id` VARCHAR(191) NOT NULL,
  `term_total` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `agt_grade_term_uq` (`annual_grade_id`, `academic_term_id`),
  INDEX `agt_term_del_idx` (`academic_term_id`, `deleted_at`),
  INDEX `agt_active_del_idx` (`is_active`, `deleted_at`),
  INDEX `agt_deleted_at_idx` (`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `annual_grade_terms`
  ADD CONSTRAINT `annual_grade_terms_annual_grade_id_fkey`
    FOREIGN KEY (`annual_grade_id`) REFERENCES `annual_grades`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `annual_grade_terms_academic_term_id_fkey`
    FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `annual_grade_terms_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `annual_grade_terms_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
