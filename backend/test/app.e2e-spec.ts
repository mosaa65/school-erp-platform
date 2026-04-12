import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GradeStage, PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { loginAsKnownAdmin } from './e2e-auth';

jest.setTimeout(30000);

type LoginBody = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    permissionCodes: string[];
  };
};

type UsersListBody = {
  data: unknown[];
  pagination: {
    total: number;
  };
};

type CreateSettingBody = {
  id: string;
  key: string;
};

type GetSettingBody = {
  value: string;
};

type AcademicYearBody = {
  id: string;
  code: string;
  status: string;
  isCurrent: boolean;
  terms?: unknown[];
};

type AcademicTermBody = {
  id: string;
  academicYearId: string;
  code: string;
};

type GradeLevelBody = {
  id: string;
  code: string;
  sections?: unknown[];
};

type SectionBody = {
  id: string;
  gradeLevelId: string;
  code: string;
};

type SubjectBody = {
  id: string;
  code: string;
};

type GradeLevelSubjectBody = {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  weeklyPeriods: number;
};

type TermSubjectOfferingBody = {
  id: string;
  academicTermId: string;
  gradeLevelSubjectId: string;
  weeklyPeriods: number;
};

type TimetableEntryBody = {
  id: string;
  academicTermId: string;
  sectionId: string;
  termSubjectOfferingId: string;
  periodIndex: number;
  dayOfWeek: string;
};

type ErrorEnvelope = {
  success: boolean;
  statusCode: number;
  error: {
    code: string;
    message: string | string[];
    details?: unknown;
  };
};

const UNIQUE_SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const LIMITED_USER_EMAIL = `e2e.readonly.${UNIQUE_SUFFIX}@school.local`;
const LIMITED_USER_PASSWORD = 'ChangeMe123!';
const LIMITED_ROLE_CODE = `e2e_read_only_${UNIQUE_SUFFIX}`;
const E2E_SETTING_KEY_PREFIX = `school.e2e.${UNIQUE_SUFFIX}`;
const E2E_ACADEMIC_YEAR_CODE_PREFIX = `ay.e2e.${UNIQUE_SUFFIX}`;
const E2E_ACADEMIC_TERM_CODE_PREFIX = `term.e2e.${UNIQUE_SUFFIX}`;
const E2E_GRADE_LEVEL_CODE_PREFIX = `grade.e2e.${UNIQUE_SUFFIX}`;
const E2E_SECTION_CODE_PREFIX = `section.e2e.${UNIQUE_SUFFIX}`;
const E2E_SUBJECT_CODE_PREFIX = `subject.e2e.${UNIQUE_SUFFIX}`;
const createdGradeLevelSubjectIds: string[] = [];
const createdTermSubjectOfferingIds: string[] = [];
const createdTimetableEntryIds: string[] = [];

