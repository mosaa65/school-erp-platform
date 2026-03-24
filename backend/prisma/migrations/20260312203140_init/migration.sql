-- DropForeignKey
ALTER TABLE `student_health_visits` DROP FOREIGN KEY `student_health_visits_created_by_fk`;

-- DropForeignKey
ALTER TABLE `student_health_visits` DROP FOREIGN KEY `student_health_visits_health_status_fk`;

-- DropForeignKey
ALTER TABLE `student_health_visits` DROP FOREIGN KEY `student_health_visits_nurse_fk`;

-- DropForeignKey
ALTER TABLE `student_health_visits` DROP FOREIGN KEY `student_health_visits_student_fk`;

-- DropForeignKey
ALTER TABLE `student_health_visits` DROP FOREIGN KEY `student_health_visits_updated_by_fk`;

-- DropIndex
DROP INDEX `student_health_visits_created_by_fk` ON `student_health_visits`;

-- DropIndex
DROP INDEX `student_health_visits_updated_by_fk` ON `student_health_visits`;

-- AlterTable
ALTER TABLE `student_health_visits` MODIFY `visit_date` DATETIME(3) NOT NULL,
    MODIFY `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updated_at` DATETIME(3) NOT NULL,
    MODIFY `deleted_at` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `student_health_visits` ADD CONSTRAINT `student_health_visits_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_health_visits` ADD CONSTRAINT `student_health_visits_nurse_id_fkey` FOREIGN KEY (`nurse_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_health_visits` ADD CONSTRAINT `student_health_visits_health_status_id_fkey` FOREIGN KEY (`health_status_id`) REFERENCES `lookup_health_statuses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_health_visits` ADD CONSTRAINT `student_health_visits_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_health_visits` ADD CONSTRAINT `student_health_visits_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
