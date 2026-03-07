import { SubjectCategory, type PrismaClient } from '@prisma/client';

export async function seedDemoSubject(prisma: PrismaClient) {
  await prisma.subject.upsert({
    where: { code: 'math' },
    update: {
      name: 'الرياضيات',
      shortName: 'MATH',
      category: SubjectCategory.MATHEMATICS,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'math',
      name: 'الرياضيات',
      shortName: 'MATH',
      category: SubjectCategory.MATHEMATICS,
      isActive: true,
    },
  });
}
