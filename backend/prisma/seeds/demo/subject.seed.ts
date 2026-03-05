import { SubjectCategory, type PrismaClient } from '@prisma/client';

export async function seedDemoSubject(prisma: PrismaClient) {
  await prisma.subject.upsert({
    where: { code: 'DEMO-MATH' },
    update: {
      name: 'رياضيات',
      shortName: 'رياضي',
      category: SubjectCategory.MATHEMATICS,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'DEMO-MATH',
      name: 'رياضيات',
      shortName: 'رياضي',
      category: SubjectCategory.MATHEMATICS,
      isActive: true,
    },
  });
}
