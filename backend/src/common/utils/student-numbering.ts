const STUDENT_ADMISSION_PREFIX = 'STU-';

export function formatStudentAdmissionNo(sequence: number) {
  return `${STUDENT_ADMISSION_PREFIX}${sequence.toString().padStart(6, '0')}`;
}

export function parseStudentAdmissionNoSequence(value: string | null | undefined) {
  if (!value || !value.startsWith(STUDENT_ADMISSION_PREFIX)) {
    return null;
  }

  const rawSequence = value.slice(STUDENT_ADMISSION_PREFIX.length);
  if (!/^\d+$/.test(rawSequence)) {
    return null;
  }

  return Number.parseInt(rawSequence, 10);
}

export function formatYearlyEnrollmentNo(
  yearPrefix: string,
  sequence: number,
) {
  return `${yearPrefix}-${sequence.toString().padStart(5, '0')}`;
}

export function parseYearlyEnrollmentNoSequence(
  value: string | null | undefined,
  yearPrefix: string,
) {
  if (!value || !value.startsWith(`${yearPrefix}-`)) {
    return null;
  }

  const rawSequence = value.slice(yearPrefix.length + 1);
  if (!/^\d+$/.test(rawSequence)) {
    return null;
  }

  return Number.parseInt(rawSequence, 10);
}
