import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  GuardianRelationship,
  Prisma,
  StudentGuardian,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { GuardiansService } from '../guardians/guardians.service';
import { StudentsService } from '../students/students.service';
import { CreateStudentGuardianDto } from './dto/create-student-guardian.dto';
import { ListStudentGuardiansDto } from './dto/list-student-guardians.dto';
import { UpdateStudentGuardianDto } from './dto/update-student-guardian.dto';

type DateInput = string | Date | null | undefined;

const studentGuardianInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
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
  relationshipTypeLookup: {
    select: {
      id: true,
      code: true,
      nameAr: true,
      gender: true,
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
export class StudentGuardiansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentsService: StudentsService,
    private readonly guardiansService: GuardiansService,
  ) {}

  async create(payload: CreateStudentGuardianDto, actorUserId: string) {
    await this.studentsService.ensureStudentExistsAndActive(payload.studentId);
    await this.guardiansService.ensureGuardianExistsAndActive(
      payload.guardianId,
    );
    this.ensureDateRange(payload.startDate, payload.endDate);
    const relationship = await this.resolveRelationshipOnCreate(payload);

    try {
      const studentGuardian = await this.prisma.$transaction(async (tx) => {
        if (payload.isPrimary) {
          await tx.studentGuardian.updateMany({
            where: {
              studentId: payload.studentId,
              deletedAt: null,
              isPrimary: true,
            },
            data: {
              isPrimary: false,
              updatedById: actorUserId,
            },
          });
        }

        return tx.studentGuardian.create({
          data: {
            studentId: payload.studentId,
            guardianId: payload.guardianId,
            relationship: relationship.relationship,
            relationshipTypeId: relationship.relationshipTypeId,
            isPrimary: payload.isPrimary ?? false,
            canReceiveNotifications: payload.canReceiveNotifications ?? true,
            canPickup: payload.canPickup ?? true,
            startDate: payload.startDate,
            endDate: payload.endDate,
            notes: payload.notes,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: studentGuardianInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_GUARDIAN_CREATE',
        resource: 'student-guardians',
        resourceId: studentGuardian.id,
        details: {
          studentId: studentGuardian.studentId,
          guardianId: studentGuardian.guardianId,
          relationship: studentGuardian.relationship,
          relationshipTypeId: studentGuardian.relationshipTypeId,
          isPrimary: studentGuardian.isPrimary,
        },
      });

      return studentGuardian;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_GUARDIAN_CREATE_FAILED',
        resource: 'student-guardians',
        status: AuditStatus.FAILURE,
        details: {
          studentId: payload.studentId,
          guardianId: payload.guardianId,
          relationship: payload.relationship,
          relationshipTypeId: payload.relationshipTypeId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentGuardiansDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentGuardianWhereInput = {
      deletedAt: null,
      studentId: query.studentId,
      guardianId: query.guardianId,
      relationship: query.relationship,
      relationshipTypeId: query.relationshipTypeId,
      isPrimary: query.isPrimary,
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
              guardian: {
                fullName: {
                  contains: query.search,
                },
              },
            },
            {
              guardian: {
                phonePrimary: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentGuardian.count({ where }),
      this.prisma.studentGuardian.findMany({
        where,
        include: studentGuardianInclude,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
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
    const studentGuardian = await this.prisma.studentGuardian.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentGuardianInclude,
    });

    if (!studentGuardian) {
      throw new NotFoundException('Student guardian relation not found');
    }

    return studentGuardian;
  }

  async update(
    id: string,
    payload: UpdateStudentGuardianDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureStudentGuardianExists(id);

    const resolvedStudentId = payload.studentId ?? existing.studentId;
    const resolvedGuardianId = payload.guardianId ?? existing.guardianId;
    const relationship = await this.resolveRelationshipOnUpdate(
      existing,
      payload,
    );
    const resolvedStartDate = payload.startDate ?? existing.startDate;
    const resolvedEndDate = payload.endDate ?? existing.endDate;

    await this.studentsService.ensureStudentExistsAndActive(resolvedStudentId);
    await this.guardiansService.ensureGuardianExistsAndActive(
      resolvedGuardianId,
    );
    this.ensureDateRange(resolvedStartDate, resolvedEndDate);

    try {
      const studentGuardian = await this.prisma.$transaction(async (tx) => {
        if (payload.isPrimary) {
          await tx.studentGuardian.updateMany({
            where: {
              studentId: resolvedStudentId,
              deletedAt: null,
              isPrimary: true,
              id: {
                not: id,
              },
            },
            data: {
              isPrimary: false,
              updatedById: actorUserId,
            },
          });
        }

        return tx.studentGuardian.update({
          where: {
            id,
          },
          data: {
            studentId: payload.studentId,
            guardianId: payload.guardianId,
            relationship: relationship.relationship,
            relationshipTypeId: relationship.relationshipTypeId,
            isPrimary: payload.isPrimary,
            canReceiveNotifications: payload.canReceiveNotifications,
            canPickup: payload.canPickup,
            startDate: payload.startDate,
            endDate: payload.endDate,
            notes: payload.notes,
            isActive: payload.isActive,
            updatedById: actorUserId,
          },
          include: studentGuardianInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_GUARDIAN_UPDATE',
        resource: 'student-guardians',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return studentGuardian;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureStudentGuardianExists(id);

    await this.prisma.studentGuardian.update({
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
      action: 'STUDENT_GUARDIAN_DELETE',
      resource: 'student-guardians',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureStudentGuardianExists(
    id: string,
  ): Promise<StudentGuardian> {
    const studentGuardian = await this.prisma.studentGuardian.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!studentGuardian) {
      throw new NotFoundException('Student guardian relation not found');
    }

    return studentGuardian;
  }

  private mapLookupRelationshipCodeToEnum(code: string): GuardianRelationship {
    const normalized = code.trim().toUpperCase();

    if (
      normalized === GuardianRelationship.FATHER ||
      normalized === GuardianRelationship.MOTHER ||
      normalized === GuardianRelationship.BROTHER ||
      normalized === GuardianRelationship.SISTER ||
      normalized === GuardianRelationship.UNCLE ||
      normalized === GuardianRelationship.AUNT ||
      normalized === GuardianRelationship.GRANDFATHER ||
      normalized === GuardianRelationship.GRANDMOTHER ||
      normalized === GuardianRelationship.OTHER
    ) {
      return normalized as GuardianRelationship;
    }

    if (normalized === 'UNCLE_PATERNAL' || normalized === 'UNCLE_MATERNAL') {
      return GuardianRelationship.UNCLE;
    }

    if (normalized === 'AUNT_PATERNAL' || normalized === 'AUNT_MATERNAL') {
      return GuardianRelationship.AUNT;
    }

    if (normalized === 'GUARDIAN') {
      return GuardianRelationship.OTHER;
    }

    throw new BadRequestException(
      `Unsupported lookup relationship type code for student guardians: ${code}`,
    );
  }

  private getRelationshipLookupCandidates(
    relationship: GuardianRelationship,
  ): string[] {
    switch (relationship) {
      case GuardianRelationship.UNCLE:
        return ['UNCLE', 'UNCLE_PATERNAL', 'UNCLE_MATERNAL'];
      case GuardianRelationship.AUNT:
        return ['AUNT', 'AUNT_PATERNAL', 'AUNT_MATERNAL'];
      case GuardianRelationship.OTHER:
        return ['OTHER', 'GUARDIAN'];
      default:
        return [relationship];
    }
  }

  private async findRelationshipLookupByEnum(
    relationship: GuardianRelationship,
  ) {
    const candidates = this.getRelationshipLookupCandidates(relationship);
    const items = await this.prisma.lookupRelationshipType.findMany({
      where: {
        code: {
          in: candidates,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
      },
    });

    if (items.length === 0) {
      return null;
    }

    const order = new Map(candidates.map((code, index) => [code, index]));
    items.sort(
      (a, b) => (order.get(a.code) ?? 999) - (order.get(b.code) ?? 999),
    );

    return items[0] ?? null;
  }

  private async ensureRelationshipLookupExists(relationshipTypeId: number) {
    const relationshipType = await this.prisma.lookupRelationshipType.findFirst(
      {
        where: {
          id: relationshipTypeId,
          deletedAt: null,
        },
        select: {
          id: true,
          code: true,
        },
      },
    );

    if (!relationshipType) {
      throw new BadRequestException('relationshipTypeId is not valid');
    }

    return relationshipType;
  }

  private async resolveRelationshipOnCreate(payload: CreateStudentGuardianDto) {
    if (payload.relationshipTypeId !== undefined) {
      const lookup = await this.ensureRelationshipLookupExists(
        payload.relationshipTypeId,
      );
      const mappedRelationship = this.mapLookupRelationshipCodeToEnum(
        lookup.code,
      );

      if (payload.relationship && payload.relationship !== mappedRelationship) {
        throw new BadRequestException(
          'relationship and relationshipTypeId do not refer to the same lookup value',
        );
      }

      return {
        relationship: payload.relationship ?? mappedRelationship,
        relationshipTypeId: lookup.id,
      };
    }

    if (!payload.relationship) {
      throw new BadRequestException(
        'Either relationship or relationshipTypeId is required',
      );
    }

    const lookup = await this.findRelationshipLookupByEnum(
      payload.relationship,
    );

    return {
      relationship: payload.relationship,
      relationshipTypeId: lookup?.id ?? null,
    };
  }

  private async resolveRelationshipOnUpdate(
    existing: StudentGuardian,
    payload: UpdateStudentGuardianDto,
  ) {
    if (payload.relationshipTypeId !== undefined) {
      const lookup = await this.ensureRelationshipLookupExists(
        payload.relationshipTypeId,
      );
      const mappedRelationship = this.mapLookupRelationshipCodeToEnum(
        lookup.code,
      );

      if (payload.relationship && payload.relationship !== mappedRelationship) {
        throw new BadRequestException(
          'relationship and relationshipTypeId do not refer to the same lookup value',
        );
      }

      return {
        relationship: payload.relationship ?? mappedRelationship,
        relationshipTypeId: lookup.id,
      };
    }

    if (payload.relationship !== undefined) {
      const lookup = await this.findRelationshipLookupByEnum(
        payload.relationship,
      );
      return {
        relationship: payload.relationship,
        relationshipTypeId: lookup?.id ?? existing.relationshipTypeId ?? null,
      };
    }

    return {
      relationship: existing.relationship,
      relationshipTypeId: existing.relationshipTypeId ?? null,
    };
  }

  private ensureDateRange(startDate?: DateInput, endDate?: DateInput) {
    const normalizedStartDate = this.parseDate(startDate);
    const normalizedEndDate = this.parseDate(endDate);

    if (!normalizedStartDate || !normalizedEndDate) {
      return;
    }

    if (normalizedStartDate.getTime() > normalizedEndDate.getTime()) {
      throw new BadRequestException('startDate must be before endDate');
    }
  }

  private parseDate(value?: DateInput): Date | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return parsedDate;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Student-guardian relationship must be unique per relationship type',
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
