import { Prisma } from '@prisma/client';

export const monthlyAssessmentPeriodInclude: Prisma.AssessmentPeriodInclude = {
  _count: {
    select: {
      components: true,
      results: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isCurrent: true,
    },
  },
  academicTerm: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isActive: true,
    },
  },
  academicMonth: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isCurrent: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  lockedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
};

export const monthlyAssessmentComponentInclude: Prisma.AssessmentPeriodComponentInclude = {
  assessmentPeriod: {
    select: {
      id: true,
      name: true,
      category: true,
      academicYearId: true,
      academicTermId: true,
      academicMonthId: true,
      status: true,
      isActive: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
};

export const monthlyStudentResultInclude: Prisma.StudentPeriodResultInclude = {
  _count: {
    select: {
      componentScores: true,
    },
  },
  assessmentPeriod: {
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      maxScore: true,
      academicYearId: true,
      academicTermId: true,
      academicMonthId: true,
    },
  },
  academicYear: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      isCurrent: true,
    },
  },
  academicTerm: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isActive: true,
    },
  },
  academicMonth: {
    select: {
      id: true,
      code: true,
      name: true,
      sequence: true,
      isActive: true,
    },
  },
  studentEnrollment: {
    select: {
      id: true,
      sectionId: true,
      academicYearId: true,
      status: true,
      isActive: true,
      student: {
        select: {
          id: true,
          admissionNo: true,
          fullName: true,
          isActive: true,
        },
      },
      section: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      },
    },
  },
  subject: {
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  },
  termSubjectOffering: {
    select: {
      id: true,
      academicTermId: true,
      gradeLevelSubject: {
        select: {
          id: true,
          subjectId: true,
          gradeLevelId: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
  lockedByUser: {
    select: {
      id: true,
      email: true,
    },
  },
};

export const monthlyStudentComponentScoreInclude: Prisma.StudentPeriodComponentScoreInclude = {
  studentPeriodResult: {
    select: {
      id: true,
      assessmentPeriodId: true,
      studentEnrollmentId: true,
      subjectId: true,
      isLocked: true,
      assessmentPeriod: {
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          isLocked: true,
          maxScore: true,
        },
      },
      studentEnrollment: {
        select: {
          id: true,
          sectionId: true,
          student: {
            select: {
              id: true,
              admissionNo: true,
              fullName: true,
            },
          },
        },
      },
      subject: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
  assessmentPeriodComponent: {
    select: {
      id: true,
      assessmentPeriodId: true,
      code: true,
      name: true,
      entryMode: true,
      maxScore: true,
      sortOrder: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      email: true,
    },
  },
};
