
import {
  AssessmentType,
  ExamAbsenceType,
  GradingComponentCalculationMode,
  GradingWorkflowStatus,
  Prisma,
  type PrismaClient,
} from '@prisma/client';
import type { DemoAcademicFoundation } from './academic-foundation.seed';

type DemoTeachingGradesResult = {
  gradingPoliciesTotal: number;
  gradingPolicyComponentsTotal: number;
  examPeriodsTotal: number;
  examAssessmentsTotal: number;
  studentExamScoresTotal: number;
  homeworkTypesTotal: number;
  homeworksTotal: number;
  studentHomeworksTotal: number;
};

type GradeSubject = {
  gradeLevelId: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
};

type TermSnapshot = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
};

type ExamPeriodMap = {
  monthly: { id: string };
  midterm: { id: string };
  final: { id: string };
};

const DEFAULT_SUBJECTS_PER_GRADE = Number(
  process.env.DEMO_GRADES_SUBJECTS_PER_GRADE ?? '4',
);
const DEFAULT_MONTHS_PER_TERM = Number(
  process.env.DEMO_GRADES_MONTHS_PER_TERM ?? '2',
);
const DEFAULT_STUDENTS_PER_SECTION = Number(
  process.env.DEMO_GRADES_STUDENTS_PER_SECTION ?? '10',
);

const HOMEWORK_TYPE_DEFINITIONS = [
  {
    code: 'HW',
    name: 'واجب منزلي',
    description: 'واجبات أسبوعية قصيرة.',
  },
  {
    code: 'PROJECT',
    name: 'مشروع',
    description: 'مشروع تطبيقي مرتبط بوحدة دراسية.',
  },
  {
    code: 'QUIZ',
    name: 'اختبار قصير',
    description: 'تقييم قصير داخل الفصل.',
  },
];

const GRADING_POLICY_TEMPLATES = [
  {
    assessmentType: AssessmentType.MONTHLY,
    passingScore: 50,
    isDefault: true,
    components: [
      {
        code: 'EXAM',
        name: 'الاختبارات',
        maxScore: 40,
        calculationMode: GradingComponentCalculationMode.AUTO_EXAM,
        includeInMonthly: true,
        includeInSemester: true,
        sortOrder: 1,
      },
      {
        code: 'HOMEWORK',
        name: 'الواجبات',
        maxScore: 20,
        calculationMode: GradingComponentCalculationMode.AUTO_HOMEWORK,
        includeInMonthly: true,
        includeInSemester: true,
        sortOrder: 2,
      },
      {
        code: 'ATTENDANCE',
        name: 'الحضور',
        maxScore: 10,
        calculationMode: GradingComponentCalculationMode.AUTO_ATTENDANCE,
        includeInMonthly: true,
        includeInSemester: true,
        sortOrder: 3,
      },
      {
        code: 'ACTIVITY',
        name: 'النشاط',
        maxScore: 10,
        calculationMode: GradingComponentCalculationMode.MANUAL,
        includeInMonthly: true,
        includeInSemester: true,
        sortOrder: 4,
      },
      {
        code: 'CONTRIBUTION',
        name: 'المشاركة',
        maxScore: 20,
        calculationMode: GradingComponentCalculationMode.MANUAL,
        includeInMonthly: true,
        includeInSemester: true,
        sortOrder: 5,
      },
    ],
  },
  {
    assessmentType: AssessmentType.MIDTERM,
    passingScore: 15,
    isDefault: false,
    components: [
      {
        code: 'MIDTERM_EXAM',
        name: 'اختبار منتصف الفصل',
        maxScore: 30,
        calculationMode: GradingComponentCalculationMode.AUTO_EXAM,
        includeInMonthly: false,
        includeInSemester: true,
        sortOrder: 1,
      },
    ],
  },
  {
    assessmentType: AssessmentType.FINAL,
    passingScore: 30,
    isDefault: false,
    components: [
      {
        code: 'FINAL_EXAM',
        name: 'الاختبار النهائي',
        maxScore: 60,
        calculationMode: GradingComponentCalculationMode.AUTO_EXAM,
        includeInMonthly: false,
        includeInSemester: true,
        sortOrder: 1,
      },
    ],
  },
];

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function addUtcDays(source: Date, days: number): Date {
  const result = new Date(
    Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()),
  );
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function clampDate(date: Date, min: Date, max: Date): Date {
  if (date < min) {
    return new Date(min);
  }
  if (date > max) {
    return new Date(max);
  }
  return date;
}

