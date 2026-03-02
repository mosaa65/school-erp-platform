-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `job_number` VARCHAR(40) NULL,
    `financial_number` VARCHAR(40) NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    `birth_date` DATETIME(3) NULL,
    `phone_primary` VARCHAR(20) NULL,
    `phone_secondary` VARCHAR(20) NULL,
    `has_whatsapp` BOOLEAN NOT NULL DEFAULT true,
    `qualification` VARCHAR(120) NULL,
    `qualification_date` DATETIME(3) NULL,
    `specialization` VARCHAR(100) NULL,
    `id_number` VARCHAR(30) NULL,
    `id_expiry_date` DATETIME(3) NULL,
    `experience_years` INTEGER NOT NULL DEFAULT 0,
    `employment_type` ENUM('PERMANENT', 'CONTRACT', 'VOLUNTEER') NULL,
    `job_title` VARCHAR(120) NULL,
    `hire_date` DATETIME(3) NULL,
    `previous_school` VARCHAR(120) NULL,
    `salary_approved` BOOLEAN NOT NULL DEFAULT false,
    `system_access_status` ENUM('GRANTED', 'SUSPENDED') NOT NULL DEFAULT 'GRANTED',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `employees_job_number_key`(`job_number`),
    UNIQUE INDEX `employees_financial_number_key`(`financial_number`),
    INDEX `emp_name_del_idx`(`full_name`, `deleted_at`),
    INDEX `emp_type_del_idx`(`employment_type`, `deleted_at`),
    INDEX `emp_job_del_idx`(`job_title`, `deleted_at`),
    INDEX `emp_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `emp_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NULL,
    `task_name` VARCHAR(120) NOT NULL,
    `day_of_week` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NULL,
    `assignment_date` DATETIME(3) NULL,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `et_employee_del_idx`(`employee_id`, `deleted_at`),
    INDEX `et_year_del_idx`(`academic_year_id`, `deleted_at`),
    INDEX `et_day_del_idx`(`day_of_week`, `deleted_at`),
    INDEX `et_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `et_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_teaching_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `section_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `weekly_periods` INTEGER NOT NULL DEFAULT 1,
    `is_primary` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `eta_section_subject_year_uq`(`section_id`, `subject_id`, `academic_year_id`),
    INDEX `eta_emp_year_del_idx`(`employee_id`, `academic_year_id`, `deleted_at`),
    INDEX `eta_section_del_idx`(`section_id`, `deleted_at`),
    INDEX `eta_subject_del_idx`(`subject_id`, `deleted_at`),
    INDEX `eta_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `eta_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_attendance` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `attendance_date` DATETIME(3) NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED_ABSENCE', 'EARLY_LEAVE') NOT NULL,
    `check_in_at` DATETIME(3) NULL,
    `check_out_at` DATETIME(3) NULL,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `ea_employee_date_uq`(`employee_id`, `attendance_date`),
    INDEX `ea_date_del_idx`(`attendance_date`, `deleted_at`),
    INDEX `ea_status_del_idx`(`status`, `deleted_at`),
    INDEX `ea_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `ea_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_performance_evaluations` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `evaluation_date` DATETIME(3) NOT NULL,
    `score` INTEGER NOT NULL,
    `rating_level` ENUM('EXCELLENT', 'VERY_GOOD', 'GOOD', 'ACCEPTABLE', 'POOR') NOT NULL,
    `evaluator_employee_id` VARCHAR(191) NULL,
    `strengths` VARCHAR(1000) NULL,
    `weaknesses` VARCHAR(1000) NULL,
    `recommendations` VARCHAR(1000) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `epe_employee_year_uq`(`employee_id`, `academic_year_id`),
    INDEX `epe_year_del_idx`(`academic_year_id`, `deleted_at`),
    INDEX `epe_eval_del_idx`(`evaluator_employee_id`, `deleted_at`),
    INDEX `epe_rating_del_idx`(`rating_level`, `deleted_at`),
    INDEX `epe_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `epe_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_tasks` ADD CONSTRAINT `employee_tasks_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_tasks` ADD CONSTRAINT `employee_tasks_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_tasks` ADD CONSTRAINT `employee_tasks_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_tasks` ADD CONSTRAINT `employee_tasks_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_teaching_assignments` ADD CONSTRAINT `employee_teaching_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_teaching_assignments` ADD CONSTRAINT `employee_teaching_assignments_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_teaching_assignments` ADD CONSTRAINT `employee_teaching_assignments_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_teaching_assignments` ADD CONSTRAINT `employee_teaching_assignments_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_teaching_assignments` ADD CONSTRAINT `employee_teaching_assignments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_teaching_assignments` ADD CONSTRAINT `employee_teaching_assignments_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_attendance` ADD CONSTRAINT `employee_attendance_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_attendance` ADD CONSTRAINT `employee_attendance_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_attendance` ADD CONSTRAINT `employee_attendance_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_performance_evaluations` ADD CONSTRAINT `employee_performance_evaluations_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_performance_evaluations` ADD CONSTRAINT `employee_performance_evaluations_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_performance_evaluations` ADD CONSTRAINT `employee_performance_evaluations_evaluator_employee_id_fkey` FOREIGN KEY (`evaluator_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_performance_evaluations` ADD CONSTRAINT `employee_performance_evaluations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_performance_evaluations` ADD CONSTRAINT `employee_performance_evaluations_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
