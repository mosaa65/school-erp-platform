import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, AssessmentType, GradingPolicy, GradingPolicyComponent } from '@prisma/client';

export type PolicyResolutionContext = {
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  assessmentType?: AssessmentType;
  assessmentTypeLookupId?: string | null;
  sectionId?: string | null;
  teacherEmployeeId?: string | null;
  academicTermId?: string | null;
};

export type ResolvedPolicy = GradingPolicy & {
  components: GradingPolicyComponent[];
};

@Injectable()
export class PolicyResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePolicy(context: PolicyResolutionContext): Promise<ResolvedPolicy> {
    const typeFilters: Array<Partial<Record<keyof Prisma.GradingPolicyWhereInput, any>>> = [];
    if (context.assessmentType) {
      typeFilters.push({ assessmentType: context.assessmentType });
    }
    if (context.assessmentTypeLookupId) {
      typeFilters.push({ assessmentTypeLookupId: context.assessmentTypeLookupId });
    }

    const policies = await this.prisma.gradingPolicy.findMany({
      where: {
        academicYearId: context.academicYearId,
        gradeLevelId: context.gradeLevelId,
        subjectId: context.subjectId,
        isActive: true,
        deletedAt: null,
        OR: typeFilters.length ? typeFilters : undefined,
      },
      include: {
        components: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (policies.length === 0) {
      throw new NotFoundException('لا توجد سياسة تقييم نشطة لهذا السياق (الصف والمادة والنوع)');
    }

    // Only allow grade-level policies (no teacher/section overrides).
    const scoredPolicies = policies.map((policy) => {
      let score = 0;

      if (policy.teacherEmployeeId || policy.sectionId) {
        return { policy, score: -1 };
      }

      // Term match (optional)
      if (context.academicTermId && policy.academicTermId === context.academicTermId) {
        score += 10;
      } else if (policy.academicTermId) {
        return { policy, score: -1 };
      }

      // Base policy
      if (!policy.academicTermId) {
        score += 1;
      }

      if (policy.isDefault) {
        score += 0.5;
      }

      return { policy, score };
    });

    const validPolicies = scoredPolicies.filter((p) => p.score > 0);

    if (validPolicies.length === 0) {
      throw new NotFoundException('يوجد سياسات تقييم ولكنها لا تتطابق مع المعلمات الحالية (المعلم/الشعبة/الفصل)');
    }

    // Sort descending by score
    validPolicies.sort((a, b) => b.score - a.score);

    // Return the most specific policy
    return validPolicies[0].policy;
  }
}
