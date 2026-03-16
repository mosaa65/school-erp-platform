-- CreateTable
CREATE TABLE `employee_section_supervisions` (
    `id` VARCHAR(191) NOT NULL,
    `employee_id` VARCHAR(191) NOT NULL,
    `section_id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `can_view_students` BOOLEAN NOT NULL DEFAULT true,
    `can_manage_homeworks` BOOLEAN NOT NULL DEFAULT true,
    `can_manage_grades` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `ess_employee_section_year_uq`(`employee_id`, `section_id`, `academic_year_id`),
    INDEX `ess_emp_year_del_idx`(`employee_id`, `academic_year_id`, `deleted_at`),
    INDEX `ess_section_del_idx`(`section_id`, `deleted_at`),
    INDEX `ess_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `ess_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employee_section_supervisions` ADD CONSTRAINT `employee_section_supervisions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_section_supervisions` ADD CONSTRAINT `employee_section_supervisions_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_section_supervisions` ADD CONSTRAINT `employee_section_supervisions_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_section_supervisions` ADD CONSTRAINT `employee_section_supervisions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_section_supervisions` ADD CONSTRAINT `employee_section_supervisions_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
