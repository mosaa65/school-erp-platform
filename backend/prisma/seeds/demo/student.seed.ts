import { hash } from 'bcrypt';
import {
  GuardianRelationship,
  StudentAttendanceStatus,
  StudentBookStatus,
  StudentEnrollmentStatus,
  StudentGender,
  StudentHealthStatus,
  StudentOrphanStatus,
  type PrismaClient,
} from '@prisma/client';
import type { DemoAcademicFoundation } from './academic-foundation.seed';
import { asUtcDate } from './utils';

type EnrollmentSeedContext = {
  enrollmentId: string;
  studentId: string;
  sectionId: string;
  gradeLevelId: string;
  studentOrder: number;
};

type GuardianAccountContext = {
  fullName: string;
  email: string;
};

export type DemoStudentSeedResult = {
  studentsTotal: number;
  guardiansTotal: number;
  guardianUsersTotal: number;
  enrollmentsTotal: number;
  attendanceTotal: number;
  studentBooksTotal: number;
  sampleCredentials: Array<{
    label: string;
    email: string;
    password: string;
    roleCode: string;
  }>;
  sampleStudentAdmissions: string[];
};

const DEFAULT_STUDENTS_PER_SECTION = Number(
  process.env.DEMO_STUDENTS_PER_SECTION ?? '24',
);
const DEFAULT_PARENT_PASSWORD =
  process.env.SEED_DEMO_PARENT_PASSWORD ?? 'ChangeMe123!';

const MALE_FIRST_NAMES = [
  'أحمد',
  'محمد',
  'عبدالله',
  'علي',
  'إبراهيم',
  'حسين',
  'خالد',
  'سالم',
  'رامي',
  'ياسر',
];

const FEMALE_FIRST_NAMES = [
  'فاطمة',
  'عائشة',
  'مريم',
  'سارة',
  'هدى',
  'أسماء',
  'نور',
  'شهد',
  'ليان',
  'آية',
];

const FAMILY_NAMES = [
  'العواضي',
  'الحميري',
  'الحداد',
  'الأنسي',
  'العبسي',
  'المتوكل',
  'العمري',
  'الشميري',
  'القحطاني',
  'العنسي',
];

function pad(value: number, length: number): string {
  return value.toString().padStart(length, '0');
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const tokens = fullName.trim().split(/\s+/);
  const firstName = tokens[0] ?? 'مستخدم';
  const lastName = tokens.slice(1).join(' ') || 'تجريبي';
  return { firstName, lastName };
}

async function syncUserRole(
  prisma: PrismaClient,
  userId: string,
  roleId: string,
) {
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
    update: {
      deletedAt: null,
      updatedById: null,
    },
    create: {
      userId,
      roleId,
    },
  });

  await prisma.userRole.updateMany({
    where: {
      userId,
      deletedAt: null,
      roleId: {
        not: roleId,
      },
    },
    data: {
      deletedAt: new Date(),
      updatedById: null,
    },
  });
}

