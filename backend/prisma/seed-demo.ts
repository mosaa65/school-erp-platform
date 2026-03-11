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
    `Employees: ${result.employees.total} | Users: ${result.employees.users} | Teaching assignments: ${result.employees.teachingAssignments} | Section supervisions: ${result.employees.sectionSupervisions} | Employee talents mappings: ${result.employees.talentsMappings} | Employees with talents: ${result.employees.employeesWithTalents}`,
  );
  console.log(
    `Students: ${result.students.total} | Guardians: ${result.students.guardians} | Guardian users: ${result.students.guardianUsers} | Enrollments: ${result.students.enrollments} | Attendance: ${result.students.attendance} | Books: ${result.students.books} | Talents: ${result.students.talents} | Siblings: ${result.students.siblings} | Problems: ${result.students.problems} | Parent notifications: ${result.students.parentNotifications}`,
  );
  console.log(
    `Teaching & Grades: Policies: ${result.teachingGrades.gradingPolicies} | Components: ${result.teachingGrades.gradingPolicyComponents} | Exam periods: ${result.teachingGrades.examPeriods} | Exam assessments: ${result.teachingGrades.examAssessments} | Student exam scores: ${result.teachingGrades.studentExamScores} | Homework types: ${result.teachingGrades.homeworkTypes} | Homeworks: ${result.teachingGrades.homeworks} | Student homeworks: ${result.teachingGrades.studentHomeworks}`,
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
  console.log(`Talents used: ${result.talentsUsed.join(', ')}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
