-- CreateTable
CREATE TABLE `lookup_blood_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(10) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `lookup_blood_types_name_key`(`name`),
    INDEX `lbt_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `lbt_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lookup_id_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `lookup_id_types_code_key`(`code`),
    INDEX `lit_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `lit_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lookup_ownership_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `lookup_ownership_types_code_key`(`code`),
    INDEX `lot_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `lot_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lookup_periods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `lookup_periods_code_key`(`code`),
    INDEX `lpd_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `lpd_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `school_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `name_ar` VARCHAR(150) NOT NULL,
    `name_en` VARCHAR(150) NULL,
    `ownership_type_id` INTEGER NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(191) NULL,
    `address_text` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `school_profiles_code_key`(`code`),
    INDEX `scp_owner_del_idx`(`ownership_type_id`, `deleted_at`),
    INDEX `scp_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `scp_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timetable_templates` (
    `id` VARCHAR(191) NOT NULL,
    `academic_term_id` VARCHAR(191) NOT NULL,
    `section_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `ttpl_term_section_del_idx`(`academic_term_id`, `section_id`, `deleted_at`),
    INDEX `ttpl_default_del_idx`(`is_default`, `deleted_at`),
    INDEX `ttpl_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `ttpl_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `ttpl_term_section_name_uq`(`academic_term_id`, `section_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timetable_template_slots` (
    `id` VARCHAR(191) NOT NULL,
    `timetable_template_id` VARCHAR(191) NOT NULL,
    `lookup_period_id` INTEGER NOT NULL,
    `day_of_week` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    `period_order` INTEGER NOT NULL,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `is_break` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `tts_period_del_idx`(`lookup_period_id`, `deleted_at`),
    INDEX `tts_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `tts_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `tts_template_day_order_uq`(`timetable_template_id`, `day_of_week`, `period_order`),
    UNIQUE INDEX `tts_template_day_period_uq`(`timetable_template_id`, `day_of_week`, `lookup_period_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lookup_blood_types` ADD CONSTRAINT `lookup_blood_types_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_blood_types` ADD CONSTRAINT `lookup_blood_types_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_id_types` ADD CONSTRAINT `lookup_id_types_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_id_types` ADD CONSTRAINT `lookup_id_types_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_ownership_types` ADD CONSTRAINT `lookup_ownership_types_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_ownership_types` ADD CONSTRAINT `lookup_ownership_types_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_periods` ADD CONSTRAINT `lookup_periods_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lookup_periods` ADD CONSTRAINT `lookup_periods_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `school_profiles` ADD CONSTRAINT `school_profiles_ownership_type_id_fkey` FOREIGN KEY (`ownership_type_id`) REFERENCES `lookup_ownership_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `school_profiles` ADD CONSTRAINT `school_profiles_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `school_profiles` ADD CONSTRAINT `school_profiles_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_templates` ADD CONSTRAINT `timetable_templates_academic_term_id_fkey` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_templates` ADD CONSTRAINT `timetable_templates_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_templates` ADD CONSTRAINT `timetable_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_templates` ADD CONSTRAINT `timetable_templates_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_template_slots` ADD CONSTRAINT `timetable_template_slots_timetable_template_id_fkey` FOREIGN KEY (`timetable_template_id`) REFERENCES `timetable_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_template_slots` ADD CONSTRAINT `timetable_template_slots_lookup_period_id_fkey` FOREIGN KEY (`lookup_period_id`) REFERENCES `lookup_periods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_template_slots` ADD CONSTRAINT `timetable_template_slots_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetable_template_slots` ADD CONSTRAINT `timetable_template_slots_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

