-- Add finance core accounting tables (branches, currencies, fiscal periods, chart of accounts, journal entries).

CREATE TABLE `branches` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(10) NOT NULL,
  `name_ar` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(20) NULL,
  `is_headquarters` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `branches_code_key`(`code`),
  INDEX `br_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `br_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `currencies` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(3) NOT NULL,
  `name_ar` VARCHAR(50) NOT NULL,
  `symbol` VARCHAR(5) NOT NULL,
  `decimal_places` INTEGER NOT NULL DEFAULT 2,
  `is_base` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `currencies_code_key`(`code`),
  INDEX `cur_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `cur_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `currency_exchange_rates` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `from_currency_id` INTEGER NOT NULL,
  `to_currency_id` INTEGER NOT NULL,
  `rate` DECIMAL(15, 6) NOT NULL,
  `effective_date` DATE NOT NULL,
  `source` VARCHAR(50) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `cer_rate_uq`(`from_currency_id`, `to_currency_id`, `effective_date`),
  INDEX `cer_effective_date_idx`(`effective_date`),
  INDEX `cer_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `cer_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fiscal_years` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `academic_year_id` VARCHAR(191) NULL,
  `is_closed` BOOLEAN NOT NULL DEFAULT false,
  `closed_at` DATETIME(3) NULL,
  `closed_by_user_id` VARCHAR(191) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `fy_dates_uq`(`start_date`, `end_date`),
  INDEX `fy_year_del_idx`(`academic_year_id`, `deleted_at`),
  INDEX `fy_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `fy_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fiscal_periods` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `fiscal_year_id` INTEGER NOT NULL,
  `period_number` INTEGER NOT NULL,
  `name_ar` VARCHAR(50) NOT NULL,
  `period_type` ENUM('MONTHLY', 'QUARTERLY', 'CUSTOM') NOT NULL DEFAULT 'MONTHLY',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM('OPEN', 'CLOSING', 'CLOSED', 'REOPENED') NOT NULL DEFAULT 'OPEN',
  `closed_at` DATETIME(3) NULL,
  `closed_by_user_id` VARCHAR(191) NULL,
  `close_notes` TEXT NULL,
  `reopened_at` DATETIME(3) NULL,
  `reopened_by_user_id` VARCHAR(191) NULL,
  `reopen_reason` TEXT NULL,
  `reopen_deadline` DATE NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `fp_period_uq`(`fiscal_year_id`, `period_number`),
  INDEX `fp_status_idx`(`status`),
  INDEX `fp_dates_idx`(`start_date`, `end_date`),
  INDEX `fp_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `fp_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `chart_of_accounts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `account_code` VARCHAR(20) NOT NULL,
  `name_ar` VARCHAR(150) NOT NULL,
  `name_en` VARCHAR(150) NULL,
  `account_type` ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
  `parent_id` INTEGER NULL,
  `hierarchy_level` INTEGER NOT NULL DEFAULT 1,
  `is_header` BOOLEAN NOT NULL DEFAULT false,
  `is_bank_account` BOOLEAN NOT NULL DEFAULT false,
  `default_currency_id` INTEGER NULL,
  `branch_id` INTEGER NULL,
  `normal_balance` ENUM('DEBIT', 'CREDIT') NOT NULL,
  `current_balance` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `is_system` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `chart_of_accounts_account_code_key`(`account_code`),
  INDEX `coa_parent_idx`(`parent_id`),
  INDEX `coa_type_idx`(`account_type`),
  INDEX `coa_code_idx`(`account_code`),
  INDEX `coa_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `coa_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `journal_entries` (
  `id` VARCHAR(191) NOT NULL,
  `entry_number` VARCHAR(30) NOT NULL,
  `entry_date` DATE NOT NULL,
  `fiscal_year_id` INTEGER NOT NULL,
  `fiscal_period_id` INTEGER NULL,
  `branch_id` INTEGER NULL,
  `description` TEXT NOT NULL,
  `reference_type` VARCHAR(30) NULL,
  `reference_id` VARCHAR(191) NULL,
  `status` ENUM('DRAFT', 'APPROVED', 'POSTED', 'REVERSED') NOT NULL DEFAULT 'DRAFT',
  `total_debit` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `total_credit` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `currency_id` INTEGER NULL,
  `exchange_rate` DECIMAL(10, 6) NOT NULL DEFAULT 1.000000,
  `created_by` VARCHAR(191) NOT NULL,
  `approved_by` VARCHAR(191) NULL,
  `approved_at` DATETIME(3) NULL,
  `posted_by` VARCHAR(191) NULL,
  `posted_at` DATETIME(3) NULL,
  `is_reversal` BOOLEAN NOT NULL DEFAULT false,
  `reversal_of_id` VARCHAR(191) NULL,
  `reversed_by_id` VARCHAR(191) NULL,
  `reversal_reason` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `journal_entries_entry_number_key`(`entry_number`),
  INDEX `je_date_idx`(`entry_date`),
  INDEX `je_status_idx`(`status`),
  INDEX `je_fiscal_year_idx`(`fiscal_year_id`),
  INDEX `je_fiscal_period_idx`(`fiscal_period_id`),
  INDEX `je_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `je_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `journal_entry_lines` (
  `id` VARCHAR(191) NOT NULL,
  `journal_entry_id` VARCHAR(191) NOT NULL,
  `line_number` INTEGER NOT NULL,
  `account_id` INTEGER NOT NULL,
  `description` VARCHAR(255) NULL,
  `debit_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `credit_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `cost_center` VARCHAR(50) NULL,
  `student_id` VARCHAR(191) NULL,
  `employee_id` VARCHAR(191) NULL,
  `branch_id` INTEGER NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `jel_line_uq`(`journal_entry_id`, `line_number`),
  INDEX `jel_account_idx`(`account_id`),
  INDEX `jel_student_idx`(`student_id`),
  INDEX `jel_employee_idx`(`employee_id`),
  INDEX `jel_branch_idx`(`branch_id`),
  INDEX `jel_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `jel_deleted_at_idx`(`deleted_at`),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `branches`
  ADD CONSTRAINT `branches_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `branches_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `currencies`
  ADD CONSTRAINT `currencies_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `currencies_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `currency_exchange_rates`
  ADD CONSTRAINT `currency_exchange_rates_from_currency_id_fkey`
    FOREIGN KEY (`from_currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `currency_exchange_rates_to_currency_id_fkey`
    FOREIGN KEY (`to_currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `currency_exchange_rates_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `currency_exchange_rates_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `fiscal_years`
  ADD CONSTRAINT `fiscal_years_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fiscal_years_closed_by_user_id_fkey`
    FOREIGN KEY (`closed_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fiscal_years_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fiscal_years_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `fiscal_periods`
  ADD CONSTRAINT `fiscal_periods_fiscal_year_id_fkey`
    FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fiscal_periods_closed_by_user_id_fkey`
    FOREIGN KEY (`closed_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fiscal_periods_reopened_by_user_id_fkey`
    FOREIGN KEY (`reopened_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fiscal_periods_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fiscal_periods_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `chart_of_accounts`
  ADD CONSTRAINT `chart_of_accounts_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `chart_of_accounts_default_currency_id_fkey`
    FOREIGN KEY (`default_currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `chart_of_accounts_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `chart_of_accounts_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `chart_of_accounts_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `journal_entries`
  ADD CONSTRAINT `journal_entries_fiscal_year_id_fkey`
    FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_fiscal_period_id_fkey`
    FOREIGN KEY (`fiscal_period_id`) REFERENCES `fiscal_periods`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_currency_id_fkey`
    FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_approved_by_fkey`
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_posted_by_fkey`
    FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_reversed_by_fkey`
    FOREIGN KEY (`reversed_by_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entries_reversal_of_id_fkey`
    FOREIGN KEY (`reversal_of_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `journal_entry_lines`
  ADD CONSTRAINT `journal_entry_lines_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entry_lines_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entry_lines_student_id_fkey`
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entry_lines_employee_id_fkey`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entry_lines_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entry_lines_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `journal_entry_lines_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
