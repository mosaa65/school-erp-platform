import { PrismaClient } from '@prisma/client';
import { runDemoSeed } from './seeds/demo';

const prisma = new PrismaClient();

async function main() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (
    nodeEnv === 'production' &&
    process.env.ALLOW_PRODUCTION_DEMO_SEED !== 'true'
  ) {
    throw new Error(
      'Demo seed is blocked in production. Set ALLOW_PRODUCTION_DEMO_SEED=true to override intentionally.',
    );
  }

  const result = await runDemoSeed(prisma);

  console.log('Demo seed completed');
  console.log(`Academic year: ${result.academicYearCode}`);
  console.log(`Section: ${result.sectionCode}`);
  console.log(`Employee: ${result.employeeReference}`);
  console.log(`Student: ${result.studentReference}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
