import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Classroom, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { ListClassroomsDto } from './dto/list-classrooms.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

const classroomInclude = {
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
export class ClassroomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateClassroomDto, actorUserId: string) {
    const code = payload.code.trim().toLowerCase();
    const name = payload.name.trim();
    const notes = this.normalizeNotes(payload.notes);

    try {
      const classroom = await this.prisma.classroom.create({
        data: {
          code,
          name,
          capacity: payload.capacity,
          notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: classroomInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'CLASSROOM_CREATE',
        resource: 'classrooms',
        resourceId: classroom.id,
        details: {
          code: classroom.code,
          name: classroom.name,
        },
      });

      return classroom;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'CLASSROOM_CREATE_FAILED',
        resource: 'classrooms',
        status: AuditStatus.FAILURE,
        details: {
          code,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListClassroomsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const search = query.search?.trim();
    const where: Prisma.ClassroomWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      OR: search
        ? [
            { code: { contains: search } },
            { name: { contains: search } },
            { notes: { contains: search } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.classroom.count({ where }),
      this.prisma.classroom.findMany({
        where,
        include: classroomInclude,
        orderBy: [{ code: 'asc' }],
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
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: classroomInclude,
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    return classroom;
  }

  async update(id: string, payload: UpdateClassroomDto, actorUserId: string) {
    await this.ensureClassroomExists(id);

    const code = payload.code === undefined ? undefined : payload.code.trim().toLowerCase();
    const name = payload.name === undefined ? undefined : payload.name.trim();
    const notes =
      payload.notes === undefined ? undefined : this.normalizeNotes(payload.notes);

    try {
      const classroom = await this.prisma.classroom.update({
        where: {
          id,
        },
        data: {
          code,
          name,
          capacity: payload.capacity,
          notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: classroomInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'CLASSROOM_UPDATE',
        resource: 'classrooms',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return classroom;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureClassroomExists(id);

    await this.prisma.classroom.update({
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
      action: 'CLASSROOM_DELETE',
      resource: 'classrooms',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureClassroomExists(id: string): Promise<Classroom> {
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    return classroom;
  }

  private normalizeNotes(notes?: string) {
    if (notes === undefined) {
      return undefined;
    }

    const normalized = notes.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Classroom code must be unique');
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
