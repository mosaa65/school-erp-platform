import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, type User } from '@prisma/client';
import { hash } from 'bcrypt';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userPublicSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  employee: {
    select: {
      id: true,
      jobNumber: true,
      fullName: true,
      jobTitle: true,
      isActive: true,
    },
  },
  userRoles: {
    where: {
      deletedAt: null,
    },
    include: {
      role: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
  ) {}

  async create(createUserDto: CreateUserDto, actorUserId: string) {
    try {
      if (createUserDto.employeeId) {
        await this.ensureEmployeeExistsAndActive(createUserDto.employeeId);
      }

      const passwordHash = await hash(createUserDto.password, 12);

      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: createUserDto.email,
            username: createUserDto.username,
            employeeId: createUserDto.employeeId,
            passwordHash,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            isActive: createUserDto.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
        });

        if (createUserDto.roleIds) {
          await this.syncUserRoles(
            tx,
            createdUser.id,
            createUserDto.roleIds,
            actorUserId,
          );
        }

        return tx.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          select: userPublicSelect,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'USER_CREATE',
        resource: 'users',
        resourceId: user.id,
        details: {
          email: user.email,
          employeeId: createUserDto.employeeId,
          rolesCount: user.userRoles.length,
        },
      });

      return user;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'USER_CREATE_FAILED',
        resource: 'users',
        status: AuditStatus.FAILURE,
        details: {
          email: createUserDto.email,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      isActive: query.isActive,
      OR: query.search
        ? [
            { email: { contains: query.search } },
            { username: { contains: query.search } },
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
            { employee: { fullName: { contains: query.search } } },
            { employee: { jobNumber: { contains: query.search } } },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
        select: userPublicSelect,
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
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: userPublicSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, actorUserId: string) {
    await this.ensureUserExists(id);

    try {
      if (updateUserDto.employeeId) {
        await this.ensureEmployeeExistsAndActive(updateUserDto.employeeId);
      }

      const user = await this.prisma.$transaction(async (tx) => {
        const passwordHash = updateUserDto.password
          ? await hash(updateUserDto.password, 12)
          : undefined;

        await tx.user.update({
          where: { id },
          data: {
            email: updateUserDto.email,
            username: updateUserDto.username,
            employeeId: updateUserDto.employeeId,
            passwordHash,
            firstName: updateUserDto.firstName,
            lastName: updateUserDto.lastName,
            isActive: updateUserDto.isActive,
            updatedById: actorUserId,
          },
        });

        if (updateUserDto.roleIds) {
          await this.syncUserRoles(tx, id, updateUserDto.roleIds, actorUserId);
        }

        return tx.user.findUniqueOrThrow({
          where: { id },
          select: userPublicSelect,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'USER_UPDATE',
        resource: 'users',
        resourceId: id,
        details: {
          ...updateUserDto,
          password: updateUserDto.password ? '[PROTECTED]' : undefined,
        } as Prisma.InputJsonValue,
      });

      return user;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async unlinkEmployee(id: string, actorUserId: string) {
    await this.ensureUserExists(id);

    const user = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        employeeId: null,
        updatedById: actorUserId,
      },
      select: userPublicSelect,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_UNLINK_EMPLOYEE',
      resource: 'users',
      resourceId: id,
    });

    return user;
  }

  async linkEmployee(id: string, employeeId: string, actorUserId: string) {
    await this.ensureUserExists(id);
    await this.ensureEmployeeExistsAndActive(employeeId);

    const linkedUser = await this.prisma.user.findFirst({
      where: {
        employeeId,
        deletedAt: null,
        id: {
          not: id,
        },
      },
      select: {
        id: true,
      },
    });

    if (linkedUser) {
      throw new ConflictException('Employee is already linked to another user');
    }

    const user = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        employeeId,
        updatedById: actorUserId,
      },
      select: userPublicSelect,
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_LINK_EMPLOYEE',
      resource: 'users',
      resourceId: id,
      details: {
        employeeId,
      },
    });

    return user;
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureUserExists(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          employeeId: null,
          updatedById: actorUserId,
        },
      });

      await tx.userRole.updateMany({
        where: {
          userId: id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          updatedById: actorUserId,
        },
      });
    });

    await this.auditLogsService.record({
      actorUserId,
      action: 'USER_DELETE',
      resource: 'users',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureUserExists(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async ensureEmployeeExistsAndActive(employeeId: string) {
    await this.employeesService.ensureEmployeeExistsAndActive(employeeId);
  }

  private async syncUserRoles(
    tx: Prisma.TransactionClient,
    userId: string,
    roleIds: string[],
    actorUserId: string,
  ): Promise<void> {
    if (roleIds.length > 0) {
      const activeRolesCount = await tx.role.count({
        where: {
          id: {
            in: roleIds,
          },
          deletedAt: null,
          isActive: true,
        },
      });

      if (activeRolesCount !== roleIds.length) {
        throw new BadRequestException(
          'One or more roles are invalid or inactive',
        );
      }
    }

    const existing = await tx.userRole.findMany({
      where: {
        userId,
      },
    });

    const existingByRoleId = new Map(
      existing.map((item) => [item.roleId, item]),
    );
    const requestedRoleIdSet = new Set(roleIds);

    for (const item of existing) {
      if (!item.deletedAt && !requestedRoleIdSet.has(item.roleId)) {
        await tx.userRole.update({
          where: {
            id: item.id,
          },
          data: {
            deletedAt: new Date(),
            updatedById: actorUserId,
          },
        });
      }
    }

    for (const roleId of roleIds) {
      const existingAssignment = existingByRoleId.get(roleId);

      if (!existingAssignment) {
        await tx.userRole.create({
          data: {
            userId,
            roleId,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
        });
        continue;
      }

      if (existingAssignment.deletedAt) {
        await tx.userRole.update({
          where: {
            id: existingAssignment.id,
          },
          data: {
            deletedAt: null,
            updatedById: actorUserId,
          },
        });
      }
    }
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'User email, username, or employee link already exists',
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