function scoreFromIndex(maxScore: number, index: number) {
  const ratio = 0.62 + (index % 6) * 0.07;
  return Math.round(maxScore * ratio * 100) / 100;
}

export async function seedDemoTeachingGrades(
  prisma: PrismaClient,
  context: DemoAcademicFoundation,
): Promise<DemoTeachingGradesResult> {
  if (DEFAULT_SUBJECTS_PER_GRADE < 1 || DEFAULT_SUBJECTS_PER_GRADE > 8) {
    throw new Error('DEMO_GRADES_SUBJECTS_PER_GRADE must be between 1 and 8');
  }

  if (DEFAULT_MONTHS_PER_TERM < 1 || DEFAULT_MONTHS_PER_TERM > 4) {
    throw new Error('DEMO_GRADES_MONTHS_PER_TERM must be between 1 and 4');
  }

  if (DEFAULT_STUDENTS_PER_SECTION < 4 || DEFAULT_STUDENTS_PER_SECTION > 30) {
    throw new Error('DEMO_GRADES_STUDENTS_PER_SECTION must be between 4 and 30');
  }

  const termIds = Object.values(context.academicTermIds);
  const gradeLevelIds = Array.from(
    new Set(context.targetSections.map((item) => item.gradeLevelId)),
  );

  const [terms, months, gradeLevelSubjects, homeworkTypes] = await Promise.all([
    prisma.academicTerm.findMany({
      where: {
        id: {
          in: termIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.academicMonth.findMany({
      where: {
        academicYearId: context.academicYearId,
        academicTermId: {
          in: termIds,
        },
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        academicTermId: true,
        name: true,
        code: true,
        sequence: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.gradeLevelSubject.findMany({
      where: {
        academicYearId: context.academicYearId,
        gradeLevelId: {
          in: gradeLevelIds,
        },
        deletedAt: null,
        isActive: true,
      },
      select: {
        gradeLevelId: true,
        subjectId: true,
        displayOrder: true,
        subject: {
          select: {
            code: true,
            name: true,
          },
        },
        gradeLevel: {
          select: {
            sequence: true,
          },
        },
      },
      orderBy: [
        {
          gradeLevel: {
            sequence: 'asc',
          },
        },
        {
          displayOrder: 'asc',
        },
      ],
    }),
    prisma.homeworkType.findMany({
      where: {
        code: {
          in: HOMEWORK_TYPE_DEFINITIONS.map((item) => item.code),
        },
      },
      select: {
        id: true,
        code: true,
      },
    }),
  ]);

  const termById = new Map<string, TermSnapshot>(
    terms.map((term) => [
      term.id,
      {
        id: term.id,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
      },
    ]),
  );

  const monthsByTermId = new Map<string, typeof months>();
  for (const month of months) {
    const bucket = monthsByTermId.get(month.academicTermId) ?? [];
    bucket.push(month);
    monthsByTermId.set(month.academicTermId, bucket);
  }
  for (const [termId, bucket] of monthsByTermId.entries()) {
    bucket.sort((a, b) => a.sequence - b.sequence);
    monthsByTermId.set(termId, bucket.slice(0, DEFAULT_MONTHS_PER_TERM));
  }

  const subjectsByGrade = new Map<string, GradeSubject[]>();
  for (const item of gradeLevelSubjects) {
    const bucket = subjectsByGrade.get(item.gradeLevelId) ?? [];
    bucket.push({
      gradeLevelId: item.gradeLevelId,
      subjectId: item.subjectId,
      subjectCode: item.subject.code,
      subjectName: item.subject.name,
    });
    subjectsByGrade.set(item.gradeLevelId, bucket);
  }

  const selectedSubjectsByGrade = new Map<string, GradeSubject[]>();
  for (const [gradeLevelId, subjects] of subjectsByGrade.entries()) {
    selectedSubjectsByGrade.set(
      gradeLevelId,
      subjects.slice(0, DEFAULT_SUBJECTS_PER_GRADE),
    );
  }

  let gradingPoliciesTotal = 0;
  let gradingPolicyComponentsTotal = 0;

  for (const [gradeLevelId, subjects] of selectedSubjectsByGrade.entries()) {
    for (const subject of subjects) {
      for (const template of GRADING_POLICY_TEMPLATES) {
        let componentSum = 0;
        for (const c of template.components) {
          componentSum += c.maxScore;
        }

        let policy = await prisma.gradingPolicy.findFirst({
          where: {
            academicYearId: context.academicYearId,
            gradeLevelId,
            subjectId: subject.subjectId,
            assessmentType: template.assessmentType,
            sectionId: null,
            academicTermId: null,
            teacherEmployeeId: null,
            version: 1,
          },
          select: { id: true },
        });

        if (policy) {
          policy = await prisma.gradingPolicy.update({
            where: { id: policy.id },
            data: {
              totalMaxScore: toDecimal(componentSum),
              passingScore: toDecimal(template.passingScore),
              isDefault: template.isDefault,
              status: GradingWorkflowStatus.APPROVED,
              notes: 'سياسة تقييم تجريبية للنظام التعليمي.',
              isActive: true,
              deletedAt: null,
              updatedById: null,
            },
            select: { id: true },
          });
        } else {
          policy = await prisma.gradingPolicy.create({
            data: {
              academicYearId: context.academicYearId,
              gradeLevelId,
              subjectId: subject.subjectId,
              assessmentType: template.assessmentType,
              sectionId: null,
              academicTermId: null,
              teacherEmployeeId: null,
              version: 1,
              totalMaxScore: toDecimal(componentSum),
              passingScore: toDecimal(template.passingScore),
              isDefault: template.isDefault,
              status: GradingWorkflowStatus.APPROVED,
              notes: 'سياسة تقييم تجريبية للنظام التعليمي.',
              isActive: true,
            },
            select: { id: true },
          });
        }

        gradingPoliciesTotal += 1;

        for (const component of template.components) {
          await prisma.gradingPolicyComponent.upsert({
            where: {
              gradingPolicyId_code: {
                gradingPolicyId: policy.id,
                code: component.code,
              },
            },
            update: {
              name: component.name,
              maxScore: toDecimal(component.maxScore),
              calculationMode: component.calculationMode,
              includeInMonthly: component.includeInMonthly,
              includeInSemester: component.includeInSemester,
              sortOrder: component.sortOrder,
              isActive: true,
              deletedAt: null,
              updatedById: null,
            },
            create: {
              gradingPolicyId: policy.id,
              code: component.code,
              name: component.name,
              maxScore: toDecimal(component.maxScore),
              calculationMode: component.calculationMode,
              includeInMonthly: component.includeInMonthly,
              includeInSemester: component.includeInSemester,
              sortOrder: component.sortOrder,
              isActive: true,
            },
          });

          gradingPolicyComponentsTotal += 1;
        }
      }
    }
  }

  const homeworkTypeIdByCode = new Map<string, string>();
  for (const definition of HOMEWORK_TYPE_DEFINITIONS) {
    let homeworkType = homeworkTypes.find((item) => item.code === definition.code);

    if (!homeworkType) {
      homeworkType = await prisma.homeworkType.create({
        data: {
          code: definition.code,
          name: definition.name,
          description: definition.description,
          isSystem: true,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
        },
      });
    } else {
      await prisma.homeworkType.update({
        where: {
          id: homeworkType.id,
        },
        data: {
          name: definition.name,
          description: definition.description,
          isSystem: true,
          isActive: true,
          deletedAt: null,
          updatedById: null,
        },
      });
    }

    homeworkTypeIdByCode.set(definition.code, homeworkType.id);
  }

  let homeworkTypesTotal = homeworkTypeIdByCode.size;
  const homeworkTypeHwId = homeworkTypeIdByCode.get('HW');
  const homeworkTypeProjectId = homeworkTypeIdByCode.get('PROJECT');

  if (!homeworkTypeHwId || !homeworkTypeProjectId) {
    throw new Error('Missing homework types for demo teaching grades seed.');
  }

  const examPeriodsByTermId = new Map<string, ExamPeriodMap>();
  let examPeriodsTotal = 0;

  for (const term of termById.values()) {
    const monthly = await prisma.examPeriod.upsert({
      where: {
        academicTermId_name: {
          academicTermId: term.id,
          name: 'الاختبارات الشهرية',
        },
      },
      update: {
        academicYearId: context.academicYearId,
        assessmentType: AssessmentType.MONTHLY,
        startDate: term.startDate,
        endDate: term.endDate,
        status: GradingWorkflowStatus.APPROVED,
        isLocked: false,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        academicYearId: context.academicYearId,
        academicTermId: term.id,
        name: 'الاختبارات الشهرية',
        assessmentType: AssessmentType.MONTHLY,
        startDate: term.startDate,
        endDate: term.endDate,
        status: GradingWorkflowStatus.APPROVED,
        isLocked: false,
        isActive: true,
      },
      select: { id: true },
    });

    const midterm = await prisma.examPeriod.upsert({
      where: {
        academicTermId_name: {
          academicTermId: term.id,
          name: 'اختبار منتصف الفصل',
        },
      },
      update: {
        academicYearId: context.academicYearId,
        assessmentType: AssessmentType.MIDTERM,
        startDate: term.startDate,
        endDate: term.endDate,
        status: GradingWorkflowStatus.APPROVED,
        isLocked: false,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        academicYearId: context.academicYearId,
        academicTermId: term.id,
        name: 'اختبار منتصف الفصل',
        assessmentType: AssessmentType.MIDTERM,
        startDate: term.startDate,
        endDate: term.endDate,
        status: GradingWorkflowStatus.APPROVED,
        isLocked: false,
        isActive: true,
      },
      select: { id: true },
    });

    const finalExam = await prisma.examPeriod.upsert({
      where: {
        academicTermId_name: {
          academicTermId: term.id,
          name: 'الاختبار النهائي',
        },
      },
      update: {
        academicYearId: context.academicYearId,
        assessmentType: AssessmentType.FINAL,
        startDate: term.startDate,
        endDate: term.endDate,
        status: GradingWorkflowStatus.APPROVED,
        isLocked: false,
        isActive: true,
        deletedAt: null,
        updatedById: null,
      },
      create: {
        academicYearId: context.academicYearId,
        academicTermId: term.id,
        name: 'الاختبار النهائي',
        assessmentType: AssessmentType.FINAL,
        startDate: term.startDate,
        endDate: term.endDate,
        status: GradingWorkflowStatus.APPROVED,
        isLocked: false,
        isActive: true,
      },
      select: { id: true },
    });

    examPeriodsByTermId.set(term.id, {
      monthly,
      midterm,
      final: finalExam,
    });

    examPeriodsTotal += 3;
  }

  const sectionIds = context.targetSections.map((section) => section.id);
  const enrollmentRows = await prisma.studentEnrollment.findMany({
    where: {
      academicYearId: context.academicYearId,
      sectionId: {
        in: sectionIds,
      },
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      sectionId: true,
      student: {
        select: {
          admissionNo: true,
        },
      },
    },
    orderBy: [
      {
        sectionId: 'asc',
      },
      {
        student: {
          admissionNo: 'asc',
        },
      },
    ],
  });

  const enrollmentsBySection = new Map<string, Array<{ id: string }>>();
  for (const enrollment of enrollmentRows) {
    if (!enrollment.sectionId) {
      continue;
    }

    const bucket = enrollmentsBySection.get(enrollment.sectionId) ?? [];
    if (bucket.length < DEFAULT_STUDENTS_PER_SECTION) {
      bucket.push({ id: enrollment.id });
      enrollmentsBySection.set(enrollment.sectionId, bucket);
    }
  }

  let examAssessmentsTotal = 0;
  let studentExamScoresTotal = 0;
  let homeworksTotal = 0;
  let studentHomeworksTotal = 0;

  for (const section of context.targetSections) {
    const subjects = selectedSubjectsByGrade.get(section.gradeLevelId) ?? [];
    const enrollments = enrollmentsBySection.get(section.id) ?? [];

    for (const term of termById.values()) {
      const termMonths = monthsByTermId.get(term.id) ?? [];
      const periodMap = examPeriodsByTermId.get(term.id);

      if (!periodMap) {
        continue;
      }

      const termLengthDays = Math.max(
        10,
        Math.floor(
          (term.endDate.getTime() - term.startDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const midtermDate = clampDate(
        addUtcDays(term.startDate, Math.floor(termLengthDays / 2)),
        term.startDate,
        term.endDate,
      );
      const finalDate = clampDate(
        addUtcDays(term.endDate, -5),
        term.startDate,
        term.endDate,
      );

      for (const [subjectIndex, subject] of subjects.entries()) {
        for (const [monthIndex, month] of termMonths.entries()) {
          const rawDate = addUtcDays(
            month.startDate,
            6 + ((subjectIndex + monthIndex) % 5),
          );
          const examDate = clampDate(rawDate, month.startDate, month.endDate);
          const title = `اختبار شهري - ${month.name} - ${subject.subjectName}`;

          const assessment = await prisma.examAssessment.upsert({
            where: {
              examPeriodId_sectionId_subjectId_examDate: {
                examPeriodId: periodMap.monthly.id,
                sectionId: section.id,
                subjectId: subject.subjectId,
                examDate,
              },
            },
            update: {
              title,
              maxScore: toDecimal(40),
              notes: 'تقييم شهري تجريبي.',
              isActive: true,
              deletedAt: null,
              updatedById: null,
            },
            create: {
              examPeriodId: periodMap.monthly.id,
              sectionId: section.id,
              subjectId: subject.subjectId,
              title,
              examDate,
              maxScore: toDecimal(40),
              notes: 'تقييم شهري تجريبي.',
              isActive: true,
            },
            select: {
              id: true,
            },
          });

          examAssessmentsTotal += 1;

          for (const [enrollmentIndex, enrollment] of enrollments.entries()) {
            const isPresent = enrollmentIndex % 9 !== 0;
            const score = isPresent ? scoreFromIndex(40, enrollmentIndex) : 0;

            await prisma.studentExamScore.upsert({
              where: {
                examAssessmentId_studentEnrollmentId: {
                  examAssessmentId: assessment.id,
                  studentEnrollmentId: enrollment.id,
                },
              },
              update: {
                score: toDecimal(score),
                isPresent,
                absenceType: isPresent
                  ? null
                  : enrollmentIndex % 2 === 0
                    ? ExamAbsenceType.EXCUSED
                    : ExamAbsenceType.UNEXCUSED,
                excuseDetails: isPresent
                  ? null
                  : enrollmentIndex % 2 === 0
                    ? 'غياب بعذر طبي.'
                    : 'غياب دون عذر.',
                teacherNotes: isPresent
                  ? 'مشاركة جيدة خلال الاختبار.'
                  : 'تم تسجيل الغياب في السجل.',
                isActive: true,
                deletedAt: null,
                updatedById: null,
              },
              create: {
                examAssessmentId: assessment.id,
                studentEnrollmentId: enrollment.id,
                score: toDecimal(score),
                isPresent,
                absenceType: isPresent
                  ? null
                  : enrollmentIndex % 2 === 0
                    ? ExamAbsenceType.EXCUSED
                    : ExamAbsenceType.UNEXCUSED,
                excuseDetails: isPresent
                  ? null
                  : enrollmentIndex % 2 === 0
                    ? 'غياب بعذر طبي.'
                    : 'غياب دون عذر.',
                teacherNotes: isPresent
                  ? 'مشاركة جيدة خلال الاختبار.'
                  : 'تم تسجيل الغياب في السجل.',
                isActive: true,
              },
            });

            studentExamScoresTotal += 1;
          }
        }

        const midtermAssessment = await prisma.examAssessment.upsert({
          where: {
            examPeriodId_sectionId_subjectId_examDate: {
              examPeriodId: periodMap.midterm.id,
              sectionId: section.id,
              subjectId: subject.subjectId,
              examDate: midtermDate,
            },
          },
          update: {
            title: `اختبار منتصف الفصل - ${subject.subjectName}`,
            maxScore: toDecimal(30),
            notes: 'تقييم منتصف الفصل.',
            isActive: true,
            deletedAt: null,
            updatedById: null,
          },
          create: {
            examPeriodId: periodMap.midterm.id,
            sectionId: section.id,
            subjectId: subject.subjectId,
            title: `اختبار منتصف الفصل - ${subject.subjectName}`,
            examDate: midtermDate,
            maxScore: toDecimal(30),
            notes: 'تقييم منتصف الفصل.',
            isActive: true,
          },
          select: { id: true },
        });

        examAssessmentsTotal += 1;

        for (const [enrollmentIndex, enrollment] of enrollments.entries()) {
          const isPresent = enrollmentIndex % 11 !== 0;
          const score = isPresent ? scoreFromIndex(30, enrollmentIndex) : 0;

          await prisma.studentExamScore.upsert({
            where: {
              examAssessmentId_studentEnrollmentId: {
                examAssessmentId: midtermAssessment.id,
                studentEnrollmentId: enrollment.id,
              },
            },
            update: {
              score: toDecimal(score),
              isPresent,
              absenceType: isPresent ? null : ExamAbsenceType.UNEXCUSED,
              excuseDetails: isPresent ? null : 'غياب دون عذر.',
              teacherNotes: isPresent ? 'أداء ثابت.' : 'غياب مسجل.',
              isActive: true,
              deletedAt: null,
              updatedById: null,
            },
            create: {
              examAssessmentId: midtermAssessment.id,
              studentEnrollmentId: enrollment.id,
              score: toDecimal(score),
              isPresent,
              absenceType: isPresent ? null : ExamAbsenceType.UNEXCUSED,
              excuseDetails: isPresent ? null : 'غياب دون عذر.',
              teacherNotes: isPresent ? 'أداء ثابت.' : 'غياب مسجل.',
              isActive: true,
            },
          });

          studentExamScoresTotal += 1;
        }

        const finalAssessment = await prisma.examAssessment.upsert({
          where: {
            examPeriodId_sectionId_subjectId_examDate: {
              examPeriodId: periodMap.final.id,
              sectionId: section.id,
              subjectId: subject.subjectId,
              examDate: finalDate,
            },
          },
          update: {
            title: `الاختبار النهائي - ${subject.subjectName}`,
            maxScore: toDecimal(60),
            notes: 'تقييم نهاية الفصل.',
            isActive: true,
            deletedAt: null,
            updatedById: null,
          },
          create: {
            examPeriodId: periodMap.final.id,
            sectionId: section.id,
            subjectId: subject.subjectId,
            title: `الاختبار النهائي - ${subject.subjectName}`,
            examDate: finalDate,
            maxScore: toDecimal(60),
            notes: 'تقييم نهاية الفصل.',
            isActive: true,
          },
          select: { id: true },
        });

        examAssessmentsTotal += 1;

        for (const [enrollmentIndex, enrollment] of enrollments.entries()) {
          const isPresent = enrollmentIndex % 13 !== 0;
          const score = isPresent ? scoreFromIndex(60, enrollmentIndex) : 0;

          await prisma.studentExamScore.upsert({
            where: {
              examAssessmentId_studentEnrollmentId: {
                examAssessmentId: finalAssessment.id,
                studentEnrollmentId: enrollment.id,
              },
            },
            update: {
              score: toDecimal(score),
              isPresent,
              absenceType: isPresent ? null : ExamAbsenceType.EXCUSED,
              excuseDetails: isPresent ? null : 'غياب بعذر.',
              teacherNotes: isPresent ? 'جهد ملحوظ في الاختبار النهائي.' : 'غياب بعذر معتمد.',
              isActive: true,
              deletedAt: null,
              updatedById: null,
            },
            create: {
              examAssessmentId: finalAssessment.id,
              studentEnrollmentId: enrollment.id,
              score: toDecimal(score),
              isPresent,
              absenceType: isPresent ? null : ExamAbsenceType.EXCUSED,
              excuseDetails: isPresent ? null : 'غياب بعذر.',
              teacherNotes: isPresent ? 'جهد ملحوظ في الاختبار النهائي.' : 'غياب بعذر معتمد.',
              isActive: true,
            },
          });

          studentExamScoresTotal += 1;
        }

        for (const month of termMonths) {
          const homeworkDate = clampDate(
            addUtcDays(month.startDate, 3 + (subjectIndex % 4)),
            month.startDate,
            month.endDate,
          );
          const dueDate = clampDate(
            addUtcDays(homeworkDate, 5),
            month.startDate,
            month.endDate,
          );
          const title = `واجب ${month.name} - ${subject.subjectName}`;

          const homework = await prisma.homework.upsert({
            where: {
              academicTermId_sectionId_subjectId_title_homeworkDate: {
                academicTermId: term.id,
                sectionId: section.id,
                subjectId: subject.subjectId,
                title,
                homeworkDate,
              },
            },
            update: {
              academicYearId: context.academicYearId,
              homeworkTypeId: homeworkTypeHwId,
              content: 'حل الأسئلة المحددة في نهاية الدرس.',
              dueDate,
              maxScore: toDecimal(10),
              notes: 'واجب دوري تجريبي.',
              isActive: true,
              deletedAt: null,
              updatedById: null,
            },
            create: {
              academicYearId: context.academicYearId,
              academicTermId: term.id,
              sectionId: section.id,
              subjectId: subject.subjectId,
              homeworkTypeId: homeworkTypeHwId,
              title,
              content: 'حل الأسئلة المحددة في نهاية الدرس.',
              homeworkDate,
              dueDate,
              maxScore: toDecimal(10),
              notes: 'واجب دوري تجريبي.',
              isActive: true,
            },
            select: { id: true },
          });

          homeworksTotal += 1;

          for (const [enrollmentIndex, enrollment] of enrollments.entries()) {
            const isCompleted = enrollmentIndex % 5 !== 0;
            const manualScore = isCompleted
              ? scoreFromIndex(10, enrollmentIndex)
              : null;

            await prisma.studentHomework.upsert({
              where: {
                homeworkId_studentEnrollmentId: {
                  homeworkId: homework.id,
                  studentEnrollmentId: enrollment.id,
                },
              },
              update: {
                isCompleted,
                submittedAt: isCompleted ? addUtcDays(homeworkDate, 2) : null,
                manualScore: manualScore !== null ? toDecimal(manualScore) : null,
                teacherNotes: isCompleted
                  ? 'تسليم جيد.'
                  : 'لم يتم التسليم حتى الآن.',
                isActive: true,
                deletedAt: null,
                updatedById: null,
              },
              create: {
                homeworkId: homework.id,
                studentEnrollmentId: enrollment.id,
                isCompleted,
                submittedAt: isCompleted ? addUtcDays(homeworkDate, 2) : null,
                manualScore: manualScore !== null ? toDecimal(manualScore) : null,
                teacherNotes: isCompleted
                  ? 'تسليم جيد.'
                  : 'لم يتم التسليم حتى الآن.',
                isActive: true,
              },
            });

            studentHomeworksTotal += 1;
          }
        }

        const projectDate = clampDate(
          addUtcDays(term.startDate, 20 + (subjectIndex % 5)),
          term.startDate,
          term.endDate,
        );
        const projectDueDate = clampDate(
          addUtcDays(projectDate, 12),
          term.startDate,
          term.endDate,
        );
        const projectTitle = `مشروع ${term.name} - ${subject.subjectName}`;

        const project = await prisma.homework.upsert({
          where: {
            academicTermId_sectionId_subjectId_title_homeworkDate: {
              academicTermId: term.id,
              sectionId: section.id,
              subjectId: subject.subjectId,
              title: projectTitle,
              homeworkDate: projectDate,
            },
          },
          update: {
            academicYearId: context.academicYearId,
            homeworkTypeId: homeworkTypeProjectId,
            content: 'إعداد مشروع تطبيقي وعرضه في الصف.',
            dueDate: projectDueDate,
            maxScore: toDecimal(20),
            notes: 'مشروع نهاية الوحدة.',
            isActive: true,
            deletedAt: null,
            updatedById: null,
          },
          create: {
            academicYearId: context.academicYearId,
            academicTermId: term.id,
            sectionId: section.id,
            subjectId: subject.subjectId,
            homeworkTypeId: homeworkTypeProjectId,
            title: projectTitle,
            content: 'إعداد مشروع تطبيقي وعرضه في الصف.',
            homeworkDate: projectDate,
            dueDate: projectDueDate,
            maxScore: toDecimal(20),
            notes: 'مشروع نهاية الوحدة.',
            isActive: true,
          },
          select: { id: true },
        });

        homeworksTotal += 1;

        for (const [enrollmentIndex, enrollment] of enrollments.entries()) {
          const isCompleted = enrollmentIndex % 4 !== 0;
          const manualScore = isCompleted
            ? scoreFromIndex(20, enrollmentIndex)
            : null;

          await prisma.studentHomework.upsert({
            where: {
              homeworkId_studentEnrollmentId: {
                homeworkId: project.id,
                studentEnrollmentId: enrollment.id,
              },
            },
            update: {
              isCompleted,
              submittedAt: isCompleted ? addUtcDays(projectDate, 6) : null,
              manualScore: manualScore !== null ? toDecimal(manualScore) : null,
              teacherNotes: isCompleted
                ? 'مشروع منظم.'
                : 'المشروع غير مكتمل.',
              isActive: true,
              deletedAt: null,
              updatedById: null,
            },
            create: {
              homeworkId: project.id,
              studentEnrollmentId: enrollment.id,
              isCompleted,
              submittedAt: isCompleted ? addUtcDays(projectDate, 6) : null,
              manualScore: manualScore !== null ? toDecimal(manualScore) : null,
              teacherNotes: isCompleted
                ? 'مشروع منظم.'
                : 'المشروع غير مكتمل.',
              isActive: true,
            },
          });

          studentHomeworksTotal += 1;
        }
      }
    }
  }

  return {
    gradingPoliciesTotal,
    gradingPolicyComponentsTotal,
    examPeriodsTotal,
    examAssessmentsTotal,
    studentExamScoresTotal,
    homeworkTypesTotal,
    homeworksTotal,
    studentHomeworksTotal,
  };
}
