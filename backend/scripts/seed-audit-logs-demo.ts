import { AuditStatus, Prisma, PrismaClient } from '@prisma/client';

type AuditDemoTemplate = {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  status: AuditStatus;
  description: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  outcome?: string;
  errorMessage?: string;
};

const DEMO_TAG = 'AUDIT_LOGS_DEMO_V1';

const DEMO_AUDIT_LOG_TEMPLATES: AuditDemoTemplate[] = [
  {
    id: 'demo-audit-log-001',
    action: 'ATTENDANCE_UPDATE',
    resource: 'attendance',
    resourceId: 'att-2026-04-01-001',
    status: AuditStatus.SUCCESS,
    description: 'تم تحديث حالة حضور طالب من غائب إلى حاضر بعد مراجعة الإدارة.',
    before: { status: 'ABSENT' },
    after: { status: 'PRESENT' },
    outcome: 'تم اعتماد التعديل.',
  },
  {
    id: 'demo-audit-log-002',
    action: 'GRADE_UPDATE',
    resource: 'grades',
    resourceId: 'grade-2026-04-01-011',
    status: AuditStatus.SUCCESS,
    description: 'تم تعديل درجة اختبار شهري بعد تصحيح خطأ إدخال.',
    before: { score: 72 },
    after: { score: 84 },
    outcome: 'تم حفظ الدرجة الجديدة.',
  },
  {
    id: 'demo-audit-log-003',
    action: 'FINANCE_EXPORT',
    resource: 'finance/revenues',
    status: AuditStatus.FAILURE,
    description: 'فشل تصدير تقرير الإيرادات بسبب عدم كفاية الصلاحيات.',
    errorMessage: 'لا تملك صلاحية التصدير لهذا التقرير.',
    outcome: 'تم إيقاف العملية.',
  },
  {
    id: 'demo-audit-log-004',
    action: 'INVOICE_CREATE',
    resource: 'fees',
    resourceId: 'inv-2026-APR-2001',
    status: AuditStatus.SUCCESS,
    description: 'تم إنشاء فاتورة رسوم دراسية للطالب.',
    before: null,
    after: { amount: 25000, currency: 'YER' },
    outcome: 'تم إنشاء الفاتورة بنجاح.',
  },
  {
    id: 'demo-audit-log-005',
    action: 'STUDENT_UPDATE',
    resource: 'students',
    resourceId: 'std-00151',
    status: AuditStatus.SUCCESS,
    description: 'تم تعديل بيانات التواصل للطالب.',
    before: { phone: '777000111' },
    after: { phone: '777000222' },
    outcome: 'تم تحديث بيانات الطالب.',
  },
  {
    id: 'demo-audit-log-006',
    action: 'EMPLOYEE_CREATE',
    resource: 'employees',
    resourceId: 'emp-00077',
    status: AuditStatus.SUCCESS,
    description: 'تمت إضافة معلم جديد ضمن قسم الرياضيات.',
    before: null,
    after: { department: 'رياضيات', isActive: true },
    outcome: 'تم إنشاء ملف الموظف.',
  },
  {
    id: 'demo-audit-log-007',
    action: 'PERMISSION_ASSIGN',
    resource: 'permissions',
    resourceId: 'perm-assign-009',
    status: AuditStatus.SUCCESS,
    description: 'تم إسناد صلاحية اعتماد الدرجات لمستخدم إداري.',
    before: { canApproveGrades: false },
    after: { canApproveGrades: true },
    outcome: 'تم تفعيل الصلاحية.',
  },
  {
    id: 'demo-audit-log-008',
    action: 'PERMISSION_REVOKE',
    resource: 'permissions',
    resourceId: 'perm-revoke-011',
    status: AuditStatus.SUCCESS,
    description: 'تم سحب صلاحية تصدير التقارير من مستخدم.',
    before: { canExportReports: true },
    after: { canExportReports: false },
    outcome: 'تم إلغاء الصلاحية.',
  },
  {
    id: 'demo-audit-log-009',
    action: 'NOTIFICATION_CREATE',
    resource: 'notifications',
    resourceId: 'notif-2026-04-0101',
    status: AuditStatus.SUCCESS,
    description: 'تم إنشاء إشعار جديد لأولياء الأمور بخصوص نتائج شهرية.',
    outcome: 'تم إرسال الإشعار بنجاح.',
  },
  {
    id: 'demo-audit-log-010',
    action: 'SYSTEM_SETTINGS_UPDATE',
    resource: 'system-settings',
    resourceId: 'sms-settings',
    status: AuditStatus.SUCCESS,
    description: 'تم تعديل إعدادات بوابة الرسائل النصية.',
    before: { provider: 'OFF' },
    after: { provider: 'ON' },
    outcome: 'تم حفظ الإعدادات.',
  },
  {
    id: 'demo-audit-log-011',
    action: 'LOGIN',
    resource: 'users',
    resourceId: 'login-session-011',
    status: AuditStatus.SUCCESS,
    description: 'تم تسجيل دخول مستخدم إلى لوحة الإدارة.',
    outcome: 'جلسة فعالة.',
  },
  {
    id: 'demo-audit-log-012',
    action: 'LOGIN',
    resource: 'users',
    resourceId: 'login-session-012',
    status: AuditStatus.FAILURE,
    description: 'محاولة تسجيل دخول فاشلة.',
    errorMessage: 'كلمة المرور غير صحيحة.',
    outcome: 'تم رفض الدخول.',
  },
  {
    id: 'demo-audit-log-013',
    action: 'ATTENDANCE_APPROVE',
    resource: 'attendance',
    resourceId: 'att-approve-013',
    status: AuditStatus.SUCCESS,
    description: 'تم اعتماد سجل حضور الفصل الأول.',
    outcome: 'تم الإغلاق بنجاح.',
  },
  {
    id: 'demo-audit-log-014',
    action: 'GRADE_APPROVE',
    resource: 'grades',
    resourceId: 'grades-approve-014',
    status: AuditStatus.SUCCESS,
    description: 'تم اعتماد كشوف الدرجات النهائية.',
    outcome: 'تم الاعتماد النهائي.',
  },
  {
    id: 'demo-audit-log-015',
    action: 'BILLING_EXPORT',
    resource: 'fees',
    resourceId: 'billing-export-015',
    status: AuditStatus.FAILURE,
    description: 'فشل تصدير ملف الرسوم بسبب خطأ في الاتصال.',
    errorMessage: 'انتهت مهلة الاتصال بخدمة التقارير.',
    outcome: 'يرجى إعادة المحاولة لاحقًا.',
  },
  {
    id: 'demo-audit-log-016',
    action: 'STUDENT_DELETE',
    resource: 'students',
    resourceId: 'std-00098',
    status: AuditStatus.SUCCESS,
    description: 'تم حذف سجل طالب من قاعدة البيانات بعد اعتماد لجنة القبول.',
    before: { isActive: true },
    after: { isDeleted: true },
    outcome: 'تم حذف السجل.',
  },
  {
    id: 'demo-audit-log-017',
    action: 'EMPLOYEE_UPDATE',
    resource: 'employees',
    resourceId: 'emp-00031',
    status: AuditStatus.SUCCESS,
    description: 'تم تحديث الدرجة الوظيفية لمعلم.',
    before: { grade: 'B2' },
    after: { grade: 'B3' },
    outcome: 'تمت الترقية.',
  },
  {
    id: 'demo-audit-log-018',
    action: 'NOTIFICATION_DELETE',
    resource: 'notifications',
    resourceId: 'notif-archive-018',
    status: AuditStatus.SUCCESS,
    description: 'تم أرشفة إشعار قديم لم يعد فعالًا.',
    before: { isActive: true },
    after: { isActive: false },
    outcome: 'تمت الأرشفة.',
  },
];

