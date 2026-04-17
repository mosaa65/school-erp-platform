-- Add dedicated monthly assessment tables.

CREATE TABLE `monthly_assessment_periods` (
  `id` VARCHAR(191) NOT NULL,
  `academic_year_id` VARCHAR(191) NOT NULL,
  `academic_term_id` VARCHAR(191) NOT NULL,
  `academic_month_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `sequence` INT NOT NULL DEFAULT 1,
  `max_score` DECIMAL(7, 2) NOT NULL DEFAULT 100.00,
  `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `is_locked` BOOLEAN NOT NULL DEFAULT false,
  `locked_at` DATETIME(3) NULL,
  `locked_by_user_id` VARCHAR(191) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `map_scope_name_uq` (`academic_year_id`, `academic_term_id`, `academic_month_id`, `name`),
  INDEX `map_year_term_del_idx` (`academic_year_id`, `academic_term_id`, `deleted_at`),
  INDEX `map_month_del_idx` (`academic_month_id`, `deleted_at`),
  INDEX `map_status_del_idx` (`status`, `deleted_at`),
  INDEX `map_locked_del_idx` (`is_locked`, `deleted_at`),
  INDEX `map_active_del_idx` (`is_active`, `deleted_at`),
  INDEX `map_deleted_at_idx` (`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `monthly_assessment_components` (
  `id` VARCHAR(191) NOT NULL,
  `monthly_assessment_period_id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `entry_mode` ENUM('MANUAL', 'AUTO_ATTENDANCE', 'AUTO_HOMEWORK', 'AUTO_EXAM', 'AGGREGATED_PERIODS') NOT NULL DEFAULT 'MANUAL',
  `max_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `sort_order` INT NOT NULL DEFAULT 1,
  `is_required` BOOLEAN NOT NULL DEFAULT true,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `mac_period_code_uq` (`monthly_assessment_period_id`, `code`),
  INDEX `mac_period_del_idx` (`monthly_assessment_period_id`, `deleted_at`),
  INDEX `mac_entry_mode_del_idx` (`entry_mode`, `deleted_at`),
  INDEX `mac_active_del_idx` (`is_active`, `deleted_at`),
  INDEX `mac_deleted_at_idx` (`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `monthly_student_results` (
  `id` VARCHAR(191) NOT NULL,
  `monthly_assessment_period_id` VARCHAR(191) NOT NULL,
  `student_enrollment_id` VARCHAR(191) NOT NULL,
  `subject_id` VARCHAR(191) NOT NULL,
  `academic_year_id` VARCHAR(191) NOT NULL,
  `academic_term_id` VARCHAR(191) NOT NULL,
  `academic_month_id` VARCHAR(191) NOT NULL,
  `term_subject_offering_id` VARCHAR(191) NULL,
  `section_id` VARCHAR(191) NULL,
  `total_score` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `is_locked` BOOLEAN NOT NULL DEFAULT false,
  `locked_at` DATETIME(3) NULL,
  `locked_by_user_id` VARCHAR(191) NULL,
  `calculated_at` DATETIME(3) NULL,
  `notes` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `msr_period_enrollment_subject_uq` (`monthly_assessment_period_id`, `student_enrollment_id`, `subject_id`),
  INDEX `msr_enrollment_del_idx` (`student_enrollment_id`, `deleted_at`),
  INDEX `msr_period_del_idx` (`monthly_assessment_period_id`, `deleted_at`),
  INDEX `msr_year_term_del_idx` (`academic_year_id`, `academic_term_id`, `deleted_at`),
  INDEX `msr_month_del_idx` (`academic_month_id`, `deleted_at`),
  INDEX `msr_status_del_idx` (`status`, `deleted_at`),
  INDEX `msr_locked_del_idx` (`is_locked`, `deleted_at`),
  INDEX `msr_active_del_idx` (`is_active`, `deleted_at`),
  INDEX `msr_deleted_at_idx` (`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `monthly_student_component_scores` (
  `id` VARCHAR(191) NOT NULL,
  `monthly_student_result_id` VARCHAR(191) NOT NULL,
  `monthly_assessment_component_id` VARCHAR(191) NOT NULL,
  `raw_score` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
  `final_score` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
  `is_auto_calculated` BOOLEAN NOT NULL DEFAULT false,
  `notes` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `mscs_result_component_uq` (`monthly_student_result_id`, `monthly_assessment_component_id`),
  INDEX `mscs_result_del_idx` (`monthly_student_result_id`, `deleted_at`),
  INDEX `mscs_component_del_idx` (`monthly_assessment_component_id`, `deleted_at`),
  INDEX `mscs_active_del_idx` (`is_active`, `deleted_at`),
  INDEX `mscs_deleted_at_idx` (`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `monthly_assessment_periods`
  ADD CONSTRAINT `monthly_assessment_periods_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_assessment_periods_academic_term_id_fkey`
    FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_assessment_periods_academic_month_id_fkey`
    FOREIGN KEY (`academic_month_id`) REFERENCES `academic_months`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_assessment_periods_locked_by_user_id_fkey`
    FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_assessment_periods_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_assessment_periods_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `monthly_assessment_components`
  ADD CONSTRAINT `monthly_assessment_components_period_id_fkey`
    FOREIGN KEY (`monthly_assessment_period_id`) REFERENCES `monthly_assessment_periods`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_assessment_components_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_assessment_components_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `monthly_student_results`
  ADD CONSTRAINT `monthly_student_results_period_id_fkey`
    FOREIGN KEY (`monthly_assessment_period_id`) REFERENCES `monthly_assessment_periods`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_student_enrollment_id_fkey`
    FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_subject_id_fkey`
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_academic_term_id_fkey`
    FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_academic_month_id_fkey`
    FOREIGN KEY (`academic_month_id`) REFERENCES `academic_months`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_term_subject_offering_id_fkey`
    FOREIGN KEY (`term_subject_offering_id`) REFERENCES `term_subject_offerings`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_section_id_fkey`
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_locked_by_user_id_fkey`
    FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_results_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `monthly_student_component_scores`
  ADD CONSTRAINT `monthly_student_component_scores_result_id_fkey`
    FOREIGN KEY (`monthly_student_result_id`) REFERENCES `monthly_student_results`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_component_scores_component_id_fkey`
    FOREIGN KEY (`monthly_assessment_component_id`) REFERENCES `monthly_assessment_components`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_component_scores_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `monthly_student_component_scores_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
