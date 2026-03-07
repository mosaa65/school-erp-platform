import type { PrismaClient } from '@prisma/client';
import { seedDemoAcademicFoundation } from './academic-foundation.seed';
import { seedDemoEmployees } from './employee.seed';
import { seedDemoStudentData } from './student.seed';
import { seedDemoSubject } from './subject.seed';
import { seedDemoTimetable } from './timetable.seed';

export async function runDemoSeed(prisma: PrismaClient) {
  const academic = await seedDemoAcademicFoundation(prisma);
  await seedDemoSubject(prisma);
  const employee = await seedDemoEmployees(prisma, academic);
  const student = await seedDemoStudentData(prisma, academic);
  await seedDemoTimetable(prisma, academic);

  return {
    academicYearCode: academic.academicYearCode,
    targetSections: academic.targetSections.map(
      (item) => `${item.gradeLevelCode}:${item.code}`,
    ),
    employees: {
      total: employee.employeesTotal,
      users: employee.usersTotal,
      teachingAssignments: employee.teachingAssignmentsTotal,
      sectionSupervisions: employee.sectionSupervisionsTotal,
    },
    students: {
      total: student.studentsTotal,
      guardians: student.guardiansTotal,
      guardianUsers: student.guardianUsersTotal,
      enrollments: student.enrollmentsTotal,
      attendance: student.attendanceTotal,
      books: student.studentBooksTotal,
    },
    sampleCredentials: [
      ...employee.sampleCredentials.slice(0, 4),
      ...student.sampleCredentials.slice(0, 4),
    ],
    sampleStudentAdmissions: student.sampleStudentAdmissions,
  };
}