describe('System 01 + 02 (e2e)', () => {
  let app: INestApplication<App> | null = null;
  let prisma: PrismaClient | null = null;
  let adminAccessToken = '';
  let adminCredentialEmail = '';
  let adminCredentialPassword = '';
  let limitedAccessToken = '';
  let limitedUserId = '';
  let limitedRoleId = '';

  const httpServer = (): App => {
    if (!app) {
      throw new Error(
        'E2E app is not initialized. Ensure MySQL is running and migrations are applied.',
      );
    }

    return app.getHttpServer();
  };
  const normalizeMessage = (message: string | string[]): string =>
    Array.isArray(message) ? message.join(' | ') : message;
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

    const superAdminRole = await prisma.role.findUnique({
      where: {
        code: 'super_admin',
      },
      select: {
        id: true,
      },
    });

    if (!superAdminRole) {
      throw new Error('Missing system role: super_admin');
    }

    const gradingReportsReadPermission = await prisma.permission.upsert({
      where: {
        code: 'grading-reports.read',
      },
      update: {
        resource: 'grading-reports',
        action: 'read',
        isSystem: true,
        deletedAt: null,
      },
      create: {
        code: 'grading-reports.read',
        resource: 'grading-reports',
        action: 'read',
        description: 'System permission for grading governance reports',
        isSystem: true,
      },
      select: {
        id: true,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: gradingReportsReadPermission.id,
        },
      },
      update: {
        deletedAt: null,
      },
      create: {
        roleId: superAdminRole.id,
        permissionId: gradingReportsReadPermission.id,
      },
    });

    const adminLogin = await loginAsKnownAdmin(httpServer);
    const adminLoginBody = adminLogin.body as LoginBody;
    adminAccessToken = adminLoginBody.accessToken;
    adminCredentialEmail = adminLogin.credential.email;
    adminCredentialPassword = adminLogin.credential.password;

    const globalSettingsReadPermission = await prisma.permission.findUnique({
      where: {
        code: 'global-settings.read',
      },
      select: {
        id: true,
      },
    });

    if (!globalSettingsReadPermission) {
      throw new Error('Missing seed permission: global-settings.read');
    }

    const limitedRole = await prisma.role.create({
      data: {
        code: LIMITED_ROLE_CODE,
        name: 'E2E Read-Only Role',
        description: 'Used for RBAC negative tests',
        isSystem: false,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    limitedRoleId = limitedRole.id;

    await prisma.rolePermission.create({
      data: {
        roleId: limitedRole.id,
        permissionId: globalSettingsReadPermission.id,
      },
    });

    const limitedPasswordHash = await hash(LIMITED_USER_PASSWORD, 12);

    const limitedUser = await prisma.user.create({
      data: {
        email: LIMITED_USER_EMAIL,
        passwordHash: limitedPasswordHash,
        firstName: 'E2E',
        lastName: 'ReadOnly',
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    limitedUserId = limitedUser.id;

    await prisma.userRole.create({
      data: {
        userId: limitedUser.id,
        roleId: limitedRole.id,
      },
    });

    const limitedLoginResponse = await request(httpServer())
      .post('/auth/login')
      .send({
        email: LIMITED_USER_EMAIL,
        password: LIMITED_USER_PASSWORD,
      })
      .expect(200);

    const limitedLoginBody = limitedLoginResponse.body as LoginBody;
    limitedAccessToken = limitedLoginBody.accessToken;
  });

  afterAll(async () => {
    if (!prisma) {
      if (app) {
        await app.close();
      }

      return;
    }

    if (createdTimetableEntryIds.length > 0) {
      await prisma.timetableEntry.deleteMany({
        where: {
          id: {
            in: createdTimetableEntryIds,
          },
        },
      });
    }

    if (createdTermSubjectOfferingIds.length > 0) {
      await prisma.termSubjectOffering.deleteMany({
        where: {
          id: {
            in: createdTermSubjectOfferingIds,
          },
        },
      });
    }

    if (createdGradeLevelSubjectIds.length > 0) {
      await prisma.gradeLevelSubject.deleteMany({
        where: {
          id: {
            in: createdGradeLevelSubjectIds,
          },
        },
      });
    }

    await prisma.section.deleteMany({
      where: {
        code: {
          startsWith: E2E_SECTION_CODE_PREFIX,
        },
      },
    });

    await prisma.gradeLevel.deleteMany({
      where: {
        code: {
          startsWith: E2E_GRADE_LEVEL_CODE_PREFIX,
        },
      },
    });

    await prisma.subject.deleteMany({
      where: {
        code: {
          startsWith: E2E_SUBJECT_CODE_PREFIX,
        },
      },
    });

    await prisma.academicTerm.deleteMany({
      where: {
        code: {
          startsWith: E2E_ACADEMIC_TERM_CODE_PREFIX,
        },
      },
    });

    await prisma.academicYear.deleteMany({
      where: {
        code: {
          startsWith: E2E_ACADEMIC_YEAR_CODE_PREFIX,
        },
      },
    });

    await prisma.globalSetting.deleteMany({
      where: {
        key: {
          startsWith: E2E_SETTING_KEY_PREFIX,
        },
      },
    });

    if (limitedUserId) {
      await prisma.userRole.deleteMany({
        where: {
          userId: limitedUserId,
        },
      });
    }

    if (limitedRoleId) {
      await prisma.rolePermission.deleteMany({
        where: {
          roleId: limitedRoleId,
        },
      });
    }

    if (limitedUserId) {
      await prisma.user.deleteMany({
        where: {
          id: limitedUserId,
        },
      });
    }

    if (limitedRoleId) {
      await prisma.role.deleteMany({
        where: {
          id: limitedRoleId,
        },
      });
    }

    await prisma.$disconnect();
    if (app) {
      await app.close();
    }
  });

  it('GET /health should return service health payload', async () => {
    const response = await request(httpServer()).get('/health').expect(200);
    const body = response.body as { status: string; service: string };

    expect(body.status).toBe('ok');
    expect(body.service).toBe('school-erp-backend');
  });

  it('POST /auth/login should authenticate seeded super admin', async () => {
    const response = await request(httpServer())
      .post('/auth/login')
      .send({
        email: adminCredentialEmail,
        password: adminCredentialPassword,
      })
      .expect(200);

    const body = response.body as LoginBody;

    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe(adminCredentialEmail);
    expect(Array.isArray(body.user.permissionCodes)).toBe(true);
  });

  it('GET /users should require JWT authentication', async () => {
    await request(httpServer()).get('/users').expect(401);
  });

  it('GET /users should return paginated users with valid token', async () => {
    const response = await request(httpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const body = response.body as UsersListBody;

    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('Global settings CRUD flow should work end-to-end', async () => {
    const uniqueKey = `${E2E_SETTING_KEY_PREFIX}.crud`;

    const createResponse = await request(httpServer())
      .post('/global-settings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        key: uniqueKey,
        valueType: 'STRING',
        value: 'Initial Value',
        description: 'E2E temporary setting',
        isPublic: false,
      })
      .expect(201);

    const createBody = createResponse.body as CreateSettingBody;
    const settingId = createBody.id;

    expect(settingId).toBeDefined();
    expect(createBody.key).toBe(uniqueKey);

    const getResponse = await request(httpServer())
      .get(`/global-settings/${settingId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const getBody = getResponse.body as GetSettingBody;
    expect(getBody.value).toBe('Initial Value');

    await request(httpServer())
      .patch(`/global-settings/${settingId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        value: 'Updated Value',
      })
      .expect(200);

    const listResponse = await request(httpServer())
      .get('/global-settings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({ search: uniqueKey })
      .expect(200);

    const listBody = listResponse.body as UsersListBody;
    expect(listBody.pagination.total).toBeGreaterThanOrEqual(1);

    await request(httpServer())
      .delete(`/global-settings/${settingId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .get(`/global-settings/${settingId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);
  });

  it('GET /users should return 403 for user without users.read permission', async () => {
    const response = await request(httpServer())
      .get('/users')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .expect(403);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(403);
    expect(normalizeMessage(body.error.message)).toContain(
      'Insufficient permissions',
    );
  });

  it('POST /global-settings should reject invalid key format', async () => {
    const response = await request(httpServer())
      .post('/global-settings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        key: 'Invalid Key Format',
        valueType: 'STRING',
        value: 'x',
      })
      .expect(400);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(normalizeMessage(body.error.message)).toContain('key must match');
  });

  it('POST /global-settings should reject non-whitelisted properties', async () => {
    const response = await request(httpServer())
      .post('/global-settings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        key: `${E2E_SETTING_KEY_PREFIX}.whitelist`,
        valueType: 'STRING',
        value: 'x',
        extraField: 'not-allowed',
      })
      .expect(400);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(normalizeMessage(body.error.message)).toContain('should not exist');
  });

  it('POST /global-settings should reject valueType and value mismatch', async () => {
    const response = await request(httpServer())
      .post('/global-settings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        key: `${E2E_SETTING_KEY_PREFIX}.type-mismatch`,
        valueType: 'NUMBER',
        value: 'not-a-number',
      })
      .expect(400);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(normalizeMessage(body.error.message)).toContain(
      'Value does not match valueType NUMBER',
    );
  });

  it('GET /academic-years should return 403 for user without academic-years.read permission', async () => {
    const response = await request(httpServer())
      .get('/academic-years')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .expect(403);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(403);
    expect(normalizeMessage(body.error.message)).toContain(
      'Insufficient permissions',
    );
  });

  it('Academic years and terms CRUD flow should work end-to-end', async () => {
    const baseYear = 2200 + Math.floor(Math.random() * 300);
    const academicYearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.crud`;
    const termCode = `${E2E_ACADEMIC_TERM_CODE_PREFIX}.crud`;
    const yearStartDate = `${baseYear}-09-01T00:00:00.000Z`;
    const yearEndDate = `${baseYear + 1}-06-30T23:59:59.000Z`;
    const termStartDate = `${baseYear}-09-01T00:00:00.000Z`;
    const termEndDate = `${baseYear}-12-31T23:59:59.000Z`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: academicYearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: yearStartDate,
        endDate: yearEndDate,
        status: 'PLANNED',
      })
      .expect(201);

    const createdYear = createYearResponse.body as AcademicYearBody;
    expect(createdYear.id).toBeDefined();
    expect(createdYear.code).toBe(academicYearCode);

    const createTermResponse = await request(httpServer())
      .post('/academic-terms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        code: termCode,
        name: 'Term 1',
        termType: 'SEMESTER',
        sequence: 1,
        startDate: termStartDate,
        endDate: termEndDate,
      })
      .expect(201);

    const createdTerm = createTermResponse.body as AcademicTermBody;
    expect(createdTerm.id).toBeDefined();
    expect(createdTerm.academicYearId).toBe(createdYear.id);
    expect(createdTerm.code).toBe(termCode);

    await request(httpServer())
      .patch(`/academic-terms/${createdTerm.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Term 1 Updated',
      })
      .expect(200);

    const getYearResponse = await request(httpServer())
      .get(`/academic-years/${createdYear.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const yearBody = getYearResponse.body as AcademicYearBody;
    expect(Array.isArray(yearBody.terms)).toBe(true);
    expect(yearBody.terms?.length).toBeGreaterThanOrEqual(1);

    await request(httpServer())
      .delete(`/academic-terms/${createdTerm.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .delete(`/academic-years/${createdYear.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .get(`/academic-years/${createdYear.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);
  });

  it('POST /academic-terms should reject term dates outside academic year range', async () => {
    const baseYear = 2600 + Math.floor(Math.random() * 100);
    const academicYearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.validation`;
    const termCode = `${E2E_ACADEMIC_TERM_CODE_PREFIX}.validation`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: academicYearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);

    const createdYear = createYearResponse.body as AcademicYearBody;

    const response = await request(httpServer())
      .post('/academic-terms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        code: termCode,
        name: 'Invalid Term',
        termType: 'SEMESTER',
        sequence: 1,
        startDate: `${baseYear}-08-01T00:00:00.000Z`,
        endDate: `${baseYear}-12-31T23:59:59.000Z`,
      })
      .expect(400);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(normalizeMessage(body.error.message)).toContain(
      'must be within academic year date range',
    );
  });

  it('GET /grade-levels should return 403 for user without grade-levels.read permission', async () => {
    const response = await request(httpServer())
      .get('/grade-levels')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .expect(403);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(403);
    expect(normalizeMessage(body.error.message)).toContain(
      'Insufficient permissions',
    );
  });

  it('Grade levels, sections, and subjects CRUD flow should work end-to-end', async () => {
    const gradeLevelCode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.crud`;
    const sectionCode = `${E2E_SECTION_CODE_PREFIX}.crud`;
    const subjectCode = `${E2E_SUBJECT_CODE_PREFIX}.crud`;

    const createGradeLevelResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeLevelCode,
        name: 'Grade CRUD',
        stage: 'PRIMARY',
        sequence: await nextGradeLevelSequence(GradeStage.PRIMARY),
        isActive: true,
      })
      .expect(201);

    const createdGradeLevel = createGradeLevelResponse.body as GradeLevelBody;
    expect(createdGradeLevel.id).toBeDefined();
    expect(createdGradeLevel.code).toBe(gradeLevelCode);

    const createSectionResponse = await request(httpServer())
      .post('/sections')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        gradeLevelId: createdGradeLevel.id,
        code: sectionCode,
        name: 'Section CRUD',
        capacity: 30,
      })
      .expect(201);

    const createdSection = createSectionResponse.body as SectionBody;
    expect(createdSection.id).toBeDefined();
    expect(createdSection.gradeLevelId).toBe(createdGradeLevel.id);

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: subjectCode,
        name: 'Mathematics CRUD',
        shortName: 'MATH',
        category: 'MATHEMATICS',
      })
      .expect(201);

    const createdSubject = createSubjectResponse.body as SubjectBody;
    expect(createdSubject.id).toBeDefined();
    expect(createdSubject.code).toBe(subjectCode);

    await request(httpServer())
      .patch(`/sections/${createdSection.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        capacity: 35,
      })
      .expect(200);

    await request(httpServer())
      .patch(`/subjects/${createdSubject.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        name: 'Mathematics Updated',
      })
      .expect(200);

    const getGradeLevelResponse = await request(httpServer())
      .get(`/grade-levels/${createdGradeLevel.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const gradeLevelBody = getGradeLevelResponse.body as GradeLevelBody;
    expect(Array.isArray(gradeLevelBody.sections)).toBe(true);
    expect(gradeLevelBody.sections?.length).toBeGreaterThanOrEqual(1);

    await request(httpServer())
      .delete(`/sections/${createdSection.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .delete(`/grade-levels/${createdGradeLevel.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .delete(`/subjects/${createdSubject.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .get(`/sections/${createdSection.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);

    await request(httpServer())
      .get(`/grade-levels/${createdGradeLevel.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);

    await request(httpServer())
      .get(`/subjects/${createdSubject.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);
  });

  it('POST /sections should reject invalid grade level reference', async () => {
    const response = await request(httpServer())
      .post('/sections')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        gradeLevelId: 'non-existing-grade-level-id',
        code: `${E2E_SECTION_CODE_PREFIX}.badref`,
        name: 'Invalid Grade Section',
      })
      .expect(400);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(normalizeMessage(body.error.message)).toContain(
      'Grade level is invalid or deleted',
    );
  });

  it('POST /subjects should reject duplicate subject codes', async () => {
    const duplicateSubjectCode = `${E2E_SUBJECT_CODE_PREFIX}.duplicate`;

    await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: duplicateSubjectCode,
        name: 'Duplicate Subject First',
      })
      .expect(201);

    const response = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: duplicateSubjectCode,
        name: 'Duplicate Subject Second',
      })
      .expect(409);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(409);
    expect(normalizeMessage(body.error.message)).toContain('must be unique');
  });

  it('GET /grade-level-subjects should return 403 for user without grade-level-subjects.read permission', async () => {
    const response = await request(httpServer())
      .get('/grade-level-subjects')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .expect(403);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(403);
    expect(normalizeMessage(body.error.message)).toContain(
      'Insufficient permissions',
    );
  });

  it('Grade level subject mappings CRUD flow should work end-to-end', async () => {
    const baseYear = 3200 + Math.floor(Math.random() * 100);
    const academicYearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.map-crud`;
    const gradeLevelCode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.map-crud`;
    const subjectCode = `${E2E_SUBJECT_CODE_PREFIX}.map-crud`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: academicYearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);

    const createdYear = createYearResponse.body as AcademicYearBody;

    const createGradeLevelResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeLevelCode,
        name: 'Map Grade',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);

    const createdGradeLevel = createGradeLevelResponse.body as GradeLevelBody;

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: subjectCode,
        name: 'Map Subject',
        category: 'CORE',
      })
      .expect(201);

    const createdSubject = createSubjectResponse.body as SubjectBody;

    const createMappingResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        gradeLevelId: createdGradeLevel.id,
        subjectId: createdSubject.id,
        isMandatory: true,
        weeklyPeriods: 5,
        displayOrder: 1,
      })
      .expect(201);

    const createdMapping = createMappingResponse.body as GradeLevelSubjectBody;
    createdGradeLevelSubjectIds.push(createdMapping.id);
    expect(createdMapping.id).toBeDefined();
    expect(createdMapping.weeklyPeriods).toBe(5);

    await request(httpServer())
      .patch(`/grade-level-subjects/${createdMapping.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        weeklyPeriods: 6,
      })
      .expect(200);

    const getMappingResponse = await request(httpServer())
      .get(`/grade-level-subjects/${createdMapping.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const mappingBody = getMappingResponse.body as GradeLevelSubjectBody;
    expect(mappingBody.weeklyPeriods).toBe(6);
    expect(mappingBody.academicYearId).toBe(createdYear.id);
    expect(mappingBody.gradeLevelId).toBe(createdGradeLevel.id);
    expect(mappingBody.subjectId).toBe(createdSubject.id);

    const listResponse = await request(httpServer())
      .get('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        gradeLevelId: createdGradeLevel.id,
      })
      .expect(200);

    const listBody = listResponse.body as UsersListBody;
    expect(listBody.pagination.total).toBeGreaterThanOrEqual(1);

    await request(httpServer())
      .delete(`/grade-level-subjects/${createdMapping.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .get(`/grade-level-subjects/${createdMapping.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);
  });

  it('POST /grade-level-subjects should reject duplicate mapping for same year/grade/subject', async () => {
    const baseYear = 3500 + Math.floor(Math.random() * 100);
    const academicYearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.map-dup`;
    const gradeLevelCode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.map-dup`;
    const subjectCode = `${E2E_SUBJECT_CODE_PREFIX}.map-dup`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: academicYearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);

    const createdYear = createYearResponse.body as AcademicYearBody;

    const createGradeLevelResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeLevelCode,
        name: 'Map Dup Grade',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);

    const createdGradeLevel = createGradeLevelResponse.body as GradeLevelBody;

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: subjectCode,
        name: 'Map Dup Subject',
      })
      .expect(201);

    const createdSubject = createSubjectResponse.body as SubjectBody;

    const createFirstResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        gradeLevelId: createdGradeLevel.id,
        subjectId: createdSubject.id,
        weeklyPeriods: 4,
      })
      .expect(201);

    const createdMapping = createFirstResponse.body as GradeLevelSubjectBody;
    createdGradeLevelSubjectIds.push(createdMapping.id);

    const response = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        gradeLevelId: createdGradeLevel.id,
        subjectId: createdSubject.id,
        weeklyPeriods: 3,
      })
      .expect(409);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(409);
    expect(normalizeMessage(body.error.message)).toContain('must be unique');
  });

  it('GET /term-subject-offerings should return 403 for user without term-subject-offerings.read permission', async () => {
    const response = await request(httpServer())
      .get('/term-subject-offerings')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .expect(403);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(403);
    expect(normalizeMessage(body.error.message)).toContain(
      'Insufficient permissions',
    );
  });

  it('Term subject offerings CRUD flow should work end-to-end', async () => {
    const baseYear = 3600 + Math.floor(Math.random() * 100);
    const academicYearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.tso-crud`;
    const termCode = `${E2E_ACADEMIC_TERM_CODE_PREFIX}.tso-crud`;
    const gradeLevelCode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.tso-crud`;
    const subjectCode = `${E2E_SUBJECT_CODE_PREFIX}.tso-crud`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: academicYearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);
    const createdYear = createYearResponse.body as AcademicYearBody;

    const createTermResponse = await request(httpServer())
      .post('/academic-terms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        code: termCode,
        name: 'TSO Term',
        termType: 'SEMESTER',
        sequence: 1,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear}-12-31T23:59:59.000Z`,
      })
      .expect(201);
    const createdTerm = createTermResponse.body as AcademicTermBody;

    const createGradeLevelResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeLevelCode,
        name: 'TSO Grade',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);
    const createdGradeLevel = createGradeLevelResponse.body as GradeLevelBody;

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: subjectCode,
        name: 'TSO Subject',
        category: 'CORE',
      })
      .expect(201);
    const createdSubject = createSubjectResponse.body as SubjectBody;

    const createMappingResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        gradeLevelId: createdGradeLevel.id,
        subjectId: createdSubject.id,
        weeklyPeriods: 5,
      })
      .expect(201);
    const createdMapping = createMappingResponse.body as GradeLevelSubjectBody;
    createdGradeLevelSubjectIds.push(createdMapping.id);

    const createOfferingResponse = await request(httpServer())
      .post('/term-subject-offerings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        gradeLevelSubjectId: createdMapping.id,
        weeklyPeriods: 5,
        displayOrder: 1,
      })
      .expect(201);
    const createdOffering =
      createOfferingResponse.body as TermSubjectOfferingBody;
    createdTermSubjectOfferingIds.push(createdOffering.id);

    expect(createdOffering.id).toBeDefined();
    expect(createdOffering.weeklyPeriods).toBe(5);

    await request(httpServer())
      .patch(`/term-subject-offerings/${createdOffering.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        weeklyPeriods: 6,
      })
      .expect(200);

    const getOfferingResponse = await request(httpServer())
      .get(`/term-subject-offerings/${createdOffering.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    const offeringBody = getOfferingResponse.body as TermSubjectOfferingBody;
    expect(offeringBody.weeklyPeriods).toBe(6);
    expect(offeringBody.academicTermId).toBe(createdTerm.id);
    expect(offeringBody.gradeLevelSubjectId).toBe(createdMapping.id);

    const listResponse = await request(httpServer())
      .get('/term-subject-offerings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        academicTermId: createdTerm.id,
      })
      .expect(200);
    const listBody = listResponse.body as UsersListBody;
    expect(listBody.pagination.total).toBeGreaterThanOrEqual(1);

    await request(httpServer())
      .delete(`/term-subject-offerings/${createdOffering.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .get(`/term-subject-offerings/${createdOffering.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);
  });

  it('POST /term-subject-offerings should reject academic-year mismatch between term and mapping', async () => {
    const baseYearA = 3800 + Math.floor(Math.random() * 50);
    const baseYearB = baseYearA + 2;

    const createYearAResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.tso-ya`,
        name: `Academic Year ${baseYearA}/${baseYearA + 1}`,
        startDate: `${baseYearA}-09-01T00:00:00.000Z`,
        endDate: `${baseYearA + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);
    const createdYearA = createYearAResponse.body as AcademicYearBody;

    const createYearBResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.tso-yb`,
        name: `Academic Year ${baseYearB}/${baseYearB + 1}`,
        startDate: `${baseYearB}-09-01T00:00:00.000Z`,
        endDate: `${baseYearB + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);
    const createdYearB = createYearBResponse.body as AcademicYearBody;

    const createTermResponse = await request(httpServer())
      .post('/academic-terms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYearB.id,
        code: `${E2E_ACADEMIC_TERM_CODE_PREFIX}.tso-mm`,
        name: 'Mismatch Term',
        termType: 'SEMESTER',
        sequence: 1,
        startDate: `${baseYearB}-09-01T00:00:00.000Z`,
        endDate: `${baseYearB}-12-31T23:59:59.000Z`,
      })
      .expect(201);
    const createdTerm = createTermResponse.body as AcademicTermBody;

    const createGradeLevelResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: `${E2E_GRADE_LEVEL_CODE_PREFIX}.tso-mm`,
        name: 'Mismatch Grade',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);
    const createdGradeLevel = createGradeLevelResponse.body as GradeLevelBody;

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: `${E2E_SUBJECT_CODE_PREFIX}.tso-mm`,
        name: 'Mismatch Subject',
      })
      .expect(201);
    const createdSubject = createSubjectResponse.body as SubjectBody;

    const createMappingResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYearA.id,
        gradeLevelId: createdGradeLevel.id,
        subjectId: createdSubject.id,
      })
      .expect(201);
    const createdMapping = createMappingResponse.body as GradeLevelSubjectBody;
    createdGradeLevelSubjectIds.push(createdMapping.id);

    const response = await request(httpServer())
      .post('/term-subject-offerings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        gradeLevelSubjectId: createdMapping.id,
      })
      .expect(400);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(normalizeMessage(body.error.message)).toContain(
      'must belong to the same academic year',
    );
  });

  it('POST /term-subject-offerings should reject duplicate term and mapping pair', async () => {
    const baseYear = 3900 + Math.floor(Math.random() * 50);
    const yearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.tso-dup`;
    const termCode = `${E2E_ACADEMIC_TERM_CODE_PREFIX}.tso-dup`;
    const gradeLevelCode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.tso-dup`;
    const subjectCode = `${E2E_SUBJECT_CODE_PREFIX}.tso-dup`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: yearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);
    const createdYear = createYearResponse.body as AcademicYearBody;

    const createTermResponse = await request(httpServer())
      .post('/academic-terms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        code: termCode,
        name: 'Duplicate TSO Term',
        termType: 'SEMESTER',
        sequence: 1,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear}-12-31T23:59:59.000Z`,
      })
      .expect(201);
    const createdTerm = createTermResponse.body as AcademicTermBody;

    const createGradeLevelResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeLevelCode,
        name: 'Duplicate TSO Grade',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);
    const createdGradeLevel = createGradeLevelResponse.body as GradeLevelBody;

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: subjectCode,
        name: 'Duplicate TSO Subject',
      })
      .expect(201);
    const createdSubject = createSubjectResponse.body as SubjectBody;

    const createMappingResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        gradeLevelId: createdGradeLevel.id,
        subjectId: createdSubject.id,
      })
      .expect(201);
    const createdMapping = createMappingResponse.body as GradeLevelSubjectBody;
    createdGradeLevelSubjectIds.push(createdMapping.id);

    const createFirstResponse = await request(httpServer())
      .post('/term-subject-offerings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        gradeLevelSubjectId: createdMapping.id,
        weeklyPeriods: 4,
      })
      .expect(201);
    const createdOffering = createFirstResponse.body as TermSubjectOfferingBody;
    createdTermSubjectOfferingIds.push(createdOffering.id);

    const response = await request(httpServer())
      .post('/term-subject-offerings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        gradeLevelSubjectId: createdMapping.id,
        weeklyPeriods: 3,
      })
      .expect(409);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(409);
    expect(normalizeMessage(body.error.message)).toContain('must be unique');
  });

  it('GET /timetable-entries should return 403 for user without timetable-entries.read permission', async () => {
    const response = await request(httpServer())
      .get('/timetable-entries')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .expect(403);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(403);
    expect(normalizeMessage(body.error.message)).toContain(
      'Insufficient permissions',
    );
  });

  it('GET /hr-reports/summary should return 403 for user without hr-reports.read permission', async () => {
    const response = await request(httpServer())
      .get('/hr-reports/summary')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .expect(403);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(403);
    expect(normalizeMessage(body.error.message)).toContain(
      'Insufficient permissions',
    );
  });

  it('GET /grading-reports/summary should return 403 for user without grading-reports.read permission', async () => {
    const response = await request(httpServer())
      .get('/grading-reports/summary')
      .set('Authorization', `Bearer ${limitedAccessToken}`)
      .expect(403);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(403);
    expect(normalizeMessage(body.error.message)).toContain(
      'Insufficient permissions',
    );
  });

  it('GET /grading-reports/summary should return governance summary payload for authorized user', async () => {
    const response = await request(httpServer())
      .get('/grading-reports/summary')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const body = response.body as {
      generatedAt: string;
      semesterGrades: { total: number; byStatus: Array<{ count: number }> };
      annualGrades: {
        total: number;
        byStatus: Array<{ count: number }>;
        byFinalStatus: Array<{ count: number }>;
      };
      annualResults: {
        total: number;
        byStatus: Array<{ count: number }>;
        byPromotionDecision: Array<{ count: number }>;
      };
      rankingReadiness: { fullyRanked: number };
    };

    expect(typeof body.generatedAt).toBe('string');
    expect(body.semesterGrades.total).toBeGreaterThanOrEqual(0);
    expect(body.annualGrades.total).toBeGreaterThanOrEqual(0);
    expect(body.annualResults.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(body.semesterGrades.byStatus)).toBe(true);
    expect(Array.isArray(body.annualGrades.byStatus)).toBe(true);
    expect(Array.isArray(body.annualGrades.byFinalStatus)).toBe(true);
    expect(Array.isArray(body.annualResults.byStatus)).toBe(true);
    expect(Array.isArray(body.annualResults.byPromotionDecision)).toBe(true);
    expect(body.rankingReadiness.fullyRanked).toBeGreaterThanOrEqual(0);
  });

  it('GET /grading-reports/summary should reject invalid date range', async () => {
    const response = await request(httpServer())
      .get('/grading-reports/summary')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        fromDate: '2026-12-31T23:59:59.000Z',
        toDate: '2026-01-01T00:00:00.000Z',
      })
      .expect(400);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(normalizeMessage(body.error.message)).toContain(
      'fromDate must be before or equal to toDate',
    );
  });

  it('Timetable entries CRUD flow should work end-to-end', async () => {
    const baseYear = 4000 + Math.floor(Math.random() * 40);
    const yearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.tte-crud`;
    const termCode = `${E2E_ACADEMIC_TERM_CODE_PREFIX}.tte-crud`;
    const gradeCode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.tte-crud`;
    const sectionCode = `${E2E_SECTION_CODE_PREFIX}.tte-crud`;
    const subjectCode = `${E2E_SUBJECT_CODE_PREFIX}.tte-crud`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: yearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);
    const createdYear = createYearResponse.body as AcademicYearBody;

    const createTermResponse = await request(httpServer())
      .post('/academic-terms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        code: termCode,
        name: 'TTE Term',
        termType: 'SEMESTER',
        sequence: 1,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear}-12-31T23:59:59.000Z`,
      })
      .expect(201);
    const createdTerm = createTermResponse.body as AcademicTermBody;

    const createGradeResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeCode,
        name: 'TTE Grade',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);
    const createdGrade = createGradeResponse.body as GradeLevelBody;

    const createSectionResponse = await request(httpServer())
      .post('/sections')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        gradeLevelId: createdGrade.id,
        code: sectionCode,
        name: 'TTE Section',
        capacity: 25,
      })
      .expect(201);
    const createdSection = createSectionResponse.body as SectionBody;

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: subjectCode,
        name: 'TTE Subject',
      })
      .expect(201);
    const createdSubject = createSubjectResponse.body as SubjectBody;

    const createMappingResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        gradeLevelId: createdGrade.id,
        subjectId: createdSubject.id,
        weeklyPeriods: 4,
      })
      .expect(201);
    const createdMapping = createMappingResponse.body as GradeLevelSubjectBody;
    createdGradeLevelSubjectIds.push(createdMapping.id);

    const createOfferingResponse = await request(httpServer())
      .post('/term-subject-offerings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        gradeLevelSubjectId: createdMapping.id,
        weeklyPeriods: 4,
      })
      .expect(201);
    const createdOffering =
      createOfferingResponse.body as TermSubjectOfferingBody;
    createdTermSubjectOfferingIds.push(createdOffering.id);

    const createEntryResponse = await request(httpServer())
      .post('/timetable-entries')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        sectionId: createdSection.id,
        termSubjectOfferingId: createdOffering.id,
        dayOfWeek: 'MONDAY',
        periodIndex: 1,
        roomLabel: 'A-101',
      })
      .expect(201);
    const createdEntry = createEntryResponse.body as TimetableEntryBody;
    createdTimetableEntryIds.push(createdEntry.id);
    expect(createdEntry.id).toBeDefined();
    expect(createdEntry.periodIndex).toBe(1);

    await request(httpServer())
      .patch(`/timetable-entries/${createdEntry.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        dayOfWeek: 'TUESDAY',
        periodIndex: 2,
      })
      .expect(200);

    const getEntryResponse = await request(httpServer())
      .get(`/timetable-entries/${createdEntry.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
    const entryBody = getEntryResponse.body as TimetableEntryBody;
    expect(entryBody.dayOfWeek).toBe('TUESDAY');
    expect(entryBody.periodIndex).toBe(2);
    expect(entryBody.sectionId).toBe(createdSection.id);

    const listResponse = await request(httpServer())
      .get('/timetable-entries')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .query({
        academicTermId: createdTerm.id,
        sectionId: createdSection.id,
      })
      .expect(200);
    const listBody = listResponse.body as UsersListBody;
    expect(listBody.pagination.total).toBeGreaterThanOrEqual(1);

    await request(httpServer())
      .delete(`/timetable-entries/${createdEntry.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(httpServer())
      .get(`/timetable-entries/${createdEntry.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);
  });

  it('POST /timetable-entries should reject section grade mismatch with offering mapping', async () => {
    const baseYear = 4100 + Math.floor(Math.random() * 40);
    const yearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.tte-mm`;
    const termCode = `${E2E_ACADEMIC_TERM_CODE_PREFIX}.tte-mm`;
    const gradeAcode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.tte-a`;
    const gradeBcode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.tte-b`;
    const sectionCode = `${E2E_SECTION_CODE_PREFIX}.tte-mm`;
    const subjectCode = `${E2E_SUBJECT_CODE_PREFIX}.tte-mm`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: yearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);
    const createdYear = createYearResponse.body as AcademicYearBody;

    const createTermResponse = await request(httpServer())
      .post('/academic-terms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        code: termCode,
        name: 'Mismatch Timetable Term',
        termType: 'SEMESTER',
        sequence: 1,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear}-12-31T23:59:59.000Z`,
      })
      .expect(201);
    const createdTerm = createTermResponse.body as AcademicTermBody;

    const createGradeAResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeAcode,
        name: 'TTE Grade A',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);
    const createdGradeA = createGradeAResponse.body as GradeLevelBody;

    const createGradeBResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeBcode,
        name: 'TTE Grade B',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);
    const createdGradeB = createGradeBResponse.body as GradeLevelBody;

    const createSectionResponse = await request(httpServer())
      .post('/sections')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        gradeLevelId: createdGradeB.id,
        code: sectionCode,
        name: 'Mismatch Section',
      })
      .expect(201);
    const createdSection = createSectionResponse.body as SectionBody;

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: subjectCode,
        name: 'Mismatch Subject',
      })
      .expect(201);
    const createdSubject = createSubjectResponse.body as SubjectBody;

    const createMappingResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        gradeLevelId: createdGradeA.id,
        subjectId: createdSubject.id,
      })
      .expect(201);
    const createdMapping = createMappingResponse.body as GradeLevelSubjectBody;
    createdGradeLevelSubjectIds.push(createdMapping.id);

    const createOfferingResponse = await request(httpServer())
      .post('/term-subject-offerings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        gradeLevelSubjectId: createdMapping.id,
      })
      .expect(201);
    const createdOffering =
      createOfferingResponse.body as TermSubjectOfferingBody;
    createdTermSubjectOfferingIds.push(createdOffering.id);

    const response = await request(httpServer())
      .post('/timetable-entries')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        sectionId: createdSection.id,
        termSubjectOfferingId: createdOffering.id,
        dayOfWeek: 'MONDAY',
        periodIndex: 1,
      })
      .expect(400);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(400);
    expect(normalizeMessage(body.error.message)).toContain(
      'Section grade level must match',
    );
  });

  it('POST /timetable-entries should reject slot conflict in same term/section/day/period', async () => {
    const baseYear = 4200 + Math.floor(Math.random() * 40);
    const yearCode = `${E2E_ACADEMIC_YEAR_CODE_PREFIX}.tte-dup`;
    const termCode = `${E2E_ACADEMIC_TERM_CODE_PREFIX}.tte-dup`;
    const gradeCode = `${E2E_GRADE_LEVEL_CODE_PREFIX}.tte-dup`;
    const sectionCode = `${E2E_SECTION_CODE_PREFIX}.tte-dup`;
    const subjectCode = `${E2E_SUBJECT_CODE_PREFIX}.tte-dup`;

    const createYearResponse = await request(httpServer())
      .post('/academic-years')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: yearCode,
        name: `Academic Year ${baseYear}/${baseYear + 1}`,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear + 1}-06-30T23:59:59.000Z`,
      })
      .expect(201);
    const createdYear = createYearResponse.body as AcademicYearBody;

    const createTermResponse = await request(httpServer())
      .post('/academic-terms')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        code: termCode,
        name: 'Duplicate Timetable Term',
        termType: 'SEMESTER',
        sequence: 1,
        startDate: `${baseYear}-09-01T00:00:00.000Z`,
        endDate: `${baseYear}-12-31T23:59:59.000Z`,
      })
      .expect(201);
    const createdTerm = createTermResponse.body as AcademicTermBody;

    const createGradeResponse = await request(httpServer())
      .post('/grade-levels')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: gradeCode,
        name: 'Duplicate Timetable Grade',
        stage: 'OTHER',
        sequence: await nextGradeLevelSequence(GradeStage.OTHER),
      })
      .expect(201);
    const createdGrade = createGradeResponse.body as GradeLevelBody;

    const createSectionResponse = await request(httpServer())
      .post('/sections')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        gradeLevelId: createdGrade.id,
        code: sectionCode,
        name: 'Duplicate Timetable Section',
      })
      .expect(201);
    const createdSection = createSectionResponse.body as SectionBody;

    const createSubjectResponse = await request(httpServer())
      .post('/subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        code: subjectCode,
        name: 'Duplicate Timetable Subject',
      })
      .expect(201);
    const createdSubject = createSubjectResponse.body as SubjectBody;

    const createMappingResponse = await request(httpServer())
      .post('/grade-level-subjects')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicYearId: createdYear.id,
        gradeLevelId: createdGrade.id,
        subjectId: createdSubject.id,
      })
      .expect(201);
    const createdMapping = createMappingResponse.body as GradeLevelSubjectBody;
    createdGradeLevelSubjectIds.push(createdMapping.id);

    const createOfferingResponse = await request(httpServer())
      .post('/term-subject-offerings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        gradeLevelSubjectId: createdMapping.id,
      })
      .expect(201);
    const createdOffering =
      createOfferingResponse.body as TermSubjectOfferingBody;
    createdTermSubjectOfferingIds.push(createdOffering.id);

    const createFirstEntryResponse = await request(httpServer())
      .post('/timetable-entries')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        sectionId: createdSection.id,
        termSubjectOfferingId: createdOffering.id,
        dayOfWeek: 'MONDAY',
        periodIndex: 1,
      })
      .expect(201);
    const createdEntry = createFirstEntryResponse.body as TimetableEntryBody;
    createdTimetableEntryIds.push(createdEntry.id);

    const response = await request(httpServer())
      .post('/timetable-entries')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        academicTermId: createdTerm.id,
        sectionId: createdSection.id,
        termSubjectOfferingId: createdOffering.id,
        dayOfWeek: 'MONDAY',
        periodIndex: 1,
      })
      .expect(409);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(409);
    expect(normalizeMessage(body.error.message)).toContain(
      'Timetable slot conflict',
    );
  });

  it('POST /global-settings should reject duplicate keys', async () => {
    const duplicateKey = `${E2E_SETTING_KEY_PREFIX}.duplicate`;

    await request(httpServer())
      .post('/global-settings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        key: duplicateKey,
        valueType: 'STRING',
        value: 'first-value',
      })
      .expect(201);

    const response = await request(httpServer())
      .post('/global-settings')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        key: duplicateKey,
        valueType: 'STRING',
        value: 'second-value',
      })
      .expect(409);

    const body = response.body as ErrorEnvelope;
    expect(body.success).toBe(false);
    expect(body.statusCode).toBe(409);
    expect(normalizeMessage(body.error.message)).toContain('must be unique');
  });
});
