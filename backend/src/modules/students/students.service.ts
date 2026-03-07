import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  Prisma,
  Student,
  StudentGender,
  StudentHealthStatus,
  StudentOrphanStatus,
} from '@prisma/client';
import { DataScopeService } from '../data-scope/data-scope.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsDto } from './dto/list-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const studentInclude: Prisma.StudentInclude = {
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
  bloodType: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },
  locality: {
    select: {
      id: true,
      nameAr: true,
      localityType: true,
      isActive: true,
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
  orphanStatusLookup: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      isActive: true,
    },
  },
  healthStatusLookup: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      requiresDetails: true,
      isActive: true,
    },
  },
  guardians: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      relationship: true,
      isPrimary: true,
      guardian: {
        select: {
          id: true,
          fullName: true,
          phonePrimary: true,
          whatsappNumber: true,
          isActive: true,
        },
      },
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  enrollments: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      status: true,
      enrollmentDate: true,
      academicYear: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          isCurrent: true,
        },
      },
      section: {
        select: {
          id: true,
          code: true,
          name: true,
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
    },
    orderBy: [
      {
        academicYear: {
          startDate: 'desc',
        },
      },
      {
        createdAt: 'desc',
      },
    ],
  },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataScopeService: DataScopeService,
  ) {}

  async create(payload: CreateStudentDto, actorUserId: string) {
    const fullName = payload.fullName.trim();
    const admissionNo = payload.admissionNo?.trim().toUpperCase();

    if (payload.bloodTypeId !== undefined && payload.bloodTypeId !== null) {
      await this.ensureBloodTypeExists(payload.bloodTypeId);
    }

    if (payload.localityId !== undefined && payload.localityId !== null) {
      await this.ensureLocalityExists(payload.localityId);
    }

    const gender = await this.resolveGenderOnCreate(payload);
    const healthStatus = await this.resolveHealthStatusOnCreate(payload);
    const orphanStatus = await this.resolveOrphanStatusOnCreate(payload);

    try {
      const student = await this.prisma.student.create({
        data: {
          admissionNo,
          fullName,
          gender: gender.gender,
          genderId: gender.genderId,
          birthDate: payload.birthDate,
          bloodTypeId:
            payload.bloodTypeId === null ? null : payload.bloodTypeId,
          localityId:
            payload.localityId === null ? null : payload.localityId,
          healthStatus: healthStatus.healthStatus,
          healthStatusId: healthStatus.healthStatusId,
          healthNotes: payload.healthNotes,
          orphanStatus: orphanStatus.orphanStatus,
          orphanStatusId: orphanStatus.orphanStatusId,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_CREATE',
        resource: 'students',
        resourceId: student.id,
        details: {
          admissionNo: student.admissionNo,
          fullName: student.fullName,
        },
      });

      return student;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_CREATE_FAILED',
        resource: 'students',
        status: AuditStatus.FAILURE,
        details: {
          admissionNo,
          fullName,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentsDto, actorUserId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentWhereInput = {
      deletedAt: null,
      gender: query.gender,
      genderId: query.genderId,
      bloodTypeId: query.bloodTypeId,
      localityId: query.localityId,
      healthStatus: query.healthStatus,
      healthStatusId: query.healthStatusId,
      orphanStatus: query.orphanStatus,
      orphanStatusId: query.orphanStatusId,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              fullName: {
                contains: query.search,
              },
            },
            {
              admissionNo: {
                contains: query.search,
              },
            },
          ]
        : undefined,
    };

    const scope = await this.dataScopeService.getStudentSectionYearGrants({
      actorUserId,
    });

    if (!scope.isPrivileged) {
      if (scope.grants.length === 0) {
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const scopedEnrollments: Prisma.StudentEnrollmentWhereInput[] =
        scope.grants.map((grant) => ({
          sectionId: grant.sectionId,
          academicYearId: grant.academicYearId,
          deletedAt: null,
          isActive: true,
        }));

      where.AND = [
        {
          enrollments: {
            some: {
              OR: scopedEnrollments,
            },
          },
        },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        include: studentInclude,
        orderBy: [{ createdAt: 'desc' }],
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

  async findOne(id: string, actorUserId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentInclude,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const scope = await this.dataScopeService.getStudentSectionYearGrants({
      actorUserId,
    });
    if (!scope.isPrivileged) {
      const grantSet = new Set(
        scope.grants.map((item) => `${item.sectionId}|${item.academicYearId}`),
      );
      const isAllowed = student.enrollments.some((enrollment) =>
        grantSet.has(`${enrollment.sectionId}|${enrollment.academicYearId}`),
      );

      if (!isAllowed) {
        throw new ForbiddenException(
          'You are not allowed to access this student profile',
        );
      }
    }

    return student;
  }

  async update(id: string, payload: UpdateStudentDto, actorUserId: string) {
    const existing = await this.ensureStudentExists(id);

    if (payload.bloodTypeId !== undefined && payload.bloodTypeId !== null) {
      await this.ensureBloodTypeExists(payload.bloodTypeId);
    }

    if (payload.localityId !== undefined && payload.localityId !== null) {
      await this.ensureLocalityExists(payload.localityId);
    }

    const gender = await this.resolveGenderOnUpdate(existing, payload);
    const healthStatus = await this.resolveHealthStatusOnUpdate(
      existing,
      payload,
    );
    const orphanStatus = await this.resolveOrphanStatusOnUpdate(
      existing,
      payload,
    );

    try {
      const student = await this.prisma.student.update({
        where: {
          id,
        },
        data: {
          admissionNo: payload.admissionNo?.trim().toUpperCase(),
          fullName: payload.fullName?.trim(),
          gender: gender.gender,
          genderId: gender.genderId,
          birthDate: payload.birthDate,
          bloodTypeId:
            payload.bloodTypeId === null ? null : payload.bloodTypeId,
          localityId:
            payload.localityId === null ? null : payload.localityId,
          healthStatus: healthStatus.healthStatus,
          healthStatusId: healthStatus.healthStatusId,
          healthNotes: payload.healthNotes,
          orphanStatus: orphanStatus.orphanStatus,
          orphanStatusId: orphanStatus.orphanStatusId,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_UPDATE',
        resource: 'students',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return student;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureStudentExists(id);

    await this.prisma.student.update({
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
      action: 'STUDENT_DELETE',
      resource: 'students',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  async ensureStudentExistsAndActive(id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!student.isActive) {
      throw new ConflictException('Student is inactive');
    }

    return student;
  }

  private async ensureStudentExists(id: string): Promise<Student> {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private async ensureBloodTypeExists(bloodTypeId: number) {
    const bloodType = await this.prisma.lookupBloodType.findFirst({
      where: {
        id: bloodTypeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!bloodType) {
      throw new BadRequestException('bloodTypeId is not valid');
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

  private mapLookupGenderCodeToEnum(code: string): StudentGender {
    const normalized = code.trim().toUpperCase();

    if (
      normalized !== StudentGender.MALE &&
      normalized !== StudentGender.FEMALE &&
      normalized !== StudentGender.OTHER
    ) {
      throw new BadRequestException(
        `Unsupported lookup gender code for students: ${code}`,
      );
    }

    return normalized as StudentGender;
  }

  private mapLookupOrphanCodeToEnum(code: string): StudentOrphanStatus {
    const normalized = code.trim().toUpperCase();

    if (
      normalized !== StudentOrphanStatus.NONE &&
      normalized !== StudentOrphanStatus.FATHER_DECEASED &&
      normalized !== StudentOrphanStatus.MOTHER_DECEASED &&
      normalized !== StudentOrphanStatus.BOTH_DECEASED
    ) {
      throw new BadRequestException(
        `Unsupported lookup orphan status code for students: ${code}`,
      );
    }

    return normalized as StudentOrphanStatus;
  }

  private mapLookupHealthCodeToEnum(code: string): StudentHealthStatus {
    const normalized = code.trim().toUpperCase();

    if (
      normalized === StudentHealthStatus.HEALTHY ||
      normalized === StudentHealthStatus.CHRONIC_DISEASE ||
      normalized === StudentHealthStatus.SPECIAL_NEEDS ||
      normalized === StudentHealthStatus.DISABILITY ||
      normalized === StudentHealthStatus.OTHER
    ) {
      return normalized as StudentHealthStatus;
    }

    // Legacy compatibility for older lookup codes.
    if (normalized === 'SICK') {
      return StudentHealthStatus.CHRONIC_DISEASE;
    }

    if (normalized === 'DISABLED') {
      return StudentHealthStatus.DISABILITY;
    }

    throw new BadRequestException(
      `Unsupported lookup health status code for students: ${code}`,
    );
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

  private async findOrphanStatusLookupByCode(code: string) {
    return this.prisma.lookupOrphanStatus.findFirst({
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

  private async findHealthStatusLookupByCode(code: string) {
    return this.prisma.lookupHealthStatus.findFirst({
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

  private async ensureOrphanStatusLookupExists(orphanStatusId: number) {
    const orphanStatus = await this.prisma.lookupOrphanStatus.findFirst({
      where: {
        id: orphanStatusId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!orphanStatus) {
      throw new BadRequestException('orphanStatusId is not valid');
    }

    return orphanStatus;
  }

  private async ensureHealthStatusLookupExists(healthStatusId: number) {
    const healthStatus = await this.prisma.lookupHealthStatus.findFirst({
      where: {
        id: healthStatusId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (!healthStatus) {
      throw new BadRequestException('healthStatusId is not valid');
    }

    return healthStatus;
  }

  private async resolveGenderOnCreate(payload: CreateStudentDto) {
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

  private async resolveHealthStatusOnCreate(payload: CreateStudentDto) {
    if (payload.healthStatusId !== undefined) {
      const lookup = await this.ensureHealthStatusLookupExists(
        payload.healthStatusId,
      );
      const mappedHealthStatus = this.mapLookupHealthCodeToEnum(lookup.code);

      if (payload.healthStatus && payload.healthStatus !== mappedHealthStatus) {
        throw new BadRequestException(
          'healthStatus and healthStatusId do not refer to the same lookup value',
        );
      }

      return {
        healthStatus: payload.healthStatus ?? mappedHealthStatus,
        healthStatusId: lookup.id,
      };
    }

    if (!payload.healthStatus) {
      return {
        healthStatus: undefined,
        healthStatusId: null,
      };
    }

    const lookup = await this.findHealthStatusLookupByCode(
      payload.healthStatus,
    );
    return {
      healthStatus: payload.healthStatus,
      healthStatusId: lookup?.id ?? null,
    };
  }

  private async resolveGenderOnUpdate(
    existing: Student,
    payload: UpdateStudentDto,
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

  private async resolveHealthStatusOnUpdate(
    existing: Student,
    payload: UpdateStudentDto,
  ) {
    if (payload.healthStatusId !== undefined) {
      const lookup = await this.ensureHealthStatusLookupExists(
        payload.healthStatusId,
      );
      const mappedHealthStatus = this.mapLookupHealthCodeToEnum(lookup.code);

      if (payload.healthStatus && payload.healthStatus !== mappedHealthStatus) {
        throw new BadRequestException(
          'healthStatus and healthStatusId do not refer to the same lookup value',
        );
      }

      return {
        healthStatus: payload.healthStatus ?? mappedHealthStatus,
        healthStatusId: lookup.id,
      };
    }

    if (payload.healthStatus !== undefined) {
      const lookup = await this.findHealthStatusLookupByCode(
        payload.healthStatus,
      );

      return {
        healthStatus: payload.healthStatus,
        healthStatusId: lookup?.id ?? existing.healthStatusId ?? null,
      };
    }

    return {
      healthStatus: existing.healthStatus,
      healthStatusId: existing.healthStatusId ?? null,
    };
  }

  private async resolveOrphanStatusOnCreate(payload: CreateStudentDto) {
    if (payload.orphanStatusId !== undefined) {
      const lookup = await this.ensureOrphanStatusLookupExists(
        payload.orphanStatusId,
      );
      const mappedOrphanStatus = this.mapLookupOrphanCodeToEnum(lookup.code);

      if (payload.orphanStatus && payload.orphanStatus !== mappedOrphanStatus) {
        throw new BadRequestException(
          'orphanStatus and orphanStatusId do not refer to the same lookup value',
        );
      }

      return {
        orphanStatus: payload.orphanStatus ?? mappedOrphanStatus,
        orphanStatusId: lookup.id,
      };
    }

    if (payload.orphanStatus) {
      const lookup = await this.findOrphanStatusLookupByCode(
        payload.orphanStatus,
      );
      return {
        orphanStatus: payload.orphanStatus,
        orphanStatusId: lookup?.id ?? null,
      };
    }

    const fallbackLookup = await this.findOrphanStatusLookupByCode(
      StudentOrphanStatus.NONE,
    );
    return {
      orphanStatus: StudentOrphanStatus.NONE,
      orphanStatusId: fallbackLookup?.id ?? null,
    };
  }

  private async resolveOrphanStatusOnUpdate(
    existing: Student,
    payload: UpdateStudentDto,
  ) {
    if (payload.orphanStatusId !== undefined) {
      const lookup = await this.ensureOrphanStatusLookupExists(
        payload.orphanStatusId,
      );
      const mappedOrphanStatus = this.mapLookupOrphanCodeToEnum(lookup.code);

      if (payload.orphanStatus && payload.orphanStatus !== mappedOrphanStatus) {
        throw new BadRequestException(
          'orphanStatus and orphanStatusId do not refer to the same lookup value',
        );
      }

      return {
        orphanStatus: payload.orphanStatus ?? mappedOrphanStatus,
        orphanStatusId: lookup.id,
      };
    }

    if (payload.orphanStatus !== undefined) {
      const lookup = await this.findOrphanStatusLookupByCode(
        payload.orphanStatus,
      );
      return {
        orphanStatus: payload.orphanStatus,
        orphanStatusId: lookup?.id ?? existing.orphanStatusId ?? null,
      };
    }

    return {
      orphanStatus: existing.orphanStatus,
      orphanStatusId: existing.orphanStatusId ?? null,
    };
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Student admission number must be unique');
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
