import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, StudentTalent } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StudentsService } from '../students/students.service';
import { TalentsService } from '../talents/talents.service';
import { CreateStudentTalentDto } from './dto/create-student-talent.dto';
import { ListStudentTalentsDto } from './dto/list-student-talents.dto';
import { UpdateStudentTalentDto } from './dto/update-student-talent.dto';

const studentTalentInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      isActive: true,
    },
  },
  talent: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
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
export class StudentTalentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentsService: StudentsService,
    private readonly talentsService: TalentsService,
  ) {}

  async create(payload: CreateStudentTalentDto, actorUserId: string) {
    try {
      await this.studentsService.ensureStudentExistsAndActive(payload.studentId);
      await this.talentsService.ensureTalentExistsAndActive(payload.talentId);

      const studentTalent = await this.prisma.studentTalent.create({
        data: {
          studentId: payload.studentId,
          talentId: payload.talentId,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentTalentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_TALENT_CREATE',
        resource: 'student-talents',
        resourceId: studentTalent.id,
        details: {
          studentId: studentTalent.studentId,
          talentId: studentTalent.talentId,
        },
      });

      return studentTalent;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_TALENT_CREATE_FAILED',
        resource: 'student-talents',
        status: AuditStatus.FAILURE,
        details: {
          studentId: payload.studentId,
          talentId: payload.talentId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentTalentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentTalentWhereInput = {
      deletedAt: null,
      studentId: query.studentId,
      talentId: query.talentId,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              student: {
                fullName: {
                  contains: query.search,
                },
              },
            },
            {
              student: {
                admissionNo: {
                  contains: query.search,
                },
              },
            },
            {
              talent: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              talent: {
                code: {
                  contains: query.search,
                },
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
      this.prisma.studentTalent.count({ where }),
      this.prisma.studentTalent.findMany({
        where,
        include: studentTalentInclude,
        orderBy: [
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
    const studentTalent = await this.prisma.studentTalent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentTalentInclude,
    });

    if (!studentTalent) {
      throw new NotFoundException('Student talent mapping not found');
    }

    return studentTalent;
  }

  async update(
    id: string,
    payload: UpdateStudentTalentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureStudentTalentExists(id);

    const resolvedStudentId = payload.studentId ?? existing.studentId;
    const resolvedTalentId = payload.talentId ?? existing.talentId;

    await this.studentsService.ensureStudentExistsAndActive(resolvedStudentId);
    await this.talentsService.ensureTalentExistsAndActive(resolvedTalentId);

    try {
      const studentTalent = await this.prisma.studentTalent.update({
        where: {
          id,
        },
        data: {
          studentId: payload.studentId,
          talentId: payload.talentId,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentTalentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_TALENT_UPDATE',
        resource: 'student-talents',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return studentTalent;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureStudentTalentExists(id);

    await this.prisma.studentTalent.update({
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
      action: 'STUDENT_TALENT_DELETE',
      resource: 'student-talents',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureStudentTalentExists(id: string): Promise<StudentTalent> {
    const studentTalent = await this.prisma.studentTalent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!studentTalent) {
      throw new NotFoundException('Student talent mapping not found');
    }

    return studentTalent;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Student-talent mapping must be unique');
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
