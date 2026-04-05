-- Add finance billing core tables (tax codes, fee structures, invoices, installments).

CREATE TABLE `fin_tax_codes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name_ar` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100) NULL,
  `rate` DECIMAL(5, 2) NOT NULL,
  `tax_type` VARCHAR(50) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `fin_tax_codes_code_key`(`code`),
  INDEX `tax_code_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `tax_code_del_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fee_structures` (
  `id` VARCHAR(191) NOT NULL,
  `academic_year_id` VARCHAR(191) NOT NULL,
  `grade_level_id` VARCHAR(191) NOT NULL,
  `fee_type` ENUM('TUITION', 'TRANSPORT', 'ACTIVITIES', 'UNIFORM', 'BOOKS', 'REGISTRATION', 'CAFETERIA', 'EXAM', 'OTHER') NOT NULL,
  `name_ar` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `currency_id` INTEGER NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  INDEX `fs_year_grade_del_idx`(`academic_year_id`, `grade_level_id`, `deleted_at`),
  INDEX `fs_type_del_idx`(`fee_type`, `deleted_at`),
  INDEX `fs_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `fs_del_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `discount_rules` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name_ar` VARCHAR(100) NOT NULL,
  `discount_type` ENUM('SIBLING', 'EMPLOYEE_CHILD', 'SCHOLARSHIP', 'EARLY_PAYMENT', 'CUSTOM') NOT NULL,
  `percentage` DECIMAL(5, 2) NULL,
  `fixed_amount` DECIMAL(15, 2) NULL,
  `min_siblings` INTEGER NULL,
  `description` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `discount_rules_code_key`(`code`),
  INDEX `dr_type_del_idx`(`discount_type`, `deleted_at`),
  INDEX `dr_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `dr_del_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `student_invoices` (
  `id` VARCHAR(191) NOT NULL,
  `invoice_number` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(191) NOT NULL,
  `academic_year_id` VARCHAR(191) NOT NULL,
  `fiscal_year_id` INTEGER NOT NULL,
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'DRAFT',
  `subtotal_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `student_invoices_invoice_number_key`(`invoice_number`),
  INDEX `inv_student_del_idx`(`student_id`, `deleted_at`),
  INDEX `inv_status_del_idx`(`status`, `deleted_at`),
  INDEX `inv_acad_year_del_idx`(`academic_year_id`, `deleted_at`),
  INDEX `inv_fisc_year_del_idx`(`fiscal_year_id`, `deleted_at`),
  INDEX `inv_due_del_idx`(`due_date`, `deleted_at`),
  INDEX `inv_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `inv_del_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_line_items` (
  `id` VARCHAR(191) NOT NULL,
  `invoice_id` VARCHAR(191) NOT NULL,
  `fee_type` ENUM('TUITION', 'TRANSPORT', 'ACTIVITIES', 'UNIFORM', 'BOOKS', 'REGISTRATION', 'CAFETERIA', 'EXAM', 'OTHER') NOT NULL,
  `description` VARCHAR(255) NULL,
  `quantity` INTEGER NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `tax_code_id` INTEGER NULL,
  `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `net_amount` DECIMAL(15, 2) NOT NULL,
  `account_id` INTEGER NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  INDEX `inv_line_invoice_del_idx`(`invoice_id`, `deleted_at`),
  INDEX `inv_line_type_del_idx`(`fee_type`, `deleted_at`),
  INDEX `inv_line_account_del_idx`(`account_id`, `deleted_at`),
  INDEX `inv_line_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `inv_line_del_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_installments` (
  `id` VARCHAR(191) NOT NULL,
  `invoice_id` VARCHAR(191) NOT NULL,
  `due_date` DATE NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID') NOT NULL DEFAULT 'PENDING',
  `installment_no` INTEGER NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  INDEX `inst_invoice_del_idx`(`invoice_id`, `deleted_at`),
  INDEX `inst_status_del_idx`(`status`, `deleted_at`),
  INDEX `inst_due_date_del_idx`(`due_date`, `deleted_at`),
  INDEX `inst_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `inst_del_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_transactions`
  ADD COLUMN `invoice_installment_id` VARCHAR(191) NULL;

ALTER TABLE `fin_tax_codes`
  ADD CONSTRAINT `fin_tax_codes_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fin_tax_codes_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `fee_structures`
  ADD CONSTRAINT `fee_structures_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fee_structures_grade_level_id_fkey`
    FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fee_structures_currency_id_fkey`
    FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fee_structures_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fee_structures_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `discount_rules`
  ADD CONSTRAINT `discount_rules_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `discount_rules_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `student_invoices`
  ADD CONSTRAINT `student_invoices_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_invoices_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_invoices_fiscal_year_id_fkey`
    FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_invoices_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `student_invoices_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `invoice_line_items`
  ADD CONSTRAINT `invoice_line_items_invoice_id_fkey`
    FOREIGN KEY (`invoice_id`) REFERENCES `student_invoices`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_tax_code_id_fkey`
    FOREIGN KEY (`tax_code_id`) REFERENCES `fin_tax_codes`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `invoice_installments`
  ADD CONSTRAINT `invoice_installments_invoice_id_fkey`
    FOREIGN KEY (`invoice_id`) REFERENCES `student_invoices`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_installments_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_installments_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_invoice_installment_id_fkey`
    FOREIGN KEY (`invoice_installment_id`) REFERENCES `invoice_installments`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
