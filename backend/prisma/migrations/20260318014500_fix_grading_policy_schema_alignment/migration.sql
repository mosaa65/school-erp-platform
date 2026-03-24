-- Fix grading policy schema drift caused by the older foundation migration.
-- This migration is intended to run after the broken
-- `20260315032805_add_grading_policy_scope_fields` migration is marked as applied
-- in production via `prisma migrate resolve --applied ...`.

ALTER TABLE `grading_policies`
  ADD COLUMN `assessment_type_lookup_id` VARCHAR(191) NULL AFTER `assessment_type`,
  ADD COLUMN `section_id` VARCHAR(191) NULL AFTER `assessment_type_lookup_id`,
  ADD COLUMN `academic_term_id` VARCHAR(191) NULL AFTER `section_id`,
  ADD COLUMN `teacher_employee_id` VARCHAR(191) NULL AFTER `academic_term_id`,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1 AFTER `teacher_employee_id`,
  ADD COLUMN `total_max_score` DECIMAL(7, 2) NULL AFTER `version`;

UPDATE `grading_policies`
SET `total_max_score` = GREATEST(
  COALESCE(`max_exam_score`, 0) +
  COALESCE(`max_homework_score`, 0) +
  COALESCE(`max_attendance_score`, 0) +
  COALESCE(`max_activity_score`, 0) +
  COALESCE(`max_contribution_score`, 0),
  COALESCE(`passing_score`, 0),
  100.00
)
WHERE `total_max_score` IS NULL;

ALTER TABLE `grading_policies`
  MODIFY `total_max_score` DECIMAL(7, 2) NOT NULL DEFAULT 100.00;

ALTER TABLE `grading_policies`
  ADD INDEX `grp_academic_year_idx` (`academic_year_id`);

DROP INDEX `grp_year_grade_subject_type_uq` ON `grading_policies`;

CREATE UNIQUE INDEX `grp_scope_uq`
  ON `grading_policies`(
    `academic_year_id`(64),
    `grade_level_id`(64),
    `subject_id`(64),
    `assessment_type`,
    `section_id`(64),
    `academic_term_id`(64),
    `teacher_employee_id`(64),
    `version`
  );

ALTER TABLE `grading_policies`
  ADD CONSTRAINT `grading_policies_section_id_fkey`
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `grading_policies_academic_term_id_fkey`
    FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `grading_policies_teacher_employee_id_fkey`
    FOREIGN KEY (`teacher_employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `grading_policies`
  DROP COLUMN `max_exam_score`,
  DROP COLUMN `max_homework_score`,
  DROP COLUMN `max_attendance_score`,
  DROP COLUMN `max_activity_score`,
  DROP COLUMN `max_contribution_score`;

ALTER TABLE `exam_periods`
  ADD COLUMN `assessment_type_lookup_id` VARCHAR(191) NULL AFTER `assessment_type`;
