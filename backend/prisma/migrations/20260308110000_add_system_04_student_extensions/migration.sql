CREATE TABLE `student_talents` (
  `id` VARCHAR(191) NOT NULL,
  `student_id` VARCHAR(191) NOT NULL,
  `talent_id` VARCHAR(191) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `stt_student_talent_uq`(`student_id`, `talent_id`),
  INDEX `stt_student_del_idx`(`student_id`, `deleted_at`),
  INDEX `stt_talent_del_idx`(`talent_id`, `deleted_at`),
  INDEX `stt_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `stt_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `student_siblings` (
  `id` VARCHAR(191) NOT NULL,
  `student_id` VARCHAR(191) NOT NULL,
  `sibling_id` VARCHAR(191) NOT NULL,
  `relationship` ENUM('BROTHER', 'SISTER') NOT NULL,
  `notes` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `ssb_student_sibling_uq`(`student_id`, `sibling_id`),
  INDEX `ssb_student_del_idx`(`student_id`, `deleted_at`),
  INDEX `ssb_sibling_del_idx`(`sibling_id`, `deleted_at`),
  INDEX `ssb_relationship_del_idx`(`relationship`, `deleted_at`),
  INDEX `ssb_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `ssb_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ssb_distinct_siblings_chk` CHECK (`student_id` <> `sibling_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `student_problems` (
  `id` VARCHAR(191) NOT NULL,
  `student_id` VARCHAR(191) NOT NULL,
  `problem_date` DATETIME(3) NOT NULL,
  `problem_type` VARCHAR(50) NULL,
  `problem_description` VARCHAR(1000) NOT NULL,
  `actions_taken` VARCHAR(1000) NULL,
  `has_minutes` BOOLEAN NOT NULL DEFAULT false,
  `is_resolved` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  INDEX `spr_student_del_idx`(`student_id`, `deleted_at`),
  INDEX `spr_date_del_idx`(`problem_date`, `deleted_at`),
  INDEX `spr_resolved_del_idx`(`is_resolved`, `deleted_at`),
  INDEX `spr_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `spr_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `parent_notifications` (
  `id` VARCHAR(191) NOT NULL,
  `notification_number` INTEGER NOT NULL,
  `student_id` VARCHAR(191) NOT NULL,
  `notification_type` ENUM('POSITIVE', 'NEGATIVE') NOT NULL,
  `guardian_title_id` INTEGER NULL,
  `behavior_type` VARCHAR(100) NULL,
  `behavior_description` VARCHAR(1000) NULL,
  `required_action` VARCHAR(1000) NULL,
  `send_method` ENUM('PAPER', 'WHATSAPP', 'PHONE', 'OTHER') NOT NULL DEFAULT 'PAPER',
  `messenger_name` VARCHAR(100) NULL,
  `is_sent` BOOLEAN NOT NULL DEFAULT false,
  `sent_date` DATETIME(3) NULL,
  `results` VARCHAR(1000) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `parent_notifications_notification_number_key`(`notification_number`),
  INDEX `pnt_student_del_idx`(`student_id`, `deleted_at`),
  INDEX `pnt_type_del_idx`(`notification_type`, `deleted_at`),
  INDEX `pnt_guardian_title_del_idx`(`guardian_title_id`, `deleted_at`),
  INDEX `pnt_sent_del_idx`(`is_sent`, `sent_date`, `deleted_at`),
  INDEX `pnt_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `pnt_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `student_talents`
  ADD CONSTRAINT `student_talents_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_talents_talent_id_fkey`
    FOREIGN KEY (`talent_id`) REFERENCES `talents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_talents_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `student_talents_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `student_siblings`
  ADD CONSTRAINT `student_siblings_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_siblings_sibling_id_fkey`
    FOREIGN KEY (`sibling_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_siblings_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `student_siblings_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `student_problems`
  ADD CONSTRAINT `student_problems_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_problems_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `student_problems_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `parent_notifications`
  ADD CONSTRAINT `parent_notifications_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `parent_notifications_guardian_title_id_fkey`
    FOREIGN KEY (`guardian_title_id`) REFERENCES `lookup_relationship_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `parent_notifications_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `parent_notifications_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
