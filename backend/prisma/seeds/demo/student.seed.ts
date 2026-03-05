import {
  GuardianRelationship,
  StudentEnrollmentStatus,
  StudentGender,
  StudentHealthStatus,
  type PrismaClient,
} from '@prisma/client';
import type { DemoAcademicFoundation } from './academic-foundation.seed';
import { asUtcDate } from './utils';

export async function seedDemoStudentData(
  prisma: PrismaClient,
  context: DemoAcademicFoundation,
) {
  const defaultNationalIdType = await prisma.lookupIdType.findUnique({
    where: { code: 'NATIONAL_ID' },
    select: { id: true },
  });

  const defaultBloodType = await prisma.lookupBloodType.findUnique({
    where: { name: 'O+' },
    select: { id: true },
  });

  const defaultMaleGender = await prisma.lookupGender.findUnique({
    where: { code: StudentGender.MALE },
    select: { id: true },
  });

  const defaultNoneOrphanStatus = await prisma.lookupOrphanStatus.findUnique({
    where: { code: 'NONE' },
    select: { id: true },
  });

  const defaultHealthyStatus = await prisma.lookupHealthStatus.findUnique({
    where: { code: StudentHealthStatus.HEALTHY },
    select: { id: true },
  });

  const defaultFatherRelationshipType =
    await prisma.lookupRelationshipType.findUnique({
      where: { code: GuardianRelationship.FATHER },
      select: { id: true },
    });

  const student = await prisma.student.upsert({
    where: { admissionNo: 'DEMO-STU-0001' },
    update: {
      fullName: 'طالب تجريبي',
      gender: StudentGender.MALE,
      genderId: defaultMaleGender?.id ?? null,
      bloodTypeId: defaultBloodType?.id ?? null,
      healthStatus: StudentHealthStatus.HEALTHY,
      healthStatusId: defaultHealthyStatus?.id ?? null,
      orphanStatusId: defaultNoneOrphanStatus?.id ?? null,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      admissionNo: 'DEMO-STU-0001',
      fullName: 'طالب تجريبي',
      gender: StudentGender.MALE,
      genderId: defaultMaleGender?.id ?? null,
      bloodTypeId: defaultBloodType?.id ?? null,
      healthStatus: StudentHealthStatus.HEALTHY,
      healthStatusId: defaultHealthyStatus?.id ?? null,
      orphanStatusId: defaultNoneOrphanStatus?.id ?? null,
      isActive: true,
    },
  });

  let guardian = await prisma.guardian.findFirst({
    where: {
      fullName: 'ولي أمر تجريبي',
      deletedAt: null,
    },
  });

  if (!guardian) {
    guardian = await prisma.guardian.create({
      data: {
        fullName: 'ولي أمر تجريبي',
        gender: StudentGender.MALE,
        genderId: defaultMaleGender?.id ?? null,
        phonePrimary: '777000111',
        idNumber: '1000000002',
        idTypeId: defaultNationalIdType?.id ?? null,
        isActive: true,
      },
    });
  } else {
    guardian = await prisma.guardian.update({
      where: { id: guardian.id },
      data: {
        idNumber: '1000000002',
        genderId: defaultMaleGender?.id ?? null,
        idTypeId: defaultNationalIdType?.id ?? null,
        deletedAt: null,
        updatedById: null,
      },
    });
  }

  await prisma.studentGuardian.upsert({
    where: {
      studentId_guardianId_relationship: {
        studentId: student.id,
        guardianId: guardian.id,
        relationship: GuardianRelationship.FATHER,
      },
    },
    update: {
      relationshipTypeId: defaultFatherRelationshipType?.id ?? null,
      isPrimary: true,
      canReceiveNotifications: true,
      canPickup: true,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      studentId: student.id,
      guardianId: guardian.id,
      relationship: GuardianRelationship.FATHER,
      relationshipTypeId: defaultFatherRelationshipType?.id ?? null,
      isPrimary: true,
      canReceiveNotifications: true,
      canPickup: true,
      isActive: true,
    },
  });

  await prisma.studentEnrollment.upsert({
    where: {
      studentId_academicYearId: {
        studentId: student.id,
        academicYearId: context.academicYearId,
      },
    },
    update: {
      sectionId: context.sectionId,
      enrollmentDate: asUtcDate('2030-09-01'),
      status: StudentEnrollmentStatus.ACTIVE,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      studentId: student.id,
      academicYearId: context.academicYearId,
      sectionId: context.sectionId,
      enrollmentDate: asUtcDate('2030-09-01'),
      status: StudentEnrollmentStatus.ACTIVE,
      isActive: true,
    },
  });

  return student;
}
