import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type DataScopeCapability =
  | 'VIEW_STUDENTS'
  | 'MANAGE_HOMEWORKS'
  | 'MANAGE_GRADES';

export type SectionSubjectYearGrant = {
  sectionId: string;
  subjectId?: string;
  academicYearId: string;
};

export type SectionYearGrant = {
  sectionId: string;
  academicYearId: string;
};

export type GradeYearGrant = {
  gradeLevelId: string;
  academicYearId: string;
};

type ActorContext = {
  userId: string;
  employeeId: string | null;
  roleCodes: string[];
  isPrivileged: boolean;
};

const PRIVILEGED_ROLE_CODES = new Set(['super_admin', 'school_admin']);

@Injectable()
export class DataScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCanManageSectionSubjectYear(params: {
    actorUserId: string;
    sectionId: string;
    subjectId: string;
    academicYearId: string;
    capability: Exclude<DataScopeCapability, 'VIEW_STUDENTS'>;
  }) {
    const actor = await this.getActorContext(params.actorUserId);

    if (actor.isPrivileged) {
      return;
    }

    if (!actor.employeeId) {
      throw new ForbiddenException(
        'يجب ربط المستخدم بملف موظف نشط حتى يتمكن من تنفيذ العمليات المقيّدة بالنطاق',
      );
    }

    const section = await this.prisma.section.findFirst({
      where: {
        id: params.sectionId,
        deletedAt: null,
      },
      select: {
        id: true,
        gradeLevelId: true,
        isActive: true,
      },
    });

    if (!section) {
      throw new ForbiddenException('الشعبة غير صالحة أو محذوفة');
    }

    if (!section.isActive) {
      throw new ForbiddenException('الشعبة غير نشطة');
    }

    const scope = await this.getSectionSubjectYearGrants({
      actorUserId: params.actorUserId,
      capability: params.capability,
      academicYearId: params.academicYearId,
    });

    const hasExactGrant = scope.grants.some(
      (grant) =>
        grant.sectionId === params.sectionId &&
        grant.academicYearId === params.academicYearId &&
        (!grant.subjectId || grant.subjectId === params.subjectId),
    );

    if (hasExactGrant) {
      return;
    }

    const hasGradeGrant = scope.gradeGrants.some(
      (grant) =>
        grant.gradeLevelId === section.gradeLevelId &&
        grant.academicYearId === params.academicYearId,
    );

    if (hasGradeGrant) {
      return;
    }

    throw new ForbiddenException(
      'ليست لديك صلاحية للوصول إلى هذا النطاق: شعبة/مادة/سنة',
    );
  }

  async ensureCanManageGradeYear(params: {
    actorUserId: string;
    gradeLevelId: string;
    academicYearId: string;
    capability: Exclude<DataScopeCapability, 'VIEW_STUDENTS'>;
  }) {
    const actor = await this.getActorContext(params.actorUserId);

    if (actor.isPrivileged) {
      return;
    }

    if (!actor.employeeId) {
      throw new ForbiddenException(
        'يجب ربط المستخدم بملف موظف نشط حتى يتمكن من تنفيذ العمليات المقيّدة بالنطاق',
      );
    }

    const scope = await this.getSectionSubjectYearGrants({
      actorUserId: params.actorUserId,
      capability: params.capability,
      academicYearId: params.academicYearId,
    });

    const hasGradeGrant = scope.gradeGrants.some(
      (grant) =>
        grant.gradeLevelId === params.gradeLevelId &&
        grant.academicYearId === params.academicYearId,
    );

    if (!hasGradeGrant) {
      throw new ForbiddenException(
        'ليست لديك صلاحية للوصول إلى هذا النطاق: صف/سنة',
      );
    }
  }

  async getSectionSubjectYearGrants(params: {
    actorUserId: string;
    capability: Exclude<DataScopeCapability, 'VIEW_STUDENTS'>;
    academicYearId?: string;
  }): Promise<{
    isPrivileged: boolean;
    grants: SectionSubjectYearGrant[];
    gradeGrants: GradeYearGrant[];
  }> {
    const actor = await this.getActorContext(params.actorUserId);

    if (actor.isPrivileged) {
      return { isPrivileged: true, grants: [], gradeGrants: [] };
    }

    if (!actor.employeeId) {
      return { isPrivileged: false, grants: [], gradeGrants: [] };
    }

    const [teachingAssignments, sectionSupervisions] = await Promise.all([
      this.prisma.employeeTeachingAssignment.findMany({
        where: {
          employeeId: actor.employeeId,
          academicYearId: params.academicYearId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          sectionId: true,
          subjectId: true,
          academicYearId: true,
        },
      }),
      this.prisma.employeeSectionSupervision.findMany({
        where: {
          employeeId: actor.employeeId,
          academicYearId: params.academicYearId,
          deletedAt: null,
          isActive: true,
          ...(params.capability === 'MANAGE_HOMEWORKS'
            ? { canManageHomeworks: true }
            : { canManageGrades: true }),
        },
        select: {
          sectionId: true,
          academicYearId: true,
        },
      }),
    ]);

    const dedup = new Map<string, SectionSubjectYearGrant>();
    const sectionIds = new Set<string>();

    for (const item of teachingAssignments) {
      sectionIds.add(item.sectionId);
      const key = `${item.sectionId}|${item.subjectId}|${item.academicYearId}`;
      dedup.set(key, {
        sectionId: item.sectionId,
        subjectId: item.subjectId,
        academicYearId: item.academicYearId,
      });
    }

    for (const item of sectionSupervisions) {
      sectionIds.add(item.sectionId);
      const key = `${item.sectionId}|*|${item.academicYearId}`;
      dedup.set(key, {
        sectionId: item.sectionId,
        academicYearId: item.academicYearId,
      });
    }

    const sectionToGradeLevel = await this.buildSectionGradeLevelMap(sectionIds);
    const gradeDedup = this.buildGradeYearGrantMap(
      sectionSupervisions,
      sectionToGradeLevel,
    );

    return {
      isPrivileged: false,
      grants: Array.from(dedup.values()),
      gradeGrants: Array.from(gradeDedup.values()),
    };
  }

  async getStudentSectionYearGrants(params: {
    actorUserId: string;
    academicYearId?: string;
  }): Promise<{
    isPrivileged: boolean;
    grants: SectionYearGrant[];
    gradeGrants: GradeYearGrant[];
  }> {
    const actor = await this.getActorContext(params.actorUserId);

    if (actor.isPrivileged) {
      return { isPrivileged: true, grants: [], gradeGrants: [] };
    }

    if (!actor.employeeId) {
      return { isPrivileged: false, grants: [], gradeGrants: [] };
    }

    const [teachingAssignments, sectionSupervisions] = await Promise.all([
      this.prisma.employeeTeachingAssignment.findMany({
        where: {
          employeeId: actor.employeeId,
          academicYearId: params.academicYearId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          sectionId: true,
          academicYearId: true,
        },
      }),
      this.prisma.employeeSectionSupervision.findMany({
        where: {
          employeeId: actor.employeeId,
          academicYearId: params.academicYearId,
          canViewStudents: true,
          deletedAt: null,
          isActive: true,
        },
        select: {
          sectionId: true,
          academicYearId: true,
        },
      }),
    ]);

    const dedup = new Map<string, SectionYearGrant>();
    const sectionIds = new Set<string>();

    for (const item of [...teachingAssignments, ...sectionSupervisions]) {
      sectionIds.add(item.sectionId);
      const key = `${item.sectionId}|${item.academicYearId}`;
      dedup.set(key, {
        sectionId: item.sectionId,
        academicYearId: item.academicYearId,
      });
    }

    const sectionToGradeLevel = await this.buildSectionGradeLevelMap(sectionIds);
    const gradeDedup = this.buildGradeYearGrantMap(
      sectionSupervisions,
      sectionToGradeLevel,
    );

    return {
      isPrivileged: false,
      grants: Array.from(dedup.values()),
      gradeGrants: Array.from(gradeDedup.values()),
    };
  }

  private async getActorContext(actorUserId: string): Promise<ActorContext> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: actorUserId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        userRoles: {
          where: {
            deletedAt: null,
          },
          select: {
            role: {
              select: {
                code: true,
                isActive: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException('المستخدم المصادق عليه غير نشط');
    }

    const roleCodes = user.userRoles
      .map((item) => item.role)
      .filter((role) => role.isActive && !role.deletedAt)
      .map((role) => role.code);

    const isPrivileged = roleCodes.some((code) =>
      PRIVILEGED_ROLE_CODES.has(code),
    );

    if (!isPrivileged && user.employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: {
          id: user.employeeId,
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!employee) {
        throw new ForbiddenException(
          'ملف الموظف المرتبط بالمستخدم غير موجود أو غير نشط',
        );
      }
    }

    return {
      userId: user.id,
      employeeId: user.employeeId,
      roleCodes,
      isPrivileged,
    };
  }

  private async buildSectionGradeLevelMap(sectionIds: Set<string>) {
    if (sectionIds.size === 0) {
      return new Map<string, string>();
    }

    const sections = await this.prisma.section.findMany({
      where: {
        id: {
          in: Array.from(sectionIds),
        },
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        gradeLevelId: true,
      },
    });

    return new Map(
      sections.map((section) => [section.id, section.gradeLevelId] as const),
    );
  }

  private buildGradeYearGrantMap(
    items: Array<{ sectionId: string; academicYearId: string }>,
    sectionToGradeLevel: Map<string, string>,
  ) {
    const gradeDedup = new Map<string, GradeYearGrant>();

    for (const item of items) {
      const gradeLevelId = sectionToGradeLevel.get(item.sectionId);
      if (!gradeLevelId) {
        continue;
      }

      const key = `${gradeLevelId}|${item.academicYearId}`;
      gradeDedup.set(key, {
        gradeLevelId,
        academicYearId: item.academicYearId,
      });
    }

    return gradeDedup;
  }
}
