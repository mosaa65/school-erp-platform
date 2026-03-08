import { hash } from 'bcrypt';
import {
  EmployeeGender,
  EmployeeSystemAccessStatus,
  EmploymentType,
  type PrismaClient,
} from '@prisma/client';
import type { DemoAcademicFoundation } from './academic-foundation.seed';

type EmployeeUserSeedDefinition = {
  key: string;
  jobNumber: string;
  fullName: string;
  gender: EmployeeGender;
  roleCode: 'school_admin' | 'supervisor' | 'class_supervisor' | 'teacher' | 'employee';
  lookupJobRoleCode: 'PRINCIPAL' | 'SUPERVISOR' | 'MENTOR' | 'TEACHER' | 'ADMIN';
  jobTitle: string;
  specialization?: string;
  email: string;
  username: string;
  idNumber: string;
  phonePrimary: string;
  targetSectionId?: string;
};

export type DemoEmployeeSeedResult = {
  employeesTotal: number;
  usersTotal: number;
  teachingAssignmentsTotal: number;
  sectionSupervisionsTotal: number;
  employeeIdByKey: Record<string, string>;
  teacherBySubjectCode: Record<string, string>;
  classSupervisorBySectionId: Record<string, string>;
  supervisorIds: string[];
  sampleCredentials: Array<{
    label: string;
    email: string;
    password: string;
    roleCode: string;
  }>;
};

const DEFAULT_DEMO_USER_PASSWORD =
  process.env.SEED_DEMO_PASSWORD ?? 'ChangeMe123!';

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

