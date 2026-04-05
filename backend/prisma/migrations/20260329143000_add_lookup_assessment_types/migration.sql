CREATE TABLE IF NOT EXISTS `lookup_assessment_types` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(255) NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'PERIOD',
  `is_system` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `lookup_assessment_types_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `grading_policies`
  ADD CONSTRAINT `grading_policies_assessment_type_lookup_id_fkey`
    FOREIGN KEY (`assessment_type_lookup_id`) REFERENCES `lookup_assessment_types`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `exam_periods`
  ADD CONSTRAINT `exam_periods_assessment_type_lookup_id_fkey`
    FOREIGN KEY (`assessment_type_lookup_id`) REFERENCES `lookup_assessment_types`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
