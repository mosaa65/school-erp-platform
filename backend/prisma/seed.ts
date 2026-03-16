import { PrismaClient } from '@prisma/client';
import { runCoreSeed } from './seeds/core';

const prisma = new PrismaClient();

async function main() {
  const result = await runCoreSeed(prisma);

  console.log('Core seed completed');
  console.log(`Admin email: ${result.adminCredentials.email}`);
  console.log(`Admin password: ${result.adminCredentials.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
