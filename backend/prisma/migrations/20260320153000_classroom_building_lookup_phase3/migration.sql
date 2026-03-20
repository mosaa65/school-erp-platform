ALTER TABLE `classrooms`
  ADD COLUMN `building_lookup_id` INTEGER NULL AFTER `name`;

CREATE INDEX `classrooms_building_lookup_id_deleted_at_idx`
  ON `classrooms`(`building_lookup_id`, `deleted_at`);

ALTER TABLE `classrooms`
  ADD CONSTRAINT `classrooms_building_lookup_id_fkey`
    FOREIGN KEY (`building_lookup_id`) REFERENCES `lookup_buildings`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
