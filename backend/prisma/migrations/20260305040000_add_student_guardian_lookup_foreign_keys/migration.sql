ALTER TABLE `students`
  ADD COLUMN `gender_id` INTEGER NULL,
  ADD COLUMN `orphan_status_id` INTEGER NULL;

ALTER TABLE `guardians`
  ADD COLUMN `gender_id` INTEGER NULL;

UPDATE `students` s
LEFT JOIN `lookup_genders` lg
  ON lg.`code` = s.`gender`
  AND lg.`deleted_at` IS NULL
SET s.`gender_id` = lg.`id`
WHERE s.`gender_id` IS NULL;

UPDATE `guardians` g
LEFT JOIN `lookup_genders` lg
  ON lg.`code` = g.`gender`
  AND lg.`deleted_at` IS NULL
SET g.`gender_id` = lg.`id`
WHERE g.`gender_id` IS NULL;

UPDATE `students` s
LEFT JOIN `lookup_orphan_statuses` los
  ON los.`code` = s.`orphan_status`
  AND los.`deleted_at` IS NULL
SET s.`orphan_status_id` = los.`id`
WHERE s.`orphan_status_id` IS NULL;

CREATE INDEX `stu_gender_id_del_idx` ON `students`(`gender_id`, `deleted_at`);
CREATE INDEX `stu_orphan_id_del_idx` ON `students`(`orphan_status_id`, `deleted_at`);
CREATE INDEX `gdn_gender_id_del_idx` ON `guardians`(`gender_id`, `deleted_at`);

ALTER TABLE `students`
  ADD CONSTRAINT `students_gender_id_fkey`
    FOREIGN KEY (`gender_id`) REFERENCES `lookup_genders`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `students_orphan_status_id_fkey`
    FOREIGN KEY (`orphan_status_id`) REFERENCES `lookup_orphan_statuses`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `guardians`
  ADD CONSTRAINT `guardians_gender_id_fkey`
    FOREIGN KEY (`gender_id`) REFERENCES `lookup_genders`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
