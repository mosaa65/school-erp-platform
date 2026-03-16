-- Add nullable lookup references to students and employees
ALTER TABLE `employees`
    ADD COLUMN `id_type_id` INTEGER NULL AFTER `id_number`;

ALTER TABLE `students`
    ADD COLUMN `blood_type_id` INTEGER NULL AFTER `birth_date`;

CREATE INDEX `emp_id_type_del_idx` ON `employees`(`id_type_id`, `deleted_at`);
CREATE INDEX `stu_blood_type_del_idx` ON `students`(`blood_type_id`, `deleted_at`);

ALTER TABLE `employees`
    ADD CONSTRAINT `employees_id_type_id_fkey`
    FOREIGN KEY (`id_type_id`) REFERENCES `lookup_id_types`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE `students`
    ADD CONSTRAINT `students_blood_type_id_fkey`
    FOREIGN KEY (`blood_type_id`) REFERENCES `lookup_blood_types`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
