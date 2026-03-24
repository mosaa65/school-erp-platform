CREATE TABLE `classrooms` (
  `id` varchar(191) NOT NULL,
  `code` varchar(40) NOT NULL,
  `name` varchar(120) NOT NULL,
  `capacity` int DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` varchar(191) DEFAULT NULL,
  `updated_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `classrooms_code_uq` (`code`),
  KEY `classrooms_active_del_idx` (`is_active`, `deleted_at`),
  KEY `classrooms_deleted_at_idx` (`deleted_at`),
  CONSTRAINT `classrooms_created_by_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `classrooms_updated_by_fk`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `timetable_entries`
  ADD COLUMN `classroom_id` varchar(191) DEFAULT NULL AFTER `section_id`;

ALTER TABLE `timetable_entries`
  ADD CONSTRAINT `tte_classroom_fk`
    FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`) ON DELETE SET NULL;

CREATE INDEX `tte_classroom_del_idx`
  ON `timetable_entries` (`classroom_id`, `deleted_at`);

CREATE TABLE `section_classroom_assignments` (
  `id` varchar(191) NOT NULL,
  `section_id` varchar(191) NOT NULL,
  `classroom_id` varchar(191) NOT NULL,
  `academic_year_id` varchar(191) NOT NULL,
  `effective_from` datetime DEFAULT NULL,
  `effective_to` datetime DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` varchar(191) DEFAULT NULL,
  `updated_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `sca_year_section_del_idx` (`academic_year_id`, `section_id`, `deleted_at`),
  KEY `sca_year_classroom_del_idx` (`academic_year_id`, `classroom_id`, `deleted_at`),
  KEY `sca_active_del_idx` (`is_active`, `deleted_at`),
  KEY `sca_deleted_at_idx` (`deleted_at`),
  CONSTRAINT `sca_section_fk`
    FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `sca_classroom_fk`
    FOREIGN KEY (`classroom_id`) REFERENCES `classrooms` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `sca_academic_year_fk`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `sca_created_by_fk`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `sca_updated_by_fk`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
