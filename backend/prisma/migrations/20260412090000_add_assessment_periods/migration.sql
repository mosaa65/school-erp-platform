-- CreateTable
CREATE TABLE `assessment_periods` (
    `id` VARCHAR(191) NOT NULL,
    `category` ENUM('MONTHLY', 'SEMESTER', 'YEAR_FINAL') NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NULL,
    `academic_month_id` VARCHAR(191) NULL,
    `name` VARCHAR(160) NOT NULL,
    `sequence` INTEGER NOT NULL DEFAULT 1,
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

    UNIQUE INDEX `ap_scope_name_uq`(`academic_year_id`, `category`, `academic_term_id`, `academic_month_id`, `name`),
    INDEX `ap_year_term_del_idx`(`academic_year_id`, `academic_term_id`, `deleted_at`),
    INDEX `ap_month_del_idx`(`academic_month_id`, `deleted_at`),
    INDEX `ap_status_del_idx`(`status`, `deleted_at`),
    INDEX `ap_locked_del_idx`(`is_locked`, `deleted_at`),
    INDEX `ap_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `ap_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_period_components` (
    `id` VARCHAR(191) NOT NULL,
    `assessment_period_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `entry_mode` ENUM('MANUAL', 'AUTO_ATTENDANCE', 'AUTO_HOMEWORK', 'AUTO_EXAM', 'AGGREGATED_PERIODS') NOT NULL DEFAULT 'MANUAL',
    `max_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `sort_order` INTEGER NOT NULL DEFAULT 1,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `apc_period_code_uq`(`assessment_period_id`, `code`),
    INDEX `apc_period_del_idx`(`assessment_period_id`, `deleted_at`),
    INDEX `apc_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `apc_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_component_source_periods` (
    `id` VARCHAR(191) NOT NULL,
    `assessment_period_component_id` VARCHAR(191) NOT NULL,
    `source_period_id` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `acsp_component_source_uq`(`assessment_period_component_id`, `source_period_id`),
    INDEX `acsp_source_del_idx`(`source_period_id`, `deleted_at`),
    INDEX `acsp_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_period_results` (
    `id` VARCHAR(191) NOT NULL,
    `assessment_period_id` VARCHAR(191) NOT NULL,
    `student_enrollment_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NULL,
    `academic_month_id` VARCHAR(191) NULL,
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

    UNIQUE INDEX `spr_period_enrollment_subject_uq`(`assessment_period_id`, `student_enrollment_id`, `subject_id`),
    INDEX `spr_enrollment_del_idx`(`student_enrollment_id`, `deleted_at`),
    INDEX `spr_period_del_idx`(`assessment_period_id`, `deleted_at`),
    INDEX `spr_year_term_del_idx`(`academic_year_id`, `academic_term_id`, `deleted_at`),
    INDEX `spr_month_del_idx`(`academic_month_id`, `deleted_at`),
    INDEX `spr_status_del_idx`(`status`, `deleted_at`),
    INDEX `spr_locked_del_idx`(`is_locked`, `deleted_at`),
    INDEX `spr_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `spr_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_period_component_scores` (
    `id` VARCHAR(191) NOT NULL,
    `student_period_result_id` VARCHAR(191) NOT NULL,
    `assessment_period_component_id` VARCHAR(191) NOT NULL,
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

    UNIQUE INDEX `spcs_result_component_uq`(`student_period_result_id`, `assessment_period_component_id`),
    INDEX `spcs_result_del_idx`(`student_period_result_id`, `deleted_at`),
    INDEX `spcs_component_del_idx`(`assessment_period_component_id`, `deleted_at`),
    INDEX `spcs_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `spcs_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_academic_month_id_fkey` FOREIGN KEY (`academic_month_id`) REFERENCES `academic_months`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_locked_by_user_id_fkey` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_periods` ADD CONSTRAINT `assessment_periods_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_period_components` ADD CONSTRAINT `assessment_period_components_assessment_period_id_fkey` FOREIGN KEY (`assessment_period_id`) REFERENCES `assessment_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_period_components` ADD CONSTRAINT `assessment_period_components_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_period_components` ADD CONSTRAINT `assessment_period_components_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_component_source_periods` ADD CONSTRAINT `assessment_component_source_periods_assessment_period_component_id_fkey` FOREIGN KEY (`assessment_period_component_id`) REFERENCES `assessment_period_components`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_component_source_periods` ADD CONSTRAINT `assessment_component_source_periods_source_period_id_fkey` FOREIGN KEY (`source_period_id`) REFERENCES `assessment_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_component_source_periods` ADD CONSTRAINT `assessment_component_source_periods_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_component_source_periods` ADD CONSTRAINT `assessment_component_source_periods_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_assessment_period_id_fkey` FOREIGN KEY (`assessment_period_id`) REFERENCES `assessment_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_student_enrollment_id_fkey` FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_academic_month_id_fkey` FOREIGN KEY (`academic_month_id`) REFERENCES `academic_months`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_term_subject_offering_id_fkey` FOREIGN KEY (`term_subject_offering_id`) REFERENCES `term_subject_offerings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_locked_by_user_id_fkey` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_results` ADD CONSTRAINT `student_period_results_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_component_scores` ADD CONSTRAINT `student_period_component_scores_student_period_result_id_fkey` FOREIGN KEY (`student_period_result_id`) REFERENCES `student_period_results`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_component_scores` ADD CONSTRAINT `student_period_component_scores_assessment_period_component_id_fkey` FOREIGN KEY (`assessment_period_component_id`) REFERENCES `assessment_period_components`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_component_scores` ADD CONSTRAINT `student_period_component_scores_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_period_component_scores` ADD CONSTRAINT `student_period_component_scores_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
