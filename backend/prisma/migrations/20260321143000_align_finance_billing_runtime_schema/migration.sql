-- Rebuild finance billing/payment runtime tables to match the current Prisma schema
-- while preserving legacy rows in *_legacy tables.

SET @base_currency_id := (
  SELECT id
  FROM currencies
  WHERE is_base = 1 AND deleted_at IS NULL
  ORDER BY id
  LIMIT 1
);

SET @main_branch_id := (
  SELECT id
  FROM branches
  WHERE code = 'MAIN' AND deleted_at IS NULL
  ORDER BY id
  LIMIT 1
);

SET @default_section_id := (
  SELECT id
  FROM sections
  WHERE deleted_at IS NULL
  ORDER BY created_at, id
  LIMIT 1
);

SET @discount_expense_account_id := (
  SELECT id
  FROM chart_of_accounts
  WHERE account_code = '5007' AND deleted_at IS NULL
  ORDER BY id
  LIMIT 1
);

SET @default_revenue_account_id := (
  SELECT id
  FROM chart_of_accounts
  WHERE account_code = '4001' AND deleted_at IS NULL
  ORDER BY id
  LIMIT 1
);

SET @vat_output_account_id := (
  SELECT id
  FROM chart_of_accounts
  WHERE account_code = '2104' AND deleted_at IS NULL
  ORDER BY id
  LIMIT 1
);