const prisma = new PrismaClient();

async function main() {
  const actors = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      userRoles: {
        where: {
          deletedAt: null,
        },
        select: {
          role: {
            select: {
              code: true,
            },
          },
        },
      },
    },
    orderBy: [
      {
        createdAt: 'asc',
      },
      {
        id: 'asc',
      },
    ],
    take: 12,
  });

  const now = Date.now();
  let upserted = 0;

  for (const [index, template] of DEMO_AUDIT_LOG_TEMPLATES.entries()) {
    const actor = actors.length > 0 ? actors[index % actors.length] : null;
    const actorRoleCodes = actor
      ? actor.userRoles
          .map((entry) => entry.role.code)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];

    const detailsObject: Record<string, unknown> = {
      description: template.description,
      actorRoleCodes,
      demoSeedTag: DEMO_TAG,
      seedIndex: index + 1,
      _requestContext: {
        requestId: `demo-request-${String(index + 1).padStart(3, '0')}`,
        correlationId: `demo-correlation-${String(index + 1).padStart(3, '0')}`,
        method: 'POST',
        path: `/demo/audit-logs/${template.id}`,
      },
    };

    if (template.before !== undefined) {
      detailsObject.before = template.before;
    }

    if (template.after !== undefined) {
      detailsObject.after = template.after;
    }

    if (template.outcome !== undefined) {
      detailsObject.outcome = template.outcome;
    }

    if (template.errorMessage !== undefined) {
      detailsObject.errorMessage = template.errorMessage;
    }

    const details = detailsObject as Prisma.InputJsonValue;

    await prisma.auditLog.upsert({
      where: {
        id: template.id,
      },
      update: {
        actorUserId: actor?.id ?? null,
        action: template.action,
        resource: template.resource,
        resourceId: template.resourceId ?? null,
        status: template.status,
        details,
        ipAddress: `10.10.0.${(index % 200) + 1}`,
        userAgent: `DemoSeedAgent/${DEMO_TAG}`,
        occurredAt: new Date(now - index * 10 * 60 * 1000),
        deletedAt: null,
        updatedById: actor?.id ?? null,
      },
      create: {
        id: template.id,
        actorUserId: actor?.id ?? null,
        action: template.action,
        resource: template.resource,
        resourceId: template.resourceId ?? null,
        status: template.status,
        details,
        ipAddress: `10.10.0.${(index % 200) + 1}`,
        userAgent: `DemoSeedAgent/${DEMO_TAG}`,
        occurredAt: new Date(now - index * 10 * 60 * 1000),
        createdById: actor?.id ?? null,
        updatedById: actor?.id ?? null,
      },
    });

    upserted += 1;
  }

  const totalAuditLogs = await prisma.auditLog.count({
    where: {
      deletedAt: null,
    },
  });

  const seededAuditLogs = await prisma.auditLog.count({
    where: {
      deletedAt: null,
      action: {
        startsWith: 'ATTENDANCE_',
      },
      userAgent: `DemoSeedAgent/${DEMO_TAG}`,
    },
  });

  console.log(`Audit demo seed completed. Upserted: ${upserted}`);
  console.log(`Total audit logs: ${totalAuditLogs}`);
  console.log(`Demo-tagged attendance audit logs: ${seededAuditLogs}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
