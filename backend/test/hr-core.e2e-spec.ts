import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GradeStage, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { loginAsKnownAdmin } from './e2e-auth';

type LoginBody = {
  accessToken: string;
};

type EmployeeBody = {
  id: string;
  fullName: string;
};

const UNIQUE_SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const HR_YEAR_CODE = `ay.hr.${UNIQUE_SUFFIX}`;
const HR_GRADE_CODE = `grade.hr.${UNIQUE_SUFFIX}`;
const HR_SECTION_CODE = `section.hr.${UNIQUE_SUFFIX}`;
const HR_SUBJECT_CODE = `subject.hr.${UNIQUE_SUFFIX}`;
const HR_TALENT_CODE = `talent.hr.${UNIQUE_SUFFIX}`;
const HR_JOB_NUMBER = `EMP-HR-${UNIQUE_SUFFIX}`;
const HR_FINANCIAL_NUMBER = `FIN-HR-${UNIQUE_SUFFIX}`;
const HR_REPORTER_JOB_NUMBER = `EMP-HR-REP-${UNIQUE_SUFFIX}`;
const HR_REPORTER_FINANCIAL_NUMBER = `FIN-HR-REP-${UNIQUE_SUFFIX}`;
const HR_USER_EMAIL = `hr.user.${UNIQUE_SUFFIX}@school.local`;
const HR_USER_PHONE = `777${UNIQUE_SUFFIX.replace(/\D+/g, '').slice(-6)}`;

jest.setTimeout(30000);

