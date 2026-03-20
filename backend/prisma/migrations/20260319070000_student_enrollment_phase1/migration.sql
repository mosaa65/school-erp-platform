CREATE TABLE `sequence_counters` (
  `key` varchar(100) NOT NULL,
  `current_value` int NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `student_enrollments`
  ADD COLUMN `grade_level_id` varchar(191) DEFAULT NULL,
  ADD COLUMN `yearly_enrollment_no` varchar(40) DEFAULT NULL,
  ADD COLUMN `distribution_status` enum('PENDING_DISTRIBUTION', 'ASSIGNED', 'TRANSFERRED') NOT NULL DEFAULT 'ASSIGNED',
  ADD COLUMN `grade_name_snapshot` varchar(120) DEFAULT NULL,
  ADD COLUMN `section_name_snapshot` varchar(120) DEFAULT NULL;

UPDATE `student_enrollments` `sen`
INNER JOIN `sections` `sec` ON `sec`.`id` = `sen`.`section_id`
INNER JOIN `grade_levels` `gl` ON `gl`.`id` = `sec`.`grade_level_id`
SET
  `sen`.`grade_level_id` = `gl`.`id`,
  `sen`.`grade_name_snapshot` = `gl`.`name`,
  `sen`.`section_name_snapshot` = `sec`.`name`,
  `sen`.`distribution_status` = 'ASSIGNED'
WHERE `sen`.`deleted_at` IS NULL;

ALTER TABLE `student_enrollments`
  ADD CONSTRAINT `sen_grade_level_fk`
    FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`) ON DELETE SET NULL;

CREATE UNIQUE INDEX `sen_year_enrollment_no_uq`
  ON `student_enrollments` (`academic_year_id`, `yearly_enrollment_no`);

CREATE INDEX `sen_year_grade_del_idx`
  ON `student_enrollments` (`academic_year_id`, `grade_level_id`, `deleted_at`);

CREATE INDEX `sen_distribution_del_idx`
  ON `student_enrollments` (`distribution_status`, `deleted_at`);
