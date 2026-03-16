-- CreateTable
CREATE TABLE `grade_level_subjects` (
    `id` VARCHAR(191) NOT NULL,
    `academic_year_id` VARCHAR(191) NOT NULL,
    `grade_level_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT true,
    `weekly_periods` INTEGER NOT NULL DEFAULT 1,
    `display_order` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `gls_year_grade_subject_uq`(`academic_year_id`, `grade_level_id`, `subject_id`),
    INDEX `gls_year_grade_del_idx`(`academic_year_id`, `grade_level_id`, `deleted_at`),
    INDEX `gls_subject_del_idx`(`subject_id`, `deleted_at`),
    INDEX `gls_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `gls_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `grade_level_subjects` ADD CONSTRAINT `grade_level_subjects_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grade_level_subjects` ADD CONSTRAINT `grade_level_subjects_grade_level_id_fkey` FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grade_level_subjects` ADD CONSTRAINT `grade_level_subjects_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grade_level_subjects` ADD CONSTRAINT `grade_level_subjects_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grade_level_subjects` ADD CONSTRAINT `grade_level_subjects_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
