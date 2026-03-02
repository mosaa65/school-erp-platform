import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, EmployeeTalent, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { TalentsService } from '../talents/talents.service';
import { CreateEmployeeTalentDto } from './dto/create-employee-talent.dto';
import { ListEmployeeTalentsDto } from './dto/list-employee-talents.dto';
import { UpdateEmployeeTalentDto } from './dto/update-employee-talent.dto';

const employeeTalentInclude = {
  employee: {
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      jobTitle: true,
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
} as const;

@Injectable()
export class EmployeeTalentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
    private readonly talentsService: TalentsService,
  ) {}

  async create(payload: CreateEmployeeTalentDto, actorUserId: string) {
    try {
      await this.employeesService.ensureEmployeeExistsAndActive(
        payload.employeeId,
      );
      await this.talentsService.ensureTalentExistsAndActive(payload.talentId);

      const employeeTalent = await this.prisma.employeeTalent.create({
        data: {
          employeeId: payload.employeeId,
          talentId: payload.talentId,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeTalentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_TALENT_CREATE',
        resource: 'employee-talents',
        resourceId: employeeTalent.id,
        details: {
          employeeId: employeeTalent.employeeId,
          talentId: employeeTalent.talentId,
        },
      });

      return employeeTalent;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_TALENT_CREATE_FAILED',
        resource: 'employee-talents',
        status: AuditStatus.FAILURE,
        details: {
          employeeId: payload.employeeId,
          talentId: payload.talentId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListEmployeeTalentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.EmployeeTalentWhereInput = {
      deletedAt: null,
      employeeId: query.employeeId,
      talentId: query.talentId,
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
      this.prisma.employeeTalent.count({ where }),
      this.prisma.employeeTalent.findMany({
        where,
        include: employeeTalentInclude,
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
    const employeeTalent = await this.prisma.employeeTalent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeTalentInclude,
    });

    if (!employeeTalent) {
      throw new NotFoundException('Employee talent mapping not found');
    }

    return employeeTalent;
  }

  async update(
    id: string,
    payload: UpdateEmployeeTalentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEmployeeTalentExists(id);

    const resolvedEmployeeId = payload.employeeId ?? existing.employeeId;
    const resolvedTalentId = payload.talentId ?? existing.talentId;

    await this.employeesService.ensureEmployeeExistsAndActive(
      resolvedEmployeeId,
    );
    await this.talentsService.ensureTalentExistsAndActive(resolvedTalentId);

    try {
      const employeeTalent = await this.prisma.employeeTalent.update({
        where: {
          id,
        },
        data: {
          employeeId: payload.employeeId,
          talentId: payload.talentId,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: employeeTalentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_TALENT_UPDATE',
        resource: 'employee-talents',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return employeeTalent;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEmployeeTalentExists(id);

    await this.prisma.employeeTalent.update({
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
      action: 'EMPLOYEE_TALENT_DELETE',
      resource: 'employee-talents',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEmployeeTalentExists(
    id: string,
  ): Promise<EmployeeTalent> {
    const employeeTalent = await this.prisma.employeeTalent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employeeTalent) {
      throw new NotFoundException('Employee talent mapping not found');
    }

    return employeeTalent;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Employee-talent mapping must be unique');
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
