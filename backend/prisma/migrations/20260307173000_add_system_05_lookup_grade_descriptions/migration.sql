CREATE TABLE `lookup_grade_descriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `min_percentage` DECIMAL(5, 2) NOT NULL,
    `max_percentage` DECIMAL(5, 2) NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NULL,
    `color_code` VARCHAR(20) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `lgd_percentage_range_uq`(`min_percentage`, `max_percentage`),
    INDEX `lgd_sort_del_idx`(`sort_order`, `deleted_at`),
    INDEX `lgd_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `lgd_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `lookup_grade_descriptions`
    ADD CONSTRAINT `lookup_grade_descriptions_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `lookup_grade_descriptions`
    ADD CONSTRAINT `lookup_grade_descriptions_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
