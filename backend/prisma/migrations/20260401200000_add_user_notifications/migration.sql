CREATE TABLE `user_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `message` VARCHAR(1000) NOT NULL,
    `notification_type` ENUM('INFO', 'SUCCESS', 'WARNING', 'ACTION_REQUIRED') NOT NULL DEFAULT 'INFO',
    `resource` VARCHAR(120) NULL,
    `resource_id` VARCHAR(191) NULL,
    `action_url` VARCHAR(255) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `triggered_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`),
    INDEX `unt_user_read_del_idx`(`user_id`, `is_read`, `deleted_at`),
    INDEX `unt_type_del_idx`(`notification_type`, `deleted_at`),
    INDEX `unt_resource_del_idx`(`resource`, `resource_id`, `deleted_at`),
    INDEX `unt_trigger_del_idx`(`triggered_by_user_id`, `deleted_at`),
    INDEX `unt_created_del_idx`(`created_at`, `deleted_at`),
    INDEX `unt_deleted_at_idx`(`deleted_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_notifications`
    ADD CONSTRAINT `user_notifications_user_id_fkey`
        FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `user_notifications`
    ADD CONSTRAINT `user_notifications_triggered_by_user_id_fkey`
        FOREIGN KEY (`triggered_by_user_id`) REFERENCES `users`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;
