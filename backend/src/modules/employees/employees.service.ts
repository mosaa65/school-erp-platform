import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  Employee,
  EmployeeGender,
  EmployeeSystemAccessStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import {
  ListEmployeesDto,
  OperationalReadinessFilter,
} from './dto/list-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

const employeeInclude = {
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
  idType: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      isActive: true,
    },
  },
  locality: {
    select: {
      id: true,
      nameAr: true,
      localityType: true,
      directorateId: true,
      villageId: true,
    },
  },
  genderLookup: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      nameEn: true,
      isActive: true,
    },
  },
  qualificationLookup: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      sortOrder: true,
      isActive: true,
    },
  },
  jobRoleLookup: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      nameArFemale: true,
      isActive: true,
    },
  },
  userAccount: {
    select: {
      id: true,
      email: true,
      username: true,
      isActive: true,
      userRoles: {
        where: {
          deletedAt: null,
        },
        select: {
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
    },
  },
} as const;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateEmployeeDto, actorUserId: string) {
    if (payload.idTypeId !== undefined && payload.idTypeId !== null) {
      await this.ensureIdTypeExists(payload.idTypeId);
    }
    if (payload.localityId !== undefined && payload.localityId !== null) {
      await this.ensureLocalityExists(payload.localityId);
    }

    const gender = await this.resolveGenderOnCreate(payload);
    const qualification = await this.resolveQualificationOnCreate(payload);
    const jobRole = await this.resolveJobRoleOnCreate(payload);

    try {
      const employee = await this.prisma.employee.create({
        data: {
          jobNumber: payload.jobNumber,
          financialNumber: payload.financialNumber,
          fullName: payload.fullName,
          gender: gender.gender,
          genderId: gender.genderId,
          birthDate: payload.birthDate,
          phonePrimary: payload.phonePrimary,
          phoneSecondary: payload.phoneSecondary,
          hasWhatsapp: payload.hasWhatsapp ?? true,
          qualification: qualification.qualification,
          qualificationId: qualification.qualificationId,
          qualificationDate: payload.qualificationDate,
          specialization: payload.specialization,
          idNumber: payload.idNumber,
          idTypeId: payload.idTypeId === null ? null : payload.idTypeId,
          localityId: payload.localityId === null ? null : payload.localityId,
          idExpiryDate: payload.idExpiryDate,
          experienceYears: payload.experienceYears ?? 0,
          employmentType: payload.employmentType,
          jobTitle: jobRole.jobTitle,
          jobRoleId: jobRole.jobRoleId,
          hireDate: payload.hireDate,
          previousSchool: payload.previousSchool,
          salaryApproved: payload.salaryApproved ?? false,
          systemAccessStatus: payload.systemAccessStatus,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: employeeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_CREATE',
        resource: 'employees',
        resourceId: employee.id,
        details: {
          jobNumber: employee.jobNumber,
          fullName: employee.fullName,
          jobTitle: employee.jobTitle,
        },
      });

      return employee;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_CREATE_FAILED',
        resource: 'employees',
        status: AuditStatus.FAILURE,
        details: {
          jobNumber: payload.jobNumber,
          financialNumber: payload.financialNumber,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListEmployeesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const operationalReadinessWhere = this.buildOperationalReadinessWhere(
      query.operationalReadiness,
    );

    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      gender: query.gender,
      genderId: query.genderId,
      employmentType: query.employmentType,
      idTypeId: query.idTypeId,
      localityId: query.localityId,
      qualificationId: query.qualificationId,
      jobRoleId: query.jobRoleId,
      isActive: query.isActive,
      jobTitle: query.jobTitle
        ? {
            contains: query.jobTitle,
          }
        : undefined,
      OR: query.search
        ? [
            {
              fullName: {
                contains: query.search,
              },
            },
            {
              jobNumber: {
                contains: query.search,
              },
            },
            {
              financialNumber: {
                contains: query.search,
              },
            },
          ]
        : undefined,
      AND: operationalReadinessWhere ? [operationalReadinessWhere] : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        include: employeeInclude,
        orderBy: [
          {
            fullName: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const employeeIds = items.map((item) => item.id);
    let teachingAssignmentsCountByEmployeeId = new Map<string, number>();
    let sectionSupervisionsCountByEmployeeId = new Map<string, number>();

    if (employeeIds.length > 0) {
      const [teachingCounts, supervisionCounts] = await Promise.all([
        Promise.all(
          employeeIds.map((employeeId) =>
            this.prisma.employeeTeachingAssignment.count({
              where: {
                employeeId,
                deletedAt: null,
                isActive: true,
              },
            }),
          ),
        ),
        Promise.all(
          employeeIds.map((employeeId) =>
            this.prisma.employeeSectionSupervision.count({
              where: {
                employeeId,
                deletedAt: null,
                isActive: true,
              },
            }),
          ),
        ),
      ]);

      teachingAssignmentsCountByEmployeeId = new Map(
        employeeIds.map((employeeId, index) => [
          employeeId,
          teachingCounts[index] ?? 0,
        ]),
      );

      sectionSupervisionsCountByEmployeeId = new Map(
        employeeIds.map((employeeId, index) => [
          employeeId,
          supervisionCounts[index] ?? 0,
        ]),
      );
    }

    const data = items.map((item) => ({
      ...item,
      operationalScope: {
        activeTeachingAssignments:
          teachingAssignmentsCountByEmployeeId.get(item.id) ?? 0,
        activeSectionSupervisions:
          sectionSupervisionsCountByEmployeeId.get(item.id) ?? 0,
      },
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildOperationalReadinessWhere(
    filter?: OperationalReadinessFilter,
  ): Prisma.EmployeeWhereInput | undefined {
    if (!filter) {
      return undefined;
    }

    const hasActiveUserAndRoles: Prisma.EmployeeWhereInput = {
      userAccount: {
        is: {
          deletedAt: null,
          isActive: true,
          userRoles: {
            some: {
              deletedAt: null,
              role: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    };

    const hasOperationalScope: Prisma.EmployeeWhereInput = {
      OR: [
        {
          teachingAssignments: {
            some: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
        {
          sectionSupervisions: {
            some: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
      ],
    };

    switch (filter) {
      case OperationalReadinessFilter.READY:
        return {
          AND: [hasActiveUserAndRoles, hasOperationalScope],
        };

      case OperationalReadinessFilter.PARTIAL:
        return {
          AND: [
            hasActiveUserAndRoles,
            {
              teachingAssignments: {
                none: {
                  deletedAt: null,
                  isActive: true,
                },
              },
            },
            {
              sectionSupervisions: {
                none: {
                  deletedAt: null,
                  isActive: true,
                },
              },
            },
          ],
        };

      case OperationalReadinessFilter.NOT_READY:
        return {
          OR: [
            {
              userAccount: {
                is: null,
              },
            },
            {
              userAccount: {
                is: {
                  OR: [
                    {
                      deletedAt: {
                        not: null,
                      },
                    },
                    {
                      isActive: false,
                    },
                    {
                      userRoles: {
                        none: {
                          deletedAt: null,
                          role: {
                            isActive: true,
                            deletedAt: null,
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        };

      default:
        return undefined;
    }
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: employeeInclude,
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const [activeTeachingAssignments, activeSectionSupervisions] =
      await this.prisma.$transaction([
        this.prisma.employeeTeachingAssignment.count({
          where: {
            employeeId: id,
            deletedAt: null,
            isActive: true,
          },
        }),
        this.prisma.employeeSectionSupervision.count({
          where: {
            employeeId: id,
            deletedAt: null,
            isActive: true,
          },
        }),
      ]);

    return {
      ...employee,
      operationalScope: {
        activeTeachingAssignments,
        activeSectionSupervisions,
      },
    };
  }

  async update(id: string, payload: UpdateEmployeeDto, actorUserId: string) {
    const existing = await this.ensureEmployeeExists(id);

    if (payload.idTypeId !== undefined && payload.idTypeId !== null) {
      await this.ensureIdTypeExists(payload.idTypeId);
    }
    if (payload.localityId !== undefined && payload.localityId !== null) {
      await this.ensureLocalityExists(payload.localityId);
    }

    const gender = await this.resolveGenderOnUpdate(existing, payload);
    const qualification = await this.resolveQualificationOnUpdate(
      existing,
      payload,
    );
    const jobRole = await this.resolveJobRoleOnUpdate(existing, payload);

    try {
      const employee = await this.prisma.employee.update({
        where: {
          id,
        },
        data: {
          jobNumber: payload.jobNumber,
          financialNumber: payload.financialNumber,
          fullName: payload.fullName,
          gender: gender.gender,
          genderId: gender.genderId,
          birthDate: payload.birthDate,
          phonePrimary: payload.phonePrimary,
          phoneSecondary: payload.phoneSecondary,
          hasWhatsapp: payload.hasWhatsapp,
          qualification: qualification.qualification,
          qualificationId: qualification.qualificationId,
          qualificationDate: payload.qualificationDate,
          specialization: payload.specialization,
          idNumber: payload.idNumber,
          idTypeId: payload.idTypeId === null ? null : payload.idTypeId,
          localityId: payload.localityId === null ? null : payload.localityId,
          idExpiryDate: payload.idExpiryDate,
          experienceYears: payload.experienceYears,
          employmentType: payload.employmentType,
          jobTitle: jobRole.jobTitle,
          jobRoleId: jobRole.jobRoleId,
          hireDate: payload.hireDate,
          previousSchool: payload.previousSchool,
          salaryApproved: payload.salaryApproved,
          systemAccessStatus: payload.systemAccessStatus,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: employeeInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'EMPLOYEE_UPDATE',
        resource: 'employees',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return employee;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEmployeeExists(id);

    await this.prisma.employee.update({
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
      action: 'EMPLOYEE_DELETE',
      resource: 'employees',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async ensureEmployeeExistsAndActive(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.isActive) {
      throw new ConflictException('Employee is inactive');
    }

    return employee;
  }

  async ensureEmployeeReadyForAcademicOperations(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
        systemAccessStatus: true,
        userAccount: {
          select: {
            id: true,
            isActive: true,
            deletedAt: true,
            userRoles: {
              where: {
                deletedAt: null,
              },
              select: {
                role: {
                  select: {
                    id: true,
                    isActive: true,
                    deletedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (!employee.isActive) {
      throw new ConflictException('Employee is inactive');
    }

    if (employee.systemAccessStatus === EmployeeSystemAccessStatus.SUSPENDED) {
      throw new ConflictException('Employee system access is suspended');
    }

    if (
      !employee.userAccount ||
      employee.userAccount.deletedAt ||
      !employee.userAccount.isActive
    ) {
      throw new ConflictException(
        'Employee must be linked to an active user account',
      );
    }

    const activeRoleCount = employee.userAccount.userRoles.filter(
      (item) => item.role.isActive && !item.role.deletedAt,
    ).length;

    if (activeRoleCount === 0) {
      throw new ConflictException('Linked user account has no active roles');
    }
  }

  private async ensureEmployeeExists(id: string): Promise<Employee> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  private async ensureIdTypeExists(idTypeId: number) {
    const idType = await this.prisma.lookupIdType.findFirst({
      where: {
        id: idTypeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!idType) {
      throw new BadRequestException('idTypeId is not valid');
    }
  }

  private async ensureLocalityExists(localityId: number) {
    const locality = await this.prisma.locality.findFirst({
      where: {
        id: localityId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!locality) {
      throw new BadRequestException('localityId is not valid');
    }

    if (!locality.isActive) {
      throw new BadRequestException('localityId is inactive');
    }
  }

  private mapLookupGenderCodeToEnum(code: string): EmployeeGender {
    const normalized = code.trim().toUpperCase();

    if (
      normalized !== EmployeeGender.MALE &&
      normalized !== EmployeeGender.FEMALE &&
      normalized !== EmployeeGender.OTHER
    ) {
      throw new BadRequestException(
        `Unsupported lookup gender code for employees: ${code}`,
      );
    }

    return normalized as EmployeeGender;
  }

  private async findGenderLookupByCode(code: string) {
    return this.prisma.lookupGender.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });
  }

  private async ensureGenderLookupExists(genderId: number) {
    const gender = await this.prisma.lookupGender.findFirst({
      where: {
        id: genderId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!gender) {
      throw new BadRequestException('genderId is not valid');
    }

    return gender;
  }

  private async ensureQualificationLookupExists(qualificationId: number) {
    const qualification = await this.prisma.lookupQualification.findFirst({
      where: {
        id: qualificationId,
        deletedAt: null,
      },
      select: {
        id: true,
        nameAr: true,
      },
    });

    if (!qualification) {
      throw new BadRequestException('qualificationId is not valid');
    }

    return qualification;
  }

  private async ensureJobRoleLookupExists(jobRoleId: number) {
    const jobRole = await this.prisma.lookupJobRole.findFirst({
      where: {
        id: jobRoleId,
        deletedAt: null,
      },
      select: {
        id: true,
        nameAr: true,
        nameArFemale: true,
      },
    });

    if (!jobRole) {
      throw new BadRequestException('jobRoleId is not valid');
    }

    return jobRole;
  }

  private async findQualificationLookupByText(raw: string) {
    const normalized = raw.trim();

    if (!normalized) {
      return null;
    }

    return this.prisma.lookupQualification.findFirst({
      where: {
        deletedAt: null,
        OR: [{ code: normalized.toUpperCase() }, { nameAr: normalized }],
      },
      select: {
        id: true,
        nameAr: true,
      },
    });
  }

  private async findJobRoleLookupByText(raw: string) {
    const normalized = raw.trim();

    if (!normalized) {
      return null;
    }

    return this.prisma.lookupJobRole.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { code: normalized.toUpperCase() },
          { nameAr: normalized },
          { nameArFemale: normalized },
        ],
      },
      select: {
        id: true,
        nameAr: true,
        nameArFemale: true,
      },
    });
  }

  private async resolveGenderOnCreate(payload: CreateEmployeeDto) {
    if (payload.genderId !== undefined) {
      const lookup = await this.ensureGenderLookupExists(payload.genderId);
      const mappedGender = this.mapLookupGenderCodeToEnum(lookup.code);

      if (payload.gender && payload.gender !== mappedGender) {
        throw new BadRequestException(
          'gender and genderId do not refer to the same lookup value',
        );
      }

      return {
        gender: payload.gender ?? mappedGender,
        genderId: lookup.id,
      };
    }

    if (!payload.gender) {
      throw new BadRequestException('Either gender or genderId is required');
    }

    const lookup = await this.findGenderLookupByCode(payload.gender);

    return {
      gender: payload.gender,
      genderId: lookup?.id ?? null,
    };
  }

  private async resolveGenderOnUpdate(
    existing: Employee,
    payload: UpdateEmployeeDto,
  ) {
    if (payload.genderId !== undefined) {
      const lookup = await this.ensureGenderLookupExists(payload.genderId);
      const mappedGender = this.mapLookupGenderCodeToEnum(lookup.code);

      if (payload.gender && payload.gender !== mappedGender) {
        throw new BadRequestException(
          'gender and genderId do not refer to the same lookup value',
        );
      }

      return {
        gender: payload.gender ?? mappedGender,
        genderId: lookup.id,
      };
    }

    if (payload.gender !== undefined) {
      const lookup = await this.findGenderLookupByCode(payload.gender);

      return {
        gender: payload.gender,
        genderId: lookup?.id ?? existing.genderId ?? null,
      };
    }

    return {
      gender: existing.gender,
      genderId: existing.genderId ?? null,
    };
  }

  private async resolveQualificationOnCreate(payload: CreateEmployeeDto) {
    if (payload.qualificationId !== undefined) {
      if (payload.qualificationId === null) {
        return {
          qualificationId: null,
          qualification: payload.qualification?.trim() || null,
        };
      }

      const lookup = await this.ensureQualificationLookupExists(
        payload.qualificationId,
      );

      return {
        qualificationId: lookup.id,
        qualification: payload.qualification?.trim() || lookup.nameAr,
      };
    }

    if (!payload.qualification) {
      return {
        qualificationId: null,
        qualification: undefined,
      };
    }

    const matched = await this.findQualificationLookupByText(
      payload.qualification,
    );
    return {
      qualificationId: matched?.id ?? null,
      qualification: payload.qualification.trim(),
    };
  }

  private async resolveQualificationOnUpdate(
    existing: Employee,
    payload: UpdateEmployeeDto,
  ) {
    if (
      payload.qualificationId === undefined &&
      payload.qualification === undefined
    ) {
      return {
        qualificationId: existing.qualificationId ?? null,
        qualification: existing.qualification,
      };
    }

    if (payload.qualificationId !== undefined) {
      if (payload.qualificationId === null) {
        return {
          qualificationId: null,
          qualification:
            payload.qualification?.trim() === ''
              ? null
              : (payload.qualification?.trim() ?? null),
        };
      }

      const lookup = await this.ensureQualificationLookupExists(
        payload.qualificationId,
      );

      return {
        qualificationId: lookup.id,
        qualification: payload.qualification?.trim() || lookup.nameAr,
      };
    }

    const normalized = payload.qualification?.trim();

    if (!normalized) {
      return {
        qualificationId: existing.qualificationId ?? null,
        qualification: null,
      };
    }

    const matched = await this.findQualificationLookupByText(normalized);

    return {
      qualificationId: matched?.id ?? existing.qualificationId ?? null,
      qualification: normalized,
    };
  }

  private async resolveJobRoleOnCreate(payload: CreateEmployeeDto) {
    if (payload.jobRoleId !== undefined) {
      if (payload.jobRoleId === null) {
        return {
          jobRoleId: null,
          jobTitle: payload.jobTitle?.trim() || null,
        };
      }

      const lookup = await this.ensureJobRoleLookupExists(payload.jobRoleId);

      return {
        jobRoleId: lookup.id,
        jobTitle:
          payload.jobTitle?.trim() ||
          lookup.nameAr ||
          lookup.nameArFemale ||
          null,
      };
    }

    if (!payload.jobTitle) {
      return {
        jobRoleId: null,
        jobTitle: undefined,
      };
    }

    const matched = await this.findJobRoleLookupByText(payload.jobTitle);

    return {
      jobRoleId: matched?.id ?? null,
      jobTitle: payload.jobTitle.trim(),
    };
  }

  private async resolveJobRoleOnUpdate(
    existing: Employee,
    payload: UpdateEmployeeDto,
  ) {
    if (payload.jobRoleId === undefined && payload.jobTitle === undefined) {
      return {
        jobRoleId: existing.jobRoleId ?? null,
        jobTitle: existing.jobTitle,
      };
    }

    if (payload.jobRoleId !== undefined) {
      if (payload.jobRoleId === null) {
        return {
          jobRoleId: null,
          jobTitle:
            payload.jobTitle?.trim() === ''
              ? null
              : (payload.jobTitle?.trim() ?? null),
        };
      }

      const lookup = await this.ensureJobRoleLookupExists(payload.jobRoleId);

      return {
        jobRoleId: lookup.id,
        jobTitle:
          payload.jobTitle?.trim() ||
          lookup.nameAr ||
          lookup.nameArFemale ||
          null,
      };
    }

    const normalized = payload.jobTitle?.trim();

    if (!normalized) {
      return {
        jobRoleId: existing.jobRoleId ?? null,
        jobTitle: null,
      };
    }

    const matched = await this.findJobRoleLookupByText(normalized);

    return {
      jobRoleId: matched?.id ?? existing.jobRoleId ?? null,
      jobTitle: normalized,
    };
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Employee job number or financial number must be unique',
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
