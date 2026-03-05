import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
        'User must be linked to an active employee profile for scoped actions',
      );
    }

    const assignmentCount = await this.prisma.employeeTeachingAssignment.count({
      where: {
        employeeId: actor.employeeId,
        sectionId: params.sectionId,
        subjectId: params.subjectId,
        academicYearId: params.academicYearId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (assignmentCount > 0) {
      return;
    }

    const supervisionWhere =
      params.capability === 'MANAGE_HOMEWORKS'
        ? { canManageHomeworks: true }
        : { canManageGrades: true };

    const supervisionCount = await this.prisma.employeeSectionSupervision.count({
      where: {
        employeeId: actor.employeeId,
        sectionId: params.sectionId,
        academicYearId: params.academicYearId,
        deletedAt: null,
        isActive: true,
        ...supervisionWhere,
      },
    });

    if (supervisionCount === 0) {
      throw new ForbiddenException(
        'You are not allowed to access this section/subject/year scope',
      );
    }
  }

  async getSectionSubjectYearGrants(params: {
    actorUserId: string;
    capability: Exclude<DataScopeCapability, 'VIEW_STUDENTS'>;
    academicYearId?: string;
  }): Promise<{ isPrivileged: boolean; grants: SectionSubjectYearGrant[] }> {
    const actor = await this.getActorContext(params.actorUserId);

    if (actor.isPrivileged) {
      return { isPrivileged: true, grants: [] };
    }

    if (!actor.employeeId) {
      return { isPrivileged: false, grants: [] };
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

    for (const item of teachingAssignments) {
      const key = `${item.sectionId}|${item.subjectId}|${item.academicYearId}`;
      dedup.set(key, {
        sectionId: item.sectionId,
        subjectId: item.subjectId,
        academicYearId: item.academicYearId,
      });
    }

    for (const item of sectionSupervisions) {
      const key = `${item.sectionId}|*|${item.academicYearId}`;
      dedup.set(key, {
        sectionId: item.sectionId,
        academicYearId: item.academicYearId,
      });
    }

    return {
      isPrivileged: false,
      grants: Array.from(dedup.values()),
    };
  }

  async getStudentSectionYearGrants(params: {
    actorUserId: string;
    academicYearId?: string;
  }): Promise<{ isPrivileged: boolean; grants: SectionYearGrant[] }> {
    const actor = await this.getActorContext(params.actorUserId);

    if (actor.isPrivileged) {
      return { isPrivileged: true, grants: [] };
    }

    if (!actor.employeeId) {
      return { isPrivileged: false, grants: [] };
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

    for (const item of [...teachingAssignments, ...sectionSupervisions]) {
      const key = `${item.sectionId}|${item.academicYearId}`;
      dedup.set(key, {
        sectionId: item.sectionId,
        academicYearId: item.academicYearId,
      });
    }

    return {
      isPrivileged: false,
      grants: Array.from(dedup.values()),
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
      throw new ForbiddenException('Authenticated user is not active');
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
          'Linked employee profile is missing or inactive',
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
}
