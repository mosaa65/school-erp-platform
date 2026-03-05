import type { PrismaClient } from '@prisma/client';
import { seedDemoAcademicFoundation } from './academic-foundation.seed';
import { seedDemoEmployee } from './employee.seed';
import { seedDemoStudentData } from './student.seed';
import { seedDemoSubject } from './subject.seed';
import { seedDemoTimetable } from './timetable.seed';

export async function runDemoSeed(prisma: PrismaClient) {
  const academic = await seedDemoAcademicFoundation(prisma);
  await seedDemoSubject(prisma);
  const employee = await seedDemoEmployee(prisma);
  const student = await seedDemoStudentData(prisma, academic);
  await seedDemoTimetable(prisma, academic);

  return {
    academicYearCode: academic.academicYearCode,
    sectionCode: academic.sectionCode,
    employeeReference: employee.jobNumber ?? employee.id,
    studentReference: student.admissionNo ?? student.id,
  };
}
