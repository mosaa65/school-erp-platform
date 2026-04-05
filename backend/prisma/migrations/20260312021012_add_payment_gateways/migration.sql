-- Add finance payment gateways (internal testing gateway).

CREATE TABLE `payment_gateways` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100) NOT NULL,
  `provider_code` VARCHAR(20) NOT NULL,
  `gateway_type` ENUM('ONLINE', 'OFFLINE') NOT NULL,
  `api_endpoint` VARCHAR(255) NULL,
  `merchant_id` VARCHAR(100) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `payment_gateways_provider_code_key`(`provider_code`),
  INDEX `pgw_type_idx`(`gateway_type`),
  INDEX `pgw_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `pgw_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_gateways`
  ADD CONSTRAINT `payment_gateways_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_gateways_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
