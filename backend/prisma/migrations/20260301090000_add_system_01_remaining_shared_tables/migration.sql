-- CreateTable
CREATE TABLE `user_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `valid_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valid_until` DATETIME(3) NULL,
    `grant_reason` TEXT NOT NULL,
    `notes` VARCHAR(500) NULL,
    `granted_by` VARCHAR(191) NOT NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revoked_at` DATETIME(3) NULL,
    `revoked_by` VARCHAR(191) NULL,
    `revoke_reason` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `upr_valid_until_idx`(`valid_until`),
    INDEX `upr_revoked_at_idx`(`revoked_at`),
    INDEX `upr_granted_by_idx`(`granted_by`),
    INDEX `upr_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `upr_user_permission_uq`(`user_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(128) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `payload` TEXT NULL,
    `last_activity` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `session_user_idx`(`user_id`),
    INDEX `session_expires_at_idx`(`expires_at`),
    INDEX `session_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_attachments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(100) NULL,
    `file_size` INTEGER UNSIGNED NULL,
    `file_category` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `uploaded_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `fat_entity_idx`(`entity_type`, `entity_id`),
    INDEX `fat_category_idx`(`file_category`),
    INDEX `fat_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gregorian_date` DATE NOT NULL,
    `hijri_date` VARCHAR(10) NOT NULL,
    `hijri_day` TINYINT UNSIGNED NOT NULL,
    `hijri_month` TINYINT UNSIGNED NOT NULL,
    `hijri_year` SMALLINT UNSIGNED NOT NULL,
    `hijri_month_name` VARCHAR(20) NOT NULL,
    `day_of_week` TINYINT UNSIGNED NOT NULL,
    `day_name_ar` VARCHAR(20) NOT NULL,
    `is_weekend` BOOLEAN NOT NULL DEFAULT false,
    `is_school_day` BOOLEAN NOT NULL DEFAULT true,
    `academic_year_id` VARCHAR(191) NULL,
    `semester` TINYINT UNSIGNED NULL,
    `academic_week` TINYINT UNSIGNED NULL,
    `is_adjusted` BOOLEAN NOT NULL DEFAULT false,
    `adjusted_at` DATETIME(3) NULL,
    `adjusted_by` VARCHAR(191) NULL,
    `is_holiday` BOOLEAN NOT NULL DEFAULT false,
    `holiday_name` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `calendar_master_gregorian_date_key`(`gregorian_date`),
    INDEX `cal_hijri_idx`(`hijri_year`, `hijri_month`, `hijri_day`),
    INDEX `cal_school_day_idx`(`is_school_day`, `gregorian_date`),
    INDEX `cal_academic_year_idx`(`academic_year_id`),
    INDEX `cal_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(50) NOT NULL,
    `setting_value` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `calendar_settings_setting_key_key`(`setting_key`),
    INDEX `cal_setting_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_adjustments_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adjustment_date` DATE NOT NULL,
    `hijri_year` SMALLINT UNSIGNED NOT NULL,
    `hijri_month` TINYINT UNSIGNED NOT NULL,
    `adjustment_type` ENUM('moon_sighting', 'holiday_add', 'holiday_remove', 'school_day_toggle', 'other') NOT NULL,
    `offset_days` TINYINT NULL,
    `reason` TEXT NOT NULL,
    `affected_records` INTEGER UNSIGNED NULL,
    `adjusted_by` VARCHAR(191) NOT NULL,
    `adjusted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `cal_adj_date_idx`(`adjustment_date`),
    INDEX `cal_adj_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` TEXT NULL,
    `setting_type` ENUM('text', 'number', 'boolean', 'image', 'json') NOT NULL DEFAULT 'text',
    `category` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `is_editable` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `system_settings_setting_key_key`(`setting_key`),
    INDEX `sys_setting_category_idx`(`category`),
    INDEX `sys_setting_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminders_ticker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `content` TEXT NOT NULL,
    `ticker_type` ENUM('ذكر', 'تنبيه', 'إعلان', 'آية', 'حديث') NOT NULL DEFAULT 'ذكر',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `display_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `rem_ticker_type_idx`(`ticker_type`),
    INDEX `rem_ticker_active_idx`(`is_active`),
    INDEX `rem_ticker_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_granted_by_fkey` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_revoked_by_fkey` FOREIGN KEY (`revoked_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_attachments` ADD CONSTRAINT `file_attachments_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_attachments` ADD CONSTRAINT `file_attachments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_attachments` ADD CONSTRAINT `file_attachments_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_master` ADD CONSTRAINT `calendar_master_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_master` ADD CONSTRAINT `calendar_master_adjusted_by_fkey` FOREIGN KEY (`adjusted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_master` ADD CONSTRAINT `calendar_master_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_master` ADD CONSTRAINT `calendar_master_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_settings` ADD CONSTRAINT `calendar_settings_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_settings` ADD CONSTRAINT `calendar_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_adjustments_log` ADD CONSTRAINT `calendar_adjustments_log_adjusted_by_fkey` FOREIGN KEY (`adjusted_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_adjustments_log` ADD CONSTRAINT `calendar_adjustments_log_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_adjustments_log` ADD CONSTRAINT `calendar_adjustments_log_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders_ticker` ADD CONSTRAINT `reminders_ticker_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminders_ticker` ADD CONSTRAINT `reminders_ticker_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

