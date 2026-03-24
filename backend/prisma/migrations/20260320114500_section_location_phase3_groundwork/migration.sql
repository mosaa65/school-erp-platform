ALTER TABLE `sections`
  ADD COLUMN `building_lookup_id` INTEGER NULL,
  ADD COLUMN `room_label` VARCHAR(80) NULL;

CREATE INDEX `sections_building_lookup_id_deleted_at_idx`
  ON `sections`(`building_lookup_id`, `deleted_at`);

ALTER TABLE `sections`
  ADD CONSTRAINT `sections_building_lookup_id_fkey`
    FOREIGN KEY (`building_lookup_id`) REFERENCES `lookup_buildings`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
