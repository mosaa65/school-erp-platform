-- Add payment webhook events and gateway transaction identifier.

ALTER TABLE `payment_transactions`
  ADD COLUMN `gateway_transaction_id` VARCHAR(100) NULL;

CREATE INDEX `ptx_gateway_txn_idx` ON `payment_transactions`(`gateway_transaction_id`);

CREATE TABLE `payment_webhook_events` (
  `id` VARCHAR(191) NOT NULL,
  `event_id` VARCHAR(100) NOT NULL,
  `event_type` ENUM('SUCCESS','FAILURE','REFUND') NOT NULL,
  `status` ENUM('RECEIVED','PROCESSED','IGNORED','FAILED') NOT NULL DEFAULT 'RECEIVED',
  `idempotency_key` VARCHAR(100) NULL,
  `gateway_id` INTEGER NULL,
  `transaction_id` VARCHAR(191) NULL,
  `payload` JSON NOT NULL,
  `error_message` TEXT NULL,
  `processed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `payment_webhook_events_event_id_key`(`event_id`),
  INDEX `pwe_event_type_idx`(`event_type`),
  INDEX `pwe_status_idx`(`status`),
  INDEX `pwe_gateway_idx`(`gateway_id`),
  INDEX `pwe_transaction_idx`(`transaction_id`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_webhook_events`
  ADD CONSTRAINT `payment_webhook_events_gateway_id_fkey`
    FOREIGN KEY (`gateway_id`) REFERENCES `payment_gateways`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_webhook_events_transaction_id_fkey`
    FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
