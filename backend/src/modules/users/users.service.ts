import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditStatus, Prisma, UserActivationStatus, type User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmployeesService } from '../employees/employees.service';
import { GuardiansService } from '../guardians/guardians.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userPublicSelect = {
  id: true,
  email: true,
  phoneCountryCode: true,
  phoneNationalNumber: true,
  phoneE164: true,
  username: true,
  firstName: true,
  lastName: true,
  guardianId: true,
  isActive: true,
  activationStatus: true,
  initialPasswordExpiresAt: true,
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
  guardian: {
    select: {
      id: true,
      fullName: true,
      phonePrimary: true,
      whatsappNumber: true,
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
  private readonly initialPasswordTtlHours = this.parseIntEnv(
    'AUTH_INITIAL_PASSWORD_TTL_HOURS',
    72,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly employeesService: EmployeesService,
    private readonly guardiansService: GuardiansService,
  ) {}

  async create(createUserDto: CreateUserDto, actorUserId: string) {
    let normalizedPhone: ReturnType<typeof this.normalizePhoneInput> = null;

    try {
      if (createUserDto.employeeId) {
        await this.ensureEmployeeExistsAndActive(createUserDto.employeeId);
      }

      if (createUserDto.guardianId) {
        await this.ensureGuardianExistsAndActive(createUserDto.guardianId);
      }

      normalizedPhone = this.normalizePhoneInput(
        createUserDto.phoneCountryCode,
        createUserDto.phoneNationalNumber,
      );
      if (!normalizedPhone) {
        throw new BadRequestException('Phone number is required');
      }
      const initialPassword = this.generateInitialPassword();
      const passwordHash = await argon2.hash(initialPassword);
      const now = new Date();
      const initialPasswordExpiresAt = new Date(
        now.getTime() + this.initialPasswordTtlHours * 60 * 60 * 1000,
      );

      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: this.resolveEmailForCreate(
              createUserDto.email,
              normalizedPhone!.phoneE164,
            ),
            username: createUserDto.username,
            phoneCountryCode: normalizedPhone!.phoneCountryCode,
            phoneNationalNumber: normalizedPhone!.phoneNationalNumber,
            phoneE164: normalizedPhone!.phoneE164,
            employeeId: createUserDto.employeeId,
            guardianId: createUserDto.guardianId,
            passwordHash,
            activationStatus: UserActivationStatus.PENDING_INITIAL_PASSWORD,
            initialPasswordIssuedAt: now,
            initialPasswordExpiresAt,
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
          guardianId: createUserDto.guardianId,
          phoneE164: normalizedPhone.phoneE164,
          rolesCount: user.userRoles.length,
          activationStatus: user.activationStatus,
        },
      });

      return {
        ...user,
        activationSetup: {
          initialOneTimePassword: initialPassword,
          expiresAt: initialPasswordExpiresAt,
          activationStatus: user.activationStatus,
        },
      };
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'USER_CREATE_FAILED',
        resource: 'users',
        status: AuditStatus.FAILURE,
        details: {
          email: createUserDto.email,
          phoneE164: normalizedPhone?.phoneE164 ?? null,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const deletedOnly = query.deletedOnly ?? false;

    const where: Prisma.UserWhereInput = {
      deletedAt: deletedOnly ? { not: null } : null,
      isActive: deletedOnly ? undefined : query.isActive,
      OR: query.search
        ? [
            { email: { contains: query.search } },
            { phoneE164: { contains: query.search } },
            { phoneNationalNumber: { contains: query.search } },
            { username: { contains: query.search } },
            { firstName: { contains: query.search } },
            { lastName: { contains: query.search } },
            { guardian: { fullName: { contains: query.search } } },
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

      if (updateUserDto.guardianId) {
        await this.ensureGuardianExistsAndActive(updateUserDto.guardianId);
      }

      const shouldUpdatePhone =
        updateUserDto.phoneCountryCode !== undefined ||
        updateUserDto.phoneNationalNumber !== undefined;

      const normalizedPhone = shouldUpdatePhone
        ? this.normalizePhoneInput(
            updateUserDto.phoneCountryCode,
            updateUserDto.phoneNationalNumber,
          )
        : null;

      const user = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            email: updateUserDto.email,
            username: updateUserDto.username,
            ...(normalizedPhone
              ? {
                  phoneCountryCode: normalizedPhone.phoneCountryCode,
                  phoneNationalNumber: normalizedPhone.phoneNationalNumber,
                  phoneE164: normalizedPhone.phoneE164,
                }
              : {}),
            employeeId: updateUserDto.employeeId,
            guardianId: updateUserDto.guardianId,
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
        details: updateUserDto as Prisma.InputJsonValue,
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
          guardianId: null,
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

  private async ensureGuardianExistsAndActive(guardianId: string) {
    await this.guardiansService.ensureGuardianExistsAndActive(guardianId);
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

  private normalizePhoneInput(
    phoneCountryCode: string | undefined,
    phoneNationalNumber: string | undefined,
    options?: {
      allowNoPhone?: boolean;
    },
  ): {
    phoneCountryCode: string;
    phoneNationalNumber: string;
    phoneE164: string;
  } | null {
    const rawCountryCode = phoneCountryCode?.trim();
    const rawNationalNumber = phoneNationalNumber?.trim();

    const hasCountryCode = Boolean(rawCountryCode);
    const hasNationalNumber = Boolean(rawNationalNumber);

    if (!hasCountryCode && !hasNationalNumber) {
      if (options?.allowNoPhone) {
        return null;
      }

      throw new BadRequestException('Phone number is required');
    }

    if (!hasCountryCode || !hasNationalNumber) {
      throw new BadRequestException(
        'Both phoneCountryCode and phoneNationalNumber are required together',
      );
    }

    const normalizedCountryCode = rawCountryCode!.startsWith('+')
      ? rawCountryCode!
      : `+${rawCountryCode!}`;

    const normalizedNationalNumber = rawNationalNumber!.replace(/\D+/g, '');
    if (!normalizedNationalNumber) {
      throw new BadRequestException('Invalid phone number');
    }

    const parsed = parsePhoneNumberFromString(
      `${normalizedCountryCode}${normalizedNationalNumber}`,
      this.resolveDefaultPhoneRegion(),
    );

    if (!parsed?.isValid()) {
      throw new BadRequestException('Invalid phone number');
    }

    return {
      phoneCountryCode: normalizedCountryCode,
      phoneNationalNumber: normalizedNationalNumber,
      phoneE164: parsed.number,
    };
  }

  private resolveDefaultPhoneRegion(): CountryCode {
    const configuredValue = process.env.AUTH_DEFAULT_PHONE_REGION
      ?.trim()
      .toUpperCase();

    if (configuredValue && /^[A-Z]{2}$/.test(configuredValue)) {
      return configuredValue as CountryCode;
    }

    return 'YE';
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'User email, phone, username, employee link, or guardian link already exists',
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

  private resolveEmailForCreate(
    email: string | undefined,
    phoneE164: string,
  ): string {
    const normalized = email?.trim().toLowerCase();
    if (normalized) {
      return normalized;
    }

    const phoneSlug = phoneE164.replace(/\D+/g, '');
    return `pending-user-${phoneSlug}@local.invalid`;
  }

  private generateInitialPassword(): string {
    return randomBytes(9).toString('base64url');
  }

  private parseIntEnv(key: string, fallback: number): number {
    const raw = process.env[key]?.trim();
    if (!raw) {
      return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
  }
}
