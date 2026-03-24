import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  EnrollmentDistributionStatus,
  Prisma,
  StudentEnrollment,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StudentsService } from '../students/students.service';
import {
  formatYearlyEnrollmentNo,
  parseYearlyEnrollmentNoSequence,
} from '../../common/utils/student-numbering';
import { AutoDistributeStudentEnrollmentsDto } from './dto/auto-distribute-student-enrollments.dto';
import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto';
import { ListStudentEnrollmentsDto } from './dto/list-student-enrollments.dto';
import { ManualDistributeStudentEnrollmentsDto } from './dto/manual-distribute-student-enrollments.dto';
import { ReturnStudentEnrollmentsToPendingDto } from './dto/return-student-enrollments-to-pending.dto';
import { StudentEnrollmentDistributionBoardDto } from './dto/student-enrollment-distribution-board.dto';
import { TransferStudentEnrollmentsDto } from './dto/transfer-student-enrollments.dto';
import { UpdateStudentEnrollmentDto } from './dto/update-student-enrollment.dto';

const studentEnrollmentInclude = {
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
      isActive: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      startDate: true,
      status: true,
      isCurrent: true,
    },
  },
  gradeLevel: {
    select: {
      id: true,
      code: true,
      name: true,
      stage: true,
      sequence: true,
    },
  },
  section: {
    select: {
      id: true,
      code: true,
      name: true,
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

const distributionBoardEnrollmentSelect = {
  id: true,
  studentId: true,
  academicYearId: true,
  gradeLevelId: true,
  sectionId: true,
  yearlyEnrollmentNo: true,
  distributionStatus: true,
  status: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      admissionNo: true,
      fullName: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  gradeLevel: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
    },
  },
  section: {
    select: {
      id: true,
      code: true,
      name: true,
      capacity: true,
    },
  },
} as const;

