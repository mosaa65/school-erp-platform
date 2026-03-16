import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, TermSubjectOffering } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateTermSubjectOfferingDto } from './dto/create-term-subject-offering.dto';
import { ListTermSubjectOfferingsDto } from './dto/list-term-subject-offerings.dto';
import { UpdateTermSubjectOfferingDto } from './dto/update-term-subject-offering.dto';

const termSubjectOfferingInclude = {
  academicTerm: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      academicYearId: true,
      isActive: true,
    },
  },
  gradeLevelSubject: {
    include: {
      academicYear: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      },
      gradeLevel: {
        select: {
          id: true,
          code: true,
          name: true,
          stage: true,
          sequence: true,
        },
      },
      subject: {
        select: {
          id: true,
          code: true,
          name: true,
          shortName: true,
          category: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class TermSubjectOfferingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateTermSubjectOfferingDto, actorUserId: string) {
    try {
      const academicTerm = await this.ensureAcademicTermExistsAndActive(
        payload.academicTermId,
      );
      const gradeLevelSubject =
        await this.ensureGradeLevelSubjectExistsAndActive(
          payload.gradeLevelSubjectId,
        );

      this.assertSameAcademicYear(
        academicTerm.academicYearId,
        gradeLevelSubject.academicYearId,
      );

      const offering = await this.prisma.termSubjectOffering.create({
        data: {
          academicTermId: payload.academicTermId,
          gradeLevelSubjectId: payload.gradeLevelSubjectId,
          weeklyPeriods:
            payload.weeklyPeriods ?? gradeLevelSubject.weeklyPeriods,
          displayOrder: payload.displayOrder,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: termSubjectOfferingInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'TERM_SUBJECT_OFFERING_CREATE',
        resource: 'term-subject-offerings',
        resourceId: offering.id,
        details: {
          academicTermId: offering.academicTermId,
          gradeLevelSubjectId: offering.gradeLevelSubjectId,
          weeklyPeriods: offering.weeklyPeriods,
        },
      });

      return offering;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'TERM_SUBJECT_OFFERING_CREATE_FAILED',
        resource: 'term-subject-offerings',
        status: AuditStatus.FAILURE,
        details: {
          academicTermId: payload.academicTermId,
          gradeLevelSubjectId: payload.gradeLevelSubjectId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListTermSubjectOfferingsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TermSubjectOfferingWhereInput = {
      deletedAt: null,
      academicTermId: query.academicTermId,
      gradeLevelSubjectId: query.gradeLevelSubjectId,
      isActive: query.isActive,
      AND: query.academicYearId
        ? [
            {
              academicTerm: {
                academicYearId: query.academicYearId,
              },
            },
          ]
        : undefined,
      OR: query.search
        ? [
            {
              academicTerm: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              gradeLevelSubject: {
                gradeLevel: {
                  name: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              gradeLevelSubject: {
                subject: {
                  name: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              gradeLevelSubject: {
                subject: {
                  code: {
                    contains: query.search,
                  },
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.termSubjectOffering.count({ where }),
      this.prisma.termSubjectOffering.findMany({
        where,
        include: termSubjectOfferingInclude,
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
    const offering = await this.prisma.termSubjectOffering.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: termSubjectOfferingInclude,
    });

    if (!offering) {
      throw new NotFoundException('Term subject offering not found');
    }

    return offering;
  }

  async update(
    id: string,
    payload: UpdateTermSubjectOfferingDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureOfferingExists(id);

    const resolvedAcademicTermId =
      payload.academicTermId ?? existing.academicTermId;
    const resolvedGradeLevelSubjectId =
      payload.gradeLevelSubjectId ?? existing.gradeLevelSubjectId;

    try {
      const academicTerm = await this.ensureAcademicTermExistsAndActive(
        resolvedAcademicTermId,
      );
      const gradeLevelSubject =
        await this.ensureGradeLevelSubjectExistsAndActive(
          resolvedGradeLevelSubjectId,
        );

      this.assertSameAcademicYear(
        academicTerm.academicYearId,
        gradeLevelSubject.academicYearId,
      );

      const offering = await this.prisma.termSubjectOffering.update({
        where: {
          id,
        },
        data: {
          academicTermId: payload.academicTermId,
          gradeLevelSubjectId: payload.gradeLevelSubjectId,
          weeklyPeriods: payload.weeklyPeriods,
          displayOrder: payload.displayOrder,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: termSubjectOfferingInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'TERM_SUBJECT_OFFERING_UPDATE',
        resource: 'term-subject-offerings',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return offering;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureOfferingExists(id);

    await this.prisma.termSubjectOffering.update({
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
      action: 'TERM_SUBJECT_OFFERING_DELETE',
      resource: 'term-subject-offerings',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureOfferingExists(id: string): Promise<TermSubjectOffering> {
    const offering = await this.prisma.termSubjectOffering.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!offering) {
      throw new NotFoundException('Term subject offering not found');
    }

    return offering;
  }

  private async ensureAcademicTermExistsAndActive(academicTermId: string) {
    const academicTerm = await this.prisma.academicTerm.findFirst({
      where: {
        id: academicTermId,
        deletedAt: null,
      },
      select: {
        id: true,
        academicYearId: true,
        isActive: true,
      },
    });

    if (!academicTerm) {
      throw new BadRequestException('Academic term is invalid or deleted');
    }

    if (!academicTerm.isActive) {
      throw new BadRequestException(
        'Cannot create offering in inactive academic term',
      );
    }

    return academicTerm;
  }

  private async ensureGradeLevelSubjectExistsAndActive(
    gradeLevelSubjectId: string,
  ) {
    const mapping = await this.prisma.gradeLevelSubject.findFirst({
      where: {
        id: gradeLevelSubjectId,
        deletedAt: null,
      },
      select: {
        id: true,
        academicYearId: true,
        isActive: true,
        weeklyPeriods: true,
      },
    });

    if (!mapping) {
      throw new BadRequestException(
        'Grade level subject mapping is invalid or deleted',
      );
    }

    if (!mapping.isActive) {
      throw new BadRequestException(
        'Cannot create offering for inactive grade level subject mapping',
      );
    }

    return mapping;
  }

  private assertSameAcademicYear(
    academicTermYearId: string,
    gradeLevelSubjectYearId: string,
  ) {
    if (academicTermYearId !== gradeLevelSubjectYearId) {
      throw new BadRequestException(
        'Academic term and grade-level subject must belong to the same academic year',
      );
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Term subject offering must be unique per academic term and grade-level subject mapping',
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
