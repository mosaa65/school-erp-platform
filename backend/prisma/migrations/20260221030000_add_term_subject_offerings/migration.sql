-- CreateTable
CREATE TABLE `term_subject_offerings` (
    `id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NOT NULL,
    `grade_level_subject_id` VARCHAR(191) NOT NULL,
    `weekly_periods` INTEGER NOT NULL DEFAULT 1,
    `display_order` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `tso_term_gls_uq`(`academic_term_id`, `grade_level_subject_id`),
    INDEX `tso_term_del_idx`(`academic_term_id`, `deleted_at`),
    INDEX `tso_gls_del_idx`(`grade_level_subject_id`, `deleted_at`),
    INDEX `tso_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `tso_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `term_subject_offerings` ADD CONSTRAINT `term_subject_offerings_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `term_subject_offerings` ADD CONSTRAINT `term_subject_offerings_grade_level_subject_id_fkey` FOREIGN KEY (`grade_level_subject_id`) REFERENCES `grade_level_subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `term_subject_offerings` ADD CONSTRAINT `term_subject_offerings_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `term_subject_offerings` ADD CONSTRAINT `term_subject_offerings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