@Injectable()
export class StudentEnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly studentsService: StudentsService,
  ) {}

  async create(payload: CreateStudentEnrollmentDto, actorUserId: string) {
    try {
      await this.studentsService.ensureStudentExistsAndActive(
        payload.studentId,
      );
      const academicYear = await this.ensureAcademicYearExists(
        payload.academicYearId,
      );
      const providedSectionId = this.normalizeOptionalId(payload.sectionId);
      const providedGradeLevelId = this.normalizeOptionalId(payload.gradeLevelId);
      let resolvedDistributionStatus =
        payload.distributionStatus ??
        (providedSectionId
          ? EnrollmentDistributionStatus.ASSIGNED
          : EnrollmentDistributionStatus.PENDING_DISTRIBUTION);

      if (
        providedSectionId &&
        resolvedDistributionStatus ===
          EnrollmentDistributionStatus.PENDING_DISTRIBUTION
      ) {
        resolvedDistributionStatus = EnrollmentDistributionStatus.ASSIGNED;
      }

      if (
        !providedSectionId &&
        resolvedDistributionStatus !== EnrollmentDistributionStatus.PENDING_DISTRIBUTION
      ) {
        throw new BadRequestException(
          'Section-less enrollment must start with pending distribution',
        );
      }

      let resolvedGradeLevelId = '';
      let gradeSnapshot = '';
      let sectionSnapshot: string | null = null;

      if (providedSectionId) {
        const section = await this.ensureSectionExistsAndActive(providedSectionId);
        await this.ensureSectionHasCapacity(
          providedSectionId,
          payload.academicYearId,
        );

        if (
          providedGradeLevelId &&
          providedGradeLevelId !== section.gradeLevel.id
        ) {
          throw new BadRequestException(
            'Selected section does not belong to the provided grade level',
          );
        }

        resolvedGradeLevelId = providedGradeLevelId ?? section.gradeLevel.id;
        gradeSnapshot = section.gradeLevel.name;
        sectionSnapshot = section.name;
      } else {
        if (!providedGradeLevelId) {
          throw new BadRequestException(
            'Grade level is required when creating an enrollment without a section',
          );
        }

        const gradeLevel = await this.ensureGradeLevelExistsAndActive(
          providedGradeLevelId,
        );
        resolvedGradeLevelId = gradeLevel.id;
        gradeSnapshot = gradeLevel.name;
      }

      const enrollment = await this.prisma.$transaction(async (tx) => {
        const yearlyEnrollmentNo = await this.generateYearlyEnrollmentNo(
          tx,
          academicYear.startDate,
          academicYear.id,
        );

        return tx.studentEnrollment.create({
          data: {
            studentId: payload.studentId,
            academicYearId: payload.academicYearId,
            gradeLevelId: resolvedGradeLevelId,
            sectionId: providedSectionId ?? null,
            yearlyEnrollmentNo,
            distributionStatus: resolvedDistributionStatus,
            gradeNameSnapshot: gradeSnapshot,
            sectionNameSnapshot: sectionSnapshot,
            enrollmentDate: payload.enrollmentDate,
            status: payload.status,
            notes: payload.notes,
            isActive: payload.isActive ?? true,
            createdById: actorUserId,
            updatedById: actorUserId,
          },
          include: studentEnrollmentInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ENROLLMENT_CREATE',
        resource: 'student-enrollments',
        resourceId: enrollment.id,
        details: {
          studentId: enrollment.studentId,
          academicYearId: enrollment.academicYearId,
          gradeLevelId: enrollment.gradeLevelId,
          sectionId: enrollment.sectionId,
          yearlyEnrollmentNo: enrollment.yearlyEnrollmentNo,
          distributionStatus: enrollment.distributionStatus,
          status: enrollment.status,
        },
      });

      return enrollment;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ENROLLMENT_CREATE_FAILED',
        resource: 'student-enrollments',
        status: AuditStatus.FAILURE,
        details: {
          studentId: payload.studentId,
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          sectionId: payload.sectionId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentEnrollmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentEnrollmentWhereInput = {
      deletedAt: null,
      studentId: query.studentId,
      academicYearId: query.academicYearId,
      gradeLevelId: query.gradeLevelId,
      sectionId: query.sectionId,
      distributionStatus: query.distributionStatus,
      status: query.status,
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
              yearlyEnrollmentNo: {
                contains: query.search,
              },
            },
            {
              gradeLevel: {
                code: {
                  contains: query.search,
                },
              },
            },
            {
              gradeLevel: {
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
              section: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              academicYear: {
                code: {
                  contains: query.search,
                },
              },
            },
            {
              academicYear: {
                name: {
                  contains: query.search,
                },
              },
            },
          ]
        : undefined,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.studentEnrollment.count({ where }),
      this.prisma.studentEnrollment.findMany({
        where,
        include: studentEnrollmentInclude,
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
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentEnrollmentInclude,
    });

    if (!enrollment) {
      throw new NotFoundException('Student enrollment not found');
    }

    return enrollment;
  }

  async getDistributionBoard(query: StudentEnrollmentDistributionBoardDto) {
    const search = query.search?.trim();
    const limit = query.limit ?? 200;

    await this.ensureAcademicYearExists(query.academicYearId);
    await this.ensureGradeLevelExistsAndActive(query.gradeLevelId);

    const baseWhere: Prisma.StudentEnrollmentWhereInput = {
      deletedAt: null,
      isActive: true,
      academicYearId: query.academicYearId,
      gradeLevelId: query.gradeLevelId,
      OR: this.buildDistributionSearchWhere(search),
    };

    const pendingWhere: Prisma.StudentEnrollmentWhereInput = {
      ...baseWhere,
      distributionStatus: EnrollmentDistributionStatus.PENDING_DISTRIBUTION,
    };

    const assignedWhere: Prisma.StudentEnrollmentWhereInput = {
      ...baseWhere,
      sectionId: {
        not: null,
      },
      distributionStatus: {
        in: [
          EnrollmentDistributionStatus.ASSIGNED,
          EnrollmentDistributionStatus.TRANSFERRED,
        ],
      },
    };

    const [sections, sectionOccupancyRows, pendingCount, assignedCount, pendingEnrollments, assignedEnrollments] =
      await this.prisma.$transaction([
        this.prisma.section.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            gradeLevelId: query.gradeLevelId,
          },
          select: {
            id: true,
            code: true,
            name: true,
            capacity: true,
          },
          orderBy: [{ code: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.studentEnrollment.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            academicYearId: query.academicYearId,
            gradeLevelId: query.gradeLevelId,
            sectionId: {
              not: null,
            },
          },
          select: {
            sectionId: true,
          },
        }),
        this.prisma.studentEnrollment.count({
          where: pendingWhere,
        }),
        this.prisma.studentEnrollment.count({
          where: assignedWhere,
        }),
        this.prisma.studentEnrollment.findMany({
          where: pendingWhere,
          select: distributionBoardEnrollmentSelect,
          orderBy: [
            {
              student: {
                fullName: 'asc',
              },
            },
            {
              createdAt: 'asc',
            },
          ],
          take: limit,
        }),
        this.prisma.studentEnrollment.findMany({
          where: assignedWhere,
          select: distributionBoardEnrollmentSelect,
          orderBy: [
            {
              section: {
                code: 'asc',
              },
            },
            {
              student: {
                fullName: 'asc',
              },
            },
          ],
          take: limit,
        }),
      ]);

    const sectionOccupancy = new Map<string, number>();
    for (const row of sectionOccupancyRows) {
      if (!row.sectionId) {
        continue;
      }

      sectionOccupancy.set(
        row.sectionId,
        (sectionOccupancy.get(row.sectionId) ?? 0) + 1,
      );
    }

    return {
      summary: {
        pendingCount,
        assignedCount,
        totalCount: pendingCount + assignedCount,
      },
      sections: sections.map((section) => {
        const assignedCountForSection = sectionOccupancy.get(section.id) ?? 0;
        return {
          ...section,
          assignedCount: assignedCountForSection,
          availableSeats:
            section.capacity === null
              ? null
              : Math.max(section.capacity - assignedCountForSection, 0),
        };
      }),
      pendingEnrollments,
      assignedEnrollments,
    };
  }

  async autoDistribute(
    payload: AutoDistributeStudentEnrollmentsDto,
    actorUserId: string,
  ) {
    const limit = payload.limit ?? 300;
    const requestedSectionIds = Array.from(
      new Set(
        (payload.sectionIds ?? [])
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );

    await this.ensureAcademicYearExists(payload.academicYearId);
    const gradeLevel = await this.ensureGradeLevelExistsAndActive(
      payload.gradeLevelId,
    );

    const [sections, pendingEnrollments, occupancyRows] = await this.prisma.$transaction([
      this.prisma.section.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          gradeLevelId: payload.gradeLevelId,
          id:
            requestedSectionIds.length > 0
              ? {
                  in: requestedSectionIds,
                }
              : undefined,
        },
        select: {
          id: true,
          code: true,
          name: true,
          capacity: true,
        },
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.studentEnrollment.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          distributionStatus: EnrollmentDistributionStatus.PENDING_DISTRIBUTION,
        },
        select: {
          id: true,
          sectionId: true,
          student: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: [
          {
            student: {
              fullName: 'asc',
            },
          },
          {
            createdAt: 'asc',
          },
        ],
        take: limit,
      }),
      this.prisma.studentEnrollment.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          sectionId:
            requestedSectionIds.length > 0
              ? {
                  in: requestedSectionIds,
                }
              : {
                  not: null,
                },
        },
        select: {
          sectionId: true,
        },
      }),
    ]);

    if (
      requestedSectionIds.length > 0 &&
      sections.length !== requestedSectionIds.length
    ) {
      throw new BadRequestException('One or more selected sections are invalid');
    }

    if (sections.length === 0) {
      throw new BadRequestException('لا توجد شعب نشطة متاحة لهذا الصف');
    }

    const occupancy = new Map<string, number>();
    for (const row of occupancyRows) {
      if (!row.sectionId) {
        continue;
      }

      occupancy.set(row.sectionId, (occupancy.get(row.sectionId) ?? 0) + 1);
    }

    const assignments: Array<{
      enrollmentId: string;
      sectionId: string;
      sectionName: string;
    }> = [];
    const skippedEnrollmentIds: string[] = [];
    let pointer = 0;

    for (const enrollment of pendingEnrollments) {
      const section = this.pickNextAvailableSection(sections, occupancy, pointer);
      if (!section) {
        skippedEnrollmentIds.push(enrollment.id);
        continue;
      }

      assignments.push({
        enrollmentId: enrollment.id,
        sectionId: section.id,
        sectionName: section.name,
      });
      occupancy.set(section.id, (occupancy.get(section.id) ?? 0) + 1);
      pointer = (sections.findIndex((item) => item.id === section.id) + 1) % sections.length;
    }

    if (assignments.length > 0) {
      await this.prisma.$transaction(
        assignments.map((assignment) =>
          this.prisma.studentEnrollment.update({
            where: {
              id: assignment.enrollmentId,
            },
            data: {
              sectionId: assignment.sectionId,
              distributionStatus: EnrollmentDistributionStatus.ASSIGNED,
              gradeLevelId: gradeLevel.id,
              gradeNameSnapshot: gradeLevel.name,
              sectionNameSnapshot: assignment.sectionName,
              updatedById: actorUserId,
            },
          }),
        ),
      );
    }

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_ENROLLMENT_AUTO_DISTRIBUTE',
      resource: 'student-enrollments',
      details: {
        academicYearId: payload.academicYearId,
        gradeLevelId: payload.gradeLevelId,
        sectionIds: sections.map((section) => section.id),
        assignedCount: assignments.length,
        skippedCount: skippedEnrollmentIds.length,
      },
    });

    return {
      assignedCount: assignments.length,
      skippedCount: skippedEnrollmentIds.length,
      skippedEnrollmentIds,
      sections: sections.map((section) => ({
        id: section.id,
        code: section.code,
        name: section.name,
        capacity: section.capacity,
        assignedCount: occupancy.get(section.id) ?? 0,
      })),
    };
  }

  async manualDistribute(
    payload: ManualDistributeStudentEnrollmentsDto,
    actorUserId: string,
  ) {
    const assignments = payload.assignments.map((assignment) => ({
      enrollmentId: assignment.enrollmentId.trim(),
      sectionId: assignment.sectionId.trim(),
    }));

    const enrollmentIds = Array.from(
      new Set(assignments.map((assignment) => assignment.enrollmentId)),
    );
    const sectionIds = Array.from(
      new Set(assignments.map((assignment) => assignment.sectionId)),
    );

    if (enrollmentIds.length !== assignments.length) {
      throw new BadRequestException('Duplicate enrollment assignments are not allowed');
    }

    await this.ensureAcademicYearExists(payload.academicYearId);
    const gradeLevel = await this.ensureGradeLevelExistsAndActive(
      payload.gradeLevelId,
    );

    const [sections, enrollments, occupancyRows] = await this.prisma.$transaction([
      this.prisma.section.findMany({
        where: {
          id: {
            in: sectionIds,
          },
          deletedAt: null,
          isActive: true,
          gradeLevelId: payload.gradeLevelId,
        },
        select: {
          id: true,
          code: true,
          name: true,
          capacity: true,
        },
      }),
      this.prisma.studentEnrollment.findMany({
        where: {
          id: {
            in: enrollmentIds,
          },
          deletedAt: null,
          isActive: true,
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
        },
        select: {
          id: true,
          sectionId: true,
          distributionStatus: true,
        },
      }),
      this.prisma.studentEnrollment.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          sectionId: {
            in: sectionIds,
          },
        },
        select: {
          sectionId: true,
        },
      }),
    ]);

    if (sections.length !== sectionIds.length) {
      throw new BadRequestException('One or more selected sections are invalid');
    }

    if (enrollments.length !== enrollmentIds.length) {
      throw new BadRequestException('One or more selected enrollments are invalid');
    }

    const sectionMap = new Map(sections.map((section) => [section.id, section]));
    const enrollmentMap = new Map(
      enrollments.map((enrollment) => [enrollment.id, enrollment]),
    );
    const occupancy = new Map<string, number>();
    for (const row of occupancyRows) {
      if (!row.sectionId) {
        continue;
      }

      occupancy.set(row.sectionId, (occupancy.get(row.sectionId) ?? 0) + 1);
    }

    for (const assignment of assignments) {
      const enrollment = enrollmentMap.get(assignment.enrollmentId);
      const section = sectionMap.get(assignment.sectionId);

      if (!enrollment || !section) {
        throw new BadRequestException('تعذر التحقق من بيانات التوزيع اليدوي');
      }

      if (enrollment.sectionId) {
        occupancy.set(
          enrollment.sectionId,
          Math.max((occupancy.get(enrollment.sectionId) ?? 1) - 1, 0),
        );
      }

      const targetCount = occupancy.get(section.id) ?? 0;
      if (section.capacity !== null && targetCount >= section.capacity) {
        throw new BadRequestException(
          `الشعبة ${section.name} (${section.code}) وصلت إلى السعة القصوى`,
        );
      }

      occupancy.set(section.id, targetCount + 1);
    }

    await this.prisma.$transaction(
      assignments.map((assignment) => {
        const section = sectionMap.get(assignment.sectionId)!;
        const enrollment = enrollmentMap.get(assignment.enrollmentId)!;
        const distributionStatus =
          enrollment.sectionId && enrollment.sectionId !== section.id
            ? EnrollmentDistributionStatus.TRANSFERRED
            : EnrollmentDistributionStatus.ASSIGNED;

        return this.prisma.studentEnrollment.update({
          where: {
            id: assignment.enrollmentId,
          },
          data: {
            sectionId: section.id,
            distributionStatus,
            gradeLevelId: gradeLevel.id,
            gradeNameSnapshot: gradeLevel.name,
            sectionNameSnapshot: section.name,
            updatedById: actorUserId,
          },
        });
      }),
    );

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_ENROLLMENT_MANUAL_DISTRIBUTE',
      resource: 'student-enrollments',
      details: {
        academicYearId: payload.academicYearId,
        gradeLevelId: payload.gradeLevelId,
        assignmentsCount: assignments.length,
      },
    });

    return {
      success: true,
      assignedCount: assignments.length,
    };
  }

  async transferSectionEnrollments(
    payload: TransferStudentEnrollmentsDto,
    actorUserId: string,
  ) {
    const rawEnrollmentIds = payload.enrollments?.map(
      (item) => item.enrollmentId,
    );
    const enrollmentIds = this.normalizeEnrollmentIds(
      rawEnrollmentIds,
    );

    if (
      rawEnrollmentIds &&
      enrollmentIds.length !== rawEnrollmentIds.length
    ) {
      throw new BadRequestException(
        'Duplicate enrollment IDs are not allowed in transfer requests',
      );
    }

    if (payload.sourceSectionId.trim() === payload.targetSectionId.trim()) {
      throw new BadRequestException(
        'Source section and target section must be different',
      );
    }

    await this.ensureAcademicYearExists(payload.academicYearId);
    const gradeLevel = await this.ensureGradeLevelExistsAndActive(
      payload.gradeLevelId,
    );
    const sourceSection = await this.ensureSectionExistsAndActive(
      payload.sourceSectionId,
    );
    const targetSection = await this.ensureSectionExistsAndActive(
      payload.targetSectionId,
    );

    if (sourceSection.gradeLevel.id !== gradeLevel.id) {
      throw new BadRequestException(
        'Source section does not belong to the selected grade level',
      );
    }

    if (targetSection.gradeLevel.id !== gradeLevel.id) {
      throw new BadRequestException(
        'Target section does not belong to the selected grade level',
      );
    }

    const where: Prisma.StudentEnrollmentWhereInput = {
      deletedAt: null,
      isActive: true,
      academicYearId: payload.academicYearId,
      gradeLevelId: payload.gradeLevelId,
      sectionId: payload.sourceSectionId,
      ...(enrollmentIds.length > 0
        ? {
            id: {
              in: enrollmentIds,
            },
          }
        : {}),
    };

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where,
      select: {
        id: true,
        sectionId: true,
        distributionStatus: true,
      },
      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    if (enrollmentIds.length > 0 && enrollments.length !== enrollmentIds.length) {
      throw new BadRequestException(
        'One or more selected enrollments are invalid or do not belong to the source section',
      );
    }

    if (enrollments.length === 0) {
      throw new BadRequestException('No enrollments found to transfer');
    }

    const targetOccupancy = await this.prisma.studentEnrollment.count({
      where: {
        deletedAt: null,
        isActive: true,
        academicYearId: payload.academicYearId,
        sectionId: payload.targetSectionId,
      },
    });

    if (
      targetSection.capacity !== null &&
      targetOccupancy + enrollments.length > targetSection.capacity
    ) {
      throw new BadRequestException(
        `Target section ${targetSection.name} (${targetSection.code}) does not have enough remaining capacity`,
      );
    }

    const moved = await this.prisma.$transaction(
      enrollments.map((enrollment) =>
        this.prisma.studentEnrollment.update({
          where: {
            id: enrollment.id,
          },
          data: {
            sectionId: targetSection.id,
            distributionStatus: EnrollmentDistributionStatus.TRANSFERRED,
            gradeLevelId: gradeLevel.id,
            gradeNameSnapshot: gradeLevel.name,
            sectionNameSnapshot: targetSection.name,
            updatedById: actorUserId,
          },
          select: {
            id: true,
            studentId: true,
            sectionId: true,
            yearlyEnrollmentNo: true,
          },
        }),
      ),
    );

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_ENROLLMENT_SECTION_TRANSFER',
      resource: 'student-enrollments',
      details: {
        academicYearId: payload.academicYearId,
        gradeLevelId: payload.gradeLevelId,
        sourceSectionId: sourceSection.id,
        targetSectionId: targetSection.id,
        enrollmentIds: moved.map((item) => item.id),
        transferredCount: moved.length,
      },
    });

    return {
      success: true,
      transferredCount: moved.length,
      sourceSection: {
        id: sourceSection.id,
        code: sourceSection.code,
        name: sourceSection.name,
      },
      targetSection: {
        id: targetSection.id,
        code: targetSection.code,
        name: targetSection.name,
      },
      enrollments: moved,
    };
  }

  async returnEnrollmentsToPendingDistribution(
    payload: ReturnStudentEnrollmentsToPendingDto,
    actorUserId: string,
  ) {
    const rawEnrollmentIds = payload.enrollments.map(
      (item) => item.enrollmentId,
    );
    const enrollmentIds = this.normalizeEnrollmentIds(rawEnrollmentIds);

    if (enrollmentIds.length !== rawEnrollmentIds.length) {
      throw new BadRequestException(
        'Duplicate enrollment IDs are not allowed in return-to-pending requests',
      );
    }

    await this.ensureAcademicYearExists(payload.academicYearId);
    const gradeLevel = await this.ensureGradeLevelExistsAndActive(
      payload.gradeLevelId,
    );

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        academicYearId: payload.academicYearId,
        gradeLevelId: payload.gradeLevelId,
        id: {
          in: enrollmentIds,
        },
      },
      select: {
        id: true,
        sectionId: true,
        distributionStatus: true,
      },
      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    if (enrollments.length !== enrollmentIds.length) {
      throw new BadRequestException(
        'One or more selected enrollments are invalid or do not belong to the selected academic year and grade level',
      );
    }

    if (enrollments.length === 0) {
      throw new BadRequestException('No enrollments found to return to pending');
    }

    const updated = await this.prisma.$transaction(
      enrollments.map((enrollment) =>
        this.prisma.studentEnrollment.update({
          where: {
            id: enrollment.id,
          },
          data: {
            sectionId: null,
            distributionStatus: EnrollmentDistributionStatus.PENDING_DISTRIBUTION,
            gradeLevelId: gradeLevel.id,
            gradeNameSnapshot: gradeLevel.name,
            sectionNameSnapshot: null,
            updatedById: actorUserId,
          },
          select: {
            id: true,
            studentId: true,
            sectionId: true,
            yearlyEnrollmentNo: true,
          },
        }),
      ),
    );

    await this.auditLogsService.record({
      actorUserId,
      action: 'STUDENT_ENROLLMENT_RETURN_TO_PENDING',
      resource: 'student-enrollments',
      details: {
        academicYearId: payload.academicYearId,
        gradeLevelId: payload.gradeLevelId,
        enrollmentIds: updated.map((item) => item.id),
        returnedCount: updated.length,
      },
    });

    return {
      success: true,
      returnedCount: updated.length,
      enrollments: updated,
    };
  }

  async update(
    id: string,
    payload: UpdateStudentEnrollmentDto,
    actorUserId: string,
  ) {
    const existing = await this.ensureEnrollmentExists(id);

    const resolvedStudentId = payload.studentId ?? existing.studentId;
    const resolvedAcademicYearId =
      payload.academicYearId ?? existing.academicYearId;
    const providedSectionId = this.normalizeOptionalId(payload.sectionId);
    const existingSectionId = this.normalizeOptionalId(
      (existing as { sectionId?: string | null }).sectionId,
    );
    const sectionWasProvided = payload.sectionId !== undefined;
    const resolvedSectionId = sectionWasProvided
      ? providedSectionId ?? null
      : existingSectionId ?? null;

    await this.studentsService.ensureStudentExistsAndActive(resolvedStudentId);
    const academicYear = await this.ensureAcademicYearExists(
      resolvedAcademicYearId,
    );
    const providedGradeLevelId = this.normalizeOptionalId(payload.gradeLevelId);
    const academicYearChanged =
      resolvedAcademicYearId !== existing.academicYearId;
    let resolvedDistributionStatus =
      payload.distributionStatus ??
      existing.distributionStatus ??
      (resolvedSectionId
        ? EnrollmentDistributionStatus.ASSIGNED
        : EnrollmentDistributionStatus.PENDING_DISTRIBUTION);

    if (
      resolvedSectionId &&
      resolvedDistributionStatus ===
        EnrollmentDistributionStatus.PENDING_DISTRIBUTION
    ) {
      resolvedDistributionStatus = EnrollmentDistributionStatus.ASSIGNED;
    }

    let resolvedGradeLevelId =
      providedGradeLevelId ?? this.normalizeOptionalId(existing.gradeLevelId) ?? '';
    let gradeSnapshot: string | null = null;
    let sectionSnapshot: string | null = null;

    if (resolvedSectionId) {
      const section = await this.ensureSectionExistsAndActive(resolvedSectionId);
      await this.ensureSectionHasCapacity(
        resolvedSectionId,
        resolvedAcademicYearId,
        id,
      );

      if (
        providedGradeLevelId &&
        providedGradeLevelId !== section.gradeLevel.id
      ) {
        throw new BadRequestException(
          'Selected section does not belong to the provided grade level',
        );
      }

      resolvedGradeLevelId = resolvedGradeLevelId ?? section.gradeLevel.id;
      gradeSnapshot = section.gradeLevel.name;
      sectionSnapshot = section.name;
    } else {
      if (!resolvedGradeLevelId) {
        throw new BadRequestException(
          'Grade level is required when removing the section from an enrollment',
        );
      }

      if (
        resolvedDistributionStatus !==
        EnrollmentDistributionStatus.PENDING_DISTRIBUTION
      ) {
        throw new BadRequestException(
          'Section-less enrollment must use pending distribution',
        );
      }

      const gradeLevel = await this.ensureGradeLevelExistsAndActive(
        resolvedGradeLevelId,
      );
      resolvedGradeLevelId = gradeLevel.id;
      gradeSnapshot = gradeLevel.name;
    }

    try {
      const enrollment = await this.prisma.$transaction(async (tx) => {
        const yearlyEnrollmentNo =
          academicYearChanged || !existing.yearlyEnrollmentNo
            ? await this.generateYearlyEnrollmentNo(
                tx,
                academicYear.startDate,
                academicYear.id,
              )
            : existing.yearlyEnrollmentNo;

        return tx.studentEnrollment.update({
          where: {
            id,
          },
          data: {
            studentId: payload.studentId,
            academicYearId: payload.academicYearId,
            gradeLevelId: resolvedGradeLevelId,
            sectionId: resolvedSectionId,
            yearlyEnrollmentNo,
            distributionStatus: resolvedDistributionStatus,
            gradeNameSnapshot: gradeSnapshot,
            sectionNameSnapshot: sectionSnapshot,
            enrollmentDate: payload.enrollmentDate,
            status: payload.status,
            notes: payload.notes,
            isActive: payload.isActive,
            updatedById: actorUserId,
          },
          include: studentEnrollmentInclude,
        });
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_ENROLLMENT_UPDATE',
        resource: 'student-enrollments',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return enrollment;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureEnrollmentExists(id);

    await this.prisma.studentEnrollment.update({
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
      action: 'STUDENT_ENROLLMENT_DELETE',
      resource: 'student-enrollments',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureEnrollmentExists(id: string): Promise<StudentEnrollment> {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Student enrollment not found');
    }

    return enrollment;
  }

  private async ensureAcademicYearExists(academicYearId: string) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        startDate: true,
      },
    });

    if (!academicYear) {
      throw new BadRequestException('Academic year is invalid or deleted');
    }

    return academicYear;
  }

  private async ensureGradeLevelExistsAndActive(gradeLevelId: string) {
    const gradeLevel = await this.prisma.gradeLevel.findFirst({
      where: {
        id: gradeLevelId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    if (!gradeLevel) {
      throw new BadRequestException('Grade level is invalid or deleted');
    }

    if (!gradeLevel.isActive) {
      throw new BadRequestException('Grade level is inactive');
    }

    return gradeLevel;
  }

  private async ensureSectionExistsAndActive(sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        capacity: true,
        isActive: true,
        gradeLevel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!section) {
      throw new BadRequestException('Section is invalid or deleted');
    }

    if (!section.isActive) {
      throw new BadRequestException('Section is inactive');
    }

    return section;
  }

  private async ensureSectionHasCapacity(
    sectionId: string,
    academicYearId: string,
    excludeEnrollmentId?: string,
  ) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        capacity: true,
      },
    });

    if (!section || section.capacity === null) {
      return;
    }

    const assignedCount = await this.prisma.studentEnrollment.count({
      where: {
        deletedAt: null,
        isActive: true,
        academicYearId,
        sectionId,
        id: excludeEnrollmentId
          ? {
              not: excludeEnrollmentId,
            }
          : undefined,
      },
    });

    if (assignedCount >= section.capacity) {
      throw new BadRequestException(
        `الشعبة ${section.name} (${section.code}) وصلت إلى السعة القصوى`,
      );
    }
  }

  private buildDistributionSearchWhere(search?: string) {
    if (!search) {
      return undefined;
    }

    return [
      {
        student: {
          fullName: {
            contains: search,
          },
        },
      },
      {
        student: {
          admissionNo: {
            contains: search,
          },
        },
      },
      {
        yearlyEnrollmentNo: {
          contains: search,
        },
      },
    ] satisfies Prisma.StudentEnrollmentWhereInput[];
  }

  private pickNextAvailableSection(
    sections: Array<{
      id: string;
      code: string;
      name: string;
      capacity: number | null;
    }>,
    occupancy: Map<string, number>,
    startIndex: number,
  ) {
    for (let offset = 0; offset < sections.length; offset += 1) {
      const index = (startIndex + offset) % sections.length;
      const section = sections[index];
      const assignedCount = occupancy.get(section.id) ?? 0;
      if (section.capacity === null || assignedCount < section.capacity) {
        return section;
      }
    }

    return null;
  }

  private normalizeOptionalId(value?: string | null) {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeEnrollmentIds(values?: Array<string | null | undefined>) {
    return Array.from(
      new Set(
        (values ?? [])
          .map((value) => this.normalizeOptionalId(value))
          .filter((value): value is string => typeof value === 'string'),
      ),
    );
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = String(error.meta?.target ?? '');

      if (target.includes('sen_year_enrollment_no_uq')) {
        throw new ConflictException(
          'Generated yearly enrollment number conflicted; please retry the operation',
        );
      }

      throw new ConflictException(
        'Student can only have one enrollment per academic year',
      );
    }

    throw error;
  }

  private async generateYearlyEnrollmentNo(
    tx: Prisma.TransactionClient,
    startDate: Date,
    academicYearId: string,
  ) {
    const yearPrefix = startDate.getUTCFullYear().toString();
    const existingMax = await this.findCurrentEnrollmentSequence(
      tx,
      academicYearId,
      yearPrefix,
    );
    const nextValue = await this.nextSequenceValue(
      tx,
      `student_enrollment:${academicYearId}`,
      existingMax,
    );
    return formatYearlyEnrollmentNo(yearPrefix, nextValue);
  }

  private async nextSequenceValue(
    tx: Prisma.TransactionClient,
    key: string,
    minimumValue = 0,
  ) {
    await tx.sequenceCounter.upsert({
      where: { key },
      update: {},
      create: { key },
    });

    if (minimumValue > 0) {
      await tx.sequenceCounter.updateMany({
        where: {
          key,
          currentValue: {
            lt: minimumValue,
          },
        },
        data: {
          currentValue: minimumValue,
        },
      });
    }

    const counter = await tx.sequenceCounter.update({
      where: { key },
      data: {
        currentValue: {
          increment: 1,
        },
      },
      select: {
        currentValue: true,
      },
    });

    return counter.currentValue;
  }

  private async findCurrentEnrollmentSequence(
    tx: Prisma.TransactionClient,
    academicYearId: string,
    yearPrefix: string,
  ) {
    const latestEnrollment = await tx.studentEnrollment.findFirst({
      where: {
        academicYearId,
        yearlyEnrollmentNo: {
          startsWith: `${yearPrefix}-`,
        },
      },
      orderBy: {
        yearlyEnrollmentNo: 'desc',
      },
      select: {
        yearlyEnrollmentNo: true,
      },
    });

    return (
      parseYearlyEnrollmentNoSequence(
        latestEnrollment?.yearlyEnrollmentNo,
        yearPrefix,
      ) ?? 0
    );
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
