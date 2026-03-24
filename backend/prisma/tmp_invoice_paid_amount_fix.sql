UPDATE `student_invoices` si
LEFT JOIN (
  SELECT
    invoice_id,
    SUM(paid_amount) AS total_paid
  FROM invoice_installments
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
