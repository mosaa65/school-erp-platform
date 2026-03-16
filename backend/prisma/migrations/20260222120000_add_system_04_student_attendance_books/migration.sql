-- CreateTable
CREATE TABLE `student_attendance` (
    `id` VARCHAR(191) NOT NULL,
    `student_enrollment_id` VARCHAR(191) NOT NULL,
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

    UNIQUE INDEX `sat_enrollment_date_uq`(`student_enrollment_id`, `attendance_date`),
    INDEX `sat_enrollment_del_idx`(`student_enrollment_id`, `deleted_at`),
    INDEX `sat_date_del_idx`(`attendance_date`, `deleted_at`),
    INDEX `sat_status_del_idx`(`status`, `deleted_at`),
    INDEX `sat_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `sat_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_books` (
    `id` VARCHAR(191) NOT NULL,
    `student_enrollment_id` VARCHAR(191) NOT NULL,
    `subject_id` VARCHAR(191) NOT NULL,
    `book_part` VARCHAR(50) NOT NULL DEFAULT 'MAIN',
    `issued_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `returned_date` DATETIME(3) NULL,
    `status` ENUM('ISSUED', 'RETURNED', 'LOST', 'DAMAGED') NOT NULL DEFAULT 'ISSUED',
    `notes` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `sbk_enrollment_subject_part_uq`(`student_enrollment_id`, `subject_id`, `book_part`),
    INDEX `sbk_enrollment_del_idx`(`student_enrollment_id`, `deleted_at`),
    INDEX `sbk_subject_del_idx`(`subject_id`, `deleted_at`),
    INDEX `sbk_status_del_idx`(`status`, `deleted_at`),
    INDEX `sbk_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `sbk_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_attendance` ADD CONSTRAINT `student_attendance_student_enrollment_id_fkey` FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance` ADD CONSTRAINT `student_attendance_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance` ADD CONSTRAINT `student_attendance_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_books` ADD CONSTRAINT `student_books_student_enrollment_id_fkey` FOREIGN KEY (`student_enrollment_id`) REFERENCES `student_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_books` ADD CONSTRAINT `student_books_subject_id_fkey` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_books` ADD CONSTRAINT `student_books_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_books` ADD CONSTRAINT `student_books_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;