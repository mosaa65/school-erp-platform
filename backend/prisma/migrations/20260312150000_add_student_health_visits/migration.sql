CREATE TABLE `student_health_visits` (
  `id` varchar(191) NOT NULL,
  `student_id` varchar(191) NOT NULL,
  `nurse_id` varchar(191) DEFAULT NULL,
  `health_status_id` int DEFAULT NULL,
  `visit_date` datetime NOT NULL,
  `notes` varchar(1000) DEFAULT NULL,
  `follow_up_required` tinyint(1) NOT NULL DEFAULT 0,
  `follow_up_notes` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` varchar(191) DEFAULT NULL,
  `updated_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `student_health_visits_student_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  CONSTRAINT `student_health_visits_nurse_fk` FOREIGN KEY (`nurse_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
  CONSTRAINT `student_health_visits_health_status_fk` FOREIGN KEY (`health_status_id`) REFERENCES `lookup_health_statuses`(`id`) ON DELETE SET NULL,
  CONSTRAINT `student_health_visits_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  CONSTRAINT `student_health_visits_updated_by_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `shv_student_visit_date_idx` ON `student_health_visits` (`student_id`, `visit_date`);
CREATE INDEX `shv_health_status_idx` ON `student_health_visits` (`health_status_id`);
CREATE INDEX `shv_nurse_idx` ON `student_health_visits` (`nurse_id`);
CREATE INDEX `shv_deleted_at_idx` ON `student_health_visits` (`deleted_at`);
