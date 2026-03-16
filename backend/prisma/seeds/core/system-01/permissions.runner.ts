import type { PrismaClient } from '@prisma/client';
import { DEFAULT_PERMISSION_CODES } from './permissions.seed';

export async function seedSystem01Permissions(prisma: PrismaClient) {
  const permissions = [] as Array<{ id: string; code: string }>;

  for (const code of DEFAULT_PERMISSION_CODES) {
    const [resource, action] = code.split('.', 2);

    const permission = await prisma.permission.upsert({
      where: { code },
      update: {
        resource,
        action: action ?? 'manage',
        description: `صلاحية نظامية: ${code}`,
        isSystem: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code,
        resource,
        action: action ?? 'manage',
        description: `صلاحية نظامية: ${code}`,
        isSystem: true,
      },
      select: {
        id: true,
        code: true,
      },
    });

    permissions.push(permission);
  }

  return permissions;
}
