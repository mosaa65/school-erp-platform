import {
  EnrollmentDistributionStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  formatStudentAdmissionNo,
  formatYearlyEnrollmentNo,
  parseStudentAdmissionNoSequence,
  parseYearlyEnrollmentNoSequence,
} from '../src/common/utils/student-numbering';

type StudentRow = {
  id: string;
  admissionNo: string | null;
  createdAt: Date;
};

type GradeLevelRow = {
  id: string;
  name: string;
};

type EnrollmentRow = {
  id: string;
  studentId: string;
  academicYearId: string;
  gradeLevelId: string | null;
  sectionId: string | null;
  yearlyEnrollmentNo: string | null;
  distributionStatus: string | null;
  gradeNameSnapshot: string | null;
  sectionNameSnapshot: string | null;
  createdAt: Date;
  academicYearStartDate: Date;
  sectionName: string | null;
  sectionGradeLevelId: string | null;
  sectionGradeLevelName: string | null;
};

type BackfillSummary = {
  studentsScanned: number;
  studentsUpdated: number;
  enrollmentRowsScanned: number;
  enrollmentMetadataUpdated: number;
  yearlyEnrollmentNumbersUpdated: number;
  unresolvedGradeLevelRows: number;
};

const prisma = new PrismaClient();

const STUDENT_ADMISSION_COUNTER_KEY = 'student_admission_no';
const YEARLY_ENROLLMENT_COUNTER_KEY_PREFIX = 'student_enrollment';

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function normalizeName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

async function ensureSequenceCounterAtLeast(
  tx: PrismaClient | Prisma.TransactionClient,
  key: string,
  minimumValue: number,
) {
  await tx.sequenceCounter.upsert({
    where: { key },
    update: {},
    create: { key },
  });

  if (minimumValue > 0) {
    await tx.sequenceCounter.updateMany({
      where: {
        key,
        currentValue: {
          lt: minimumValue,
        },
      },
      data: {
        currentValue: minimumValue,
      },
    });
  }
}

async function nextSequenceValue(
  tx: PrismaClient | Prisma.TransactionClient,
  key: string,
  minimumValue = 0,
) {
  await ensureSequenceCounterAtLeast(tx, key, minimumValue);

  const counter = await tx.sequenceCounter.update({
    where: { key },
    data: {
      currentValue: {
        increment: 1,
      },
    },
    select: {
      currentValue: true,
    },
  });

  return counter.currentValue;
}

function getAcademicYearPrefix(startDate: Date) {
  return startDate.getUTCFullYear().toString();
}