describe('System 03 HR Core (e2e)', () => {
  let app: INestApplication<App> | null = null;
  let prisma: PrismaClient | null = null;
  let accessToken = '';

  let employeeId = '';
  let academicYearId = '';
  let gradeLevelId = '';
  let sectionId = '';
  let subjectId = '';
  let gradeLevelSubjectId = '';

  let attendanceId = '';
  let teachingAssignmentId = '';
  let evaluationId = '';
  let talentId = '';
  let employeeTalentId = '';
  let courseId = '';
  let violationId = '';
  let reporterEmployeeId = '';
  let linkedUserId = '';

  const httpServer = (): App => {
    if (!app) {
      throw new Error(
        'E2E app is not initialized. Ensure MySQL is running and migrations are applied.',
      );
    }

    return app.getHttpServer();
  };
  const readId = (body: unknown): string => {
    if (
      !body ||
      typeof body !== 'object' ||
      !('id' in body) ||
      typeof (body as { id?: unknown }).id !== 'string'
    ) {
      throw new Error('Missing id in response body');
    }

    return (body as { id: string }).id;
  };

  const nextGradeLevelSequence = async (stage: GradeStage): Promise<number> => {
    if (!prisma) {
      throw new Error(
        'Prisma client is not initialized. Ensure MySQL is running before e2e tests.',
      );
    }

    const existing = await prisma.gradeLevel.findMany({
      where: {
        stage,
        deletedAt: null,
      },
      select: {
        sequence: true,
      },
    });

    const used = new Set(existing.map((item) => item.sequence));
    for (let sequence = 1; sequence <= 1000; sequence += 1) {
      if (!used.has(sequence)) {
        return sequence;
      }
    }

    throw new Error(`No available grade level sequence for stage ${stage}`);
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    prisma = new PrismaClient();

    const adminLogin = await loginAsKnownAdmin(httpServer);
    const loginBody = adminLogin.body as LoginBody;
    accessToken = loginBody.accessToken;
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) {
        await app.close();
      }

      return;
    }

    if (linkedUserId) {
      await prisma.userRole.deleteMany({
        where: {
          userId: linkedUserId,
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: linkedUserId,
        },
      });
    }

    if (violationId) {
      await prisma.employeeViolation.deleteMany({
        where: {
          id: violationId,
        },
      });
    }

    if (courseId) {
      await prisma.employeeCourse.deleteMany({
        where: {
          id: courseId,
        },
      });
    }

    if (employeeTalentId) {
      await prisma.employeeTalent.deleteMany({
        where: {
          id: employeeTalentId,
        },
      });
    }

    if (evaluationId) {
      await prisma.employeePerformanceEvaluation.deleteMany({
        where: {
          id: evaluationId,
        },
      });
    }

    if (attendanceId) {
      await prisma.employeeAttendance.deleteMany({
        where: {
          id: attendanceId,
        },
      });
    }

    if (teachingAssignmentId) {
      await prisma.employeeTeachingAssignment.deleteMany({
        where: {
          id: teachingAssignmentId,
        },
      });
    }

    if (gradeLevelSubjectId) {
      await prisma.gradeLevelSubject.deleteMany({
        where: {
          id: gradeLevelSubjectId,
        },
      });
    }

    if (employeeId) {
      await prisma.employee.deleteMany({
        where: {
          id: employeeId,
        },
      });
    }

    if (reporterEmployeeId) {
      await prisma.employee.deleteMany({
        where: {
          id: reporterEmployeeId,
        },
      });
    }

    if (talentId) {
      await prisma.talent.deleteMany({
        where: {
          id: talentId,
        },
      });
    }

    if (sectionId) {
      await prisma.section.deleteMany({
        where: {
          id: sectionId,
        },
      });
    }

    if (gradeLevelId) {
      await prisma.gradeLevel.deleteMany({
        where: {
          id: gradeLevelId,
        },
      });
    }

    if (subjectId) {
      await prisma.subject.deleteMany({
        where: {
          id: subjectId,
        },
      });
    }

    if (academicYearId) {
      await prisma.academicYear.deleteMany({
        where: {
          id: academicYearId,
        },
      });
    }

    await prisma.$disconnect();
    if (app) {
      await app.close();
    }
  });

  it('Employees CRUD should work for HR core', async () => {
    const createEmployeeResponse = await request(httpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        jobNumber: HR_JOB_NUMBER,
        financialNumber: HR_FINANCIAL_NUMBER,
        fullName: 'HR Core Employee',
        gender: 'MALE',
        employmentType: 'PERMANENT',
        jobTitle: 'Teacher',
      })
      .expect(201);

    const employee = createEmployeeResponse.body as EmployeeBody;
    employeeId = employee.id;

    expect(employee.id).toBeDefined();
    expect(employee.fullName).toBe('HR Core Employee');

    await request(httpServer())
      .get('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ search: HR_JOB_NUMBER })
      .expect(200);

    await request(httpServer())
      .patch(`/employees/${employeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        jobTitle: 'Senior Teacher',
      })
      .expect(200);

    await request(httpServer())
      .get(`/employees/${employeeId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('Users should support linking and unlinking employee profile', async () => {
    const createUserResponse = await request(httpServer())
      .post('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: HR_USER_EMAIL,
        username: `hr_user_${UNIQUE_SUFFIX}`,
        phoneCountryCode: '+967',
        phoneNationalNumber: HR_USER_PHONE,
        firstName: 'HR',
        lastName: 'LinkedUser',
        isActive: true,
      })
      .expect(201);

    linkedUserId = readId(createUserResponse.body);

    const linkResponse = await request(httpServer())
      .patch(`/users/${linkedUserId}/employee-link`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
      })
      .expect(200);

    expect(
      (
        linkResponse.body as {
          employee?: { id?: string };
        }
      ).employee?.id,
    ).toBe(employeeId);

    const unlinkResponse = await request(httpServer())
      .delete(`/users/${linkedUserId}/employee-link`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      (
        unlinkResponse.body as {
          employee: unknown;
        }
      ).employee,
    ).toBeNull();
  });

  it('Employee talents should support mapping and reject duplicate employee-talent pair', async () => {
    const createTalentResponse = await request(httpServer())
      .post('/talents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: HR_TALENT_CODE,
        name: 'Handwriting',
      })
      .expect(201);
    talentId = readId(createTalentResponse.body);

    const createEmployeeTalentResponse = await request(httpServer())
      .post('/employee-talents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        talentId,
        notes: 'Runs school handwriting club',
      })
      .expect(201);
    employeeTalentId = readId(createEmployeeTalentResponse.body);

    await request(httpServer())
      .post('/employee-talents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        talentId,
      })
      .expect(409);
  });

  it('Employee courses should create and list records', async () => {
    const createCourseResponse = await request(httpServer())
      .post('/employee-courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        courseName: 'Active Learning Strategies',
        courseProvider: 'Ministry of Education',
        courseDate: '2026-10-15T00:00:00.000Z',
        durationDays: 5,
      })
      .expect(201);
    courseId = readId(createCourseResponse.body);

    await request(httpServer())
      .get('/employee-courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        employeeId,
        search: 'Active Learning',
      })
      .expect(200);
  });

  it('Employee violations should create and update records with reporter validation', async () => {
    const createReporterResponse = await request(httpServer())
      .post('/employees')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        jobNumber: HR_REPORTER_JOB_NUMBER,
        financialNumber: HR_REPORTER_FINANCIAL_NUMBER,
        fullName: 'HR Reporter Employee',
        gender: 'FEMALE',
        employmentType: 'PERMANENT',
        jobTitle: 'Vice Principal',
      })
      .expect(201);
    reporterEmployeeId = readId(createReporterResponse.body);

    const createViolationResponse = await request(httpServer())
      .post('/employee-violations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        reportedByEmployeeId: reporterEmployeeId,
        violationDate: '2026-11-10T00:00:00.000Z',
        violationAspect: 'Late arrival',
        violationText: 'Arrived 20 minutes late without prior notice.',
        severity: 'MEDIUM',
      })
      .expect(201);
    violationId = readId(createViolationResponse.body);

    await request(httpServer())
      .patch(`/employee-violations/${violationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        hasWarning: true,
        actionTaken: 'Written warning issued',
      })
      .expect(200);

    await request(httpServer())
      .get('/employee-violations')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        employeeId,
        severity: 'MEDIUM',
      })
      .expect(200);
  });

  it('Employee attendance should reject duplicate attendance for same date', async () => {
    const createAttendanceResponse = await request(httpServer())
      .post('/employee-attendance')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        attendanceDate: '2026-09-10T00:00:00.000Z',
        status: 'PRESENT',
        checkInAt: '2026-09-10T07:30:00.000Z',
        checkOutAt: '2026-09-10T14:00:00.000Z',
      })
      .expect(201);

    attendanceId = readId(createAttendanceResponse.body);

    await request(httpServer())
      .post('/employee-attendance')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        attendanceDate: '2026-09-10T00:00:00.000Z',
        status: 'LATE',
      })
      .expect(409);
  });

  it('Employee teaching assignment should validate mapping and reject duplicate section-subject-year', async () => {
    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: HR_YEAR_CODE,
        name: 'HR Academic Year',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2027-06-30T23:59:59.000Z',
      })
      .expect(201);
    academicYearId = readId(createYearResponse.body);

    const createGradeResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: HR_GRADE_CODE,
        name: 'HR Grade',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);
    gradeLevelId = readId(createGradeResponse.body);

    const createSectionResponse = await request(httpServer())
      .post('/sections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        gradeLevelId,
        code: HR_SECTION_CODE,
        name: 'HR Section',
      })
      .expect(201);
    sectionId = readId(createSectionResponse.body);

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        code: HR_SUBJECT_CODE,
        name: 'HR Subject',
      })
      .expect(201);
    subjectId = readId(createSubjectResponse.body);

    await request(httpServer())
      .post('/employee-teaching-assignments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        sectionId,
        subjectId,
        academicYearId,
      })
      .expect(400);

    const createMappingResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        academicYearId,
        gradeLevelId,
        subjectId,
      })
      .expect(201);
    gradeLevelSubjectId = readId(createMappingResponse.body);

    const createAssignmentResponse = await request(httpServer())
      .post('/employee-teaching-assignments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        sectionId,
        subjectId,
        academicYearId,
        weeklyPeriods: 4,
      })
      .expect(201);

    teachingAssignmentId = readId(createAssignmentResponse.body);

    await request(httpServer())
      .post('/employee-teaching-assignments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        sectionId,
        subjectId,
        academicYearId,
      })
      .expect(409);
  });

  it('Employee performance evaluation should validate score-rating consistency', async () => {
    await request(httpServer())
      .post('/employee-performance-evaluations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        academicYearId,
        evaluationDate: '2027-05-20T00:00:00.000Z',
        score: 95,
        ratingLevel: 'GOOD',
      })
      .expect(400);

    const createEvaluationResponse = await request(httpServer())
      .post('/employee-performance-evaluations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        academicYearId,
        evaluationDate: '2027-05-20T00:00:00.000Z',
        score: 95,
      })
      .expect(201);

    evaluationId = readId(createEvaluationResponse.body);

    await request(httpServer())
      .post('/employee-performance-evaluations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        employeeId,
        academicYearId,
        evaluationDate: '2027-05-21T00:00:00.000Z',
        score: 90,
      })
      .expect(409);
  });

  it('HR summary report should return aggregated operational metrics', async () => {
    const response = await request(httpServer())
      .get('/hr-reports/summary')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        employeeId,
        fromDate: '2026-01-01T00:00:00.000Z',
        toDate: '2027-12-31T23:59:59.000Z',
      })
      .expect(200);

    const body = response.body as {
      employees: { total: number };
      attendance: { total: number };
      violations: { total: number };
      courses: { total: number };
      performance: { totalEvaluations: number };
    };

    expect(body.employees.total).toBeGreaterThanOrEqual(1);
    expect(body.attendance.total).toBeGreaterThanOrEqual(1);
    expect(body.violations.total).toBeGreaterThanOrEqual(1);
    expect(body.courses.total).toBeGreaterThanOrEqual(1);
    expect(body.performance.totalEvaluations).toBeGreaterThanOrEqual(1);
  });
});
