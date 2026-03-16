ALTER TABLE `students`
  ADD COLUMN `locality_id` INTEGER NULL;

ALTER TABLE `guardians`
  ADD COLUMN `locality_id` INTEGER NULL;

CREATE INDEX `stu_locality_del_idx` ON `students`(`locality_id`, `deleted_at`);
CREATE INDEX `gdn_locality_del_idx` ON `guardians`(`locality_id`, `deleted_at`);

ALTER TABLE `students`
  ADD CONSTRAINT `students_locality_id_fkey`
    FOREIGN KEY (`locality_id`) REFERENCES `localities`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `guardians`
  ADD CONSTRAINT `guardians_locality_id_fkey`
    FOREIGN KEY (`locality_id`) REFERENCES `localities`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
