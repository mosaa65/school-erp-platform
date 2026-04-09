import { PrismaClient } from '@prisma/client';
import { runCoreSeed } from './seeds/core';

const prisma = new PrismaClient();

async function main() {
  await runCoreSeed(prisma);
  console.log('Core seed completed successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
