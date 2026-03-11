import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  EmployeeTeachingAssignment,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { EmployeesService } from '../../employees/employees.service';
import { CreateEmployeeTeachingAssignmentDto } from './dto/create-employee-teaching-assignment.dto';
import { ListEmployeeTeachingAssignmentsDto } from './dto/list-employee-teaching-assignments.dto';
import { UpdateEmployeeTeachingAssignmentDto } from './dto/update-employee-teaching-assignment.dto';

const assignmentInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
    },
  },
  section: {
    select: {
      id: true,
      code: true,
      name: true,
      gradeLevelId: true,
      gradeLevel: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
  subject: {
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
    },
  },
} as const;

@Injectable()
export class EmployeeTeachingAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(
    payload: CreateEmployeeTeachingAssignmentDto,
    actorUserId: string,
  ) {
    try {
      const resolvedIsActive = payload.isActive ?? true;
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );
      await this.ensureEmployeeReadyForOperationalScopeIfStrict(
        payload.employeeId,
        resolvedIsActive,
      );
      const section = await this.ensureSectionExistsAndActive(
        payload.sectionId,
      );
      await this.ensureSubjectExistsAndActive(payload.subjectId);
      await this.ensureAcademicYearExists(payload.academicYearId);
      await this.ensureGradeLevelMappingExists(
        payload.academicYearId,
        section.gradeLevelId,
        payload.subjectId,
      );

      const assignment = await this.prisma.employeeTeachingAssignment.create({
        data: {
          employeeId: payload.employeeId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          weeklyPeriods: payload.weeklyPeriods ?? 1,
          isPrimary: payload.isPrimary ?? true,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: assignmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_TEACHING_ASSIGNMENT_CREATE',
        resource: 'employee-teaching-assignments',
        resourceId: assignment.id,
        details: {
          employeeId: assignment.employeeId,
          sectionId: assignment.sectionId,
          subjectId: assignment.subjectId,
          academicYearId: assignment.academicYearId,
        },
      });

      return assignment;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_TEACHING_ASSIGNMENT_CREATE_FAILED',
        resource: 'employee-teaching-assignments',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListEmployeeTeachingAssignmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeTeachingAssignmentWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      sectionId: query.sectionId,
      subjectId: query.subjectId,
      academicYearId: query.academicYearId,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              employee: {
                fullName: {
                  contains: query.search,
                },
              },
            },
            {
              section: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              section: {
                code: {
                  contains: query.search,
                },
              },
            },
            {
              subject: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              subject: {
                code: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employeeTeachingAssignment.count({ where }),
      this.prisma.employeeTeachingAssignment.findMany({
        where,
        include: assignmentInclude,
        orderBy: [
          {
            academicYear: {
              startDate: 'desc',
            },
          },
          {
            createdAt: 'desc',
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const assignment = await this.prisma.employeeTeachingAssignment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: assignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException('Employee teaching assignment not found');
    }

    return assignment;
  }

  async update(
    id: string,
    payload: UpdateEmployeeTeachingAssignmentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureAssignmentExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    const resolvedSectionId = payload.sectionId ?? existing.sectionId;
    const resolvedSubjectId = payload.subjectId ?? existing.subjectId;
    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedIsActive = payload.isActive ?? existing.isActive;

    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );
    await this.ensureEmployeeReadyForOperationalScopeIfStrict(
      resolvedEmployeeId,
      resolvedIsActive,
    );
    const section = await this.ensureSectionExistsAndActive(resolvedSectionId);
    await this.ensureSubjectExistsAndActive(resolvedSubjectId);
    await this.ensureAcademicYearExists(resolvedAcademicYearId);
    await this.ensureGradeLevelMappingExists(
      resolvedAcademicYearId,
      section.gradeLevelId,
      resolvedSubjectId,
    );

    try {
      const assignment = await this.prisma.employeeTeachingAssignment.update({
        where: {
          id,
        },
        data: {
          employeeId: payload.employeeId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          academicYearId: payload.academicYearId,
          weeklyPeriods: payload.weeklyPeriods,
          isPrimary: payload.isPrimary,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: assignmentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_TEACHING_ASSIGNMENT_UPDATE',
        resource: 'employee-teaching-assignments',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return assignment;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureAssignmentExists(id);

    await this.prisma.employeeTeachingAssignment.update({
      where: {
        id,
      },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: actorUserId,
      },
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'EMPLOYEE_TEACHING_ASSIGNMENT_DELETE',
      resource: 'employee-teaching-assignments',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureAssignmentExists(
    id: string,
  ): Promise<EmployeeTeachingAssignment> {
    const assignment = await this.prisma.employeeTeachingAssignment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Employee teaching assignment not found');
    }

    return assignment;
  }

  private async ensureSectionExistsAndActive(sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        deletedAt: null,
      },
      select: {
        id: true,
        gradeLevelId: true,
        isActive: true,
      },
    });

    if (!section) {
      throw new BadRequestException('Section is invalid or deleted');
    }

    if (!section.isActive) {
      throw new BadRequestException('Section is inactive');
    }

    return section;
  }

  private async ensureSubjectExistsAndActive(subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!subject) {
      throw new BadRequestException('Subject is invalid or deleted');
    }

    if (!subject.isActive) {
      throw new BadRequestException('Subject is inactive');
    }
  }

  private async ensureAcademicYearExists(academicYearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!year) {
      throw new BadRequestException('Academic year is invalid or deleted');
    }
  }

  private async ensureGradeLevelMappingExists(
    academicYearId: string,
    gradeLevelId: string,
    subjectId: string,
  ) {
    const mapping = await this.prisma.gradeLevelSubject.findFirst({
      where: {
        academicYearId,
        gradeLevelId,
        subjectId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!mapping) {
      throw new BadRequestException(
        'No active grade-level subject mapping for section grade level, subject, and academic year',
      );
    }
  }

  private isStrictEmployeeWorkflowEnabled() {
    const value = process.env.STRICT_EMPLOYEE_WORKFLOW?.trim().toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }

  private async ensureEmployeeReadyForOperationalScopeIfStrict(
    employeeId: string,
    isActive: boolean,
  ) {
    if (!isActive) {
      return;
    }

    if (!this.isStrictEmployeeWorkflowEnabled()) {
      return;
    }

    await this.employeesService.ensureEmployeeReadyForAcademicOperations(
      employeeId,
    );
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A section can only have one teacher per subject within the same academic year',
      );
    }

    throw error;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
