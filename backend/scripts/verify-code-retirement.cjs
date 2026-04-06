/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const RETIRED_COLUMNS = [
  { table: "branches", column: "code" },
  { table: "currencies", column: "code" },
  { table: "chart_of_accounts", column: "account_code" },
  { table: "payment_gateways", column: "provider_code" },
  { table: "fin_tax_codes", column: "tax_code" },
  { table: "financial_categories", column: "code" },
  { table: "financial_funds", column: "code" },
  { table: "cost_centers", column: "code" },
];

async function queryColumnExists(tableName, columnName) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
    `,
    tableName,
    columnName,
  );

  const count = Number(rows?.[0]?.count ?? 0);
  return count > 0;
}

async function queryArchiveRows(tableName, fieldName) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT COUNT(*) AS count
      FROM retired_code_archive
      WHERE table_name = ?
        AND field_name = ?
    `,
    tableName,
    fieldName,
  );

  return Number(rows?.[0]?.count ?? 0);
}

async function main() {
  console.log("Running safe verification for retired finance code columns...");

  const stillExisting = [];
  for (const target of RETIRED_COLUMNS) {
    const exists = await queryColumnExists(target.table, target.column);
    if (exists) {
      stillExisting.push(target);
    }
  }

  if (stillExisting.length > 0) {
    console.error("\n[FAILED] Some retired columns still exist in database:");
    for (const item of stillExisting) {
      console.error(`- ${item.table}.${item.column}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[OK] All retired columns are absent from current schema.");

  let archiveTableExists = true;
  try {
    await prisma.$queryRawUnsafe("SELECT 1 FROM retired_code_archive LIMIT 1");
  } catch {
    archiveTableExists = false;
  }

  if (!archiveTableExists) {
    console.warn(
      "[WARN] retired_code_archive table is missing. Archival verification was skipped.",
    );
    return;
  }

  console.log("\nArchive row counts (retired_code_archive):");
  for (const target of RETIRED_COLUMNS) {
    const count = await queryArchiveRows(target.table, target.column);
    console.log(`- ${target.table}.${target.column}: ${count}`);
  }
}

main()
  .catch((error) => {
    console.error("\n[ERROR] verify-code-retirement failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
