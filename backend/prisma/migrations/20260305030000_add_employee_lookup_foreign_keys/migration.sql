-- AlterTable
ALTER TABLE `employees`
    ADD COLUMN `gender_id` INTEGER NULL AFTER `gender`,
    ADD COLUMN `qualification_id` INTEGER NULL AFTER `qualification`,
    ADD COLUMN `job_role_id` INTEGER NULL AFTER `job_title`;

-- Backfill gender lookup from enum value
UPDATE `employees` AS e
INNER JOIN `lookup_genders` AS lg
    ON UPPER(TRIM(lg.`code`)) = UPPER(TRIM(e.`gender`))
SET e.`gender_id` = lg.`id`
WHERE e.`gender_id` IS NULL;

-- Backfill qualification lookup from existing text (code or Arabic label)
UPDATE `employees` AS e
INNER JOIN `lookup_qualifications` AS lq
    ON UPPER(TRIM(lq.`code`)) = UPPER(TRIM(e.`qualification`))
    OR TRIM(lq.`name_ar`) = TRIM(e.`qualification`)
SET e.`qualification_id` = lq.`id`
WHERE e.`qualification_id` IS NULL
  AND e.`qualification` IS NOT NULL
  AND TRIM(e.`qualification`) <> '';

-- Backfill job role lookup from existing text (code, male or female label)
UPDATE `employees` AS e
INNER JOIN `lookup_job_roles` AS ljr
    ON UPPER(TRIM(ljr.`code`)) = UPPER(TRIM(e.`job_title`))
    OR TRIM(ljr.`name_ar`) = TRIM(e.`job_title`)
    OR TRIM(COALESCE(ljr.`name_ar_female`, '')) = TRIM(e.`job_title`)
SET e.`job_role_id` = ljr.`id`
WHERE e.`job_role_id` IS NULL
  AND e.`job_title` IS NOT NULL
  AND TRIM(e.`job_title`) <> '';

-- Normalize legacy text from lookup values when lookup id exists
UPDATE `employees` AS e
INNER JOIN `lookup_qualifications` AS lq
    ON lq.`id` = e.`qualification_id`
SET e.`qualification` = lq.`name_ar`
WHERE (e.`qualification` IS NULL OR TRIM(e.`qualification`) = '');

UPDATE `employees` AS e
INNER JOIN `lookup_job_roles` AS ljr
    ON ljr.`id` = e.`job_role_id`
SET e.`job_title` = COALESCE(ljr.`name_ar`, ljr.`name_ar_female`, e.`job_title`)
WHERE (e.`job_title` IS NULL OR TRIM(e.`job_title`) = '');

-- Add indexes
CREATE INDEX `emp_gender_id_del_idx` ON `employees`(`gender_id`, `deleted_at`);
CREATE INDEX `emp_qualification_id_del_idx` ON `employees`(`qualification_id`, `deleted_at`);
CREATE INDEX `emp_job_role_id_del_idx` ON `employees`(`job_role_id`, `deleted_at`);

-- AddForeignKey
ALTER TABLE `employees`
    ADD CONSTRAINT `employees_gender_id_fkey`
    FOREIGN KEY (`gender_id`) REFERENCES `lookup_genders`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees`
    ADD CONSTRAINT `employees_qualification_id_fkey`
    FOREIGN KEY (`qualification_id`) REFERENCES `lookup_qualifications`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees`
    ADD CONSTRAINT `employees_job_role_id_fkey`
    FOREIGN KEY (`job_role_id`) REFERENCES `lookup_job_roles`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

