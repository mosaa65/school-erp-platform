import type { PrismaClient } from '@prisma/client';
import { seedDemoAcademicFoundation } from './academic-foundation.seed';
import { seedDemoEmployees } from './employee.seed';
import { seedDemoEmployeeTalents } from './employee-talents.seed';
import { seedDemoStudentData } from './student.seed';
import { seedDemoStudentExtensions } from './student-extensions.seed';
import { seedDemoSubject } from './subject.seed';
import { seedDemoHealthVisits } from './health-visits.seed';
import { seedDemoTeachingGrades } from './teaching-grades.seed';
import { seedDemoTimetable } from './timetable.seed';

export async function runDemoSeed(prisma: PrismaClient) {
  const academic = await seedDemoAcademicFoundation(prisma);
  await seedDemoSubject(prisma);
  const employee = await seedDemoEmployees(prisma, academic);
  const employeeTalents = await seedDemoEmployeeTalents(prisma, employee);
  const student = await seedDemoStudentData(prisma, academic);
  const studentExtensions = await seedDemoStudentExtensions(prisma, academic);
  const healthVisits = await seedDemoHealthVisits(prisma);
  const teachingGrades = await seedDemoTeachingGrades(prisma, academic);

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
      talentsMappings: employeeTalents.mappingsTotal,
      employeesWithTalents: employeeTalents.employeesWithTalents,
    },
    students: {
      total: student.studentsTotal,
      guardians: student.guardiansTotal,
      guardianUsers: student.guardianUsersTotal,
      enrollments: student.enrollmentsTotal,
      attendance: student.attendanceTotal,
      books: student.studentBooksTotal,
      talents: studentExtensions.studentTalentsTotal,
      siblings: studentExtensions.studentSiblingsTotal,
      problems: studentExtensions.studentProblemsTotal,
      parentNotifications: studentExtensions.parentNotificationsTotal,
    },
    teachingGrades: {
      gradingPolicies: teachingGrades.gradingPoliciesTotal,
      gradingPolicyComponents: teachingGrades.gradingPolicyComponentsTotal,
      examPeriods: teachingGrades.examPeriodsTotal,
      examAssessments: teachingGrades.examAssessmentsTotal,
      studentExamScores: teachingGrades.studentExamScoresTotal,
      homeworkTypes: teachingGrades.homeworkTypesTotal,
      homeworks: teachingGrades.homeworksTotal,
      studentHomeworks: teachingGrades.studentHomeworksTotal,
    },
    sampleCredentials: [
      ...employee.sampleCredentials.slice(0, 4),
      ...student.sampleCredentials.slice(0, 4),
    ],
    sampleStudentAdmissions: student.sampleStudentAdmissions,
    talentsUsed: employeeTalents.talentsUsed,
    healthVisitsRecorded: healthVisits.created,
  };
}

