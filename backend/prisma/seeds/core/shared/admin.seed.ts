import { hash } from 'bcrypt';
import type { PrismaClient } from '@prisma/client';

type SeedPermission = {
  id: string;
  code: string;
};

type RoleSeedDefinition = {
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  includePermission: (params: {
    code: string;
    resource: string;
    action: string;
  }) => boolean;
};

const TEACHER_READ_RESOURCES = new Set([
  'school-profiles',
  'academic-years',
  'academic-terms',
  'academic-months',
  'grade-levels',
  'sections',
  'subjects',
  'grade-level-subjects',
  'term-subject-offerings',
  'timetable-entries',
  'students',
  'student-enrollments',
  'student-attendance',
  'homework-types',
  'homeworks',
  'student-homeworks',
  'exam-periods',
  'exam-assessments',
  'student-exam-scores',
  'monthly-grades',
  'monthly-custom-component-scores',
  'semester-grades',
  'annual-grades',
  'annual-results',
  'annual-statuses',
  'promotion-decisions',
  'grading-outcome-rules',
  'grading-reports',
  'reminders-ticker',
  'lookup-blood-types',
  'lookup-id-types',
  'lookup-enrollment-statuses',
  'lookup-orphan-statuses',
  'lookup-ability-levels',
  'lookup-activity-types',
]);

const TEACHER_WRITE_RESOURCES = new Set([
  'homeworks',
  'student-homeworks',
  'student-attendance',
  'student-exam-scores',
  'monthly-custom-component-scores',
  'monthly-grades',
  'semester-grades',
  'annual-grades',
]);

const CLASS_SUPERVISOR_EXTRA_READ_RESOURCES = new Set([
  'guardians',
  'student-guardians',
  'student-books',
]);

const CLASS_SUPERVISOR_EXTRA_WRITE_RESOURCES = new Set([
  'students',
  'guardians',
  'student-guardians',
  'student-enrollments',
  'student-books',
]);

const SUPERVISOR_EXTRA_WRITE_RESOURCES = new Set([
  'homework-types',
  'homeworks',
  'student-homeworks',
  'student-attendance',
  'exam-periods',
  'exam-assessments',
  'student-exam-scores',
  'monthly-grades',
  'monthly-custom-component-scores',
  'semester-grades',
  'annual-grades',
  'annual-results',
  'annual-statuses',
  'promotion-decisions',
  'grading-outcome-rules',
  'employee-performance-evaluations',
  'employee-teaching-assignments',
]);

const SUPERVISOR_EXTRA_ACTION_CODES = new Set([
  'monthly-grades.calculate',
  'monthly-grades.lock',
  'monthly-grades.unlock',
  'semester-grades.calculate',
  'semester-grades.fill-final-exam',
  'semester-grades.lock',
  'semester-grades.unlock',
  'annual-grades.lock',
  'annual-grades.unlock',
  'annual-results.calculate',
  'annual-results.lock',
  'annual-results.unlock',
]);

const EMPLOYEE_READ_RESOURCES = new Set([
  'school-profiles',
  'academic-years',
  'academic-terms',
  'academic-months',
  'grade-levels',
  'sections',
  'subjects',
  'timetable-entries',
  'students',
  'student-enrollments',
  'student-attendance',
  'employees',
  'employee-attendance',
  'employee-tasks',
  'employee-courses',
  'employee-talents',
  'hr-reports',
  'reminders-ticker',
  'system-settings',
  'lookup-blood-types',
  'lookup-id-types',
  'lookup-enrollment-statuses',
  'lookup-orphan-statuses',
  'lookup-ability-levels',
  'lookup-activity-types',
]);

function splitPermissionCode(code: string) {
  const [resource, action = 'manage'] = code.split('.', 2);
  return { resource, action };
}

function isReadPermission(code: string, action: string) {
  return action === 'read' || code === 'grading-reports.read' || code === 'hr-reports.read';
}

function canTeacherAccess(params: { code: string; resource: string; action: string }) {
  if (isReadPermission(params.code, params.action)) {
    return TEACHER_READ_RESOURCES.has(params.resource);
  }

  if (params.action === 'create' || params.action === 'update') {
    return TEACHER_WRITE_RESOURCES.has(params.resource);
  }

  return false;
}

function canClassSupervisorAccess(params: {
  code: string;
  resource: string;
  action: string;
}) {
  if (canTeacherAccess(params)) {
    return true;
  }

  if (isReadPermission(params.code, params.action)) {
    return CLASS_SUPERVISOR_EXTRA_READ_RESOURCES.has(params.resource);
  }

  if (params.action === 'create' || params.action === 'update') {
    return CLASS_SUPERVISOR_EXTRA_WRITE_RESOURCES.has(params.resource);
  }

  return false;
}

