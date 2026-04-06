-- Archive retired finance code values before dropping columns.

CREATE TABLE IF NOT EXISTS retired_code_archive (
  table_name VARCHAR(80) NOT NULL,
  row_id VARCHAR(191) NOT NULL,
  field_name VARCHAR(80) NOT NULL,
  code_value VARCHAR(255) NOT NULL,
  migrated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (table_name, row_id, field_name)
);

INSERT IGNORE INTO retired_code_archive (table_name, row_id, field_name, code_value, migrated_at)
SELECT 'branches', CAST(id AS CHAR), 'code', code, CURRENT_TIMESTAMP
FROM branches
WHERE code IS NOT NULL;

INSERT IGNORE INTO retired_code_archive (table_name, row_id, field_name, code_value, migrated_at)
SELECT 'currencies', CAST(id AS CHAR), 'code', code, CURRENT_TIMESTAMP
FROM currencies
WHERE code IS NOT NULL;

INSERT IGNORE INTO retired_code_archive (table_name, row_id, field_name, code_value, migrated_at)
SELECT 'chart_of_accounts', CAST(id AS CHAR), 'account_code', account_code, CURRENT_TIMESTAMP
FROM chart_of_accounts
WHERE account_code IS NOT NULL;

INSERT IGNORE INTO retired_code_archive (table_name, row_id, field_name, code_value, migrated_at)
SELECT 'payment_gateways', CAST(id AS CHAR), 'provider_code', provider_code, CURRENT_TIMESTAMP
FROM payment_gateways
WHERE provider_code IS NOT NULL;

INSERT IGNORE INTO retired_code_archive (table_name, row_id, field_name, code_value, migrated_at)
SELECT 'fin_tax_codes', CAST(id AS CHAR), 'tax_code', tax_code, CURRENT_TIMESTAMP
FROM fin_tax_codes
WHERE tax_code IS NOT NULL;

INSERT IGNORE INTO retired_code_archive (table_name, row_id, field_name, code_value, migrated_at)
SELECT 'financial_categories', CAST(id AS CHAR), 'code', code, CURRENT_TIMESTAMP
FROM financial_categories
WHERE code IS NOT NULL;

INSERT IGNORE INTO retired_code_archive (table_name, row_id, field_name, code_value, migrated_at)
SELECT 'financial_funds', CAST(id AS CHAR), 'code', code, CURRENT_TIMESTAMP
FROM financial_funds
WHERE code IS NOT NULL;

INSERT IGNORE INTO retired_code_archive (table_name, row_id, field_name, code_value, migrated_at)
SELECT 'cost_centers', CAST(id AS CHAR), 'code', code, CURRENT_TIMESTAMP
FROM cost_centers
WHERE code IS NOT NULL;

-- NOTE:
-- Column drop operations are intentionally postponed to a follow-up migration
-- after all dependent application services/reports are switched away from code fields.
-- This release focuses on safe archival with zero runtime breakage.
