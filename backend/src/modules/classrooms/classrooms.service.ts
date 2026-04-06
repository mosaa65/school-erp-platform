import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Classroom, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateAutoCode } from '../../common/utils/auto-code';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { ListClassroomsDto } from './dto/list-classrooms.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

const classroomInclude = {
  building: {
    select: {
      id: true,
      code: true,
      nameAr: true,
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

type ClassroomWithRelations = Prisma.ClassroomGetPayload<{
  include: typeof classroomInclude;
}>;

type ClassroomWithMeta = ClassroomWithRelations & {
  activeAssignmentsCount: number;
};

@Injectable()
export class ClassroomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateClassroomDto, actorUserId: string) {
    const code =
      payload.code?.trim().toLowerCase() || generateAutoCode('CLS').toLowerCase();
    const name = payload.name.trim();
    const notes = this.normalizeNotes(payload.notes);

    try {
      if (payload.buildingLookupId !== undefined) {
        await this.ensureBuildingExistsAndActive(payload.buildingLookupId);
      }

      const classroom = await this.prisma.classroom.create({
        data: {
          code,
          name,
          buildingLookupId: payload.buildingLookupId,
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

      const [enrichedClassroom] = await this.attachActiveAssignmentCounts([classroom]);
      return enrichedClassroom;
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
      buildingLookupId: query.buildingLookupId,
      OR: search
        ? [
            { code: { contains: search } },
            { name: { contains: search } },
            { notes: { contains: search } },
            {
              building: {
                OR: [
                  { code: { contains: search } },
                  { nameAr: { contains: search } },
                ],
              },
            },
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

    const enrichedItems = await this.attachActiveAssignmentCounts(items);

    return {
      data: enrichedItems,
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

    const [enrichedClassroom] = await this.attachActiveAssignmentCounts([classroom]);
    return enrichedClassroom;
  }

  async update(id: string, payload: UpdateClassroomDto, actorUserId: string) {
    await this.ensureClassroomExists(id);

    const code = payload.code === undefined ? undefined : payload.code.trim().toLowerCase();
    const name = payload.name === undefined ? undefined : payload.name.trim();
    const notes =
      payload.notes === undefined ? undefined : this.normalizeNotes(payload.notes);

    try {
      if (payload.buildingLookupId !== undefined && payload.buildingLookupId !== null) {
        await this.ensureBuildingExistsAndActive(payload.buildingLookupId);
      }

      const classroom = await this.prisma.classroom.update({
        where: {
          id,
        },
        data: {
          code,
          name,
          buildingLookupId:
            payload.buildingLookupId === undefined
              ? undefined
              : payload.buildingLookupId,
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

      const [enrichedClassroom] = await this.attachActiveAssignmentCounts([classroom]);
      return enrichedClassroom;
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

  private async attachActiveAssignmentCounts(
    classrooms: ClassroomWithRelations[],
  ): Promise<ClassroomWithMeta[]> {
    if (classrooms.length === 0) {
      return [];
    }

    const counts = await this.prisma.sectionClassroomAssignment.groupBy({
      by: ['classroomId'],
      where: {
        deletedAt: null,
        isActive: true,
        classroomId: {
          in: classrooms.map((classroom) => classroom.id),
        },
      },
      _count: {
        classroomId: true,
      },
    });

    const countsMap = new Map(
      counts.map((entry) => [entry.classroomId, entry._count.classroomId]),
    );

    return classrooms.map((classroom) => ({
      ...classroom,
      activeAssignmentsCount: countsMap.get(classroom.id) ?? 0,
    }));
  }

  private async ensureBuildingExistsAndActive(buildingLookupId: number) {
    const building = await this.prisma.lookupBuilding.findFirst({
      where: {
        id: buildingLookupId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!building) {
      throw new BadRequestException('Building is invalid or deleted');
    }

    if (!building.isActive) {
      throw new BadRequestException('Building is inactive');
    }

    return building;
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
