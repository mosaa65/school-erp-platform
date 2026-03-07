import { PrismaClient } from '@prisma/client';
import { runDemoSeed } from './seeds/demo';

const prisma = new PrismaClient();

async function main() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (
    nodeEnv === 'production' &&
    process.env.ALLOW_PRODUCTION_DEMO_SEED !== 'true'
  ) {
    throw new Error(
      'Demo seed is blocked in production. Set ALLOW_PRODUCTION_DEMO_SEED=true to override intentionally.',
    );
  }

  const result = await runDemoSeed(prisma);

  console.log('Demo seed completed');
  console.log(`Academic year: ${result.academicYearCode}`);
  console.log(`Target sections: ${result.targetSections.join(', ')}`);
  console.log(
    `Employees: ${result.employees.total} | Users: ${result.employees.users} | Teaching assignments: ${result.employees.teachingAssignments} | Section supervisions: ${result.employees.sectionSupervisions}`,
  );
  console.log(
    `Students: ${result.students.total} | Guardians: ${result.students.guardians} | Guardian users: ${result.students.guardianUsers} | Enrollments: ${result.students.enrollments} | Attendance: ${result.students.attendance} | Books: ${result.students.books}`,
  );
  console.log('Sample credentials:');
  for (const credential of result.sampleCredentials) {
    console.log(
      `- ${credential.label} | ${credential.roleCode} | ${credential.email} | ${credential.password}`,
    );
  }
  console.log(
    `Sample admissions: ${result.sampleStudentAdmissions.join(', ')}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
