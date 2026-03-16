-- CreateTable
CREATE TABLE `academic_months` (
    `id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `sequence` INTEGER NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `is_current` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `acm_term_code_uq`(`academic_term_id`, `code`),
    UNIQUE INDEX `acm_term_sequence_uq`(`academic_term_id`, `sequence`),
    INDEX `acm_year_term_del_idx`(`academic_year_id`, `academic_term_id`, `deleted_at`),
    INDEX `acm_start_del_idx`(`start_date`, `deleted_at`),
    INDEX `acm_end_del_idx`(`end_date`, `deleted_at`),
    INDEX `acm_status_del_idx`(`status`, `deleted_at`),
    INDEX `acm_current_del_idx`(`is_current`, `deleted_at`),
    INDEX `acm_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `acm_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_grades` (
    `id` VARCHAR(191) NOT NULL,
    `student_enrollment_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `academic_month_id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `grading_policy_id` VARCHAR(191) NOT NULL,
    `attendance_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `homework_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `activity_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `contribution_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `custom_components_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `exam_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `monthly_total` DECIMAL(7, 2) NOT NULL DEFAULT 0.00,
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

    UNIQUE INDEX `mng_enrollment_subject_month_uq`(`student_enrollment_id`, `subject_id`, `academic_month_id`),
    INDEX `mng_month_subject_del_idx`(`academic_month_id`, `subject_id`, `deleted_at`),
    INDEX `mng_year_term_del_idx`(`academic_year_id`, `academic_term_id`, `deleted_at`),
    INDEX `mng_policy_del_idx`(`grading_policy_id`, `deleted_at`),
    INDEX `mng_status_del_idx`(`status`, `deleted_at`),
    INDEX `mng_locked_del_idx`(`is_locked`, `deleted_at`),
    INDEX `mng_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `mng_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_custom_component_scores` (
    `id` VARCHAR(191) NOT NULL,
    `monthly_grade_id` VARCHAR(191) NOT NULL,
    `grading_policy_component_id` VARCHAR(191) NOT NULL,
    `score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `mcc_monthly_grade_component_uq`(`monthly_grade_id`, `grading_policy_component_id`),
    INDEX `mcc_component_del_idx`(`grading_policy_component_id`, `deleted_at`),
    INDEX `mcc_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `mcc_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `academic_months` ADD CONSTRAINT `academic_months_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_months` ADD CONSTRAINT `academic_months_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_months` ADD CONSTRAINT `academic_months_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `academic_months` ADD CONSTRAINT `academic_months_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_student_enrollment_id_fkey` FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_academic_month_id_fkey` FOREIGN KEY (`academic_month_id`) REFERENCES `academic_months`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_grading_policy_id_fkey` FOREIGN KEY (`grading_policy_id`) REFERENCES `grading_policies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_locked_by_user_id_fkey` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_grades` ADD CONSTRAINT `monthly_grades_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_custom_component_scores` ADD CONSTRAINT `monthly_custom_component_scores_monthly_grade_id_fkey` FOREIGN KEY (`monthly_grade_id`) REFERENCES `monthly_grades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_custom_component_scores` ADD CONSTRAINT `monthly_custom_component_scores_grading_policy_component_id_fkey` FOREIGN KEY (`grading_policy_component_id`) REFERENCES `grading_policy_components`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_custom_component_scores` ADD CONSTRAINT `monthly_custom_component_scores_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monthly_custom_component_scores` ADD CONSTRAINT `monthly_custom_component_scores_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;