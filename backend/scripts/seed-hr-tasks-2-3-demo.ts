import {
  EmployeeAttendanceStatus,
  EmployeeGender,
  EmployeeLeaveRequestStatus,
  EmployeeLeaveType,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_YEAR = 2026;
const TARGET_MONTH = 4;

type DepartmentSeed = {
  code: string;
  name: string;
  description: string;
};

const DEPARTMENTS: DepartmentSeed[] = [
  {
    code: 'HR',
    name: 'الموارد البشرية',
    description: 'قسم شؤون الموظفين والتشغيل الإداري.',
  },
  {
    code: 'ACA',
    name: 'الشؤون الأكاديمية',
    description: 'قسم المتابعة الأكاديمية والإسناد.',
  },
  {
    code: 'ADM',
    name: 'الإدارة والخدمات',
    description: 'قسم الدعم الإداري والخدمات التشغيلية.',
  },
];

const ATTENDANCE_DATES = [
  '2026-04-01T00:00:00.000Z',
  '2026-04-02T00:00:00.000Z',
  '2026-04-03T00:00:00.000Z',
  '2026-04-06T00:00:00.000Z',
  '2026-04-07T00:00:00.000Z',
] as const;

const ATTENDANCE_PATTERN: EmployeeAttendanceStatus[] = [
  EmployeeAttendanceStatus.PRESENT,
  EmployeeAttendanceStatus.PRESENT,
  EmployeeAttendanceStatus.LATE,
  EmployeeAttendanceStatus.ABSENT,
  EmployeeAttendanceStatus.EXCUSED_ABSENCE,
];

function toDate(value: string) {
  return new Date(value);
}

function daysInclusive(start: Date, end: Date) {
  const startUtc = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const endUtc = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  );
  return Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;
}

async function ensureDepartments() {
  const byCode = new Map<string, string>();

  for (const item of DEPARTMENTS) {
    const record = await prisma.employeeDepartment.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        isActive: true,
      },
      select: { id: true, code: true },
    });

    byCode.set(record.code, record.id);
  }

  return byCode;
}

