-- Add missing legacy finance lookup tables, community contributions, credit/debit notes, and legacy analysis view.

CREATE TABLE IF NOT EXISTS `lookup_exemption_reasons` (
  `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(50) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `sort_order` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE INDEX `lookup_exemption_reasons_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lookup_exemption_authorities` (
  `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(50) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  UNIQUE INDEX `lookup_exemption_authorities_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lookup_contribution_amounts` (
  `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name_ar` VARCHAR(50) NOT NULL,
  `amount_value` DECIMAL(10, 2) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed legacy lookup data (idempotent)
INSERT INTO `lookup_exemption_reasons` (`name_ar`, `code`, `sort_order`)
VALUES
  ('يتيم', 'ORPHAN', 1),
  ('ابن تربوي', 'TEACHER_CHILD', 2),
  ('ابن موظف', 'EMPLOYEE_CHILD', 3),
  ('أحفاد بلال', 'BILAL_DESCENDANTS', 4),
  ('له أكثر من أخ', 'MULTIPLE_SIBLINGS', 5),
  ('حالة متعسرة', 'FINANCIAL_HARDSHIP', 6),
  ('أخرى', 'OTHER', 99)
ON DUPLICATE KEY UPDATE
  `name_ar` = VALUES(`name_ar`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);

INSERT INTO `lookup_exemption_authorities` (`name_ar`, `code`)
VALUES
  ('تعميم وزاري', 'CIRCULAR'),
  ('قرار مدير', 'PRINCIPAL'),
  ('مجلس الآباء', 'PARENTS_COUNCIL'),
  ('أخرى', 'OTHER')
ON DUPLICATE KEY UPDATE
  `name_ar` = VALUES(`name_ar`);

INSERT INTO `lookup_contribution_amounts` (`name_ar`, `amount_value`)
VALUES
  ('أساسي (محسن)', 5000.00),
  ('أساسي (مخفض)', 2500.00),
  ('ثانوي (كامل)', 7000.00)
ON DUPLICATE KEY UPDATE
  `name_ar` = VALUES(`name_ar`),
  `amount_value` = VALUES(`amount_value`),
  `is_active` = VALUES(`is_active`);

CREATE TABLE IF NOT EXISTS `credit_debit_notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `note_number` VARCHAR(30) NOT NULL,
  `note_type` ENUM('CREDIT','DEBIT') NOT NULL,
  `original_invoice_id` BIGINT UNSIGNED NOT NULL,
  `enrollment_id` VARCHAR(191) NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `vat_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(15, 2) NOT NULL,
  `reason` ENUM('WITHDRAWAL','OVERCHARGE','SCHOLARSHIP','FEE_ADJUSTMENT','REFUND','PENALTY','OTHER') NOT NULL,
  `reason_details` TEXT NULL,
  `status` ENUM('DRAFT','APPROVED','APPLIED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `applied_at` DATETIME(3) NULL,
  `journal_entry_id` VARCHAR(191) NULL,
  `created_by_user_id` VARCHAR(191) NULL,
  `approved_by_user_id` VARCHAR(191) NULL,
  `approved_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  UNIQUE INDEX `credit_debit_notes_note_number_key`(`note_number`),
  INDEX `idx_invoice`(`original_invoice_id`),
  INDEX `idx_type`(`note_type`),
  INDEX `idx_status`(`status`),
  INDEX `idx_reason`(`reason`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `community_contributions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `enrollment_id` VARCHAR(191) NOT NULL,
  `academic_year_id` VARCHAR(191) NOT NULL,
  `semester_id` VARCHAR(191) NOT NULL,
  `month_id` VARCHAR(191) NOT NULL,
  `week_id` SMALLINT UNSIGNED NULL,
  `payment_date` DATE NOT NULL,
  `payment_date_hijri` VARCHAR(20) NULL,
  `required_amount_id` SMALLINT UNSIGNED NOT NULL,
  `received_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `is_exempt` BOOLEAN NOT NULL DEFAULT false,
  `exemption_reason_id` SMALLINT UNSIGNED NULL,
  `exemption_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `exemption_authority_id` SMALLINT UNSIGNED NULL,
  `recipient_employee_id` VARCHAR(191) NULL,
  `payer_name` VARCHAR(150) NULL,
  `receipt_number` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` VARCHAR(191) NULL,
  `invoice_id` BIGINT UNSIGNED NULL,
  `journal_entry_id` VARCHAR(191) NULL,
  UNIQUE INDEX `uk_contrib_monthly`(`enrollment_id`, `month_id`),
  INDEX `cc_enrollment_idx`(`enrollment_id`),
  INDEX `cc_month_idx`(`month_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `credit_debit_notes`
  ADD CONSTRAINT `credit_debit_notes_original_invoice_id_fkey`
    FOREIGN KEY (`original_invoice_id`) REFERENCES `student_invoices`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `credit_debit_notes_enrollment_id_fkey`
    FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `credit_debit_notes_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `credit_debit_notes_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `credit_debit_notes_approved_by_user_id_fkey`
    FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `community_contributions`
  ADD CONSTRAINT `community_contributions_enrollment_id_fkey`
    FOREIGN KEY (`enrollment_id`) REFERENCES `student_enrollments`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_academic_year_id_fkey`
    FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_semester_id_fkey`
    FOREIGN KEY (`semester_id`) REFERENCES `academic_terms`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_month_id_fkey`
    FOREIGN KEY (`month_id`) REFERENCES `academic_months`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_week_id_fkey`
    FOREIGN KEY (`week_id`) REFERENCES `lookup_weeks`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_required_amount_id_fkey`
    FOREIGN KEY (`required_amount_id`) REFERENCES `lookup_contribution_amounts`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_exemption_reason_id_fkey`
    FOREIGN KEY (`exemption_reason_id`) REFERENCES `lookup_exemption_reasons`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_exemption_authority_id_fkey`
    FOREIGN KEY (`exemption_authority_id`) REFERENCES `lookup_exemption_authorities`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_recipient_employee_id_fkey`
    FOREIGN KEY (`recipient_employee_id`) REFERENCES `employees`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_invoice_id_fkey`
    FOREIGN KEY (`invoice_id`) REFERENCES `student_invoices`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `community_contributions_journal_entry_id_fkey`
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE VIEW `v_community_contributions_analysis` AS
SELECT
  s.full_name AS student_name,
  gl.name AS grade,
  sec.name AS classroom,
  am.name AS month_name,
  ca.amount_value AS expected,
  cc.received_amount AS paid,
  cc.exemption_amount AS exempt,
  (ca.amount_value - cc.received_amount - cc.exemption_amount) AS balance,
  cc.payment_date,
  cc.invoice_id AS linked_invoice_id,
  cc.journal_entry_id AS linked_je_id
FROM community_contributions cc
JOIN student_enrollments se ON cc.enrollment_id = se.id
JOIN students s ON se.student_id = s.id
JOIN sections sec ON se.section_id = sec.id
JOIN grade_levels gl ON sec.grade_level_id = gl.id
JOIN academic_months am ON cc.month_id = am.id
JOIN lookup_contribution_amounts ca ON cc.required_amount_id = ca.id;
