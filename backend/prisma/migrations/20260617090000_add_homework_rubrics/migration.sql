CREATE TABLE `homework_rubrics` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `homework_type_id` VARCHAR(191) NULL,
  `subject_id` VARCHAR(191) NULL,
  `grade_level_id` VARCHAR(191) NULL,
  `difficulty` VARCHAR(20) NOT NULL DEFAULT 'BALANCED',
  `max_score` DECIMAL(6, 2) NOT NULL DEFAULT 10.00,
  `is_system` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `homework_rubrics_code_key`(`code`),
  INDEX `hr_homework_type_del_idx`(`homework_type_id`, `deleted_at`),
  INDEX `hr_subject_del_idx`(`subject_id`, `deleted_at`),
  INDEX `hr_grade_level_del_idx`(`grade_level_id`, `deleted_at`),
  INDEX `hr_difficulty_del_idx`(`difficulty`, `deleted_at`),
  INDEX `hr_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `hr_deleted_at_idx`(`deleted_at`),
  INDEX `homework_rubrics_created_by_fkey`(`created_by`),
  INDEX `homework_rubrics_updated_by_fkey`(`updated_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `homework_rubric_criteria` (
  `id` VARCHAR(191) NOT NULL,
  `homework_rubric_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `max_score` DECIMAL(6, 2) NOT NULL,
  `weight` DECIMAL(6, 2) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 1,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  INDEX `hrc_rubric_del_idx`(`homework_rubric_id`, `deleted_at`),
  INDEX `hrc_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `hrc_deleted_at_idx`(`deleted_at`),
  INDEX `homework_rubric_criteria_created_by_fkey`(`created_by`),
  INDEX `homework_rubric_criteria_updated_by_fkey`(`updated_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `homework_rubrics`
  ADD CONSTRAINT `homework_rubrics_homework_type_id_fkey`
  FOREIGN KEY (`homework_type_id`) REFERENCES `homework_types`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `homework_rubrics`
  ADD CONSTRAINT `homework_rubrics_subject_id_fkey`
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `homework_rubrics`
  ADD CONSTRAINT `homework_rubrics_grade_level_id_fkey`
  FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `homework_rubrics`
  ADD CONSTRAINT `homework_rubrics_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `homework_rubrics`
  ADD CONSTRAINT `homework_rubrics_updated_by_fkey`
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `homework_rubric_criteria`
  ADD CONSTRAINT `homework_rubric_criteria_homework_rubric_id_fkey`
  FOREIGN KEY (`homework_rubric_id`) REFERENCES `homework_rubrics`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `homework_rubric_criteria`
  ADD CONSTRAINT `homework_rubric_criteria_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `homework_rubric_criteria`
  ADD CONSTRAINT `homework_rubric_criteria_updated_by_fkey`
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