async function main() {
  const existingActiveEmployees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      hireDate: true,
      branchId: true,
    },
    orderBy: [{ jobNumber: 'asc' }, { fullName: 'asc' }],
    take: 16,
  });

  const minimumDemoEmployees = 10;
  if (existingActiveEmployees.length < minimumDemoEmployees) {
    const employeesToCreate = minimumDemoEmployees - existingActiveEmployees.length;

    for (let index = 0; index < employeesToCreate; index += 1) {
      const serial = String(index + 1).padStart(3, '0');
      const jobNumber = `DEMO-HR-${serial}`;
      const gender = index % 2 === 0 ? EmployeeGender.MALE : EmployeeGender.FEMALE;
      const fullName = gender === EmployeeGender.MALE
        ? `موظف تجريبي ${serial}`
        : `موظفة تجريبية ${serial}`;

      await prisma.employee.upsert({
        where: { jobNumber },
        update: {
          fullName,
          gender,
          jobTitle: 'موظف تجريبي',
          hireDate: new Date('2026-01-01T00:00:00.000Z'),
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          jobNumber,
          fullName,
          gender,
          jobTitle: 'موظف تجريبي',
          hireDate: new Date('2026-01-01T00:00:00.000Z'),
          isActive: true,
        },
      });
    }
  }

  const activeEmployees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      jobNumber: true,
      hireDate: true,
      branchId: true,
    },
    orderBy: [{ jobNumber: 'asc' }, { fullName: 'asc' }],
    take: 16,
  });

  if (activeEmployees.length === 0) {
    throw new Error(
      'No active employees found. Run core/demo seed first then run this script again.',
    );
  }

  const departments = await ensureDepartments();
  const departmentIds = Array.from(departments.values());
  const assignedEmployees = activeEmployees.slice(0, Math.max(8, activeEmployees.length - 2));
  const unassignedEmployees = activeEmployees.slice(assignedEmployees.length);

  let departmentsAssigned = 0;
  for (const [index, employee] of assignedEmployees.entries()) {
    const departmentId = departmentIds[index % departmentIds.length];
    if (!departmentId) {
      continue;
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        departmentId,
        updatedById: null,
      },
      select: { id: true },
    });
    departmentsAssigned += 1;
  }

  for (const employee of unassignedEmployees) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        departmentId: null,
        updatedById: null,
      },
      select: { id: true },
    });
  }

  let contractsCreated = 0;
  let contractsUpdated = 0;

  const contractEmployees = activeEmployees.slice(0, Math.min(10, activeEmployees.length));
  for (const [index, employee] of contractEmployees.entries()) {
    const salaryAmount = (3200 + index * 180).toFixed(2);
    const contractStartDate =
      employee.hireDate && employee.hireDate < toDate(`${TARGET_YEAR}-01-01T00:00:00.000Z`)
        ? toDate(`${TARGET_YEAR}-01-01T00:00:00.000Z`)
        : employee.hireDate ?? toDate(`${TARGET_YEAR}-01-01T00:00:00.000Z`);

    const existingCurrent = await prisma.employeeContract.findFirst({
      where: {
        employeeId: employee.id,
        deletedAt: null,
        isCurrent: true,
        isActive: true,
      },
      select: { id: true },
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (existingCurrent) {
      await prisma.employeeContract.update({
        where: { id: existingCurrent.id },
        data: {
          contractTitle: 'عقد دوام أساسي - بيانات تجريبية',
          contractNumber: `DEMO-CNT-${String(index + 1).padStart(4, '0')}`,
          contractStartDate,
          contractEndDate: null,
          salaryAmount,
          isCurrent: true,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
      });
      contractsUpdated += 1;
      continue;
    }

    await prisma.employeeContract.create({
      data: {
        employeeId: employee.id,
        contractTitle: 'عقد دوام أساسي - بيانات تجريبية',
        contractNumber: `DEMO-CNT-${String(index + 1).padStart(4, '0')}`,
        contractStartDate,
        contractEndDate: null,
        salaryAmount,
        notes: 'تمت إضافته كسجل تجريبي لاختبار Payroll Preview',
        isCurrent: true,
        isActive: true,
      },
    });
    contractsCreated += 1;
  }

  let unpaidLeavesCreated = 0;
  const unpaidLeaveEmployees = contractEmployees.slice(0, Math.min(3, contractEmployees.length));
  const leaveRanges = [
    { start: '2026-04-02T00:00:00.000Z', end: '2026-04-03T00:00:00.000Z' },
    { start: '2026-04-08T00:00:00.000Z', end: '2026-04-10T00:00:00.000Z' },
    { start: '2026-04-14T00:00:00.000Z', end: '2026-04-14T00:00:00.000Z' },
  ];

  for (const [index, employee] of unpaidLeaveEmployees.entries()) {
    const range = leaveRanges[index];
    if (!range) {
      continue;
    }
    const startDate = toDate(range.start);
    const endDate = toDate(range.end);

    const existing = await prisma.employeeLeaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        deletedAt: null,
        leaveType: EmployeeLeaveType.UNPAID,
        status: EmployeeLeaveRequestStatus.APPROVED,
        startDate,
        endDate,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.employeeLeaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: EmployeeLeaveType.UNPAID,
        startDate,
        endDate,
        totalDays: daysInclusive(startDate, endDate),
        status: EmployeeLeaveRequestStatus.APPROVED,
        reason: 'إجازة غير مدفوعة - بيانات تجريبية',
        notes: 'تمت إضافتها لاختبار خصومات Payroll Preview',
        approvedByUserId: null,
        approvedAt: new Date(),
        isActive: true,
      },
    });
    unpaidLeavesCreated += 1;
  }

  let attendanceUpserts = 0;
  const attendanceEmployees = activeEmployees.slice(0, Math.min(8, activeEmployees.length));
  for (const [employeeIndex, employee] of attendanceEmployees.entries()) {
    for (const [dateIndex, dateValue] of ATTENDANCE_DATES.entries()) {
      const attendanceDate = toDate(dateValue);
      const patternStatus = ATTENDANCE_PATTERN[(employeeIndex + dateIndex) % ATTENDANCE_PATTERN.length];
      if (!patternStatus) {
        continue;
      }

      await prisma.employeeAttendance.upsert({
        where: {
          employeeId_attendanceDate: {
            employeeId: employee.id,
            attendanceDate,
          },
        },
        update: {
          status: patternStatus,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
        create: {
          employeeId: employee.id,
          attendanceDate,
          status: patternStatus,
          isActive: true,
        },
      });

      attendanceUpserts += 1;
    }
  }

  console.log('HR tasks 2/3 demo seed completed');
  console.log(`Target period: ${TARGET_MONTH}/${TARGET_YEAR}`);
  console.log(`Employees processed: ${activeEmployees.length}`);
  console.log(`Departments assigned: ${departmentsAssigned}`);
  console.log(
    `Contracts -> created: ${contractsCreated}, updated: ${contractsUpdated}`,
  );
  console.log(`Approved unpaid leaves created: ${unpaidLeavesCreated}`);
  console.log(`Attendance records upserted: ${attendanceUpserts}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
