import type { PrismaClient } from '@prisma/client';

export async function seedDemoHealthVisits(prisma: PrismaClient) {
  const [student, nurse, status, actorUser] = await Promise.all([
    prisma.student.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
    prisma.employee.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
    prisma.lookupHealthStatus.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
    prisma.user.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!student || !nurse || !status || !actorUser) {
    return {
      created: 0,
    };
  }

  const existing = await prisma.studentHealthVisit.findFirst({
    where: {
      studentId: student.id,
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      created: 0,
    };
  }

  await prisma.studentHealthVisit.create({
    data: {
      studentId: student.id,
      nurseId: nurse.id,
      healthStatusId: status.id,
      visitDate: new Date(),
      notes: 'تمت زيارة صحية دورية من قبل موظف الصحة.',
      followUpRequired: false,
      isActive: true,
      createdById: actorUser.id,
      updatedById: actorUser.id,
    },
  });

  return {
    created: 1,
  };
}
