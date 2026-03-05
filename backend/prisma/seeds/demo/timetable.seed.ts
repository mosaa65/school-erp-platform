import { TimetableDay, type PrismaClient } from '@prisma/client';
import type { DemoAcademicFoundation } from './academic-foundation.seed';

export async function seedDemoTimetable(prisma: PrismaClient, context: DemoAcademicFoundation) {
  const morningPeriod = await prisma.lookupPeriod.findUnique({
    where: { code: 'MORNING' },
    select: { id: true },
  });

  if (!morningPeriod) {
    return;
  }

  const timetableTemplate = await prisma.timetableTemplate.upsert({
    where: {
      academicTermId_sectionId_name: {
        academicTermId: context.academicTermId,
        sectionId: context.sectionId,
        name: 'القالب الصباحي الأساسي',
      },
    },
    update: {
      isDefault: true,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      academicTermId: context.academicTermId,
      sectionId: context.sectionId,
      name: 'القالب الصباحي الأساسي',
      isDefault: true,
      isActive: true,
    },
  });

  await prisma.timetableTemplateSlot.upsert({
    where: {
      timetableTemplateId_dayOfWeek_periodOrder: {
        timetableTemplateId: timetableTemplate.id,
        dayOfWeek: TimetableDay.SUNDAY,
        periodOrder: 1,
      },
    },
    update: {
      lookupPeriodId: morningPeriod.id,
      startTime: '08:00',
      endTime: '08:45',
      isBreak: false,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      timetableTemplateId: timetableTemplate.id,
      lookupPeriodId: morningPeriod.id,
      dayOfWeek: TimetableDay.SUNDAY,
      periodOrder: 1,
      startTime: '08:00',
      endTime: '08:45',
      isBreak: false,
      isActive: true,
    },
  });
}
