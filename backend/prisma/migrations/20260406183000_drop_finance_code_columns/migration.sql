-- Finalize finance code-field retirement by dropping legacy columns.
-- Data archival is handled by migration: 20260406120000_retire_finance_code_columns

ALTER TABLE `branches`
  DROP COLUMN `code`;

ALTER TABLE `currencies`
  DROP COLUMN `code`;

ALTER TABLE `chart_of_accounts`
  DROP COLUMN `account_code`;

ALTER TABLE `payment_gateways`
  DROP COLUMN `provider_code`;

ALTER TABLE `fin_tax_codes`
  DROP COLUMN `tax_code`;

ALTER TABLE `financial_categories`
  DROP COLUMN `code`;

ALTER TABLE `financial_funds`
  DROP COLUMN `code`;

ALTER TABLE `cost_centers`
  DROP COLUMN `code`;
