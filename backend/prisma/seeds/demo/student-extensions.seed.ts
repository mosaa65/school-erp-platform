import {
  ParentNotificationSendMethod,
  ParentNotificationType,
  StudentSiblingRelationship,
  type PrismaClient,
} from '@prisma/client';
import type { DemoAcademicFoundation } from './academic-foundation.seed';
import { asUtcDate } from './utils';

export type DemoStudentExtensionsSeedResult = {
  studentTalentsTotal: number;
  studentSiblingsTotal: number;
  studentProblemsTotal: number;
  parentNotificationsTotal: number;
};

type EnrollmentContext = {
  sectionId: string;
  sectionCode: string;
  studentId: string;
  studentGender: 'MALE' | 'FEMALE' | 'OTHER';
  studentFullName: string;
  admissionNo: string | null;
};

export async function seedDemoStudentExtensions(
  prisma: PrismaClient,
  context: DemoAcademicFoundation,
): Promise<DemoStudentExtensionsSeedResult> {
  const [activeTalents, fatherRelationship] = await Promise.all([
    prisma.talent.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
      orderBy: [
        {
          name: 'asc',
        },
      ],
      take: 12,
    }),
    prisma.lookupRelationshipType.findFirst({
      where: {
        code: {
          in: ['FATHER', 'GUARDIAN'],
        },
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
      orderBy: {
        id: 'asc',
      },
    }),
  ]);

  if (activeTalents.length === 0) {
    return {
      studentTalentsTotal: 0,
      studentSiblingsTotal: 0,
      studentProblemsTotal: 0,
      parentNotificationsTotal: 0,
    };
  }

  const enrollments = await prisma.studentEnrollment.findMany({
    where: {
      academicYearId: context.academicYearId,
      deletedAt: null,
      isActive: true,
      student: {
        deletedAt: null,
        isActive: true,
      },
    },
    select: {
      sectionId: true,
      section: {
        select: {
          code: true,
        },
      },
      student: {
        select: {
          id: true,
          gender: true,
          fullName: true,
          admissionNo: true,
        },
      },
    },
    orderBy: [
      {
        section: {
          gradeLevel: {
            sequence: 'asc',
          },
        },
      },
      {
        section: {
          code: 'asc',
        },
      },
      {
        student: {
          fullName: 'asc',
        },
      },
    ],
  });

  const rows: EnrollmentContext[] = enrollments.map((item) => ({
    sectionId: item.sectionId,
    sectionCode: item.section.code,
    studentId: item.student.id,
    studentGender: item.student.gender,
    studentFullName: item.student.fullName,
    admissionNo: item.student.admissionNo,
  }));

  const sectionBuckets = new Map<string, EnrollmentContext[]>();
  for (const row of rows) {
    const bucket = sectionBuckets.get(row.sectionId) ?? [];
    bucket.push(row);
    sectionBuckets.set(row.sectionId, bucket);
  }

  let studentTalentsTotal = 0;
  for (const [index, row] of rows.entries()) {
    const firstTalent = activeTalents[index % activeTalents.length];
    const secondTalent = activeTalents[(index + 3) % activeTalents.length];

    await prisma.studentTalent.upsert({
      where: {
        studentId_talentId: {
          studentId: row.studentId,
          talentId: firstTalent.id,
        },
      },
      update: {
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        studentId: row.studentId,
        talentId: firstTalent.id,
        notes: `موهبة أساسية - ${row.sectionCode}`,
        isActive: true,
      },
    });

    studentTalentsTotal += 1;

    if (index % 4 === 0) {
      await prisma.studentTalent.upsert({
        where: {
          studentId_talentId: {
            studentId: row.studentId,
            talentId: secondTalent.id,
          },
        },
        update: {
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          studentId: row.studentId,
          talentId: secondTalent.id,
          notes: `موهبة إضافية - ${row.sectionCode}`,
          isActive: true,
        },
      });

      studentTalentsTotal += 1;
    }
  }

  let studentSiblingsTotal = 0;
  for (const bucket of sectionBuckets.values()) {
    for (let index = 0; index + 1 < bucket.length; index += 2) {
      const first = bucket[index];
      const second = bucket[index + 1];

      await prisma.studentSibling.upsert({
        where: {
          studentId_siblingId: {
            studentId: first.studentId,
            siblingId: second.studentId,
          },
        },
        update: {
          relationship:
            second.studentGender === 'FEMALE'
              ? StudentSiblingRelationship.SISTER
              : StudentSiblingRelationship.BROTHER,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          studentId: first.studentId,
          siblingId: second.studentId,
          relationship:
            second.studentGender === 'FEMALE'
              ? StudentSiblingRelationship.SISTER
              : StudentSiblingRelationship.BROTHER,
          isActive: true,
        },
      });

      studentSiblingsTotal += 1;
    }
  }

  const problemCandidates = rows.filter((_, index) => index % 7 === 0).slice(0, 18);
  let studentProblemsTotal = 0;

  for (const [index, row] of problemCandidates.entries()) {
    const problemDate = asUtcDate(`2026-10-${String((index % 20) + 1).padStart(2, '0')}`);
    const problemType = index % 2 === 0 ? 'سلوكي' : 'تأخر';

    const existing = await prisma.studentProblem.findFirst({
      where: {
        studentId: row.studentId,
        problemDate,
        problemType,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await prisma.studentProblem.update({
        where: {
          id: existing.id,
        },
        data: {
          problemDescription:
            problemType === 'سلوكي'
              ? 'ملاحظة سلوكية داخل الصف وتم التوجيه.'
              : 'تأخر صباحي متكرر يحتاج متابعة.',
          actionsTaken: 'تم التواصل مع ولي الأمر وتوثيق الحالة.',
          hasMinutes: index % 3 === 0,
          isResolved: index % 4 === 0,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
      });
    } else {
      await prisma.studentProblem.create({
        data: {
          studentId: row.studentId,
          problemDate,
          problemType,
          problemDescription:
            problemType === 'سلوكي'
              ? 'ملاحظة سلوكية داخل الصف وتم التوجيه.'
              : 'تأخر صباحي متكرر يحتاج متابعة.',
          actionsTaken: 'تم التواصل مع ولي الأمر وتوثيق الحالة.',
          hasMinutes: index % 3 === 0,
          isResolved: index % 4 === 0,
          isActive: true,
        },
      });
    }

    studentProblemsTotal += 1;
  }

  let parentNotificationsTotal = 0;
  for (const [index, row] of problemCandidates.entries()) {
    const behaviorType = index % 2 === 0 ? 'مخالفة سلوكية' : 'تنبيه تأخر';

    const existing = await prisma.parentNotification.findFirst({
      where: {
        studentId: row.studentId,
        behaviorType,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await prisma.parentNotification.update({
        where: {
          id: existing.id,
        },
        data: {
          notificationType: ParentNotificationType.NEGATIVE,
          guardianTitleId: fatherRelationship?.id ?? null,
          behaviorDescription: `إشعار متابعة للطالب ${row.studentFullName}`,
          requiredAction: 'مراجعة المرشد الطلابي خلال 3 أيام.',
          sendMethod: ParentNotificationSendMethod.WHATSAPP,
          messengerName: 'المرشد الطلابي',
          isSent: true,
          sentDate: asUtcDate('2026-10-20'),
          results: 'تم استلام الإشعار وتأكيد المتابعة.',
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
      });
    } else {
      const aggregate = await prisma.parentNotification.aggregate({
        _max: {
          notificationNumber: true,
        },
      });
      const notificationNumber = (aggregate._max.notificationNumber ?? 0) + 1;

      await prisma.parentNotification.create({
        data: {
          notificationNumber,
          studentId: row.studentId,
          notificationType: ParentNotificationType.NEGATIVE,
          guardianTitleId: fatherRelationship?.id ?? null,
          behaviorType,
          behaviorDescription: `إشعار متابعة للطالب ${row.studentFullName}`,
          requiredAction: 'مراجعة المرشد الطلابي خلال 3 أيام.',
          sendMethod: ParentNotificationSendMethod.WHATSAPP,
          messengerName: 'المرشد الطلابي',
          isSent: true,
          sentDate: asUtcDate('2026-10-20'),
          results: 'تم استلام الإشعار وتأكيد المتابعة.',
          isActive: true,
        },
      });
    }

    parentNotificationsTotal += 1;
  }

  return {
    studentTalentsTotal,
    studentSiblingsTotal,
    studentProblemsTotal,
    parentNotificationsTotal,
  };
}