export async function seedDemoEmployees(
  prisma: PrismaClient,
  context: DemoAcademicFoundation,
): Promise<DemoEmployeeSeedResult> {
  const [nationalIdType, maleGender, femaleGender, qualification] =
    await Promise.all([
      prisma.lookupIdType.findUnique({
        where: { code: 'NATIONAL_ID' },
        select: { id: true },
      }),
      prisma.lookupGender.findUnique({
        where: { code: 'MALE' },
        select: { id: true },
      }),
      prisma.lookupGender.findUnique({
        where: { code: 'FEMALE' },
        select: { id: true },
      }),
      prisma.lookupQualification.findUnique({
        where: { code: 'BACHELOR' },
        select: { id: true, nameAr: true },
      }),
    ]);

  const localityOptions = await prisma.locality.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
    },
    orderBy: [
      {
        nameAr: 'asc',
      },
      {
        id: 'asc',
      },
    ],
  });

  if (!nationalIdType) {
    throw new Error('Missing lookup id type NATIONAL_ID');
  }

  const lookupJobRoles = await prisma.lookupJobRole.findMany({
    where: {
      code: {
        in: ['PRINCIPAL', 'SUPERVISOR', 'MENTOR', 'TEACHER', 'ADMIN'],
      },
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      nameAr: true,
    },
  });

  const jobRoleIdByCode = new Map(lookupJobRoles.map((item) => [item.code, item.id]));
  for (const code of ['PRINCIPAL', 'SUPERVISOR', 'MENTOR', 'TEACHER', 'ADMIN']) {
    if (!jobRoleIdByCode.has(code)) {
      throw new Error(`Missing lookup job role ${code}`);
    }
  }

  const requiredRoleCodes: Array<
    EmployeeUserSeedDefinition['roleCode'] | 'guardian'
  > = ['school_admin', 'supervisor', 'class_supervisor', 'teacher', 'employee', 'guardian'];

  const roles = await prisma.role.findMany({
    where: {
      code: {
        in: requiredRoleCodes,
      },
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
    },
  });

  const roleIdByCode = new Map(roles.map((item) => [item.code, item.id]));
  for (const code of ['school_admin', 'supervisor', 'class_supervisor', 'teacher', 'employee']) {
    if (!roleIdByCode.has(code)) {
      throw new Error(`Missing role ${code}; run core seed first.`);
    }
  }

  const targetGradeLevelIds = Array.from(
    new Set(context.targetSections.map((item) => item.gradeLevelId)),
  );

  const targetGradeMappings = await prisma.gradeLevelSubject.findMany({
    where: {
      academicYearId: context.academicYearId,
      gradeLevelId: {
        in: targetGradeLevelIds,
      },
      deletedAt: null,
      isActive: true,
    },
    select: {
      gradeLevelId: true,
      subjectId: true,
      weeklyPeriods: true,
      subject: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  const uniqueSubjects = new Map<string, { code: string; name: string }>();
  for (const item of targetGradeMappings) {
    uniqueSubjects.set(item.subject.code, {
      code: item.subject.code,
      name: item.subject.name,
    });
  }

  const orderedSubjects = Array.from(uniqueSubjects.values()).sort((a, b) =>
    a.code.localeCompare(b.code),
  );

  const employeeDefinitions: EmployeeUserSeedDefinition[] = [
    {
      key: 'school-admin',
      jobNumber: 'EMP-ADM-001',
      fullName: 'مدير المدرسة التجريبي',
      gender: EmployeeGender.MALE,
      roleCode: 'school_admin',
      lookupJobRoleCode: 'PRINCIPAL',
      jobTitle: 'مدير المدرسة',
      specialization: 'إدارة مدرسية',
      email: 'school.admin@school.local',
      username: 'school_admin',
      idNumber: '3000000001',
      phonePrimary: '777110001',
    },
    {
      key: 'supervisor-1',
      jobNumber: 'EMP-SUP-001',
      fullName: 'مشرف أكاديمي أول',
      gender: EmployeeGender.MALE,
      roleCode: 'supervisor',
      lookupJobRoleCode: 'SUPERVISOR',
      jobTitle: 'مشرف أكاديمي',
      specialization: 'إشراف أكاديمي',
      email: 'supervisor.1@school.local',
      username: 'supervisor_1',
      idNumber: '3000000002',
      phonePrimary: '777110002',
    },
    {
      key: 'supervisor-2',
      jobNumber: 'EMP-SUP-002',
      fullName: 'مشرفة أكاديمية ثانية',
      gender: EmployeeGender.FEMALE,
      roleCode: 'supervisor',
      lookupJobRoleCode: 'SUPERVISOR',
      jobTitle: 'مشرفة أكاديمية',
      specialization: 'إشراف أكاديمي',
      email: 'supervisor.2@school.local',
      username: 'supervisor_2',
      idNumber: '3000000003',
      phonePrimary: '777110003',
    },
    {
      key: 'employee-registrar',
      jobNumber: 'EMP-REG-001',
      fullName: 'موظف شؤون الطلاب',
      gender: EmployeeGender.MALE,
      roleCode: 'employee',
      lookupJobRoleCode: 'ADMIN',
      jobTitle: 'موظف إداري',
      specialization: 'شؤون الطلاب',
      email: 'registrar@school.local',
      username: 'registrar',
      idNumber: '3000000004',
      phonePrimary: '777110004',
    },
  ];

  context.targetSections.forEach((section, index) => {
    const isMale = index % 2 === 0;
    const gradeSuffix = section.gradeLevelSequence.toString().padStart(2, '0');
    employeeDefinitions.push({
      key: `class-supervisor-${section.gradeLevelCode}-${section.code.toLowerCase()}`,
      jobNumber: `EMP-CLS-${gradeSuffix}${section.code}`,
      fullName: `مربي ${section.gradeLevelName} ${section.code}`,
      gender: isMale ? EmployeeGender.MALE : EmployeeGender.FEMALE,
      roleCode: 'class_supervisor',
      lookupJobRoleCode: 'MENTOR',
      jobTitle: 'مربي صف',
      specialization: section.gradeLevelName,
      email: `class.supervisor.${section.gradeLevelCode}.${section.code.toLowerCase()}@school.local`,
      username: `class_supervisor_${section.gradeLevelCode}_${section.code.toLowerCase()}`,
      idNumber: `3001${(index + 1).toString().padStart(6, '0')}`,
      phonePrimary: `77712${(index + 1).toString().padStart(4, '0')}`,
      targetSectionId: section.id,
    });
  });

  orderedSubjects.forEach((subject, index) => {
    const isMale = index % 2 === 0;
    employeeDefinitions.push({
      key: `teacher-${subject.code}`,
      jobNumber: `EMP-TCH-${subject.code.toUpperCase()}`,
      fullName: `${isMale ? 'معلم' : 'معلمة'} ${subject.name}`,
      gender: isMale ? EmployeeGender.MALE : EmployeeGender.FEMALE,
      roleCode: 'teacher',
      lookupJobRoleCode: 'TEACHER',
      jobTitle: `${isMale ? 'معلم' : 'معلمة'} ${subject.name}`,
      specialization: subject.name,
      email: `teacher.${subject.code}@school.local`,
      username: `teacher_${subject.code}`,
      idNumber: `3002${(index + 1).toString().padStart(6, '0')}`,
      phonePrimary: `77713${(index + 1).toString().padStart(4, '0')}`,
    });
  });

  const passwordHash = await hash(DEFAULT_DEMO_USER_PASSWORD, 12);
  const employeeIdByKey = new Map<string, string>();
  const teacherBySubjectCode = new Map<string, string>();
  const classSupervisorBySectionId = new Map<string, string>();
  const supervisorIds: string[] = [];
  const sampleCredentials: Array<{
    label: string;
    email: string;
    password: string;
    roleCode: string;
  }> = [];

  for (const [definitionIndex, definition] of employeeDefinitions.entries()) {
    const jobRoleId = jobRoleIdByCode.get(definition.lookupJobRoleCode);
    const roleId = roleIdByCode.get(definition.roleCode);
    const localityId =
      localityOptions.length > 0
        ? localityOptions[definitionIndex % localityOptions.length]?.id ?? null
        : null;

    if (!jobRoleId || !roleId) {
      throw new Error(
        `Failed to resolve role mapping for ${definition.key} (${definition.roleCode})`,
      );
    }

    const employee = await prisma.employee.upsert({
      where: { jobNumber: definition.jobNumber },
      update: {
        fullName: definition.fullName,
        gender: definition.gender,
        genderId:
          definition.gender === EmployeeGender.FEMALE
            ? (femaleGender?.id ?? null)
            : (maleGender?.id ?? null),
        idNumber: definition.idNumber,
        idTypeId: nationalIdType.id,
        localityId,
        phonePrimary: definition.phonePrimary,
        systemAccessStatus: EmployeeSystemAccessStatus.GRANTED,
        qualification: qualification?.nameAr ?? 'جامعي',
        qualificationId: qualification?.id ?? null,
        jobTitle: definition.jobTitle,
        jobRoleId,
        employmentType: EmploymentType.PERMANENT,
        specialization: definition.specialization ?? null,
        hireDate: new Date('2024-09-01T00:00:00.000Z'),
        salaryApproved: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        jobNumber: definition.jobNumber,
        fullName: definition.fullName,
        gender: definition.gender,
        genderId:
          definition.gender === EmployeeGender.FEMALE
            ? (femaleGender?.id ?? null)
            : (maleGender?.id ?? null),
        idNumber: definition.idNumber,
        idTypeId: nationalIdType.id,
        localityId,
        phonePrimary: definition.phonePrimary,
        systemAccessStatus: EmployeeSystemAccessStatus.GRANTED,
        qualification: qualification?.nameAr ?? 'جامعي',
        qualificationId: qualification?.id ?? null,
        jobTitle: definition.jobTitle,
        jobRoleId,
        employmentType: EmploymentType.PERMANENT,
        specialization: definition.specialization ?? null,
        hireDate: new Date('2024-09-01T00:00:00.000Z'),
        salaryApproved: true,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const names = splitName(definition.fullName);

    const user = await prisma.user.upsert({
      where: {
        email: definition.email,
      },
      update: {
        username: definition.username,
        employeeId: employee.id,
        passwordHash,
        firstName: names.firstName,
        lastName: names.lastName,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        email: definition.email,
        username: definition.username,
        employeeId: employee.id,
        passwordHash,
        firstName: names.firstName,
        lastName: names.lastName,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    await syncUserRole(prisma, user.id, roleId);

    employeeIdByKey.set(definition.key, employee.id);

    if (definition.key.startsWith('teacher-')) {
      const subjectCode = definition.key.replace('teacher-', '');
      teacherBySubjectCode.set(subjectCode, employee.id);
    }

    if (definition.targetSectionId) {
      classSupervisorBySectionId.set(definition.targetSectionId, employee.id);
    }

    if (definition.roleCode === 'supervisor') {
      supervisorIds.push(employee.id);
    }

    if (sampleCredentials.length < 8) {
      sampleCredentials.push({
        label: definition.fullName,
        email: definition.email,
        password: DEFAULT_DEMO_USER_PASSWORD,
        roleCode: definition.roleCode,
      });
    }
  }

  const fallbackTeacherId = teacherBySubjectCode.values().next().value;

  if (!fallbackTeacherId) {
    throw new Error('No teacher accounts were seeded for subject assignments.');
  }

  let teachingAssignmentsTotal = 0;
  for (const section of context.targetSections) {
    const sectionMappings = targetGradeMappings.filter(
      (item) => item.gradeLevelId === section.gradeLevelId,
    );

    for (const mapping of sectionMappings) {
      const employeeId =
        teacherBySubjectCode.get(mapping.subject.code) ?? fallbackTeacherId;

      const existing = await prisma.employeeTeachingAssignment.findFirst({
        where: {
          sectionId: section.id,
          subjectId: mapping.subjectId,
          academicYearId: context.academicYearId,
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        await prisma.employeeTeachingAssignment.update({
          where: {
            id: existing.id,
          },
          data: {
            employeeId,
            weeklyPeriods: mapping.weeklyPeriods,
            isPrimary: true,
            isActive: true,
            deletedAt: null,
            updatedById: null,
          },
        });
      } else {
        await prisma.employeeTeachingAssignment.create({
          data: {
            employeeId,
            sectionId: section.id,
            subjectId: mapping.subjectId,
            academicYearId: context.academicYearId,
            weeklyPeriods: mapping.weeklyPeriods,
            isPrimary: true,
            isActive: true,
          },
        });
      }

      teachingAssignmentsTotal += 1;
    }
  }

  let sectionSupervisionsTotal = 0;
  for (const [index, section] of context.targetSections.entries()) {
    const classSupervisorId = classSupervisorBySectionId.get(section.id);
    const supervisorId = supervisorIds[index % supervisorIds.length];

    const supervisingEmployeeIds = [classSupervisorId, supervisorId].filter(
      (value): value is string => Boolean(value),
    );

    for (const employeeId of supervisingEmployeeIds) {
      const existing = await prisma.employeeSectionSupervision.findFirst({
        where: {
          employeeId,
          sectionId: section.id,
          academicYearId: context.academicYearId,
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        await prisma.employeeSectionSupervision.update({
          where: {
            id: existing.id,
          },
          data: {
            canViewStudents: true,
            canManageHomeworks: true,
            canManageGrades: true,
            isActive: true,
            deletedAt: null,
            updatedById: null,
          },
        });
      } else {
        await prisma.employeeSectionSupervision.create({
          data: {
            employeeId,
            sectionId: section.id,
            academicYearId: context.academicYearId,
            canViewStudents: true,
            canManageHomeworks: true,
            canManageGrades: true,
            isActive: true,
          },
        });
      }

      sectionSupervisionsTotal += 1;
    }
  }

  return {
    employeesTotal: employeeDefinitions.length,
    usersTotal: employeeDefinitions.length,
    teachingAssignmentsTotal,
    sectionSupervisionsTotal,
    employeeIdByKey: Object.fromEntries(employeeIdByKey.entries()),
    teacherBySubjectCode: Object.fromEntries(teacherBySubjectCode.entries()),
    classSupervisorBySectionId: Object.fromEntries(
      classSupervisorBySectionId.entries(),
    ),
    supervisorIds,
    sampleCredentials,
  };
}
