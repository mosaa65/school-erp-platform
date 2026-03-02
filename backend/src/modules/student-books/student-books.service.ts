import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditStatus,
  Prisma,
  StudentBook,
  StudentBookStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateStudentBookDto } from './dto/create-student-book.dto';
import { ListStudentBooksDto } from './dto/list-student-books.dto';
import { UpdateStudentBookDto } from './dto/update-student-book.dto';

type DateInput = string | Date | null | undefined;

const studentBookInclude: Prisma.StudentBookInclude = {
  studentEnrollment: {
    select: {
      id: true,
      status: true,
      isActive: true,
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
          isCurrent: true,
          status: true,
        },
      },
      section: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      },
    },
  },
  subject: {
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
};

@Injectable()
export class StudentBooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(payload: CreateStudentBookDto, actorUserId: string) {
    await this.ensureEnrollmentExistsAndActive(payload.studentEnrollmentId);
    await this.ensureSubjectExistsAndActive(payload.subjectId);
    this.validateBookDates(
      payload.issuedDate,
      payload.dueDate,
      payload.returnedDate,
      payload.status ?? StudentBookStatus.ISSUED,
    );

    const normalizedBookPart = payload.bookPart?.trim() || 'MAIN';

    try {
      const studentBook = await this.prisma.studentBook.create({
        data: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          bookPart: normalizedBookPart,
          issuedDate: payload.issuedDate,
          dueDate: payload.dueDate,
          returnedDate: payload.returnedDate,
          status: payload.status ?? StudentBookStatus.ISSUED,
          notes: payload.notes,
          isActive: payload.isActive ?? true,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
        include: studentBookInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_BOOK_CREATE',
        resource: 'student-books',
        resourceId: studentBook.id,
        details: {
          studentEnrollmentId: studentBook.studentEnrollmentId,
          subjectId: studentBook.subjectId,
          status: studentBook.status,
          bookPart: studentBook.bookPart,
        },
      });

      return studentBook;
    } catch (error) {
      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_BOOK_CREATE_FAILED',
        resource: 'student-books',
        status: AuditStatus.FAILURE,
        details: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          reason: this.extractErrorMessage(error),
        },
      });

      this.throwKnownDatabaseErrors(error);
    }
  }

  async findAll(query: ListStudentBooksDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.StudentBookWhereInput = {
      deletedAt: null,
      studentEnrollmentId: query.studentEnrollmentId,
      subjectId: query.subjectId,
      status: query.status,
      isActive: query.isActive,
      studentEnrollment: query.studentId
        ? {
            studentId: query.studentId,
          }
        : undefined,
      issuedDate:
        query.fromIssuedDate || query.toIssuedDate
          ? {
              gte: query.fromIssuedDate,
              lte: query.toIssuedDate,
            }
          : undefined,
      OR: query.search
        ? [
            {
              studentEnrollment: {
                student: {
                  fullName: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              studentEnrollment: {
                student: {
                  admissionNo: {
                    contains: query.search,
                  },
                },
              },
            },
            {
              subject: {
                name: {
                  contains: query.search,
                },
              },
            },
            {
              subject: {
                code: {
                  contains: query.search,
                },
              },
            },
            {
              bookPart: {
                contains: query.search,
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
      this.prisma.studentBook.count({ where }),
      this.prisma.studentBook.findMany({
        where,
        include: studentBookInclude,
        orderBy: [{ issuedDate: 'desc' }, { createdAt: 'desc' }],
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
    const studentBook = await this.prisma.studentBook.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: studentBookInclude,
    });

    if (!studentBook) {
      throw new NotFoundException('Student book record not found');
    }

    return studentBook;
  }

  async update(id: string, payload: UpdateStudentBookDto, actorUserId: string) {
    const existing = await this.ensureStudentBookExists(id);

    const resolvedStudentEnrollmentId =
      payload.studentEnrollmentId ?? existing.studentEnrollmentId;
    const resolvedSubjectId = payload.subjectId ?? existing.subjectId;
    const resolvedIssuedDate = payload.issuedDate ?? existing.issuedDate;
    const resolvedDueDate = payload.dueDate ?? existing.dueDate;
    const resolvedReturnedDate = payload.returnedDate ?? existing.returnedDate;
    const resolvedStatus = payload.status ?? existing.status;

    await this.ensureEnrollmentExistsAndActive(resolvedStudentEnrollmentId);
    await this.ensureSubjectExistsAndActive(resolvedSubjectId);
    this.validateBookDates(
      resolvedIssuedDate,
      resolvedDueDate,
      resolvedReturnedDate,
      resolvedStatus,
    );

    try {
      const studentBook = await this.prisma.studentBook.update({
        where: {
          id,
        },
        data: {
          studentEnrollmentId: payload.studentEnrollmentId,
          subjectId: payload.subjectId,
          bookPart: payload.bookPart?.trim(),
          issuedDate: payload.issuedDate,
          dueDate: payload.dueDate,
          returnedDate: payload.returnedDate,
          status: payload.status,
          notes: payload.notes,
          isActive: payload.isActive,
          updatedById: actorUserId,
        },
        include: studentBookInclude,
      });

      await this.auditLogsService.record({
        actorUserId,
        action: 'STUDENT_BOOK_UPDATE',
        resource: 'student-books',
        resourceId: id,
        details: payload as Prisma.InputJsonValue,
      });

      return studentBook;
    } catch (error) {
      this.throwKnownDatabaseErrors(error);
    }
  }

  async remove(id: string, actorUserId: string) {
    await this.ensureStudentBookExists(id);

    await this.prisma.studentBook.update({
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
      action: 'STUDENT_BOOK_DELETE',
      resource: 'student-books',
      resourceId: id,
    });

    return {
      success: true,
      id,
    };
  }

  private async ensureStudentBookExists(id: string): Promise<StudentBook> {
    const studentBook = await this.prisma.studentBook.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!studentBook) {
      throw new NotFoundException('Student book record not found');
    }

    return studentBook;
  }

  private async ensureEnrollmentExistsAndActive(studentEnrollmentId: string) {
    const enrollment = await this.prisma.studentEnrollment.findFirst({
      where: {
        id: studentEnrollmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('Student enrollment is invalid or deleted');
    }

    if (!enrollment.isActive) {
      throw new BadRequestException('Student enrollment is inactive');
    }
  }

  private async ensureSubjectExistsAndActive(subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!subject) {
      throw new BadRequestException('Subject is invalid or deleted');
    }

    if (!subject.isActive) {
      throw new BadRequestException('Subject is inactive');
    }
  }

  private validateBookDates(
    issuedDate: DateInput,
    dueDate: DateInput,
    returnedDate: DateInput,
    status: StudentBookStatus,
  ) {
    const normalizedIssuedDate = this.parseDate(issuedDate, 'issuedDate');
    const normalizedDueDate = this.parseDate(dueDate, 'dueDate');
    const normalizedReturnedDate = this.parseDate(returnedDate, 'returnedDate');

    if (!normalizedIssuedDate) {
      throw new BadRequestException('issuedDate is required');
    }

    if (normalizedDueDate && normalizedDueDate < normalizedIssuedDate) {
      throw new BadRequestException('dueDate must be on or after issuedDate');
    }

    if (
      normalizedReturnedDate &&
      normalizedReturnedDate < normalizedIssuedDate
    ) {
      throw new BadRequestException(
        'returnedDate must be on or after issuedDate',
      );
    }

    if (status === StudentBookStatus.RETURNED && !normalizedReturnedDate) {
      throw new BadRequestException(
        'returnedDate is required when status is RETURNED',
      );
    }
  }

  private parseDate(value: DateInput, fieldName: string): Date | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid date format for ${fieldName}`);
    }

    return parsedDate;
  }

  private throwKnownDatabaseErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Student book record already exists for this enrollment, subject, and part',
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