INSERT INTO student_enrollments (
  id,
  student_id,
  academic_year_id,
  section_id,
  enrollment_date,
  status,
  notes,
  is_active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  CONCAT('finmig_', LOWER(REPLACE(UUID(), '-', ''))),
  si.student_id,
  si.academic_year_id,
  @default_section_id,
  MIN(si.issue_date),
  'ACTIVE',
  'Auto-created by finance billing migration',
  TRUE,
  NOW(3),
  NOW(3),
  MIN(si.created_by),
  MIN(si.updated_by)
FROM student_invoices si
LEFT JOIN student_enrollments se
  ON se.student_id = si.student_id
 AND se.academic_year_id = si.academic_year_id
 AND se.deleted_at IS NULL
WHERE si.deleted_at IS NULL
  AND se.id IS NULL
GROUP BY si.student_id, si.academic_year_id;

CREATE TABLE `fin_tax_codes_new` (
  `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tax_code` VARCHAR(10) NOT NULL,
  `tax_name_ar` VARCHAR(80) NOT NULL,
  `tax_name_en` VARCHAR(80) NULL,
  `rate` DECIMAL(5, 2) NOT NULL,
  `tax_type` ENUM('OUTPUT', 'INPUT', 'EXEMPT', 'ZERO_RATED') NOT NULL,
  `is_inclusive` BOOLEAN NOT NULL DEFAULT false,
  `output_gl_account_id` INTEGER NULL,
  `input_gl_account_id` INTEGER NULL,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  UNIQUE INDEX `fin_tax_codes_tax_code_key`(`tax_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `fee_structures_new` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `legacy_id` VARCHAR(191) NULL,
  `name_ar` VARCHAR(100) NOT NULL,
  `academic_year_id` VARCHAR(191) NOT NULL,
  `grade_level_id` VARCHAR(191) NULL,
  `fee_type` ENUM('TUITION', 'TRANSPORT', 'UNIFORM', 'REGISTRATION', 'ACTIVITY', 'PENALTY', 'OTHER') NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `currency_id` INTEGER NULL,
  `vat_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `fee_structures_new_legacy_id_key`(`legacy_id`),
  INDEX `fs_year_idx`(`academic_year_id`),
  INDEX `fs_type_idx`(`fee_type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `discount_rules_new` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `legacy_id` VARCHAR(191) NULL,
  `name_ar` VARCHAR(100) NOT NULL,
  `discount_type` ENUM('SIBLING', 'ORPHAN', 'EMPLOYEE_CHILD', 'SCHOLARSHIP', 'HARDSHIP', 'CUSTOM') NOT NULL,
  `calculation_method` ENUM('PERCENTAGE', 'FIXED') NOT NULL,
  `value` DECIMAL(10, 2) NOT NULL,
  `applies_to_fee_type` ENUM('TUITION', 'TRANSPORT', 'ALL') NOT NULL,
  `sibling_order_from` SMALLINT UNSIGNED NULL,
  `max_discount_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
  `requires_approval` BOOLEAN NOT NULL DEFAULT false,
  `discount_gl_account_id` INTEGER NULL,
  `contra_gl_account_id` INTEGER NULL,
  `academic_year_id` VARCHAR(191) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `discount_rules_new_legacy_id_key`(`legacy_id`),
  INDEX `dr_type_idx`(`discount_type`),
  INDEX `dr_active_idx`(`is_active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `student_invoices_new` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `legacy_id` VARCHAR(191) NULL,
  `invoice_number` VARCHAR(30) NOT NULL,
  `enrollment_id` VARCHAR(191) NOT NULL,
  `academic_year_id` VARCHAR(191) NOT NULL,
  `branch_id` INTEGER NULL,
  `invoice_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `vat_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(15, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  `currency_id` INTEGER NULL,
  `status` ENUM('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'CANCELLED', 'CREDITED') NOT NULL DEFAULT 'DRAFT',
  `notes` TEXT NULL,
  `created_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  UNIQUE INDEX `student_invoices_new_legacy_id_key`(`legacy_id`),
  UNIQUE INDEX `student_invoices_invoice_number_key`(`invoice_number`),
  INDEX `inv_enrollment_idx`(`enrollment_id`),
  INDEX `inv_status_idx`(`status`),
  INDEX `inv_date_idx`(`invoice_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_line_items_new` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `legacy_id` VARCHAR(191) NULL,
  `invoice_id` BIGINT UNSIGNED NOT NULL,
  `fee_structure_id` INTEGER UNSIGNED NULL,
  `description_ar` VARCHAR(200) NOT NULL,
  `fee_type` ENUM('TUITION', 'TRANSPORT', 'UNIFORM', 'REGISTRATION', 'ACTIVITY', 'PENALTY', 'OTHER') NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  `unit_price` DECIMAL(15, 2) NOT NULL,
  `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `discount_rule_id` INTEGER UNSIGNED NULL,
  `discount_gl_account_id` INTEGER NULL,
  `tax_code_id` SMALLINT UNSIGNED NULL,
  `vat_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `vat_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `line_total` DECIMAL(15, 2) NOT NULL,
  `account_id` INTEGER NULL,
  UNIQUE INDEX `invoice_line_items_new_legacy_id_key`(`legacy_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_installments_new` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `legacy_id` VARCHAR(191) NULL,
  `invoice_id` BIGINT UNSIGNED NOT NULL,
  `installment_number` SMALLINT UNSIGNED NOT NULL,
  `due_date` DATE NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `paid_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `payment_date` DATE NULL,
  `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `late_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `notes` VARCHAR(255) NULL,
  UNIQUE INDEX `invoice_installments_new_legacy_id_key`(`legacy_id`),
  UNIQUE INDEX `uk_installment`(`invoice_id`, `installment_number`),
  INDEX `idx_due`(`due_date`),
  INDEX `idx_status`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_transactions_new` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `legacy_id` VARCHAR(191) NULL,
  `transaction_number` VARCHAR(30) NOT NULL,
  `gateway_id` INTEGER NOT NULL,
  `gateway_transaction_id` VARCHAR(100) NULL,
  `invoice_id` BIGINT UNSIGNED NULL,
  `installment_id` BIGINT UNSIGNED NULL,
  `enrollment_id` VARCHAR(191) NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `currency_id` INTEGER NULL,
  `payment_method` ENUM('CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_WALLET', 'CHEQUE') NOT NULL,
  `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paid_at` DATETIME(3) NULL,
  `receipt_number` VARCHAR(50) NULL,
  `payer_name` VARCHAR(150) NULL,
  `payer_phone` VARCHAR(20) NULL,
  `journal_entry_id` VARCHAR(191) NULL,
  `notes` TEXT NULL,
  `created_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  UNIQUE INDEX `payment_transactions_new_legacy_id_key`(`legacy_id`),
  UNIQUE INDEX `payment_transactions_transaction_number_key`(`transaction_number`),
  INDEX `ptx_gateway_idx`(`gateway_id`),
  INDEX `ptx_invoice_idx`(`invoice_id`),
  INDEX `ptx_status_idx`(`status`),
  INDEX `ptx_paid_at_idx`(`paid_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `fin_tax_codes_new` (
  `id`,
  `tax_code`,
  `tax_name_ar`,
  `tax_name_en`,
  `rate`,
  `tax_type`,
  `is_inclusive`,
  `output_gl_account_id`,
  `input_gl_account_id`,
  `effective_from`,
  `effective_to`,
  `is_active`,
  `created_at`,
  `updated_at`
)
SELECT
  ft.id,
  ft.code,
  ft.name_ar,
  ft.name_en,
  ft.rate,
  CASE ft.tax_type
    WHEN 'ZERO' THEN 'ZERO_RATED'
    ELSE ft.tax_type
  END,
  FALSE,
  CASE
    WHEN ft.tax_type = 'OUTPUT' THEN @vat_output_account_id
    ELSE NULL
  END,
  NULL,
  COALESCE(DATE(ft.created_at), CURDATE()),
  NULL,
  ft.is_active,
  ft.created_at,
  ft.updated_at
FROM fin_tax_codes ft
WHERE ft.deleted_at IS NULL;

INSERT INTO `fee_structures_new` (
  `legacy_id`,
  `name_ar`,
  `academic_year_id`,
  `grade_level_id`,
  `fee_type`,
  `amount`,
  `currency_id`,
  `vat_rate`,
  `is_active`,
  `created_at`
)
SELECT
  fs.id,
  fs.name_ar,
  fs.academic_year_id,
  fs.grade_level_id,
  CASE fs.fee_type
    WHEN 'ACTIVITIES' THEN 'ACTIVITY'
    WHEN 'UNIFORM' THEN 'UNIFORM'
    WHEN 'TRANSPORT' THEN 'TRANSPORT'
    WHEN 'REGISTRATION' THEN 'REGISTRATION'
    WHEN 'TUITION' THEN 'TUITION'
    ELSE 'OTHER'
  END,
  fs.amount,
  COALESCE(fs.currency_id, @base_currency_id),
  15.00,
  fs.is_active,
  fs.created_at
FROM fee_structures fs
WHERE fs.deleted_at IS NULL;

INSERT INTO `discount_rules_new` (
  `legacy_id`,
  `name_ar`,
  `discount_type`,
  `calculation_method`,
  `value`,
  `applies_to_fee_type`,
  `sibling_order_from`,
  `max_discount_percentage`,
  `requires_approval`,
  `discount_gl_account_id`,
  `contra_gl_account_id`,
  `academic_year_id`,
  `is_active`,
  `created_at`
)
SELECT
  dr.id,
  dr.name_ar,
  CASE dr.discount_type
    WHEN 'EARLY_PAYMENT' THEN 'CUSTOM'
    ELSE dr.discount_type
  END,
  CASE
    WHEN dr.fixed_amount IS NOT NULL AND dr.fixed_amount > 0 THEN 'FIXED'
    ELSE 'PERCENTAGE'
  END,
  COALESCE(dr.fixed_amount, dr.percentage, 0),
  'TUITION',
  dr.min_siblings,
  COALESCE(dr.percentage, 100.00),
  FALSE,
  @discount_expense_account_id,
  @default_revenue_account_id,
  NULL,
  dr.is_active,
  dr.created_at
FROM discount_rules dr
WHERE dr.deleted_at IS NULL;

INSERT INTO `student_invoices_new` (
  `legacy_id`,
  `invoice_number`,
  `enrollment_id`,
  `academic_year_id`,
  `branch_id`,
  `invoice_date`,
  `due_date`,
  `subtotal`,
  `discount_amount`,
  `vat_amount`,
  `total_amount`,
  `paid_amount`,
  `currency_id`,
  `status`,
  `notes`,
  `created_by_user_id`,
  `created_at`,
  `updated_at`
)
SELECT
  si.id,
  LEFT(si.invoice_number, 30),
  se.id,
  si.academic_year_id,
  @main_branch_id,
  si.issue_date,
  si.due_date,
  si.subtotal_amount,
  si.discount_amount,
  si.tax_amount,
  si.total_amount,
  si.paid_amount,
  @base_currency_id,
  CASE si.status
    WHEN 'PARTIALLY_PAID' THEN 'PARTIAL'
    WHEN 'REFUNDED' THEN 'CREDITED'
    WHEN 'OVERDUE' THEN CASE WHEN si.paid_amount > 0 THEN 'PARTIAL' ELSE 'ISSUED' END
    ELSE si.status
  END,
  si.notes,
  si.created_by,
  si.created_at,
  si.updated_at
FROM student_invoices si
JOIN student_enrollments se
  ON se.student_id = si.student_id
 AND se.academic_year_id = si.academic_year_id
 AND se.deleted_at IS NULL
WHERE si.deleted_at IS NULL;

INSERT INTO `invoice_line_items_new` (
  `legacy_id`,
  `invoice_id`,
  `fee_structure_id`,
  `description_ar`,
  `fee_type`,
  `quantity`,
  `unit_price`,
  `discount_amount`,
  `discount_rule_id`,
  `discount_gl_account_id`,
  `tax_code_id`,
  `vat_rate`,
  `vat_amount`,
  `line_total`,
  `account_id`
)
SELECT
  ili.id,
  sin.id,
  NULL,
  COALESCE(
    NULLIF(TRIM(ili.description), ''),
    CASE ili.fee_type
      WHEN 'TUITION' THEN 'رسوم دراسية'
      WHEN 'TRANSPORT' THEN 'رسوم نقل'
      WHEN 'UNIFORM' THEN 'رسوم زي مدرسي'
      WHEN 'REGISTRATION' THEN 'رسوم تسجيل'
      ELSE 'بند فوترة مرحل'
    END
  ),
  CASE ili.fee_type
    WHEN 'ACTIVITIES' THEN 'ACTIVITY'
    WHEN 'UNIFORM' THEN 'UNIFORM'
    WHEN 'TRANSPORT' THEN 'TRANSPORT'
    WHEN 'REGISTRATION' THEN 'REGISTRATION'
    WHEN 'TUITION' THEN 'TUITION'
    WHEN 'EXAM' THEN 'OTHER'
    WHEN 'BOOKS' THEN 'OTHER'
    WHEN 'CAFETERIA' THEN 'OTHER'
    ELSE 'OTHER'
  END,
  ili.quantity,
  ili.unit_price,
  ili.discount_amount,
  NULL,
  CASE
    WHEN ili.discount_amount > 0 THEN @discount_expense_account_id
    ELSE NULL
  END,
  ili.tax_code_id,
  COALESCE(ft.rate, 0.00),
  ili.tax_amount,
  ili.net_amount,
  COALESCE(
    ili.account_id,
    CASE ili.fee_type
      WHEN 'TRANSPORT' THEN (SELECT id FROM chart_of_accounts WHERE account_code = '4003' AND deleted_at IS NULL ORDER BY id LIMIT 1)
      WHEN 'UNIFORM' THEN (SELECT id FROM chart_of_accounts WHERE account_code = '4004' AND deleted_at IS NULL ORDER BY id LIMIT 1)
      WHEN 'REGISTRATION' THEN (SELECT id FROM chart_of_accounts WHERE account_code = '4005' AND deleted_at IS NULL ORDER BY id LIMIT 1)
      ELSE @default_revenue_account_id
    END
  )
FROM invoice_line_items ili
JOIN student_invoices_new sin
  ON sin.legacy_id = ili.invoice_id
LEFT JOIN fin_tax_codes_new ft
  ON ft.id = ili.tax_code_id
WHERE ili.deleted_at IS NULL;

INSERT INTO `invoice_installments_new` (
  `legacy_id`,
  `invoice_id`,
  `installment_number`,
  `due_date`,
  `amount`,
  `paid_amount`,
  `payment_date`,
  `status`,
  `late_fee`,
  `notes`
)
SELECT
  ii.id,
  sin.id,
  ii.installment_no,
  ii.due_date,
  ii.amount,
  ii.paid_amount,
  CASE
    WHEN ii.paid_amount > 0 THEN DATE(ii.updated_at)
    ELSE NULL
  END,
  CASE ii.status
    WHEN 'PARTIALLY_PAID' THEN 'PARTIAL'
    ELSE ii.status
  END,
  0.00,
  NULL
FROM invoice_installments ii
JOIN student_invoices_new sin
  ON sin.legacy_id = ii.invoice_id
WHERE ii.deleted_at IS NULL;

UPDATE `student_invoices_new` si
LEFT JOIN (
  SELECT
    invoice_id,
    SUM(paid_amount) AS total_paid
  FROM invoice_installments_new
  GROUP BY invoice_id
) installment_totals
  ON installment_totals.invoice_id = si.id
SET
  si.paid_amount = COALESCE(installment_totals.total_paid, si.paid_amount),
  si.status = CASE
    WHEN si.status IN ('CANCELLED', 'CREDITED') THEN si.status
    WHEN COALESCE(installment_totals.total_paid, 0) >= si.total_amount AND si.total_amount > 0 THEN 'PAID'
    WHEN COALESCE(installment_totals.total_paid, 0) > 0 THEN 'PARTIAL'
    WHEN si.status = 'PARTIAL' THEN 'ISSUED'
    ELSE si.status
  END;

INSERT INTO `payment_transactions_new` (
  `legacy_id`,
  `transaction_number`,
  `gateway_id`,
  `gateway_transaction_id`,
  `invoice_id`,
  `installment_id`,
  `enrollment_id`,
  `amount`,
  `currency_id`,
  `payment_method`,
  `status`,
  `paid_at`,
  `receipt_number`,
  `payer_name`,
  `payer_phone`,
  `journal_entry_id`,
  `notes`,
  `created_by_user_id`,
  `created_at`,
  `updated_at`
)
SELECT
  pt.id,
  pt.transaction_number,
  pt.gateway_id,
  pt.gateway_transaction_id,
  COALESCE(sir.id, sii.id),
  iin.id,
  COALESCE(pt.student_enrollment_id, sir.enrollment_id, sii.enrollment_id),
  pt.amount,
  @base_currency_id,
  pt.payment_method,
  pt.status,
  pt.paid_at,
  pt.receipt_number,
  pt.payer_name,
  pt.payer_phone,
  pt.journal_entry_id,
  pt.notes,
  pt.created_by,
  pt.created_at,
  pt.updated_at
FROM payment_transactions pt
LEFT JOIN invoice_installments_new iin
  ON iin.legacy_id = pt.invoice_installment_id
LEFT JOIN student_invoices_new sii
  ON sii.id = iin.invoice_id
LEFT JOIN student_invoices_new sir
  ON sir.legacy_id = pt.reference_id
WHERE pt.deleted_at IS NULL;

DROP TABLE IF EXISTS `payment_webhook_events`;
DROP TABLE IF EXISTS `reconciliation_items`;
DROP TABLE IF EXISTS `bank_reconciliation`;

SET FOREIGN_KEY_CHECKS = 0;

RENAME TABLE
  `fin_tax_codes` TO `fin_tax_codes_legacy`,
  `fee_structures` TO `fee_structures_legacy`,
  `discount_rules` TO `discount_rules_legacy`,
  `student_invoices` TO `student_invoices_legacy`,
  `invoice_line_items` TO `invoice_line_items_legacy`,
  `invoice_installments` TO `invoice_installments_legacy`,
  `payment_transactions` TO `payment_transactions_legacy`,
  `fin_tax_codes_new` TO `fin_tax_codes`,
  `fee_structures_new` TO `fee_structures`,
  `discount_rules_new` TO `discount_rules`,
  `student_invoices_new` TO `student_invoices`,
  `invoice_line_items_new` TO `invoice_line_items`,
  `invoice_installments_new` TO `invoice_installments`,
  `payment_transactions_new` TO `payment_transactions`;

SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE `fin_tax_codes_legacy`
  DROP FOREIGN KEY `fin_tax_codes_created_by_fkey`,
  DROP FOREIGN KEY `fin_tax_codes_updated_by_fkey`;

ALTER TABLE `discount_rules_legacy`
  DROP FOREIGN KEY `discount_rules_created_by_fkey`,
  DROP FOREIGN KEY `discount_rules_updated_by_fkey`;

ALTER TABLE `fee_structures_legacy`
  DROP FOREIGN KEY `fee_structures_academic_year_id_fkey`,
  DROP FOREIGN KEY `fee_structures_created_by_fkey`,
  DROP FOREIGN KEY `fee_structures_currency_id_fkey`,
  DROP FOREIGN KEY `fee_structures_grade_level_id_fkey`,
  DROP FOREIGN KEY `fee_structures_updated_by_fkey`;

ALTER TABLE `student_invoices_legacy`
  DROP FOREIGN KEY `student_invoices_academic_year_id_fkey`,
  DROP FOREIGN KEY `student_invoices_created_by_fkey`,
  DROP FOREIGN KEY `student_invoices_fiscal_year_id_fkey`,
  DROP FOREIGN KEY `student_invoices_student_id_fkey`,
  DROP FOREIGN KEY `student_invoices_updated_by_fkey`;

ALTER TABLE `invoice_line_items_legacy`
  DROP FOREIGN KEY `invoice_line_items_account_id_fkey`,
  DROP FOREIGN KEY `invoice_line_items_created_by_fkey`,
  DROP FOREIGN KEY `invoice_line_items_invoice_id_fkey`,
  DROP FOREIGN KEY `invoice_line_items_tax_code_id_fkey`,
  DROP FOREIGN KEY `invoice_line_items_updated_by_fkey`;

ALTER TABLE `invoice_installments_legacy`
  DROP FOREIGN KEY `invoice_installments_created_by_fkey`,
  DROP FOREIGN KEY `invoice_installments_invoice_id_fkey`,
  DROP FOREIGN KEY `invoice_installments_updated_by_fkey`;

ALTER TABLE `payment_transactions_legacy`
  DROP FOREIGN KEY `payment_transactions_created_by_fkey`,
  DROP FOREIGN KEY `payment_transactions_gateway_id_fkey`,
  DROP FOREIGN KEY `payment_transactions_invoice_installment_id_fkey`,
  DROP FOREIGN KEY `payment_transactions_journal_entry_id_fkey`,
  DROP FOREIGN KEY `payment_transactions_reconciled_by_fkey`,
  DROP FOREIGN KEY `payment_transactions_student_enrollment_id_fkey`,
  DROP FOREIGN KEY `payment_transactions_updated_by_fkey`;

CREATE TABLE `payment_webhook_events` (
  `id` VARCHAR(191) NOT NULL,
  `event_id` VARCHAR(100) NOT NULL,
  `event_type` ENUM('SUCCESS', 'FAILURE', 'REFUND') NOT NULL,
  `status` ENUM('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
  `idempotency_key` VARCHAR(100) NULL,
  `gateway_id` INTEGER NULL,
  `transaction_id` BIGINT UNSIGNED NULL,
  `payload` JSON NOT NULL,
  `error_message` TEXT NULL,
  `processed_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `payment_webhook_events_event_id_key`(`event_id`),
  INDEX `pwe_event_type_idx`(`event_type`),
  INDEX `pwe_status_idx`(`status`),
  INDEX `pwe_gateway_idx`(`gateway_id`),
  INDEX `pwe_transaction_idx`(`transaction_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `bank_reconciliation` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bank_account_id` INTEGER NOT NULL,
  `statement_date` DATE NOT NULL,
  `statement_reference` VARCHAR(50) NULL,
  `bank_balance` DECIMAL(18, 2) NOT NULL,
  `book_balance` DECIMAL(18, 2) NOT NULL,
  `difference` DECIMAL(18, 2) GENERATED ALWAYS AS (bank_balance - book_balance) STORED,
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RECONCILED') NOT NULL DEFAULT 'OPEN',
  `reconciled_by_user_id` VARCHAR(191) NULL,
  `reconciled_at` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `br_bank_account_idx`(`bank_account_id`),
  INDEX `br_statement_date_idx`(`statement_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reconciliation_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reconciliation_id` BIGINT UNSIGNED NOT NULL,
  `transaction_id` BIGINT UNSIGNED NULL,
  `journal_entry_id` VARCHAR(191) NULL,
  `bank_reference` VARCHAR(100) NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `item_type` ENUM('MATCHED', 'UNMATCHED_BANK', 'UNMATCHED_BOOK') NOT NULL,
  `matched_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `fin_tax_codes`
  ADD CONSTRAINT `fin_tax_codes_output_gl_account_id_fkey`
    FOREIGN KEY (`output_gl_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fin_tax_codes_input_gl_account_id_fkey`
    FOREIGN KEY (`input_gl_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `fee_structures`
  ADD CONSTRAINT `fee_structures_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fee_structures_grade_level_id_fkey`
    FOREIGN KEY (`grade_level_id`) REFERENCES `grade_levels`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fee_structures_currency_id_fkey`
    FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `discount_rules`
  ADD CONSTRAINT `discount_rules_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `discount_rules_discount_gl_account_id_fkey`
    FOREIGN KEY (`discount_gl_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `discount_rules_contra_gl_account_id_fkey`
    FOREIGN KEY (`contra_gl_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `student_invoices`
  ADD CONSTRAINT `student_invoices_enrollment_id_fkey`
    FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_invoices_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `student_invoices_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `student_invoices_currency_id_fkey`
    FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `student_invoices_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `invoice_line_items`
  ADD CONSTRAINT `invoice_line_items_invoice_id_fkey`
    FOREIGN KEY (`invoice_id`) REFERENCES `student_invoices`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_fee_structure_id_fkey`
    FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_discount_rule_id_fkey`
    FOREIGN KEY (`discount_rule_id`) REFERENCES `discount_rules`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_discount_gl_account_id_fkey`
    FOREIGN KEY (`discount_gl_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_tax_code_id_fkey`
    FOREIGN KEY (`tax_code_id`) REFERENCES `fin_tax_codes`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_line_items_account_id_fkey`
    FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `invoice_installments`
  ADD CONSTRAINT `invoice_installments_invoice_id_fkey`
    FOREIGN KEY (`invoice_id`) REFERENCES `student_invoices`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `payment_transactions_gateway_id_fkey`
    FOREIGN KEY (`gateway_id`) REFERENCES `payment_gateways`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_invoice_id_fkey`
    FOREIGN KEY (`invoice_id`) REFERENCES `student_invoices`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_installment_id_fkey`
    FOREIGN KEY (`installment_id`) REFERENCES `invoice_installments`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_enrollment_id_fkey`
    FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_currency_id_fkey`
    FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_transactions_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_webhook_events`
  ADD CONSTRAINT `payment_webhook_events_gateway_id_fkey`
    FOREIGN KEY (`gateway_id`) REFERENCES `payment_gateways`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `payment_webhook_events_transaction_id_fkey`
    FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `bank_reconciliation`
  ADD CONSTRAINT `bank_reconciliation_bank_account_id_fkey`
    FOREIGN KEY (`bank_account_id`) REFERENCES `chart_of_accounts`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `bank_reconciliation_reconciled_by_user_id_fkey`
    FOREIGN KEY (`reconciled_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `reconciliation_items`
  ADD CONSTRAINT `reconciliation_items_reconciliation_id_fkey`
    FOREIGN KEY (`reconciliation_id`) REFERENCES `bank_reconciliation`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_items_transaction_id_fkey`
    FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `reconciliation_items_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE journal_entries je
JOIN payment_transactions pt
  ON pt.legacy_id = je.reference_id
SET je.reference_id = CAST(pt.id AS CHAR)
WHERE je.reference_type IN ('PAYMENT', 'PAYMENT_TRANSACTION');

CREATE OR REPLACE VIEW `v_student_account_statement` AS
SELECT
  s.id AS student_id,
  s.full_name AS student_name,
  si.invoice_number,
  si.invoice_date,
  si.total_amount,
  si.paid_amount,
  si.balance_due,
  si.status AS invoice_status,
  gl.name AS grade_name
FROM student_invoices si
JOIN student_enrollments se ON si.enrollment_id = se.id
JOIN students s ON se.student_id = s.id
JOIN sections sec ON se.section_id = sec.id
JOIN grade_levels gl ON sec.grade_level_id = gl.id;

CREATE OR REPLACE VIEW `v_vat_return_report` AS
SELECT
  tc.tax_code,
  tc.tax_name_ar,
  tc.rate AS tax_rate,
  tc.tax_type,
  COUNT(ili.id) AS line_count,
  SUM(ili.unit_price * ili.quantity) AS taxable_amount,
  SUM(ili.vat_amount) AS tax_collected,
  coa_out.account_code AS output_account_code,
  coa_out.name_ar AS output_account_name
FROM invoice_line_items ili
JOIN fin_tax_codes tc ON ili.tax_code_id = tc.id
JOIN student_invoices si ON ili.invoice_id = si.id
LEFT JOIN chart_of_accounts coa_out ON tc.output_gl_account_id = coa_out.id
WHERE si.status IN ('ISSUED', 'PARTIAL', 'PAID')
GROUP BY tc.id, tc.tax_code, tc.tax_name_ar, tc.rate, tc.tax_type,
         coa_out.account_code, coa_out.name_ar;

CREATE OR REPLACE VIEW `v_accounts_receivable_aging` AS
SELECT
  s.id AS student_id,
  s.full_name AS student_name,
  g.full_name AS guardian_name,
  gl.name AS grade_name,
  si.invoice_number,
  si.invoice_date,
  si.due_date,
  si.total_amount,
  si.paid_amount,
  si.balance_due,
  DATEDIFF(CURRENT_DATE, si.due_date) AS days_overdue,
  CASE
    WHEN si.balance_due <= 0 THEN 'مسدد'
    WHEN DATEDIFF(CURRENT_DATE, si.due_date) <= 0 THEN 'غير مستحق بعد'
    WHEN DATEDIFF(CURRENT_DATE, si.due_date) BETWEEN 1 AND 30 THEN '1-30 يوم'
    WHEN DATEDIFF(CURRENT_DATE, si.due_date) BETWEEN 31 AND 60 THEN '31-60 يوم'
    WHEN DATEDIFF(CURRENT_DATE, si.due_date) BETWEEN 61 AND 90 THEN '61-90 يوم'
    WHEN DATEDIFF(CURRENT_DATE, si.due_date) BETWEEN 91 AND 120 THEN '91-120 يوم'
    ELSE 'أكثر من 120 يوم'
  END AS aging_bucket,
  CASE WHEN DATEDIFF(CURRENT_DATE, si.due_date) BETWEEN 1 AND 30 THEN si.balance_due ELSE 0 END AS bucket_1_30,
  CASE WHEN DATEDIFF(CURRENT_DATE, si.due_date) BETWEEN 31 AND 60 THEN si.balance_due ELSE 0 END AS bucket_31_60,
  CASE WHEN DATEDIFF(CURRENT_DATE, si.due_date) BETWEEN 61 AND 90 THEN si.balance_due ELSE 0 END AS bucket_61_90,
  CASE WHEN DATEDIFF(CURRENT_DATE, si.due_date) BETWEEN 91 AND 120 THEN si.balance_due ELSE 0 END AS bucket_91_120,
  CASE WHEN DATEDIFF(CURRENT_DATE, si.due_date) > 120 THEN si.balance_due ELSE 0 END AS bucket_120_plus,
  si.status AS invoice_status,
  br.name_ar AS branch_name
FROM student_invoices si
JOIN student_enrollments se ON si.enrollment_id = se.id
JOIN students s ON se.student_id = s.id
JOIN sections sec ON se.section_id = sec.id
JOIN grade_levels gl ON sec.grade_level_id = gl.id
LEFT JOIN student_guardians sg ON s.id = sg.student_id AND sg.is_primary = TRUE
LEFT JOIN guardians g ON sg.guardian_id = g.id
LEFT JOIN branches br ON si.branch_id = br.id
WHERE si.status IN ('ISSUED', 'PARTIAL', 'PAID')
  AND si.balance_due > 0;
