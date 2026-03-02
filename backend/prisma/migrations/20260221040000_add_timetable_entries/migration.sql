-- CreateTable
CREATE TABLE `timetable_entries` (
    `id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NOT NULL,
    `section_id` VARCHAR(191) NOT NULL,
    `term_subject_offering_id` VARCHAR(191) NOT NULL,
    `day_of_week` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    `period_index` INTEGER NOT NULL,
    `room_label` VARCHAR(80) NULL,
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `tte_term_section_slot_uq`(`academic_term_id`, `section_id`, `day_of_week`, `period_index`),
    INDEX `tte_tso_del_idx`(`term_subject_offering_id`, `deleted_at`),
    INDEX `tte_term_section_del_idx`(`academic_term_id`, `section_id`, `deleted_at`),
    INDEX `tte_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `tte_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `timetable_entries` ADD CONSTRAINT `timetable_entries_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_entries` ADD CONSTRAINT `timetable_entries_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_entries` ADD CONSTRAINT `timetable_entries_term_subject_offering_id_fkey` FOREIGN KEY (`term_subject_offering_id`) REFERENCES `term_subject_offerings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_entries` ADD CONSTRAINT `timetable_entries_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_entries` ADD CONSTRAINT `timetable_entries_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