async function backfillStudentAdmissionNumbers(summary: BackfillSummary) {
  const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT
      id,
      admission_no AS admissionNo,
      created_at AS createdAt
    FROM students
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC, id ASC
  `;

  summary.studentsScanned = students.length;

  const missingStudents = students.filter((student) =>
    isBlank(student.admissionNo),
  );

  if (missingStudents.length === 0) {
    return;
  }

  const existingMax = students.reduce((max, student) => {
    const parsed = parseStudentAdmissionNoSequence(student.admissionNo);
    return parsed && parsed > max ? parsed : max;
  }, 0);

  await ensureSequenceCounterAtLeast(
    prisma,
    STUDENT_ADMISSION_COUNTER_KEY,
    existingMax,
  );

  for (const student of missingStudents) {
    const nextValue = await nextSequenceValue(
      prisma,
      STUDENT_ADMISSION_COUNTER_KEY,
      existingMax,
    );

    await prisma.student.update({
      where: {
        id: student.id,
      },
      data: {
        admissionNo: formatStudentAdmissionNo(nextValue),
      },
    });

    summary.studentsUpdated += 1;
  }
}

async function backfillEnrollmentMetadata(summary: BackfillSummary) {
  const gradeLevels = await prisma.$queryRaw<GradeLevelRow[]>`
    SELECT
      id,
      name
    FROM grade_levels
    WHERE deleted_at IS NULL
  `;

  const gradeLevelById = new Map<string, string>();
  const gradeLevelIdsByName = new Map<string, string[]>();

  for (const gradeLevel of gradeLevels) {
    gradeLevelById.set(gradeLevel.id, gradeLevel.name);
    const nameKey = normalizeName(gradeLevel.name);
    const existingIds = gradeLevelIdsByName.get(nameKey) ?? [];
    existingIds.push(gradeLevel.id);
    gradeLevelIdsByName.set(nameKey, existingIds);
  }

  const enrollments = await prisma.$queryRaw<EnrollmentRow[]>`
    SELECT
      se.id AS id,
      se.student_id AS studentId,
      se.academic_year_id AS academicYearId,
      se.grade_level_id AS gradeLevelId,
      se.section_id AS sectionId,
      se.yearly_enrollment_no AS yearlyEnrollmentNo,
      se.distribution_status AS distributionStatus,
      se.grade_name_snapshot AS gradeNameSnapshot,
      se.section_name_snapshot AS sectionNameSnapshot,
      se.created_at AS createdAt,
      ay.start_date AS academicYearStartDate,
      s.name AS sectionName,
      s.grade_level_id AS sectionGradeLevelId,
      sgl.name AS sectionGradeLevelName
    FROM student_enrollments se
    INNER JOIN academic_years ay ON ay.id = se.academic_year_id
    LEFT JOIN sections s ON s.id = se.section_id
    LEFT JOIN grade_levels sgl ON sgl.id = s.grade_level_id
    WHERE se.deleted_at IS NULL
    ORDER BY se.academic_year_id ASC, se.created_at ASC, se.id ASC
  `;

  summary.enrollmentRowsScanned = enrollments.length;

  for (const enrollment of enrollments) {
    const updates: {
      gradeLevelId?: string | null;
      gradeNameSnapshot?: string | null;
      sectionNameSnapshot?: string | null;
      distributionStatus?: EnrollmentDistributionStatus;
    } = {};

    const resolvedGradeLevelId =
      enrollment.gradeLevelId ?? enrollment.sectionGradeLevelId ?? null;

    if (enrollment.gradeLevelId == null && enrollment.sectionGradeLevelId) {
      updates.gradeLevelId = enrollment.sectionGradeLevelId;
    }

    if (isBlank(enrollment.gradeNameSnapshot)) {
      const gradeNameFromId =
        (resolvedGradeLevelId && gradeLevelById.get(resolvedGradeLevelId)) ?? null;
      const gradeNameFromSection =
        enrollment.sectionGradeLevelName ?? null;
      const gradeNameFromSnapshot =
        !isBlank(enrollment.gradeNameSnapshot) ? enrollment.gradeNameSnapshot : null;
      const gradeNameCandidate =
        gradeNameFromId ?? gradeNameFromSection ?? gradeNameFromSnapshot;

      if (gradeNameCandidate) {
        updates.gradeNameSnapshot = gradeNameCandidate;
      } else if (isBlank(enrollment.gradeNameSnapshot)) {
        const fallbackIds = gradeLevelIdsByName.get(
          normalizeName(enrollment.sectionGradeLevelName),
        );
        if (fallbackIds && fallbackIds.length === 1) {
          updates.gradeLevelId = updates.gradeLevelId ?? fallbackIds[0];
          updates.gradeNameSnapshot =
            gradeLevelById.get(fallbackIds[0]) ?? enrollment.sectionGradeLevelName ?? null;
        }
      }
    }

    if (isBlank(enrollment.sectionNameSnapshot) && enrollment.sectionName) {
      updates.sectionNameSnapshot = enrollment.sectionName;
    }

    if (isBlank(enrollment.distributionStatus)) {
      updates.distributionStatus = enrollment.sectionId
        ? EnrollmentDistributionStatus.ASSIGNED
        : EnrollmentDistributionStatus.PENDING_DISTRIBUTION;
    }

    if (Object.keys(updates).length === 0) {
      continue;
    }

    await prisma.studentEnrollment.update({
      where: {
        id: enrollment.id,
      },
      data: updates,
    });

    summary.enrollmentMetadataUpdated += 1;

    if (updates.gradeLevelId === undefined && enrollment.gradeLevelId == null) {
      summary.unresolvedGradeLevelRows += 1;
    }
  }
}

async function backfillYearlyEnrollmentNumbers(summary: BackfillSummary) {
  const enrollments = await prisma.$queryRaw<EnrollmentRow[]>`
    SELECT
      se.id AS id,
      se.student_id AS studentId,
      se.academic_year_id AS academicYearId,
      se.grade_level_id AS gradeLevelId,
      se.section_id AS sectionId,
      se.yearly_enrollment_no AS yearlyEnrollmentNo,
      se.distribution_status AS distributionStatus,
      se.grade_name_snapshot AS gradeNameSnapshot,
      se.section_name_snapshot AS sectionNameSnapshot,
      se.created_at AS createdAt,
      ay.start_date AS academicYearStartDate,
      s.name AS sectionName,
      s.grade_level_id AS sectionGradeLevelId,
      sgl.name AS sectionGradeLevelName
    FROM student_enrollments se
    INNER JOIN academic_years ay ON ay.id = se.academic_year_id
    LEFT JOIN sections s ON s.id = se.section_id
    LEFT JOIN grade_levels sgl ON sgl.id = s.grade_level_id
    WHERE se.deleted_at IS NULL
    ORDER BY se.academic_year_id ASC, se.created_at ASC, se.id ASC
  `;

  const enrollmentsByYear = new Map<string, EnrollmentRow[]>();
  const maxSequenceByYear = new Map<string, number>();

  for (const enrollment of enrollments) {
    const bucket = enrollmentsByYear.get(enrollment.academicYearId) ?? [];
    bucket.push(enrollment);
    enrollmentsByYear.set(enrollment.academicYearId, bucket);

    const yearPrefix = getAcademicYearPrefix(enrollment.academicYearStartDate);
    const parsedSequence = parseYearlyEnrollmentNoSequence(
      enrollment.yearlyEnrollmentNo,
      yearPrefix,
    );

    if (parsedSequence && parsedSequence > (maxSequenceByYear.get(enrollment.academicYearId) ?? 0)) {
      maxSequenceByYear.set(enrollment.academicYearId, parsedSequence);
    }
  }

  for (const [academicYearId, yearEnrollments] of enrollmentsByYear.entries()) {
    const missingEnrollments = yearEnrollments.filter((enrollment) =>
      isBlank(enrollment.yearlyEnrollmentNo),
    );

    if (missingEnrollments.length === 0) {
      continue;
    }

    const yearPrefix = getAcademicYearPrefix(missingEnrollments[0].academicYearStartDate);
    const existingMax = maxSequenceByYear.get(academicYearId) ?? 0;
    const sequenceKey = `${YEARLY_ENROLLMENT_COUNTER_KEY_PREFIX}:${academicYearId}`;

    await ensureSequenceCounterAtLeast(prisma, sequenceKey, existingMax);

    for (const enrollment of missingEnrollments) {
      const nextValue = await nextSequenceValue(prisma, sequenceKey, existingMax);
      await prisma.studentEnrollment.update({
        where: {
          id: enrollment.id,
        },
        data: {
          yearlyEnrollmentNo: formatYearlyEnrollmentNo(yearPrefix, nextValue),
        },
      });

      summary.yearlyEnrollmentNumbersUpdated += 1;
    }
  }
}

async function main() {
  const summary: BackfillSummary = {
    studentsScanned: 0,
    studentsUpdated: 0,
    enrollmentRowsScanned: 0,
    enrollmentMetadataUpdated: 0,
    yearlyEnrollmentNumbersUpdated: 0,
    unresolvedGradeLevelRows: 0,
  };

  try {
    console.log('Starting student system phase-1 backfill...');

    await backfillStudentAdmissionNumbers(summary);
    await backfillEnrollmentMetadata(summary);
    await backfillYearlyEnrollmentNumbers(summary);

    console.log(
      [
        'Student system phase-1 backfill complete.',
        `Students scanned: ${summary.studentsScanned}`,
        `Students updated: ${summary.studentsUpdated}`,
        `Enrollment rows scanned: ${summary.enrollmentRowsScanned}`,
        `Enrollment metadata updated: ${summary.enrollmentMetadataUpdated}`,
        `Yearly enrollment numbers updated: ${summary.yearlyEnrollmentNumbersUpdated}`,
        `Rows still missing a resolvable grade level: ${summary.unresolvedGradeLevelRows}`,
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Student system phase-1 backfill failed.');
  console.error(error);
  process.exit(1);
});
