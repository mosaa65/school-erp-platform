-- Finance advanced foundation aligned with DDL where it is safe to apply
-- on top of the current database shape. This migration intentionally focuses
-- on additive objects and non-destructive finance capabilities.

ALTER TABLE `payment_gateways`
  ADD COLUMN `settlement_account_id` INTEGER NULL;

ALTER TABLE `journal_entry_lines`
  ADD COLUMN `cost_center_id` INTEGER UNSIGNED NULL;

CREATE TABLE IF NOT EXISTS `financial_categories` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(100) NOT NULL,
  `category_type` ENUM('REVENUE', 'EXPENSE') NOT NULL,
  `code` VARCHAR(30) NULL,
  `parent_id` INTEGER UNSIGNED NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `coa_account_id` INTEGER NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `financial_funds` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(100) NOT NULL,
  `code` VARCHAR(30) NULL,
  `fund_type` ENUM('رئيسي', 'فرعي') NOT NULL,
  `current_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `coa_account_id` INTEGER NULL,
  UNIQUE INDEX `financial_funds_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `revenues` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `fund_id` INTEGER UNSIGNED NOT NULL,
  `category_id` INTEGER UNSIGNED NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `revenue_date` DATE NOT NULL,
  `source_type` ENUM('طالب', 'موظف', 'متبرع', 'أخرى') NOT NULL,
  `source_id` VARCHAR(191) NULL,
  `receipt_number` VARCHAR(50) NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` VARCHAR(191) NULL,
  `journal_entry_id` VARCHAR(191) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `fund_id` INTEGER UNSIGNED NOT NULL,
  `category_id` INTEGER UNSIGNED NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `expense_date` DATE NOT NULL,
  `vendor_name` VARCHAR(200) NULL,
  `invoice_number` VARCHAR(50) NULL,
  `is_approved` BOOLEAN NOT NULL DEFAULT false,
  `approved_by_user_id` VARCHAR(191) NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` VARCHAR(191) NULL,
  `journal_entry_id` VARCHAR(191) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `financial_view_logs` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `viewer_name` VARCHAR(100) NULL,
  `viewer_phone` VARCHAR(20) NULL,
  `view_date` DATE NOT NULL,
  `target_report` VARCHAR(100) NULL,
  `impression` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_trail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(80) NOT NULL,
  `record_id` BIGINT UNSIGNED NOT NULL,
  `action` ENUM('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'POST', 'REVERSE', 'CLOSE', 'REOPEN') NOT NULL,
  `field_name` VARCHAR(80) NULL,
  `old_value` TEXT NULL,
  `new_value` TEXT NULL,
  `change_summary` TEXT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `user_ip` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `idx_table_record`(`table_name`, `record_id`),
  INDEX `idx_user`(`user_id`),
  INDEX `idx_action`(`action`),
  INDEX `idx_date`(`created_at`),
  INDEX `idx_table_date`(`table_name`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `budgets` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(100) NOT NULL,
  `fiscal_year_id` INTEGER NOT NULL,
  `branch_id` INTEGER NULL,
  `budget_type` ENUM('ANNUAL', 'SEMESTER', 'QUARTERLY', 'MONTHLY', 'PROJECT') NOT NULL DEFAULT 'ANNUAL',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `total_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED', 'REVISED') NOT NULL DEFAULT 'DRAFT',
  `approved_by_user_id` VARCHAR(191) NULL,
  `approved_at` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `created_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  INDEX `idx_fiscal`(`fiscal_year_id`),
  INDEX `idx_status`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `budget_lines` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `budget_id` INTEGER UNSIGNED NOT NULL,
  `account_id` INTEGER NOT NULL,
  `line_description` VARCHAR(200) NULL,
  `budgeted_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `actual_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `variance` DECIMAL(18, 2) NOT NULL DEFAULT (budgeted_amount - actual_amount),
  `variance_percentage` DECIMAL(7, 2) NOT NULL DEFAULT (CASE WHEN budgeted_amount > 0 THEN ROUND(((budgeted_amount - actual_amount) / budgeted_amount) * 100, 2) ELSE 0 END),
  `notes` VARCHAR(255) NULL,
  INDEX `idx_budget`(`budget_id`),
  INDEX `idx_account`(`account_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_sequences` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `document_type` ENUM('JOURNAL_ENTRY', 'INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'RECEIPT') NOT NULL,
  `prefix` VARCHAR(10) NOT NULL,
  `fiscal_year_id` INTEGER NULL,
  `branch_id` INTEGER NULL,
  `last_number` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `number_format` VARCHAR(50) NOT NULL DEFAULT '{PREFIX}-{YEAR}-{SEQ:5}',
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  UNIQUE INDEX `uk_seq`(`document_type`, `fiscal_year_id`, `branch_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cost_centers` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(20) NOT NULL,
  `name_ar` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100) NULL,
  `parent_id` INTEGER UNSIGNED NULL,
  `branch_id` INTEGER NULL,
  `manager_employee_id` VARCHAR(191) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `cost_centers_code_key`(`code`),
  INDEX `idx_code`(`code`),
  INDEX `idx_parent`(`parent_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recurring_journal_templates` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL') NOT NULL DEFAULT 'MONTHLY',
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `next_run_date` DATE NOT NULL,
  `branch_id` INTEGER NULL,
  `currency_id` INTEGER NULL,
  `entry_description` TEXT NOT NULL,
  `reference_type` VARCHAR(30) NULL,
  `total_amount` DECIMAL(18, 2) NOT NULL,
  `auto_post` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `last_generated_at` DATETIME(3) NULL,
  `last_generated_je_id` VARCHAR(191) NULL,
  `total_generated` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  `created_by_user_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  INDEX `idx_next_run`(`next_run_date`),
  INDEX `idx_active`(`is_active`),
  INDEX `idx_frequency`(`frequency`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recurring_template_lines` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` INTEGER UNSIGNED NOT NULL,
  `line_number` SMALLINT UNSIGNED NOT NULL,
  `account_id` INTEGER NOT NULL,
  `description` VARCHAR(255) NULL,
  `debit_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `credit_amount` DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  `cost_center_id` INTEGER UNSIGNED NULL,
  UNIQUE INDEX `uk_tpl_line`(`template_id`, `line_number`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payment_gateways`
  ADD CONSTRAINT `payment_gateways_settlement_account_id_fkey`
    FOREIGN KEY (`settlement_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `journal_entry_lines`
  ADD CONSTRAINT `journal_entry_lines_cost_center_id_fkey`
    FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `financial_categories`
  ADD CONSTRAINT `financial_categories_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `financial_categories`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `financial_categories_coa_account_id_fkey`
    FOREIGN KEY (`coa_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `financial_funds`
  ADD CONSTRAINT `financial_funds_coa_account_id_fkey`
    FOREIGN KEY (`coa_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `revenues`
  ADD CONSTRAINT `revenues_fund_id_fkey`
    FOREIGN KEY (`fund_id`) REFERENCES `financial_funds`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `revenues_category_id_fkey`
    FOREIGN KEY (`category_id`) REFERENCES `financial_categories`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `revenues_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `revenues_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_fund_id_fkey`
    FOREIGN KEY (`fund_id`) REFERENCES `financial_funds`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_category_id_fkey`
    FOREIGN KEY (`category_id`) REFERENCES `financial_categories`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_approved_by_user_id_fkey`
    FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `expenses_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `audit_trail`
  ADD CONSTRAINT `audit_trail_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `budgets`
  ADD CONSTRAINT `budgets_fiscal_year_id_fkey`
    FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `budgets_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `budgets_approved_by_user_id_fkey`
    FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `budgets_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `budget_lines`
  ADD CONSTRAINT `budget_lines_budget_id_fkey`
    FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `budget_lines_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `document_sequences`
  ADD CONSTRAINT `document_sequences_fiscal_year_id_fkey`
    FOREIGN KEY (`fiscal_year_id`) REFERENCES `fiscal_years`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `document_sequences_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `cost_centers`
  ADD CONSTRAINT `cost_centers_parent_id_fkey`
    FOREIGN KEY (`parent_id`) REFERENCES `cost_centers`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `cost_centers_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `cost_centers_manager_employee_id_fkey`
    FOREIGN KEY (`manager_employee_id`) REFERENCES `employees`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `recurring_journal_templates`
  ADD CONSTRAINT `recurring_journal_templates_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `recurring_journal_templates_currency_id_fkey`
    FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `recurring_journal_templates_last_generated_je_id_fkey`
    FOREIGN KEY (`last_generated_je_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `recurring_journal_templates_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `recurring_template_lines`
  ADD CONSTRAINT `recurring_template_lines_template_id_fkey`
    FOREIGN KEY (`template_id`) REFERENCES `recurring_journal_templates`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `recurring_template_lines_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `recurring_template_lines_cost_center_id_fkey`
    FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE VIEW `v_unified_financial_status` AS
SELECT
  f.name_ar AS fund_name,
  f.current_balance,
  (
    SELECT COALESCE(SUM(r.amount), 0)
    FROM revenues r
    WHERE r.fund_id = f.id
  ) AS total_in,
  (
    SELECT COALESCE(SUM(e.amount), 0)
    FROM expenses e
    WHERE e.fund_id = f.id
      AND e.is_approved = 1
  ) AS total_out,
  coa.account_code AS coa_code,
  coa.name_ar AS coa_account_name
FROM financial_funds f
LEFT JOIN chart_of_accounts coa ON f.coa_account_id = coa.id;

CREATE OR REPLACE VIEW `v_general_ledger` AS
SELECT
  coa.account_code,
  coa.name_ar AS account_name,
  coa.account_type,
  je.entry_date,
  je.entry_number,
  je.description AS entry_description,
  jel.description AS line_description,
  jel.debit_amount,
  jel.credit_amount,
  je.status,
  je.reference_type,
  fp.name_ar AS fiscal_period_name,
  fp.status AS period_status,
  b.name_ar AS branch_name
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
LEFT JOIN fiscal_periods fp ON je.fiscal_period_id = fp.id
LEFT JOIN branches b ON je.branch_id = b.id
WHERE je.status = 'POSTED';

CREATE OR REPLACE VIEW `v_trial_balance` AS
SELECT
  coa.account_code,
  coa.name_ar AS account_name,
  coa.account_type,
  coa.normal_balance,
  SUM(jel.debit_amount) AS total_debit,
  SUM(jel.credit_amount) AS total_credit,
  SUM(jel.debit_amount) - SUM(jel.credit_amount) AS net_balance
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED'
GROUP BY coa.id, coa.account_code, coa.name_ar, coa.account_type, coa.normal_balance
ORDER BY coa.account_code;

CREATE OR REPLACE VIEW `v_budget_vs_actual` AS
SELECT
  b.name_ar AS budget_name,
  b.budget_type,
  b.status AS budget_status,
  coa.account_code,
  coa.name_ar AS account_name,
  coa.account_type,
  bl.budgeted_amount,
  bl.actual_amount,
  bl.variance,
  bl.variance_percentage,
  CASE
    WHEN bl.variance < 0 THEN 'تجاوز'
    WHEN bl.variance_percentage <= 10 THEN 'قريب من النفاد'
    ELSE 'ضمن الميزانية'
  END AS budget_health,
  br.name_ar AS branch_name
FROM budget_lines bl
JOIN budgets b ON bl.budget_id = b.id
JOIN chart_of_accounts coa ON bl.account_id = coa.id
LEFT JOIN branches br ON b.branch_id = br.id
WHERE b.status IN ('APPROVED', 'ACTIVE');

-- Database triggers for journal-period enforcement were moved out of the
-- required migration path to keep managed/shared MySQL deployments compatible.
-- If your MySQL user has the needed privileges, you may apply the optional
-- hardening script manually from:
-- prisma/optional/finance-journal-period-triggers.sql
