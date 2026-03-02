-- CreateTable
CREATE TABLE `lookup_annual_statuses` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `lookup_annual_statuses_code_key`(`code`),
    INDEX `las_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `las_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lookup_promotion_decisions` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `lookup_promotion_decisions_code_key`(`code`),
    INDEX `lpd_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `lpd_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grading_outcome_rules` (
    `id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `grade_level_id` VARCHAR(191) NOT NULL,
    `promoted_max_failed_subjects` INTEGER NOT NULL DEFAULT 0,
    `conditional_max_failed_subjects` INTEGER NOT NULL DEFAULT 2,
    `conditional_decision_id` VARCHAR(191) NOT NULL,
    `retained_decision_id` VARCHAR(191) NOT NULL,
    `tie_break_strategy` ENUM('PERCENTAGE_ONLY', 'PERCENTAGE_THEN_TOTAL', 'PERCENTAGE_THEN_NAME') NOT NULL DEFAULT 'PERCENTAGE_THEN_NAME',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `gor_year_grade_uq`(`academic_year_id`, `grade_level_id`),
    INDEX `gor_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `gor_deleted_at_idx`(`deleted_at`),
    CONSTRAINT `gor_conditional_gte_promoted_chk` CHECK (`conditional_max_failed_subjects` >= `promoted_max_failed_subjects`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `semester_grades` (
    `id` VARCHAR(191) NOT NULL,
    `student_enrollment_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `semester_work_total` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
    `final_exam_score` DECIMAL(7, 2) NULL,
    `semester_total` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `locked_at` DATETIME(3) NULL,
    `locked_by_user_id` VARCHAR(191) NULL,
    `calculated_at` DATETIME(3) NULL,
    `approved_by_user_id` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `smg_enrollment_subject_term_uq`(`student_enrollment_id`, `subject_id`, `academic_term_id`),
    INDEX `smg_year_term_del_idx`(`academic_year_id`, `academic_term_id`, `deleted_at`),
    INDEX `smg_term_subject_del_idx`(`academic_term_id`, `subject_id`, `deleted_at`),
    INDEX `smg_status_del_idx`(`status`, `deleted_at`),
    INDEX `smg_locked_del_idx`(`is_locked`, `deleted_at`),
    INDEX `smg_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `smg_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `annual_grades` (
    `id` VARCHAR(191) NOT NULL,
    `student_enrollment_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `semester1_total` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
    `semester2_total` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
    `annual_total` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `annual_percentage` DECIMAL(5, 2) NULL,
    `final_status_id` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `locked_at` DATETIME(3) NULL,
    `locked_by_user_id` VARCHAR(191) NULL,
    `calculated_at` DATETIME(3) NULL,
    `approved_by_user_id` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `ang_enrollment_subject_year_uq`(`student_enrollment_id`, `subject_id`, `academic_year_id`),
    INDEX `ang_year_subject_del_idx`(`academic_year_id`, `subject_id`, `deleted_at`),
    INDEX `ang_final_status_del_idx`(`final_status_id`, `deleted_at`),
    INDEX `ang_status_del_idx`(`status`, `deleted_at`),
    INDEX `ang_locked_del_idx`(`is_locked`, `deleted_at`),
    INDEX `ang_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `ang_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `annual_results` (
    `id` VARCHAR(191) NOT NULL,
    `student_enrollment_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `total_all_subjects` DECIMAL(9, 2) NOT NULL DEFAULT 0.00,
    `max_possible_total` DECIMAL(9, 2) NOT NULL DEFAULT 0.00,
    `percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `rank_in_class` INTEGER NULL,
    `rank_in_grade` INTEGER NULL,
    `passed_subjects_count` INTEGER NOT NULL DEFAULT 0,
    `failed_subjects_count` INTEGER NOT NULL DEFAULT 0,
    `promotion_decision_id` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `locked_at` DATETIME(3) NULL,
    `locked_by_user_id` VARCHAR(191) NULL,
    `calculated_at` DATETIME(3) NULL,
    `approved_by_user_id` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `anr_enrollment_year_uq`(`student_enrollment_id`, `academic_year_id`),
    INDEX `anr_year_del_idx`(`academic_year_id`, `deleted_at`),
    INDEX `anr_decision_del_idx`(`promotion_decision_id`, `deleted_at`),
    INDEX `anr_percentage_del_idx`(`percentage`, `deleted_at`),
    INDEX `anr_status_del_idx`(`status`, `deleted_at`),
    INDEX `anr_locked_del_idx`(`is_locked`, `deleted_at`),
    INDEX `anr_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `anr_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lookup_annual_statuses` ADD CONSTRAINT `lookup_annual_statuses_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_annual_statuses` ADD CONSTRAINT `lookup_annual_statuses_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_promotion_decisions` ADD CONSTRAINT `lookup_promotion_decisions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_promotion_decisions` ADD CONSTRAINT `lookup_promotion_decisions_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_outcome_rules` ADD CONSTRAINT `grading_outcome_rules_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_outcome_rules` ADD CONSTRAINT `grading_outcome_rules_grade_level_id_fkey` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_outcome_rules` ADD CONSTRAINT `grading_outcome_rules_conditional_decision_id_fkey` FOREIGN KEY (`conditional_decision_id`) REFERENCES `lookup_promotion_decisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_outcome_rules` ADD CONSTRAINT `grading_outcome_rules_retained_decision_id_fkey` FOREIGN KEY (`retained_decision_id`) REFERENCES `lookup_promotion_decisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_outcome_rules` ADD CONSTRAINT `grading_outcome_rules_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_outcome_rules` ADD CONSTRAINT `grading_outcome_rules_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_grades` ADD CONSTRAINT `semester_grades_student_enrollment_id_fkey` FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_grades` ADD CONSTRAINT `semester_grades_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_grades` ADD CONSTRAINT `semester_grades_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_grades` ADD CONSTRAINT `semester_grades_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_grades` ADD CONSTRAINT `semester_grades_locked_by_user_id_fkey` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_grades` ADD CONSTRAINT `semester_grades_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_grades` ADD CONSTRAINT `semester_grades_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `semester_grades` ADD CONSTRAINT `semester_grades_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_grades` ADD CONSTRAINT `annual_grades_student_enrollment_id_fkey` FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_grades` ADD CONSTRAINT `annual_grades_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_grades` ADD CONSTRAINT `annual_grades_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_grades` ADD CONSTRAINT `annual_grades_final_status_id_fkey` FOREIGN KEY (`final_status_id`) REFERENCES `lookup_annual_statuses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_grades` ADD CONSTRAINT `annual_grades_locked_by_user_id_fkey` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_grades` ADD CONSTRAINT `annual_grades_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_grades` ADD CONSTRAINT `annual_grades_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_grades` ADD CONSTRAINT `annual_grades_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_results` ADD CONSTRAINT `annual_results_student_enrollment_id_fkey` FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_results` ADD CONSTRAINT `annual_results_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_results` ADD CONSTRAINT `annual_results_promotion_decision_id_fkey` FOREIGN KEY (`promotion_decision_id`) REFERENCES `lookup_promotion_decisions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_results` ADD CONSTRAINT `annual_results_locked_by_user_id_fkey` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_results` ADD CONSTRAINT `annual_results_approved_by_user_id_fkey` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_results` ADD CONSTRAINT `annual_results_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `annual_results` ADD CONSTRAINT `annual_results_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
