import type { PrismaClient } from '@prisma/client';

export async function seedSystem05Lookups(prisma: PrismaClient) {
  const defaultHomeworkTypes = [
    {
      code: 'HOMEWORK',
      name: 'Homework Assignment',
      description: 'Standard take-home assignment',
    },
    {
      code: 'RESEARCH',
      name: 'Research Task',
      description: 'Research-based homework task',
    },
    {
      code: 'PROJECT',
      name: 'Project',
      description: 'Project-based assignment',
    },
    {
      code: 'REPORT',
      name: 'Report',
      description: 'Written report assignment',
    },
    {
      code: 'CLASS_ACTIVITY',
      name: 'Class Activity',
      description: 'In-class activity assigned as tracked homework',
    },
    {
      code: 'OTHER',
      name: 'Other',
      description: 'Other homework type',
    },
  ];

  for (const homeworkType of defaultHomeworkTypes) {
    await prisma.homeworkType.upsert({
      where: {
        code: homeworkType.code,
      },
      update: {
        name: homeworkType.name,
        description: homeworkType.description,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: homeworkType.code,
        name: homeworkType.name,
        description: homeworkType.description,
        isSystem: true,
        isActive: true,
      },
    });
  }

  const defaultAnnualStatuses = [
    {
      code: 'PASS',
      name: 'Passed',
      description: 'Student passed subject in annual outcome',
    },
    {
      code: 'FAIL',
      name: 'Failed',
      description: 'Student failed subject in annual outcome',
    },
    {
      code: 'MAKEUP',
      name: 'Makeup Required',
      description: 'Student requires makeup exam for this subject',
    },
    {
      code: 'DEPRIVED',
      name: 'Deprived',
      description: 'Student deprived from annual subject result',
    },
  ];

  for (const annualStatus of defaultAnnualStatuses) {
    await prisma.annualStatusLookup.upsert({
      where: {
        code: annualStatus.code,
      },
      update: {
        name: annualStatus.name,
        description: annualStatus.description,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: annualStatus.code,
        name: annualStatus.name,
        description: annualStatus.description,
        isSystem: true,
        isActive: true,
      },
    });
  }

  const defaultPromotionDecisions = [
    {
      code: 'PROMOTED',
      name: 'Promoted to next grade',
      description: 'Student promoted without conditions',
    },
    {
      code: 'RETAINED',
      name: 'Retained in same grade',
      description: 'Student repeats current grade',
    },
    {
      code: 'DISMISSED',
      name: 'Dismissed',
      description: 'Student dismissed based on policy',
    },
    {
      code: 'CONDITIONAL',
      name: 'Conditionally promoted',
      description: 'Student promoted with conditions',
    },
  ];

  for (const promotionDecision of defaultPromotionDecisions) {
    await prisma.promotionDecisionLookup.upsert({
      where: {
        code: promotionDecision.code,
      },
      update: {
        name: promotionDecision.name,
        description: promotionDecision.description,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: promotionDecision.code,
        name: promotionDecision.name,
        description: promotionDecision.description,
        isSystem: true,
        isActive: true,
      },
    });
  }
}
