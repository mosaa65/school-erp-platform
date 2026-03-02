import { hash } from 'bcrypt';
import type { PrismaClient } from '@prisma/client';

export async function seedSuperAdmin(
  prisma: PrismaClient,
  permissions: Array<{ id: string; code: string }>,
) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@school.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const superAdminRole = await prisma.role.upsert({
    where: {
      code: 'super_admin',
    },
    update: {
      name: 'Super Admin',
      isSystem: true,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'super_admin',
      name: 'Super Admin',
      description: 'Full access role for ERP foundation modules',
      isSystem: true,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {
        deletedAt: null,
        updatedById: null,
      },
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  const passwordHash = await hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
    },
    select: {
      id: true,
      email: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {
      deletedAt: null,
      updatedById: null,
    },
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });

  return {
    email: adminUser.email,
    password: adminPassword,
  };
}
