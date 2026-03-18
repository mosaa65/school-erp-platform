-- Add the scoped uniqueness and foreign keys used by the application.
CREATE UNIQUE INDEX `grp_scope_uq`
  ON `grading_policies`(
    `academic_year_id`,
    `grade_level_id`,
    `subject_id`,
    `assessment_type`,
    `section_id`,
    `academic_term_id`,
    `teacher_employee_id`,
    `version`
  );

ALTER TABLE `grading_policies`
  ADD CONSTRAINT `grading_policies_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `grading_policies_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `grading_policies_teacher_employee_id_fkey` FOREIGN KEY (`teacher_employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