async function ensureGuardianRole(prisma: PrismaClient): Promise<string> {
  const guardianRole = await prisma.role.upsert({
    where: {
      code: 'guardian',
    },
    update: {
      name: 'ولي أمر',
      description: 'وصول مبدئي لحسابات أولياء الأمور لحين تفعيل تطبيق ولي الأمر.',
      isSystem: false,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      code: 'guardian',
      name: 'ولي أمر',
      description: 'وصول مبدئي لحسابات أولياء الأمور لحين تفعيل تطبيق ولي الأمر.',
      isSystem: false,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  await prisma.rolePermission.updateMany({
    where: {
      roleId: guardianRole.id,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      updatedById: null,
    },
  });

  return guardianRole.id;
}

export async function seedDemoStudentData(
  prisma: PrismaClient,
  context: DemoAcademicFoundation,
): Promise<DemoStudentSeedResult> {
  if (DEFAULT_STUDENTS_PER_SECTION < 1 || DEFAULT_STUDENTS_PER_SECTION > 60) {
    throw new Error('DEMO_STUDENTS_PER_SECTION must be between 1 and 60');
  }

  const [
    defaultNationalIdType,
    defaultBloodType,
    defaultMaleGender,
    defaultFemaleGender,
    defaultNoneOrphanStatus,
    defaultHealthyStatus,
    defaultFatherRelationshipType,
    guardianRoleId,
  ] = await Promise.all([
    prisma.lookupIdType.findUnique({
      where: { code: 'NATIONAL_ID' },
      select: { id: true },
    }),
    prisma.lookupBloodType.findUnique({
      where: { name: 'O+' },
      select: { id: true },
    }),
    prisma.lookupGender.findUnique({
      where: { code: StudentGender.MALE },
      select: { id: true },
    }),
    prisma.lookupGender.findUnique({
      where: { code: StudentGender.FEMALE },
      select: { id: true },
    }),
    prisma.lookupOrphanStatus.findUnique({
      where: { code: 'NONE' },
      select: { id: true },
    }),
    prisma.lookupHealthStatus.findUnique({
      where: { code: StudentHealthStatus.HEALTHY },
      select: { id: true },
    }),
    prisma.lookupRelationshipType.findUnique({
      where: { code: GuardianRelationship.FATHER },
      select: { id: true },
    }),
    ensureGuardianRole(prisma),
  ]);

  if (!defaultNationalIdType) {
    throw new Error('Missing lookup id type NATIONAL_ID');
  }

  const gradeLevelIds = Array.from(
    new Set(context.targetSections.map((item) => item.gradeLevelId)),
  );

  const gradeLevelSubjects = await prisma.gradeLevelSubject.findMany({
    where: {
      academicYearId: context.academicYearId,
      gradeLevelId: {
        in: gradeLevelIds,
      },
      deletedAt: null,
      isActive: true,
    },
    select: {
      gradeLevelId: true,
      subjectId: true,
      subject: {
        select: {
          code: true,
        },
      },
    },
    orderBy: [
      {
        gradeLevel: {
          sequence: 'asc',
        },
      },
      {
        displayOrder: 'asc',
      },
    ],
  });

  const gradeSubjectsMap = new Map<
    string,
    Array<{ subjectId: string; subjectCode: string }>
  >();

  for (const item of gradeLevelSubjects) {
    const bucket = gradeSubjectsMap.get(item.gradeLevelId) ?? [];
    bucket.push({
      subjectId: item.subjectId,
      subjectCode: item.subject.code,
    });
    gradeSubjectsMap.set(item.gradeLevelId, bucket);
  }

  const enrollmentContexts: EnrollmentSeedContext[] = [];
  const guardianAccountById = new Map<string, GuardianAccountContext>();
  const sampleStudentAdmissions: string[] = [];
  let studentsTotal = 0;
  let guardiansTotal = 0;

  for (const [sectionIndex, section] of context.targetSections.entries()) {
    for (let studentOrder = 1; studentOrder <= DEFAULT_STUDENTS_PER_SECTION; studentOrder += 1) {
      const isMale = studentOrder % 2 === 1;
      const firstName = isMale
        ? MALE_FIRST_NAMES[(studentOrder + sectionIndex) % MALE_FIRST_NAMES.length]
        : FEMALE_FIRST_NAMES[
            (studentOrder + sectionIndex) % FEMALE_FIRST_NAMES.length
          ];
      const familyName =
        FAMILY_NAMES[(Math.ceil(studentOrder / 2) + sectionIndex) % FAMILY_NAMES.length];
      const fullName = `${firstName} ${familyName}`;

      const admissionNo = `STU-${pad(section.gradeLevelSequence, 2)}${section.code}-${pad(
        studentOrder,
        3,
      )}`;

      const student = await prisma.student.upsert({
        where: {
          admissionNo,
        },
        update: {
          fullName,
          gender: isMale ? StudentGender.MALE : StudentGender.FEMALE,
          genderId: isMale ? (defaultMaleGender?.id ?? null) : (defaultFemaleGender?.id ?? null),
          bloodTypeId: defaultBloodType?.id ?? null,
          healthStatus: StudentHealthStatus.HEALTHY,
          healthStatusId: defaultHealthyStatus?.id ?? null,
          orphanStatus: StudentOrphanStatus.NONE,
          orphanStatusId: defaultNoneOrphanStatus?.id ?? null,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          admissionNo,
          fullName,
          gender: isMale ? StudentGender.MALE : StudentGender.FEMALE,
          genderId: isMale ? (defaultMaleGender?.id ?? null) : (defaultFemaleGender?.id ?? null),
          bloodTypeId: defaultBloodType?.id ?? null,
          healthStatus: StudentHealthStatus.HEALTHY,
          healthStatusId: defaultHealthyStatus?.id ?? null,
          orphanStatus: StudentOrphanStatus.NONE,
          orphanStatusId: defaultNoneOrphanStatus?.id ?? null,
          isActive: true,
        },
        select: {
          id: true,
          admissionNo: true,
        },
      });

      studentsTotal += 1;
      if (sampleStudentAdmissions.length < 6 && student.admissionNo) {
        sampleStudentAdmissions.push(student.admissionNo);
      }

      const familyOrder = Math.ceil(studentOrder / 2);
      const guardianCode = `GDN-${pad(section.gradeLevelSequence, 2)}${section.code}-${pad(
        familyOrder,
        3,
      )}`;
      const guardianEmail = `guardian.${guardianCode.toLowerCase()}@school.local`;
      const guardianFullName = `ولي أمر ${familyName} ${section.code}${pad(
        familyOrder,
        2,
      )}`;
      const guardianIdNumber = `500${pad(sectionIndex + 1, 2)}${pad(familyOrder, 6)}`;
      const guardianPhone = `770${pad(sectionIndex + 1, 2)}${pad(familyOrder, 5)}`;

      let guardian = await prisma.guardian.findFirst({
        where: {
          idNumber: guardianIdNumber,
        },
        select: {
          id: true,
        },
      });

      if (guardian) {
        guardian = await prisma.guardian.update({
          where: {
            id: guardian.id,
          },
          data: {
            fullName: guardianFullName,
            gender: StudentGender.MALE,
            genderId: defaultMaleGender?.id ?? null,
            idTypeId: defaultNationalIdType.id,
            phonePrimary: guardianPhone,
            whatsappNumber: guardianPhone,
            isActive: true,
            deletedAt: null,
            updatedById: null,
          },
          select: {
            id: true,
          },
        });
      } else {
        guardian = await prisma.guardian.create({
          data: {
            fullName: guardianFullName,
            gender: StudentGender.MALE,
            genderId: defaultMaleGender?.id ?? null,
            idNumber: guardianIdNumber,
            idTypeId: defaultNationalIdType.id,
            phonePrimary: guardianPhone,
            whatsappNumber: guardianPhone,
            isActive: true,
          },
          select: {
            id: true,
          },
        });
      }

      guardianAccountById.set(guardian.id, {
        fullName: guardianFullName,
        email: guardianEmail,
      });

      await prisma.studentGuardian.upsert({
        where: {
          studentId_guardianId_relationship: {
            studentId: student.id,
            guardianId: guardian.id,
            relationship: GuardianRelationship.FATHER,
          },
        },
        update: {
          relationshipTypeId: defaultFatherRelationshipType?.id ?? null,
          isPrimary: true,
          canReceiveNotifications: true,
          canPickup: true,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          studentId: student.id,
          guardianId: guardian.id,
          relationship: GuardianRelationship.FATHER,
          relationshipTypeId: defaultFatherRelationshipType?.id ?? null,
          isPrimary: true,
          canReceiveNotifications: true,
          canPickup: true,
          isActive: true,
        },
      });

      const enrollment = await prisma.studentEnrollment.upsert({
        where: {
          studentId_academicYearId: {
            studentId: student.id,
            academicYearId: context.academicYearId,
          },
        },
        update: {
          sectionId: section.id,
          enrollmentDate: asUtcDate('2026-09-01'),
          status: StudentEnrollmentStatus.ACTIVE,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          studentId: student.id,
          academicYearId: context.academicYearId,
          sectionId: section.id,
          enrollmentDate: asUtcDate('2026-09-01'),
          status: StudentEnrollmentStatus.ACTIVE,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      enrollmentContexts.push({
        enrollmentId: enrollment.id,
        studentId: student.id,
        sectionId: section.id,
        gradeLevelId: section.gradeLevelId,
        studentOrder,
      });
    }
  }

  guardiansTotal = guardianAccountById.size;

  const attendanceDates = [
    asUtcDate('2026-09-07'),
    asUtcDate('2026-09-08'),
    asUtcDate('2026-09-09'),
  ];

  let attendanceTotal = 0;
  for (const enrollment of enrollmentContexts) {
    for (const [dayIndex, attendanceDate] of attendanceDates.entries()) {
      let status: StudentAttendanceStatus = StudentAttendanceStatus.PRESENT;
      if (dayIndex === 1 && enrollment.studentOrder % 13 === 0) {
        status = StudentAttendanceStatus.ABSENT;
      } else if (dayIndex === 2 && enrollment.studentOrder % 9 === 0) {
        status = StudentAttendanceStatus.LATE;
      }

      const existing = await prisma.studentAttendance.findFirst({
        where: {
          studentEnrollmentId: enrollment.enrollmentId,
          attendanceDate,
        },
        select: {
          id: true,
        },
      });

      const checkInAt =
        status === StudentAttendanceStatus.PRESENT ||
        status === StudentAttendanceStatus.LATE
          ? new Date(`${attendanceDate.toISOString().slice(0, 10)}T08:00:00.000Z`)
          : null;
      const checkOutAt =
        status === StudentAttendanceStatus.PRESENT ||
        status === StudentAttendanceStatus.LATE
          ? new Date(`${attendanceDate.toISOString().slice(0, 10)}T13:00:00.000Z`)
          : null;

      if (existing) {
        await prisma.studentAttendance.update({
          where: {
            id: existing.id,
          },
          data: {
            status,
            checkInAt,
            checkOutAt,
            isActive: true,
            deletedAt: null,
            updatedById: null,
          },
        });
      } else {
        await prisma.studentAttendance.create({
          data: {
            studentEnrollmentId: enrollment.enrollmentId,
            attendanceDate,
            status,
            checkInAt,
            checkOutAt,
            isActive: true,
          },
        });
      }

      attendanceTotal += 1;
    }
  }

  const workbookSubjectCodes = new Set(['arb', 'eng', 'math']);
  let studentBooksTotal = 0;

  for (const enrollment of enrollmentContexts) {
    const gradeSubjects = gradeSubjectsMap.get(enrollment.gradeLevelId) ?? [];

    for (const subject of gradeSubjects) {
      const parts = ['MAIN'];
      if (workbookSubjectCodes.has(subject.subjectCode)) {
        parts.push('WORKBOOK');
      }

      for (const part of parts) {
        const existing = await prisma.studentBook.findFirst({
          where: {
            studentEnrollmentId: enrollment.enrollmentId,
            subjectId: subject.subjectId,
            bookPart: part,
          },
          select: {
            id: true,
          },
        });

        if (existing) {
          await prisma.studentBook.update({
            where: {
              id: existing.id,
            },
            data: {
              issuedDate: asUtcDate('2026-09-10'),
              dueDate: asUtcDate('2027-04-14'),
              returnedDate: null,
              status: StudentBookStatus.ISSUED,
              isActive: true,
              deletedAt: null,
              updatedById: null,
            },
          });
        } else {
          await prisma.studentBook.create({
            data: {
              studentEnrollmentId: enrollment.enrollmentId,
              subjectId: subject.subjectId,
              bookPart: part,
              issuedDate: asUtcDate('2026-09-10'),
              dueDate: asUtcDate('2027-04-14'),
              status: StudentBookStatus.ISSUED,
              isActive: true,
            },
          });
        }

        studentBooksTotal += 1;
      }
    }
  }

  const guardianPasswordHash = await hash(DEFAULT_PARENT_PASSWORD, 12);
  const sampleCredentials: Array<{
    label: string;
    email: string;
    password: string;
    roleCode: string;
  }> = [];
  let guardianUsersTotal = 0;

  for (const [guardianId, account] of guardianAccountById.entries()) {
    const names = splitName(account.fullName);
    const user = await prisma.user.upsert({
      where: {
        email: account.email,
      },
      update: {
        username: account.email.split('@')[0],
        employeeId: null,
        passwordHash: guardianPasswordHash,
        firstName: names.firstName,
        lastName: names.lastName,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        email: account.email,
        username: account.email.split('@')[0],
        passwordHash: guardianPasswordHash,
        firstName: names.firstName,
        lastName: names.lastName,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    await syncUserRole(prisma, user.id, guardianRoleId);
    guardianUsersTotal += 1;

    if (sampleCredentials.length < 6) {
      sampleCredentials.push({
        label: `${account.fullName} (${guardianId})`,
        email: account.email,
        password: DEFAULT_PARENT_PASSWORD,
        roleCode: 'guardian',
      });
    }
  }

  return {
    studentsTotal,
    guardiansTotal,
    guardianUsersTotal,
    enrollmentsTotal: enrollmentContexts.length,
    attendanceTotal,
    studentBooksTotal,
    sampleCredentials,
    sampleStudentAdmissions,
  };
}
