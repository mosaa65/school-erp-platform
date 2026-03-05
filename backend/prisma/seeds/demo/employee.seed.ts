import {
  EmployeeGender,
  EmployeeSystemAccessStatus,
  type PrismaClient,
} from '@prisma/client';

export async function seedDemoEmployee(prisma: PrismaClient) {
  const defaultNationalIdType = await prisma.lookupIdType.findUnique({
    where: { code: 'NATIONAL_ID' },
    select: { id: true },
  });

  const defaultGender = await prisma.lookupGender.findUnique({
    where: { code: 'MALE' },
    select: { id: true },
  });

  const defaultQualification = await prisma.lookupQualification.findUnique({
    where: { code: 'BACHELOR' },
    select: { id: true, nameAr: true },
  });

  const defaultJobRole = await prisma.lookupJobRole.findUnique({
    where: { code: 'TEACHER' },
    select: { id: true, nameAr: true, nameArFemale: true },
  });

  return prisma.employee.upsert({
    where: { jobNumber: 'DEMO-EMP-0001' },
    update: {
      fullName: 'معلم تجريبي',
      gender: EmployeeGender.MALE,
      genderId: defaultGender?.id ?? null,
      idNumber: '1000000001',
      idTypeId: defaultNationalIdType?.id ?? null,
      systemAccessStatus: EmployeeSystemAccessStatus.GRANTED,
      qualification: defaultQualification?.nameAr ?? null,
      qualificationId: defaultQualification?.id ?? null,
      jobTitle: defaultJobRole?.nameAr ?? 'معلم رياضيات',
      jobRoleId: defaultJobRole?.id ?? null,
      isActive: true,
      deletedAt: null,
      updatedById: null,
    },
    create: {
      jobNumber: 'DEMO-EMP-0001',
      fullName: 'معلم تجريبي',
      gender: EmployeeGender.MALE,
      genderId: defaultGender?.id ?? null,
      idNumber: '1000000001',
      idTypeId: defaultNationalIdType?.id ?? null,
      systemAccessStatus: EmployeeSystemAccessStatus.GRANTED,
      qualification: defaultQualification?.nameAr ?? null,
      qualificationId: defaultQualification?.id ?? null,
      jobTitle: defaultJobRole?.nameAr ?? 'معلم رياضيات',
      jobRoleId: defaultJobRole?.id ?? null,
      isActive: true,
    },
  });
}
