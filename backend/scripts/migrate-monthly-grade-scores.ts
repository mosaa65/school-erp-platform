import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Starting monthly grade migration...');

    const grades = await prisma.monthlyGrade.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        gradingPolicyId: true,
        attendanceScore: true,
        homeworkScore: true,
        activityScore: true,
        contributionScore: true,
        examScore: true,
        periodGradeComponents: {
          select: {
            id: true,
          },
        },
      },
    });

    let created = 0;
    for (const grade of grades) {
      if (grade.periodGradeComponents.length > 0) {
        continue;
      }

      const policyComponents = await prisma.gradingPolicyComponent.findMany({
        where: {
          gradingPolicyId: grade.gradingPolicyId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
        },
      });

      const componentByCode = new Map(policyComponents.map((pc) => [pc.code?.toUpperCase() ?? '', pc]));

      const desired: Array<{
        gradingPolicyComponentId: string;
        score: number;
      }> = [];

      const addIfExists = (code: string, score: number) => {
        const comp = componentByCode.get(code);
        if (!comp) return;
        if (score === null || score === undefined) return;
        // Only create if there is a non-zero value recorded
        if (score === 0) return;
        desired.push({ gradingPolicyComponentId: comp.id, score });
      };

      addIfExists('ATTENDANCE', Number(grade.attendanceScore ?? 0));
      addIfExists('HOMEWORK', Number(grade.homeworkScore ?? 0));
      addIfExists('EXAM', Number(grade.examScore ?? 0));
      addIfExists('ACTIVITY', Number(grade.activityScore ?? 0));
      addIfExists('CONTRIBUTION', Number(grade.contributionScore ?? 0));

      if (desired.length === 0) {
        continue;
      }

      await prisma.periodGradeComponent.createMany({
        data: desired.map((d) => ({
          monthlyGradeId: grade.id,
          gradingPolicyComponentId: d.gradingPolicyComponentId,
          score: d.score,
          isAutoCalculated: false,
        })),
      });

      created += desired.length;
    }

    console.log(`Migration complete. Created ${created} period grade component records.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