const ROLE_DEFINITIONS: RoleSeedDefinition[] = [
  {
    code: 'super_admin',
    name: 'مدير النظام',
    description: 'صلاحية شاملة لكل أنظمة المنصة بدون قيود.',
    isSystem: true,
    includePermission: () => true,
  },
  {
    code: 'school_admin',
    name: 'مدير المدرسة',
    description: 'إدارة تشغيل المدرسة بالكامل مع صلاحيات إدارية متقدمة.',
    isSystem: true,
    includePermission: ({ code }) =>
      !['permissions.create', 'permissions.update', 'permissions.delete'].includes(code),
  },
  {
    code: 'supervisor',
    name: 'مشرف',
    description: 'إشراف أكاديمي مع اعتماد ومتابعة عمليات التعليم والدرجات.',
    isSystem: false,
    includePermission: (params) => {
      if (canClassSupervisorAccess(params)) {
        return true;
      }

      if (params.action === 'create' || params.action === 'update') {
        return SUPERVISOR_EXTRA_WRITE_RESOURCES.has(params.resource);
      }

      return SUPERVISOR_EXTRA_ACTION_CODES.has(params.code);
    },
  },
  {
    code: 'teacher',
    name: 'معلم',
    description: 'تنفيذ أعمال التدريس والحضور والواجبات وإدخال الدرجات.',
    isSystem: false,
    includePermission: canTeacherAccess,
  },
  {
    code: 'class_supervisor',
    name: 'مربي/رائد صف',
    description: 'متابعة الصف والطلاب وأولياء الأمور إضافةً لصلاحيات التدريس.',
    isSystem: false,
    includePermission: canClassSupervisorAccess,
  },
  {
    code: 'employee',
    name: 'موظف',
    description: 'وصول تشغيلي محدود للعرض وبعض الأعمال اليومية.',
    isSystem: false,
    includePermission: (params) => {
      if (isReadPermission(params.code, params.action)) {
        return EMPLOYEE_READ_RESOURCES.has(params.resource);
      }

      if (params.action === 'create' || params.action === 'update') {
        return params.resource === 'employee-attendance';
      }

      return false;
    },
  },
  {
    code: 'viewer',
    name: 'مشاهد فقط',
    description: 'وصول قراءة فقط للتقارير والبيانات بدون صلاحيات تعديل.',
    isSystem: false,
    includePermission: ({ code, action }) => isReadPermission(code, action),
  },
];

async function syncRolePermissions(
  prisma: PrismaClient,
  roleId: string,
  permissionIds: string[],
) {
  const selectedIds = Array.from(new Set(permissionIds));

  for (const permissionId of selectedIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      update: {
        deletedAt: null,
        updatedById: null,
      },
      create: {
        roleId,
        permissionId,
      },
    });
  }

  await prisma.rolePermission.updateMany({
    where: {
      roleId,
      deletedAt: null,
      permissionId: {
        notIn: selectedIds,
      },
    },
    data: {
      deletedAt: new Date(),
      updatedById: null,
    },
  });
}

async function seedDefaultRoles(
  prisma: PrismaClient,
  permissions: SeedPermission[],
) {
  const roleIdByCode = new Map<string, string>();

  for (const roleDefinition of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: {
        code: roleDefinition.code,
      },
      update: {
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystem: roleDefinition.isSystem,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: roleDefinition.code,
        name: roleDefinition.name,
        description: roleDefinition.description,
        isSystem: roleDefinition.isSystem,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    roleIdByCode.set(roleDefinition.code, role.id);

    const selectedPermissionIds = permissions
      .filter((permission) => {
        const { resource, action } = splitPermissionCode(permission.code);
        return roleDefinition.includePermission({
          code: permission.code,
          resource,
          action,
        });
      })
      .map((permission) => permission.id);

    await syncRolePermissions(prisma, role.id, selectedPermissionIds);
  }

  return roleIdByCode;
}

export async function seedSuperAdmin(
  prisma: PrismaClient,
  permissions: SeedPermission[],
) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@school.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const roleIdByCode = await seedDefaultRoles(prisma, permissions);
  const superAdminRoleId = roleIdByCode.get('super_admin');

  if (!superAdminRoleId) {
    throw new Error('Failed to seed super_admin role');
  }

  const passwordHash = await hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
    },
    select: {
      id: true,
      email: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRoleId,
      },
    },
    update: {
      deletedAt: null,
      updatedById: null,
    },
    create: {
      userId: adminUser.id,
      roleId: superAdminRoleId,
    },
  });

  return {
    email: adminUser.email,
    password: adminPassword,
  };
}
