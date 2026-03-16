import type { PrismaClient } from '@prisma/client';
import type { DemoEmployeeSeedResult } from './employee.seed';

type DemoEmployeeTalentsSeedResult = {
  mappingsTotal: number;
  employeesWithTalents: number;
  talentsUsed: string[];
};

function getTeacherTalentCodes(subjectCode: string): string[] {
  switch (subjectCode) {
    case 'quran':
      return ['QURAN_RECITATION', 'MEMORIZATION'];
    case 'arb':
      return ['CALLIGRAPHY', 'POETRY'];
    case 'eng':
      return ['READING', 'ORATORY'];
    case 'art':
      return ['DRAWING', 'CALLIGRAPHY'];
    case 'pe':
      return ['SPORTS', 'SWIMMING'];
    case 'cs':
      return ['MANUFACTURING', 'ACADEMIC_EXCELLENCE'];
    default:
      return ['ACADEMIC_EXCELLENCE'];
  }
}

export async function seedDemoEmployeeTalents(
  prisma: PrismaClient,
  employeeSeed: DemoEmployeeSeedResult,
): Promise<DemoEmployeeTalentsSeedResult> {
  const assignmentsByEmployeeId = new Map<string, string[]>();

  const schoolAdminId = employeeSeed.employeeIdByKey['school-admin'];
  if (schoolAdminId) {
    assignmentsByEmployeeId.set(schoolAdminId, ['LEADERSHIP', 'ORATORY']);
  }

  const registrarId = employeeSeed.employeeIdByKey['employee-registrar'];
  if (registrarId) {
    assignmentsByEmployeeId.set(registrarId, ['READING', 'MEMORIZATION']);
  }

  for (const [employeeKey, employeeId] of Object.entries(
    employeeSeed.employeeIdByKey,
  )) {
    if (!employeeKey.startsWith('supervisor-')) {
      continue;
    }

    assignmentsByEmployeeId.set(employeeId, ['LEADERSHIP', 'ORATORY', 'POETRY']);
  }

  for (const [employeeKey, employeeId] of Object.entries(
    employeeSeed.employeeIdByKey,
  )) {
    if (!employeeKey.startsWith('class-supervisor-')) {
      continue;
    }

    assignmentsByEmployeeId.set(employeeId, ['MEMORIZATION', 'ORATORY']);
  }

  for (const [subjectCode, employeeId] of Object.entries(
    employeeSeed.teacherBySubjectCode,
  )) {
    assignmentsByEmployeeId.set(employeeId, getTeacherTalentCodes(subjectCode));
  }

  const requestedTalentCodes = Array.from(
    new Set(
      Array.from(assignmentsByEmployeeId.values()).flatMap(
        (talentCodes) => talentCodes,
      ),
    ),
  );

  if (requestedTalentCodes.length === 0) {
    return {
      mappingsTotal: 0,
      employeesWithTalents: 0,
      talentsUsed: [],
    };
  }

  const talents = await prisma.talent.findMany({
    where: {
      code: {
        in: requestedTalentCodes,
      },
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
    },
  });

  const talentIdByCode = new Map<string, string>(
    talents.map((item): [string, string] => [item.code, item.id]),
  );
  const talentCodeById = new Map<string, string>(
    talents.map((item): [string, string] => [item.id, item.code]),
  );
  let mappingsTotal = 0;
  const talentsUsed = new Set<string>();
  let employeesWithTalents = 0;

  for (const [employeeId, talentCodes] of assignmentsByEmployeeId.entries()) {
    const activeTalentIds = Array.from(
      new Set(
        talentCodes
          .map((code) => talentIdByCode.get(code))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (activeTalentIds.length === 0) {
      continue;
    }

    employeesWithTalents += 1;

    for (const talentId of activeTalentIds) {
      const code = talentCodeById.get(talentId);
      if (code) {
        talentsUsed.add(code);
      }

      await prisma.employeeTalent.upsert({
        where: {
          employeeId_talentId: {
            employeeId,
            talentId,
          },
        },
        update: {
          notes: 'مُولَّد تلقائياً عبر seed-demo',
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          employeeId,
          talentId,
          notes: 'مُولَّد تلقائياً عبر seed-demo',
          isActive: true,
        },
      });

      mappingsTotal += 1;
    }
  }

  return {
    mappingsTotal,
    employeesWithTalents,
    talentsUsed: Array.from(talentsUsed).sort((a, b) => a.localeCompare(b)),
  };
}
