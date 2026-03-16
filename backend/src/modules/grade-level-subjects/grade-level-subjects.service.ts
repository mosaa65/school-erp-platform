import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, GradeLevelSubject, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateGradeLevelSubjectDto } from './dto/create-grade-level-subject.dto';
import { ListGradeLevelSubjectsDto } from './dto/list-grade-level-subjects.dto';
import { UpdateGradeLevelSubjectDto } from './dto/update-grade-level-subject.dto';

const gradeLevelSubjectInclude = {
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isCurrent: true,
    },
  },
  gradeLevel: {
    select: {
      id: true,
      code: true,
      name: true,
      stage: true,
      sequence: true,
      isActive: true,
    },
  },
  subject: {
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      category: true,
      isActive: true,
    },
  },
} as const;

@Injectable()
export class GradeLevelSubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateGradeLevelSubjectDto, actorUserId: string) {
    try {
      await this.ensureAcademicYearExists(payload.academicYearId);
      await this.ensureGradeLevelExistsAndActive(payload.gradeLevelId);
      await this.ensureSubjectExistsAndActive(payload.subjectId);

      const mapping = await this.prisma.gradeLevelSubject.create({
        data: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          subjectId: payload.subjectId,
          isMandatory: payload.isMandatory ?? true,
          weeklyPeriods: payload.weeklyPeriods ?? 1,
          displayOrder: payload.displayOrder,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: gradeLevelSubjectInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADE_LEVEL_SUBJECT_CREATE',
        resource: 'grade-level-subjects',
        resourceId: mapping.id,
        details: {
          academicYearId: mapping.academicYearId,
          gradeLevelId: mapping.gradeLevelId,
          subjectId: mapping.subjectId,
        },
      });

      return mapping;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADE_LEVEL_SUBJECT_CREATE_FAILED',
        resource: 'grade-level-subjects',
        status: AuditStatus.FAILURE,
        details: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          subjectId: payload.subjectId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListGradeLevelSubjectsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.GradeLevelSubjectWhereInput = {
      deletedAt: null,
      academicYearId: query.academicYearId,
      gradeLevelId: query.gradeLevelId,
      subjectId: query.subjectId,
      isMandatory: query.isMandatory,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              academicYear: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              gradeLevel: {
                name: {
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
      this.prisma.gradeLevelSubject.count({ where }),
      this.prisma.gradeLevelSubject.findMany({
        where,
        include: gradeLevelSubjectInclude,
        orderBy: [
          {
            displayOrder: 'asc',
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
    const mapping = await this.prisma.gradeLevelSubject.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: gradeLevelSubjectInclude,
    });

    if (!mapping) {
      throw new NotFoundException('Grade level subject mapping not found');
    }

    return mapping;
  }

  async update(
    id: string,
    payload: UpdateGradeLevelSubjectDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureMappingExists(id);

    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const resolvedGradeLevelId = payload.gradeLevelId ?? existing.gradeLevelId;
    const resolvedSubjectId = payload.subjectId ?? existing.subjectId;

    try {
      await this.ensureAcademicYearExists(resolvedAcademicYearId);
      await this.ensureGradeLevelExistsAndActive(resolvedGradeLevelId);
      await this.ensureSubjectExistsAndActive(resolvedSubjectId);

      const mapping = await this.prisma.gradeLevelSubject.update({
        where: {
          id,
        },
        data: {
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          subjectId: payload.subjectId,
          isMandatory: payload.isMandatory,
          weeklyPeriods: payload.weeklyPeriods,
          displayOrder: payload.displayOrder,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: gradeLevelSubjectInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'GRADE_LEVEL_SUBJECT_UPDATE',
        resource: 'grade-level-subjects',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return mapping;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureMappingExists(id);

    await this.prisma.gradeLevelSubject.update({
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
      action: 'GRADE_LEVEL_SUBJECT_DELETE',
      resource: 'grade-level-subjects',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureMappingExists(id: string): Promise<GradeLevelSubject> {
    const mapping = await this.prisma.gradeLevelSubject.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!mapping) {
      throw new NotFoundException('Grade level subject mapping not found');
    }

    return mapping;
  }

  private async ensureAcademicYearExists(academicYearId: string) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!academicYear) {
      throw new BadRequestException('Academic year is invalid or deleted');
    }
  }

  private async ensureGradeLevelExistsAndActive(gradeLevelId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findFirst({
      where: {
        id: gradeLevelId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!gradeLevel) {
      throw new BadRequestException('Grade level is invalid or deleted');
    }

    if (!gradeLevel.isActive) {
      throw new BadRequestException(
        'Cannot map subjects to an inactive grade level',
      );
    }
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
      throw new BadRequestException('Cannot map inactive subject');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Mapping must be unique for academic year, grade level, and subject',
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
