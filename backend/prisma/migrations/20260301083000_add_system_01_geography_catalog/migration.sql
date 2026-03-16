-- CreateTable
CREATE TABLE `governorates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    UNIQUE INDEX `governorates_code_key`(`code`),
    INDEX `gov_name_del_idx`(`name_ar`, `deleted_at`),
    INDEX `gov_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `gov_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `directorates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `governorate_id` INTEGER NOT NULL,
    `code` VARCHAR(10) NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `dir_governorate_del_idx`(`governorate_id`, `deleted_at`),
    INDEX `dir_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `dir_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `dir_governorate_name_uq`(`governorate_id`, `name_ar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_districts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `directorate_id` INTEGER NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `sub_district_directorate_del_idx`(`directorate_id`, `deleted_at`),
    INDEX `sub_district_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `sub_district_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `sub_district_directorate_name_uq`(`directorate_id`, `name_ar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `villages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sub_district_id` INTEGER NOT NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `village_sub_district_del_idx`(`sub_district_id`, `deleted_at`),
    INDEX `village_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `village_deleted_at_idx`(`deleted_at`),
    UNIQUE INDEX `village_sub_district_name_uq`(`sub_district_id`, `name_ar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `localities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `village_id` INTEGER NULL,
    `directorate_id` INTEGER NULL,
    `name_ar` VARCHAR(100) NOT NULL,
    `locality_type` ENUM('RURAL', 'URBAN') NOT NULL DEFAULT 'RURAL',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_by` VARCHAR(191) NULL,
    `updated_by` VARCHAR(191) NULL,

    INDEX `locality_village_del_idx`(`village_id`, `deleted_at`),
    INDEX `locality_directorate_del_idx`(`directorate_id`, `deleted_at`),
    INDEX `locality_type_del_idx`(`locality_type`, `deleted_at`),
    INDEX `locality_active_del_idx`(`is_active`, `deleted_at`),
    INDEX `locality_deleted_at_idx`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `governorates` ADD CONSTRAINT `governorates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `governorates` ADD CONSTRAINT `governorates_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `directorates` ADD CONSTRAINT `directorates_governorate_id_fkey` FOREIGN KEY (`governorate_id`) REFERENCES `governorates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `directorates` ADD CONSTRAINT `directorates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `directorates` ADD CONSTRAINT `directorates_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_districts` ADD CONSTRAINT `sub_districts_directorate_id_fkey` FOREIGN KEY (`directorate_id`) REFERENCES `directorates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_districts` ADD CONSTRAINT `sub_districts_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sub_districts` ADD CONSTRAINT `sub_districts_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `villages` ADD CONSTRAINT `villages_sub_district_id_fkey` FOREIGN KEY (`sub_district_id`) REFERENCES `sub_districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `villages` ADD CONSTRAINT `villages_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `villages` ADD CONSTRAINT `villages_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `localities` ADD CONSTRAINT `localities_village_id_fkey` FOREIGN KEY (`village_id`) REFERENCES `villages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `localities` ADD CONSTRAINT `localities_directorate_id_fkey` FOREIGN KEY (`directorate_id`) REFERENCES `directorates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `localities` ADD CONSTRAINT `localities_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `localities` ADD CONSTRAINT `localities_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
