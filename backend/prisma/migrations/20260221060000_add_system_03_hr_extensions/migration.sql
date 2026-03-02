-- CreateTable
CREATE TABLE `talents` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `talents_code_key`(`code`),
    INDEX `tal_name_del_idx`(`name`, `deleted_at`),
    INDEX `tal_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `tal_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_talents` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `talent_id` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `emt_employee_talent_uq`(`employee_id`, `talent_id`),
    INDEX `emt_employee_del_idx`(`employee_id`, `deleted_at`),
    INDEX `emt_talent_del_idx`(`talent_id`, `deleted_at`),
    INDEX `emt_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `emt_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_courses` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `course_name` VARCHAR(150) NOT NULL,
    `course_provider` VARCHAR(120) NULL,
    `course_date` DATETIME(3) NULL,
    `duration_days` INTEGER NULL,
    `certificate_number` VARCHAR(60) NULL,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `emc_employee_date_del_idx`(`employee_id`, `course_date`, `deleted_at`),
    INDEX `emc_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `emc_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_violations` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `violation_date` DATETIME(3) NOT NULL,
    `violation_aspect` VARCHAR(100) NOT NULL,
    `violation_text` VARCHAR(1000) NOT NULL,
    `action_taken` VARCHAR(1000) NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `has_warning` BOOLEAN NOT NULL DEFAULT false,
    `has_minutes` BOOLEAN NOT NULL DEFAULT false,
    `reported_by_employee_id` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `emv_employee_date_del_idx`(`employee_id`, `violation_date`, `deleted_at`),
    INDEX `emv_reporter_del_idx`(`reported_by_employee_id`, `deleted_at`),
    INDEX `emv_severity_del_idx`(`severity`, `deleted_at`),
    INDEX `emv_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `emv_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `talents` ADD CONSTRAINT `talents_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `talents` ADD CONSTRAINT `talents_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_talents` ADD CONSTRAINT `employee_talents_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_talents` ADD CONSTRAINT `employee_talents_talent_id_fkey` FOREIGN KEY (`talent_id`) REFERENCES `talents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_talents` ADD CONSTRAINT `employee_talents_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_talents` ADD CONSTRAINT `employee_talents_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_courses` ADD CONSTRAINT `employee_courses_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_courses` ADD CONSTRAINT `employee_courses_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_courses` ADD CONSTRAINT `employee_courses_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_violations` ADD CONSTRAINT `employee_violations_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_violations` ADD CONSTRAINT `employee_violations_reported_by_employee_id_fkey` FOREIGN KEY (`reported_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_violations` ADD CONSTRAINT `employee_violations_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_violations` ADD CONSTRAINT `employee_violations_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
