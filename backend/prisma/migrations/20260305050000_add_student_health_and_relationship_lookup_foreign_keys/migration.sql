ALTER TABLE `students`
  ADD COLUMN `health_status_id` INTEGER NULL;

ALTER TABLE `student_guardians`
  ADD COLUMN `relationship_type_id` INTEGER NULL;

UPDATE `students` s
LEFT JOIN `lookup_health_statuses` lhs
  ON lhs.`code` = s.`health_status`
  AND lhs.`deleted_at` IS NULL
SET s.`health_status_id` = lhs.`id`
WHERE s.`health_status_id` IS NULL
  AND s.`health_status` IS NOT NULL;

UPDATE `students` s
LEFT JOIN `lookup_health_statuses` lhs
  ON lhs.`code` = 'SICK'
  AND lhs.`deleted_at` IS NULL
SET s.`health_status_id` = lhs.`id`
WHERE s.`health_status_id` IS NULL
  AND s.`health_status` = 'CHRONIC_DISEASE';

UPDATE `students` s
LEFT JOIN `lookup_health_statuses` lhs
  ON lhs.`code` = 'DISABLED'
  AND lhs.`deleted_at` IS NULL
SET s.`health_status_id` = lhs.`id`
WHERE s.`health_status_id` IS NULL
  AND s.`health_status` IN ('SPECIAL_NEEDS', 'DISABILITY');

UPDATE `student_guardians` sg
LEFT JOIN `lookup_relationship_types` lrt
  ON lrt.`code` = CASE sg.`relationship`
    WHEN 'FATHER' THEN 'FATHER'
    WHEN 'MOTHER' THEN 'MOTHER'
    WHEN 'BROTHER' THEN 'BROTHER'
    WHEN 'SISTER' THEN 'SISTER'
    WHEN 'UNCLE' THEN 'UNCLE'
    WHEN 'AUNT' THEN 'AUNT'
    WHEN 'GRANDFATHER' THEN 'GRANDFATHER'
    WHEN 'GRANDMOTHER' THEN 'GRANDMOTHER'
    ELSE 'OTHER'
  END
  AND lrt.`deleted_at` IS NULL
SET sg.`relationship_type_id` = lrt.`id`
WHERE sg.`relationship_type_id` IS NULL;

CREATE INDEX `stu_health_status_id_del_idx` ON `students`(`health_status_id`, `deleted_at`);
CREATE INDEX `sg_relationship_type_del_idx` ON `student_guardians`(`relationship_type_id`, `deleted_at`);

ALTER TABLE `students`
  ADD CONSTRAINT `students_health_status_id_fkey`
    FOREIGN KEY (`health_status_id`) REFERENCES `lookup_health_statuses`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `student_guardians`
  ADD CONSTRAINT `student_guardians_relationship_type_id_fkey`
    FOREIGN KEY (`relationship_type_id`) REFERENCES `lookup_relationship_types`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
