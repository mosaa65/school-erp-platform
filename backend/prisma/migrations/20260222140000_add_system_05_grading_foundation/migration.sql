-- CreateTable
CREATE TABLE `grading_policies` (
    `id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `grade_level_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `assessment_type` ENUM('MONTHLY', 'MIDTERM', 'FINAL', 'QUIZ', 'ORAL', 'PRACTICAL', 'PROJECT') NOT NULL DEFAULT 'MONTHLY',
    `max_exam_score` DECIMAL(6, 2) NOT NULL DEFAULT 20.00,
    `max_homework_score` DECIMAL(6, 2) NOT NULL DEFAULT 5.00,
    `max_attendance_score` DECIMAL(6, 2) NOT NULL DEFAULT 5.00,
    `max_activity_score` DECIMAL(6, 2) NOT NULL DEFAULT 5.00,
    `max_contribution_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `passing_score` DECIMAL(6, 2) NOT NULL DEFAULT 50.00,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `grp_year_grade_subject_type_uq`(`academic_year_id`, `grade_level_id`, `subject_id`, `assessment_type`),
    INDEX `grp_type_del_idx`(`assessment_type`, `deleted_at`),
    INDEX `grp_status_del_idx`(`status`, `deleted_at`),
    INDEX `grp_default_del_idx`(`is_default`, `deleted_at`),
    INDEX `grp_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `grp_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grading_policy_components` (
    `id` VARCHAR(191) NOT NULL,
    `grading_policy_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `max_score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `calculation_mode` ENUM('MANUAL', 'AUTO_ATTENDANCE', 'AUTO_HOMEWORK', 'AUTO_EXAM') NOT NULL DEFAULT 'MANUAL',
    `include_in_monthly` BOOLEAN NOT NULL DEFAULT true,
    `include_in_semester` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `gpc_policy_code_uq`(`grading_policy_id`, `code`),
    INDEX `gpc_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `gpc_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_periods` (
    `id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `assessment_type` ENUM('MONTHLY', 'MIDTERM', 'FINAL', 'QUIZ', 'ORAL', 'PRACTICAL', 'PROJECT') NOT NULL DEFAULT 'MONTHLY',
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
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

    UNIQUE INDEX `exp_term_name_uq`(`academic_term_id`, `name`),
    INDEX `exp_type_del_idx`(`assessment_type`, `deleted_at`),
    INDEX `exp_status_del_idx`(`status`, `deleted_at`),
    INDEX `exp_locked_del_idx`(`is_locked`, `deleted_at`),
    INDEX `exp_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `exp_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_assessments` (
    `id` VARCHAR(191) NOT NULL,
    `exam_period_id` VARCHAR(191) NOT NULL,
    `section_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `exam_date` DATETIME(3) NOT NULL,
    `max_score` DECIMAL(6, 2) NOT NULL DEFAULT 20.00,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `exa_period_section_subject_date_uq`(`exam_period_id`, `section_id`, `subject_id`, `exam_date`),
    INDEX `exa_period_del_idx`(`exam_period_id`, `deleted_at`),
    INDEX `exa_section_del_idx`(`section_id`, `deleted_at`),
    INDEX `exa_subject_del_idx`(`subject_id`, `deleted_at`),
    INDEX `exa_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `exa_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_exam_scores` (
    `id` VARCHAR(191) NOT NULL,
    `exam_assessment_id` VARCHAR(191) NOT NULL,
    `student_enrollment_id` VARCHAR(191) NOT NULL,
    `score` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    `is_present` BOOLEAN NOT NULL DEFAULT true,
    `absence_type` ENUM('EXCUSED', 'UNEXCUSED') NULL,
    `excuse_details` VARCHAR(255) NULL,
    `teacher_notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `ses_assessment_enrollment_uq`(`exam_assessment_id`, `student_enrollment_id`),
    INDEX `ses_enrollment_del_idx`(`student_enrollment_id`, `deleted_at`),
    INDEX `ses_present_del_idx`(`is_present`, `deleted_at`),
    INDEX `ses_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `ses_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `grading_policies` ADD CONSTRAINT `grading_policies_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_policies` ADD CONSTRAINT `grading_policies_grade_level_id_fkey` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_policies` ADD CONSTRAINT `grading_policies_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_policies` ADD CONSTRAINT `grading_policies_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_policies` ADD CONSTRAINT `grading_policies_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_policy_components` ADD CONSTRAINT `grading_policy_components_grading_policy_id_fkey` FOREIGN KEY (`grading_policy_id`) REFERENCES `grading_policies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_policy_components` ADD CONSTRAINT `grading_policy_components_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grading_policy_components` ADD CONSTRAINT `grading_policy_components_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_periods` ADD CONSTRAINT `exam_periods_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_periods` ADD CONSTRAINT `exam_periods_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_periods` ADD CONSTRAINT `exam_periods_locked_by_user_id_fkey` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_periods` ADD CONSTRAINT `exam_periods_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_periods` ADD CONSTRAINT `exam_periods_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_assessments` ADD CONSTRAINT `exam_assessments_exam_period_id_fkey` FOREIGN KEY (`exam_period_id`) REFERENCES `exam_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_assessments` ADD CONSTRAINT `exam_assessments_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_assessments` ADD CONSTRAINT `exam_assessments_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_assessments` ADD CONSTRAINT `exam_assessments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exam_assessments` ADD CONSTRAINT `exam_assessments_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_exam_scores` ADD CONSTRAINT `student_exam_scores_exam_assessment_id_fkey` FOREIGN KEY (`exam_assessment_id`) REFERENCES `exam_assessments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_exam_scores` ADD CONSTRAINT `student_exam_scores_student_enrollment_id_fkey` FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_exam_scores` ADD CONSTRAINT `student_exam_scores_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_exam_scores` ADD CONSTRAINT `student_exam_scores_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;