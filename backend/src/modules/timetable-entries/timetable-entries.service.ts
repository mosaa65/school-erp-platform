import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, TimetableEntry } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { ListTimetableEntriesDto } from './dto/list-timetable-entries.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';

const timetableEntryInclude = {
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
  section: {
    select: {
      id: true,
      code: true,
      name: true,
      gradeLevelId: true,
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
  termSubjectOffering: {
    include: {
      academicTerm: {
        select: {
          id: true,
          code: true,
          name: true,
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
        },
      },
    },
  },
} as const;

@Injectable()
export class TimetableEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateTimetableEntryDto, actorUserId: string) {
    try {
      const academicTerm = await this.ensureAcademicTermExistsAndActive(
        payload.academicTermId,
      );
      const section = await this.ensureSectionExistsAndActive(
        payload.sectionId,
      );
      const offering = await this.ensureTermSubjectOfferingExistsAndActive(
        payload.termSubjectOfferingId,
      );

      this.assertTermConsistency(
        payload.academicTermId,
        offering.academicTermId,
      );
      this.assertSectionGradeConsistency(
        section.gradeLevelId,
        offering.gradeLevelSubject.gradeLevelId,
      );
      this.assertAcademicYearConsistency(
        academicTerm.academicYearId,
        offering.gradeLevelSubject.academicYearId,
      );

      const entry = await this.prisma.timetableEntry.create({
        data: {
          academicTermId: payload.academicTermId,
          sectionId: payload.sectionId,
          termSubjectOfferingId: payload.termSubjectOfferingId,
          dayOfWeek: payload.dayOfWeek,
          periodIndex: payload.periodIndex,
          roomLabel: payload.roomLabel,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: timetableEntryInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'TIMETABLE_ENTRY_CREATE',
        resource: 'timetable-entries',
        resourceId: entry.id,
        details: {
          academicTermId: entry.academicTermId,
          sectionId: entry.sectionId,
          termSubjectOfferingId: entry.termSubjectOfferingId,
          dayOfWeek: entry.dayOfWeek,
          periodIndex: entry.periodIndex,
        },
      });

      return entry;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'TIMETABLE_ENTRY_CREATE_FAILED',
        resource: 'timetable-entries',
        status: AuditStatus.FAILURE,
        details: {
          academicTermId: payload.academicTermId,
          sectionId: payload.sectionId,
          termSubjectOfferingId: payload.termSubjectOfferingId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListTimetableEntriesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TimetableEntryWhereInput = {
      deletedAt: null,
      academicTermId: query.academicTermId,
      sectionId: query.sectionId,
      termSubjectOfferingId: query.termSubjectOfferingId,
      dayOfWeek: query.dayOfWeek,
      isActive: query.isActive,
      OR: query.search
        ? [
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
              termSubjectOffering: {
                gradeLevelSubject: {
                  subject: {
                    name: {
                      contains: query.search,
                    },
                  },
                },
              },
            },
            {
              termSubjectOffering: {
                gradeLevelSubject: {
                  subject: {
                    code: {
                      contains: query.search,
                    },
                  },
                },
              },
            },
            {
              roomLabel: {
                contains: query.search,
              },
            },
            {
              notes: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.timetableEntry.count({ where }),
      this.prisma.timetableEntry.findMany({
        where,
        include: timetableEntryInclude,
        orderBy: [
          {
            dayOfWeek: 'asc',
          },
          {
            periodIndex: 'asc',
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
    const entry = await this.prisma.timetableEntry.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: timetableEntryInclude,
    });

    if (!entry) {
      throw new NotFoundException('Timetable entry not found');
    }

    return entry;
  }

  async update(
    id: string,
    payload: UpdateTimetableEntryDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEntryExists(id);

    const resolvedAcademicTermId =
      payload.academicTermId ?? existing.academicTermId;
    const resolvedSectionId = payload.sectionId ?? existing.sectionId;
    const resolvedOfferingId =
      payload.termSubjectOfferingId ?? existing.termSubjectOfferingId;

    try {
      const academicTerm = await this.ensureAcademicTermExistsAndActive(
        resolvedAcademicTermId,
      );
      const section =
        await this.ensureSectionExistsAndActive(resolvedSectionId);
      const offering =
        await this.ensureTermSubjectOfferingExistsAndActive(resolvedOfferingId);

      this.assertTermConsistency(
        resolvedAcademicTermId,
        offering.academicTermId,
      );
      this.assertSectionGradeConsistency(
        section.gradeLevelId,
        offering.gradeLevelSubject.gradeLevelId,
      );
      this.assertAcademicYearConsistency(
        academicTerm.academicYearId,
        offering.gradeLevelSubject.academicYearId,
      );

      const entry = await this.prisma.timetableEntry.update({
        where: {
          id,
        },
        data: {
          academicTermId: payload.academicTermId,
          sectionId: payload.sectionId,
          termSubjectOfferingId: payload.termSubjectOfferingId,
          dayOfWeek: payload.dayOfWeek,
          periodIndex: payload.periodIndex,
          roomLabel: payload.roomLabel,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: timetableEntryInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'TIMETABLE_ENTRY_UPDATE',
        resource: 'timetable-entries',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return entry;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEntryExists(id);

    await this.prisma.timetableEntry.update({
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
      action: 'TIMETABLE_ENTRY_DELETE',
      resource: 'timetable-entries',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEntryExists(id: string): Promise<TimetableEntry> {
    const entry = await this.prisma.timetableEntry.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!entry) {
      throw new NotFoundException('Timetable entry not found');
    }

    return entry;
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
        'Cannot create timetable entry in inactive academic term',
      );
    }

    return academicTerm;
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
      throw new BadRequestException(
        'Cannot create timetable entry for inactive section',
      );
    }

    return section;
  }

  private async ensureTermSubjectOfferingExistsAndActive(
    termSubjectOfferingId: string,
  ) {
    const offering = await this.prisma.termSubjectOffering.findFirst({
      where: {
        id: termSubjectOfferingId,
        deletedAt: null,
      },
      select: {
        id: true,
        academicTermId: true,
        isActive: true,
        gradeLevelSubject: {
          select: {
            academicYearId: true,
            gradeLevelId: true,
          },
        },
      },
    });

    if (!offering) {
      throw new BadRequestException(
        'Term subject offering is invalid or deleted',
      );
    }

    if (!offering.isActive) {
      throw new BadRequestException(
        'Cannot use inactive term subject offering',
      );
    }

    return offering;
  }

  private assertTermConsistency(
    academicTermId: string,
    offeringAcademicTermId: string,
  ) {
    if (academicTermId !== offeringAcademicTermId) {
      throw new BadRequestException(
        'Academic term must match term subject offering academic term',
      );
    }
  }

  private assertSectionGradeConsistency(
    sectionGradeLevelId: string,
    offeringGradeLevelId: string,
  ) {
    if (sectionGradeLevelId !== offeringGradeLevelId) {
      throw new BadRequestException(
        'Section grade level must match grade-level subject mapping grade level',
      );
    }
  }

  private assertAcademicYearConsistency(
    termAcademicYearId: string,
    mappingAcademicYearId: string,
  ) {
    if (termAcademicYearId !== mappingAcademicYearId) {
      throw new BadRequestException(
        'Academic term and grade-level subject mapping must belong to the same academic year',
      );
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Timetable slot conflict: section already has a class in this term/day/period',
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
