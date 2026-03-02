import type { PrismaClient } from '@prisma/client';
import { seedSystem01Permissions } from './system-01/permissions.runner';
import { seedSystem01Lookups } from './system-01/lookups.seed';
import { seedSystem01SchoolProfile } from './system-01/school-profile.seed';
import { seedSystem01Settings } from './system-01/settings.seed';
import { seedSystem05Lookups } from './system-05/lookups.seed';
import { seedSuperAdmin } from './shared/admin.seed';

export async function runCoreSeed(prisma: PrismaClient) {
  const permissions = await seedSystem01Permissions(prisma);
  const adminCredentials = await seedSuperAdmin(prisma, permissions);

  await seedSystem01Lookups(prisma);
  await seedSystem01Settings(prisma);
  await seedSystem01SchoolProfile(prisma);
  await seedSystem05Lookups(prisma);

  return {
    adminCredentials,
  };
}
