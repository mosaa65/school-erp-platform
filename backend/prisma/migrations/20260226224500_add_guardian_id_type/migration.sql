-- Add optional ID type reference for guardians
ALTER TABLE `guardians`
    ADD COLUMN `id_type_id` INTEGER NULL AFTER `id_number`;

CREATE INDEX `gdn_id_type_del_idx` ON `guardians`(`id_type_id`, `deleted_at`);

ALTER TABLE `guardians`
    ADD CONSTRAINT `guardians_id_type_id_fkey`
    FOREIGN KEY (`id_type_id`) REFERENCES `lookup_id_types`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
