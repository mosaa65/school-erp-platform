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
