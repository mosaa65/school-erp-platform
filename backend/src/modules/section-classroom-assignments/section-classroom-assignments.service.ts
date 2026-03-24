import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, SectionClassroomAssignment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateSectionClassroomAssignmentDto } from './dto/create-section-classroom-assignment.dto';
import { ListSectionClassroomAssignmentsDto } from './dto/list-section-classroom-assignments.dto';
import { UpdateSectionClassroomAssignmentDto } from './dto/update-section-classroom-assignment.dto';

const sectionClassroomAssignmentInclude = {
  section: {
    select: {
      id: true,
      code: true,
      name: true,
      capacity: true,
      isActive: true,
      gradeLevel: {
        select: {
          id: true,
          code: true,
          name: true,
          stage: true,
          sequence: true,
        },
      },
    },
  },
  classroom: {
    select: {
      id: true,
      code: true,
      name: true,
      capacity: true,
      notes: true,
      isActive: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isCurrent: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class SectionClassroomAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    payload: CreateSectionClassroomAssignmentDto,
    actorUserId: string,
  ) {
    const notes = this.normalizeNotes(payload.notes);

    try {
      await this.ensureSectionExistsAndActive(payload.sectionId);
      await this.ensureClassroomExistsAndActive(payload.classroomId);
      await this.ensureAcademicYearExistsAndActive(payload.academicYearId);
      this.ensureValidDateRange(payload.effectiveFrom, payload.effectiveTo);

      const assignment = await this.prisma.$transaction(async (tx) => {
        if (payload.isPrimary) {
          await tx.sectionClassroomAssignment.updateMany({
            where: {
              deletedAt: null,
              sectionId: payload.sectionId,
              academicYearId: payload.academicYearId,
              isPrimary: true,
            },
            data: {
              isPrimary: false,
              updatedById: actorUserId,
            },
          });
        }

        return tx.sectionClassroomAssignment.create({
          data: {
            sectionId: payload.sectionId,
            classroomId: payload.classroomId,
            academicYearId: payload.academicYearId,
            effectiveFrom: payload.effectiveFrom
              ? new Date(payload.effectiveFrom)
              : null,
            effectiveTo: payload.effectiveTo ? new Date(payload.effectiveTo) : null,
            notes,
            isPrimary: payload.isPrimary ?? false,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: sectionClassroomAssignmentInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'SECTION_CLASSROOM_ASSIGNMENT_CREATE',
        resource: 'section-classroom-assignments',
        resourceId: assignment.id,
        details: {
          sectionId: assignment.sectionId,
          classroomId: assignment.classroomId,
          academicYearId: assignment.academicYearId,
          isPrimary: assignment.isPrimary,
        },
      });

      return assignment;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'SECTION_CLASSROOM_ASSIGNMENT_CREATE_FAILED',
        resource: 'section-classroom-assignments',
        status: AuditStatus.FAILURE,
        details: {
          sectionId: payload.sectionId,
          classroomId: payload.classroomId,
          academicYearId: payload.academicYearId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListSectionClassroomAssignmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const where: Prisma.SectionClassroomAssignmentWhereInput = {
      deletedAt: null,
      sectionId: query.sectionId,
      classroomId: query.classroomId,
      academicYearId: query.academicYearId,
      isActive: query.isActive,
      isPrimary: query.isPrimary,
      OR: search
        ? [
            {
              section: {
                OR: [{ code: { contains: search } }, { name: { contains: search } }],
              },
            },
            {
              classroom: {
                OR: [{ code: { contains: search } }, { name: { contains: search } }],
              },
            },
            {
              academicYear: {
                OR: [{ code: { contains: search } }, { name: { contains: search } }],
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.sectionClassroomAssignment.count({ where }),
      this.prisma.sectionClassroomAssignment.findMany({
        where,
        orderBy: [
          { academicYear: { startDate: 'desc' } },
          { section: { code: 'asc' } },
          { classroom: { code: 'asc' } },
          { isPrimary: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: sectionClassroomAssignmentInclude,
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
    const assignment = await this.prisma.sectionClassroomAssignment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: sectionClassroomAssignmentInclude,
    });

    if (!assignment) {
      throw new NotFoundException('Section classroom assignment not found');
    }

    return assignment;
  }

  async update(
    id: string,
    payload: UpdateSectionClassroomAssignmentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureAssignmentExists(id);

    const resolvedSectionId = payload.sectionId ?? existing.sectionId;
    const resolvedClassroomId = payload.classroomId ?? existing.classroomId;
    const resolvedAcademicYearId = payload.academicYearId ?? existing.academicYearId;
    const resolvedIsPrimary =
      payload.isPrimary !== undefined ? payload.isPrimary : existing.isPrimary;
    const resolvedIsActive =
      payload.isActive !== undefined ? payload.isActive : existing.isActive;
    const resolvedNotes =
      payload.notes === undefined ? existing.notes : this.normalizeNotes(payload.notes);
    const resolvedEffectiveFrom =
      payload.effectiveFrom === undefined
        ? existing.effectiveFrom
        : payload.effectiveFrom
          ? new Date(payload.effectiveFrom)
          : null;
    const resolvedEffectiveTo =
      payload.effectiveTo === undefined
        ? existing.effectiveTo
        : payload.effectiveTo
          ? new Date(payload.effectiveTo)
          : null;

    try {
      await this.ensureSectionExistsAndActive(resolvedSectionId);
      await this.ensureClassroomExistsAndActive(resolvedClassroomId);
      await this.ensureAcademicYearExistsAndActive(resolvedAcademicYearId);
      this.ensureValidDateRange(
        resolvedEffectiveFrom ? resolvedEffectiveFrom.toISOString() : null,
        resolvedEffectiveTo ? resolvedEffectiveTo.toISOString() : null,
      );

      const assignment = await this.prisma.$transaction(async (tx) => {
        if (resolvedIsPrimary) {
          await tx.sectionClassroomAssignment.updateMany({
            where: {
              deletedAt: null,
              sectionId: resolvedSectionId,
              academicYearId: resolvedAcademicYearId,
              isPrimary: true,
              NOT: {
                id,
              },
            },
            data: {
              isPrimary: false,
              updatedById: actorUserId,
            },
          });
        }

        return tx.sectionClassroomAssignment.update({
          where: {
            id,
          },
          data: {
            sectionId: resolvedSectionId,
            classroomId: resolvedClassroomId,
            academicYearId: resolvedAcademicYearId,
            effectiveFrom: resolvedEffectiveFrom,
            effectiveTo: resolvedEffectiveTo,
            notes: resolvedNotes,
            isPrimary: resolvedIsPrimary,
            isActive: resolvedIsActive,
            updatedById: actorUserId,
          },
          include: sectionClassroomAssignmentInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'SECTION_CLASSROOM_ASSIGNMENT_UPDATE',
        resource: 'section-classroom-assignments',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return assignment;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'SECTION_CLASSROOM_ASSIGNMENT_UPDATE_FAILED',
        resource: 'section-classroom-assignments',
        status: AuditStatus.FAILURE,
        details: {
          id,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureAssignmentExists(id);

    await this.prisma.sectionClassroomAssignment.update({
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
      action: 'SECTION_CLASSROOM_ASSIGNMENT_DELETE',
      resource: 'section-classroom-assignments',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureAssignmentExists(id: string): Promise<SectionClassroomAssignment> {
    const assignment = await this.prisma.sectionClassroomAssignment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Section classroom assignment not found');
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

  private async ensureClassroomExistsAndActive(classroomId: string) {
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id: classroomId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!classroom) {
      throw new BadRequestException('Classroom is invalid or deleted');
    }

    if (!classroom.isActive) {
      throw new BadRequestException('Classroom is inactive');
    }

    return classroom;
  }

  private async ensureAcademicYearExistsAndActive(academicYearId: string) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
        isCurrent: true,
        status: true,
      },
    });

    if (!academicYear) {
      throw new BadRequestException('Academic year is invalid or deleted');
    }

    return academicYear;
  }

  private normalizeNotes(notes?: string | null) {
    if (notes === undefined) {
      return undefined;
    }

    if (notes === null) {
      return null;
    }

    const normalized = notes.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private ensureValidDateRange(
    effectiveFrom?: string | null,
    effectiveTo?: string | null,
  ) {
    if (!effectiveFrom || !effectiveTo) {
      return;
    }

    const start = new Date(effectiveFrom);
    const end = new Date(effectiveTo);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid effective date range');
    }

    if (end < start) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Section classroom assignment already exists');
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
