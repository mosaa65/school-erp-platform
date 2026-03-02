import type { PrismaClient } from '@prisma/client';

export async function seedSystem01SchoolProfile(prisma: PrismaClient) {
  const privateOwnershipType = await prisma.lookupOwnershipType.findUnique({
    where: { code: 'PRIVATE' },
    select: { id: true },
  });

  await prisma.schoolProfile.upsert({
    where: {
      code: 'default_school',
    },
    update: {
      nameAr: 'المدرسة الافتراضية',
      nameEn: 'Default School',
      ownershipTypeId: privateOwnershipType?.id ?? null,
      phone: null,
      email: null,
      addressText: null,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'default_school',
      nameAr: 'المدرسة الافتراضية',
      nameEn: 'Default School',
      ownershipTypeId: privateOwnershipType?.id ?? null,
      isActive: true,
    },
  });
}
