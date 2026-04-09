import { appConfig } from "@/lib/env";
import type { AuthSession } from "@/features/auth/types/auth-session";
import {
  clearAuthSession,
  getAccessTokenFromStorage,
  saveAuthSession,
} from "@/lib/auth/session";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type HealthCheckResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export type LoginPayload = {
  loginId: string;
  password: string;
  deviceId?: string;
  deviceLabel?: string;
  captchaToken?: string;
};

export type LoginMfaChallengeResponse = {
  mfaRequired: true;
  factorType: "TOTP";
  challengeId: string;
  challengeExpiresInSeconds: number;
};

export type LoginWebAuthnChallengeResponse = {
  webauthnRequired: true;
  factorType: "WEBAUTHN";
  challengeId: string;
  challengeExpiresInSeconds: number;
  options: Record<string, unknown>;
};

export type LoginActivationRequiredResponse = {
  activationRequired: true;
  loginId: string;
  activationStatus: "PENDING_INITIAL_PASSWORD";
  initialPasswordExpiresAt: string | null;
  requiresApproval: boolean;
};

export type LoginDeviceApprovalRequiredResponse = {
  deviceApprovalRequired: true;
  purpose: "NEW_DEVICE_LOGIN";
  requestId: string;
  expiresAt: string;
};

export type AccountIdentifyResponse = {
  status: "ACTIVE_LOGIN" | "PENDING_ACTIVATION" | "UNKNOWN_ACCOUNT";
  loginId: string;
  requiresOneTimePassword: boolean;
};

export type BeginAccountActivationPayload = {
  loginId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  deviceId?: string;
  deviceLabel?: string;
};

export type AccountApprovalPendingResponse = {
  approvalRequired: true;
  purpose: "FIRST_PASSWORD_SETUP" | "NEW_DEVICE_LOGIN" | "PASSWORD_RESET";
  requestId: string;
  expiresAt: string;
};

export type AuthApprovalPurpose =
  | "FIRST_PASSWORD_SETUP"
  | "NEW_DEVICE_LOGIN"
  | "PASSWORD_RESET";

export type AuthApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "COMPLETED";

export type AuthApprovalRequestItem = {
  id: string;
  userId: string;
  purpose: AuthApprovalPurpose;
  status: AuthApprovalStatus;
  loginId: string | null;
  deviceId: string | null;
  deviceLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    phoneE164: string | null;
    phoneCountryCode: string | null;
    phoneNationalNumber: string | null;
    firstName: string;
    lastName: string;
    guardianId: string | null;
    employeeId: string | null;
    activationStatus: "ACTIVE" | "PENDING_INITIAL_PASSWORD" | "SUSPENDED";
    isActive: boolean;
  };
  approvedByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type AuthApprovalRequestsResponse = PaginatedResponse<AuthApprovalRequestItem>;

export type CompleteAccountActivationPayload = {
  requestId: string;
  approvalCode: string;
  deviceId?: string;
  deviceLabel?: string;
};

export type CompleteDeviceApprovalPayload = {
  requestId: string;
  approvalCode: string;
};

export type BeginForgotPasswordPayload = {
  loginId: string;
  deviceId?: string;
  deviceLabel?: string;
};

export type CompleteForgotPasswordPayload = {
  requestId: string;
  approvalCode: string;
  newPassword: string;
  confirmPassword: string;
  deviceId?: string;
  deviceLabel?: string;
};

export type ChangePasswordByCredentialsPayload = {
  loginId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type LoginResponse =
  | AuthSession
  | LoginMfaChallengeResponse
  | LoginWebAuthnChallengeResponse
  | LoginActivationRequiredResponse
  | LoginDeviceApprovalRequiredResponse;

export type VerifyLoginMfaPayload = {
  challengeId: string;
  code: string;
};

export type WebAuthnCredentialListItem = {
  id: string;
  credentialName: string | null;
  deviceType: string;
  backedUp: boolean;
  transports: string[];
  lastUsedAt: string | null;
  createdAt: string;
};

export type BeginWebAuthnRegistrationResponse = {
  challengeId: string;
  options: Record<string, unknown>;
};

export type FinishWebAuthnRegistrationPayload = {
  challengeId: string;
  response: Record<string, unknown>;
  credentialName?: string;
};

export type BeginWebAuthnAuthenticationResponse = {
  challengeId: string;
  options: Record<string, unknown>;
};

export type FinishWebAuthnAuthenticationPayload = {
  challengeId: string;
  response: Record<string, unknown>;
  deviceId?: string;
  deviceLabel?: string;
};

export type AuthSessionView = {
  id: string;
  deviceId: string | null;
  deviceLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivity: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type AuthProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneCountryCode: string | null;
  phoneNationalNumber: string | null;
  phoneE164: string | null;
  webAuthnRequired: boolean;
  hasWebAuthnCredentials: boolean;
};

export type UpdateProfilePayload = {
  phoneCountryCode?: string;
  phoneNationalNumber?: string;
  webAuthnRequired?: boolean;
};

export type UserListItem = {
  id: string;
  email: string;
  phoneCountryCode: string | null;
  phoneNationalNumber: string | null;
  phoneE164: string | null;
  username: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  activationStatus: "ACTIVE" | "PENDING_INITIAL_PASSWORD" | "SUSPENDED";
  initialPasswordExpiresAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    jobNumber: string;
    fullName: string;
    jobTitle: string;
    isActive: boolean;
  } | null;
  guardian: {
    id: string;
    fullName: string;
    phonePrimary: string | null;
    whatsappNumber: string | null;
    isActive: boolean;
  } | null;
  userRoles: Array<{
    role: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
    };
  }>;
};

export type RoleListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rolePermissions: Array<{
    id: string;
    permission: {
      id: string;
      code: string;
      resource: string;
      action: string;
    };
  }>;
};

export type PermissionListItem = {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SettingValueType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON";

export type GlobalSettingListItem = {
  id: string;
  key: string;
  value: unknown;
  valueType: SettingValueType;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SystemSettingType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "IMAGE"
  | "JSON";

export type SystemSettingListItem = {
  id: number;
  settingKey: string;
  settingValue: string | null;
  settingType: SystemSettingType;
  category: string | null;
  description: string | null;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type ReminderTickerType =
  | "DHIKR"
  | "ALERT"
  | "ANNOUNCEMENT"
  | "VERSE"
  | "HADITH";

export type ReminderTickerListItem = {
  id: number;
  content: string;
  tickerType: ReminderTickerType;
  isActive: boolean;
  displayOrder: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type UserPermissionListItem = {
  id: number;
  userId: string;
  permissionId: string;
  validFrom: string;
  validUntil: string | null;
  grantReason: string;
  notes: string | null;
  grantedById: string;
  grantedAt: string;
  revokedAt: string | null;
  revokedById: string | null;
  revokeReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
  permission: {
    id: string;
    code: string;
    resource: string;
    action: string;
    deletedAt: string | null;
  };
  grantedBy: {
    id: string;
    email: string;
  };
  revokedBy: {
    id: string;
    email: string;
  } | null;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type EmployeeSectionSupervisionListItem = {
  id: string;
  employeeId: string;
  sectionId: string;
  academicYearId: string;
  canViewStudents: boolean;
  canManageHomeworks: boolean;
  canManageGrades: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string;
    jobTitle: string;
  };
  section: {
    id: string;
    code: string;
    name: string;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
    } | null;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: string;
  };
};

export type AuditStatus = "SUCCESS" | "FAILURE";

export type AuditLogListItem = {
  id: string;
  actorUserId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  status: AuditStatus;
  ipAddress: string | null;
  userAgent: string | null;
  details: unknown;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  actorUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type LookupBloodTypeListItem = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupIdTypeListItem = {
  id: number;
  code: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupOwnershipTypeListItem = {
  id: number;
  code: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupPeriodListItem = {
  id: number;
  code: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    timetableTemplateSlots: number;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupEnrollmentStatusListItem = {
  id: number;
  code: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupOrphanStatusListItem = {
  id: number;
  code: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupAbilityLevelListItem = {
  id: number;
  code: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupActivityTypeListItem = {
  id: number;
  code: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupGradeDescriptionListItem = {
  id: number;
  minPercentage: number | string;
  maxPercentage: number | string;
  nameAr: string;
  nameEn: string | null;
  colorCode: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type LookupCatalogType =
  | "blood-types"
  | "id-types"
  | "ownership-types"
  | "periods"
  | "school-types"
  | "genders"
  | "qualifications"
  | "job-roles"
  | "days"
  | "attendance-statuses"
  | "marital-statuses"
  | "health-statuses"
  | "enrollment-statuses"
  | "orphan-statuses"
  | "ability-levels"
  | "activity-types"
  | "relationship-types"
  | "talents"
  | "hijri-months"
  | "weeks"
  | "buildings"
  | "governorates"
  | "directorates"
  | "sub-districts"
  | "villages"
  | "localities";

export type LookupCatalogListItem = {
  id: number;
  code?: string;
  name?: string;
  nameAr?: string;
  nameEn?: string | null;
  sortOrder?: number;
  nameArFemale?: string | null;
  orderNum?: number;
  isWorkingDay?: boolean;
  governorateId?: number;
  directorateId?: number;
  subDistrictId?: number;
  villageId?: number;
  appliesTo?: "STUDENTS" | "EMPLOYEES" | "ALL";
  colorCode?: string | null;
  requiresDetails?: boolean;
  gender?: "MALE" | "FEMALE" | "ALL";
  localityType?: "RURAL" | "URBAN";
  category?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type SchoolProfileListItem = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  ownershipTypeId: number | null;
  phone: string | null;
  email: string | null;
  addressText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ownershipType: {
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  } | null;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type AcademicYearStatus = "PLANNED" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export type AcademicYearListItem = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AcademicYearStatus;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AcademicTermType = "SEMESTER" | "TRIMESTER" | "QUARTER" | "CUSTOM";

export type TimetableDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type AcademicTermListItem = {
  id: string;
  academicYearId: string;
  code: string;
  name: string;
  termType: AcademicTermType;
  sequence: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
};

export type AcademicMonthListItem = {
  id: string;
  academicYearId: string;
  academicTermId: string;
  code: string;
  name: string;
  sequence: number;
  startDate: string;
  endDate: string;
  status: GradingWorkflowStatus;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    monthlyGrades: number;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    termType: AcademicTermType;
    isActive: boolean;
    startDate: string;
    endDate: string;
  };
};

export type GradeStage = "PRE_SCHOOL" | "PRIMARY" | "MIDDLE" | "HIGH" | "OTHER";

export type GradeLevelListItem = {
  id: string;
  code: string;
  name: string;
  stage: GradeStage;
  sequence: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sections: Array<{
    id: string;
    code: string;
    name: string;
    capacity: number | null;
    isActive: boolean;
  }>;
};

export type SubjectCategory =
  | "CORE"
  | "ELECTIVE"
  | "LANGUAGE"
  | "SCIENCE"
  | "MATHEMATICS"
  | "HUMANITIES"
  | "ARTS"
  | "SPORTS"
  | "TECHNOLOGY"
  | "OTHER";

export type SubjectListItem = {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  category: SubjectCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SectionListItem = {
  id: string;
  gradeLevelId: string;
  buildingLookupId: number | null;
  code: string;
  name: string;
  capacity: number | null;
  roomLabel: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  gradeLevel: {
    id: string;
    code: string;
    name: string;
    stage: GradeStage;
    sequence: number;
    isActive: boolean;
  };
  building: {
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  } | null;
};

export type ClassroomListItem = {
  id: string;
  code: string;
  name: string;
  capacity: number | null;
  notes: string | null;
  buildingLookupId: number | null;
  activeAssignmentsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  building: {
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  } | null;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type SectionClassroomAssignmentListItem = {
  id: string;
  sectionId: string;
  classroomId: string;
  academicYearId: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  notes: string | null;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  section: {
    id: string;
    code: string;
    name: string;
    capacity: number | null;
    isActive: boolean;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      stage: GradeStage;
      sequence: number;
    };
  };
  classroom: {
    id: string;
    code: string;
    name: string;
    capacity: number | null;
    notes: string | null;
    isActive: boolean;
    building?: {
      id: number;
      code: string;
      nameAr: string;
      nameEn: string | null;
      isActive: boolean;
    } | null;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type GradeLevelSubjectListItem = {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  isMandatory: boolean;
  weeklyPeriods: number;
  displayOrder: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  gradeLevel: {
    id: string;
    code: string;
    name: string;
    stage: GradeStage;
    sequence: number;
    isActive: boolean;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    shortName: string | null;
    category: SubjectCategory;
    isActive: boolean;
  };
};

export type TermSubjectOfferingListItem = {
  id: string;
  academicTermId: string;
  gradeLevelSubjectId: string;
  weeklyPeriods: number;
  displayOrder: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    academicYearId: string;
    isActive: boolean;
  };
  gradeLevelSubject: {
    id: string;
    academicYearId: string;
    gradeLevelId: string;
    subjectId: string;
    isMandatory: boolean;
    weeklyPeriods: number;
    displayOrder: number | null;
    isActive: boolean;
    academicYear: {
      id: string;
      code: string;
      name: string;
      status: AcademicYearStatus;
    };
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      stage: GradeStage;
      sequence: number;
    };
    subject: {
      id: string;
      code: string;
      name: string;
      shortName: string | null;
      category: SubjectCategory;
    };
  };
};

export type TimetableEntryListItem = {
  id: string;
  academicTermId: string;
  sectionId: string;
  termSubjectOfferingId: string;
  dayOfWeek: TimetableDay;
  periodIndex: number;
  roomLabel: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    academicYearId: string;
    isActive: boolean;
  };
  section: {
    id: string;
    code: string;
    name: string;
    gradeLevelId: string;
    isActive: boolean;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      stage: GradeStage;
      sequence: number;
    };
  };
  termSubjectOffering: TermSubjectOfferingListItem;
};

export type StudentGender = "MALE" | "FEMALE" | "OTHER";

export type StudentHealthStatus =
  | "HEALTHY"
  | "CHRONIC_DISEASE"
  | "SPECIAL_NEEDS"
  | "DISABILITY"
  | "OTHER";

export type StudentOrphanStatus =
  | "NONE"
  | "FATHER_DECEASED"
  | "MOTHER_DECEASED"
  | "BOTH_DECEASED";

export type GuardianRelationship =
  | "FATHER"
  | "MOTHER"
  | "BROTHER"
  | "SISTER"
  | "UNCLE"
  | "AUNT"
  | "GRANDFATHER"
  | "GRANDMOTHER"
  | "OTHER";

export type StudentEnrollmentStatus =
  | "NEW"
  | "TRANSFERRED"
  | "ACTIVE"
  | "PROMOTED"
  | "REPEATED"
  | "WITHDRAWN"
  | "GRADUATED"
  | "SUSPENDED";

export type StudentEnrollmentDistributionStatus =
  | "PENDING_DISTRIBUTION"
  | "ASSIGNED"
  | "TRANSFERRED";

export type StudentListItem = {
  id: string;
  admissionNo: string | null;
  fullName: string;
  gender: StudentGender;
  genderId: number | null;
  birthDate: string | null;
  bloodTypeId: number | null;
  localityId: number | null;
  healthStatus: StudentHealthStatus | null;
  healthStatusId: number | null;
  healthNotes: string | null;
  orphanStatus: StudentOrphanStatus;
  orphanStatusId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  bloodType: {
    id: number;
    name: string;
    isActive: boolean;
  } | null;
  locality: {
    id: number;
    nameAr: string;
    localityType: "RURAL" | "URBAN";
    isActive: boolean;
  } | null;
  genderLookup: {
    id: number;
    code: string;
    nameAr: string;
    nameEn: string | null;
    isActive: boolean;
  } | null;
  orphanStatusLookup: {
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  } | null;
  healthStatusLookup: {
    id: number;
    code: string;
    nameAr: string;
    requiresDetails: boolean;
    isActive: boolean;
  } | null;
  guardians: Array<{
    id: string;
    relationship: GuardianRelationship;
    isPrimary: boolean;
    guardian: {
      id: string;
      fullName: string;
      phonePrimary: string | null;
      whatsappNumber: string | null;
      isActive: boolean;
    };
  }>;
  enrollments: Array<{
    id: string;
    status: StudentEnrollmentStatus;
    enrollmentDate: string;
    gradeLevelId?: string | null;
    yearlyEnrollmentNo?: string | null;
    distributionStatus?: StudentEnrollmentDistributionStatus | null;
    academicYear: {
      id: string;
      code: string;
      name: string;
      status: AcademicYearStatus;
      isCurrent: boolean;
    };
    section: {
      id: string;
      code: string;
      name: string;
      gradeLevel: {
        id: string;
        code: string;
        name: string;
        stage: GradeStage;
        sequence: number;
      };
    };
  }>;
};

export type GuardianListItem = {
  id: string;
  fullName: string;
  gender: StudentGender;
  genderId: number | null;
  idNumber: string | null;
  idTypeId: number | null;
  localityId: number | null;
  phonePrimary: string | null;
  phoneSecondary: string | null;
  whatsappNumber: string | null;
  residenceText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  idType: {
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  } | null;
  locality: {
    id: number;
    nameAr: string;
    localityType: "RURAL" | "URBAN";
    isActive: boolean;
  } | null;
  genderLookup: {
    id: number;
    code: string;
    nameAr: string;
    nameEn: string | null;
    isActive: boolean;
  } | null;
  students: Array<{
    id: string;
    isPrimary: boolean;
    relationship: GuardianRelationship;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
  }>;
};

export type StudentGuardianListItem = {
  id: string;
  studentId: string;
  guardianId: string;
  relationship: GuardianRelationship;
  relationshipTypeId: number | null;
  isPrimary: boolean;
  canReceiveNotifications: boolean;
  canPickup: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
  guardian: {
    id: string;
    fullName: string;
    phonePrimary: string | null;
    whatsappNumber: string | null;
    isActive: boolean;
  };
  relationshipTypeLookup: {
    id: number;
    code: string;
    nameAr: string;
    gender: "MALE" | "FEMALE" | "ALL";
    isActive: boolean;
  } | null;
};

export type StudentEnrollmentListItem = {
  id: string;
  studentId: string;
  academicYearId: string;
  sectionId: string | null;
  gradeLevelId?: string | null;
  yearlyEnrollmentNo?: string | null;
  distributionStatus?: StudentEnrollmentDistributionStatus | null;
  enrollmentDate: string | null;
  status: StudentEnrollmentStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  gradeLevel?: {
    id: string;
    code: string;
    name: string;
    stage: GradeStage;
    sequence: number;
  } | null;
  section: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      stage: GradeStage;
      sequence: number;
    };
  };
};

export type StudentAttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED_ABSENCE"
  | "EARLY_LEAVE";

export type StudentAttendanceListItem = {
  id: string;
  studentEnrollmentId: string;
  attendanceDate: string;
  status: StudentAttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  studentEnrollment: {
    id: string;
    status: StudentEnrollmentStatus;
    isActive: boolean;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
    academicYear: {
      id: string;
      code: string;
      name: string;
      status: AcademicYearStatus;
      isCurrent: boolean;
    };
    section: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
    };
  };
};

export type StudentBookStatus = "ISSUED" | "RETURNED" | "LOST" | "DAMAGED";
export type StudentSiblingRelationship = "BROTHER" | "SISTER";
export type ParentNotificationType = "POSITIVE" | "NEGATIVE";
export type ParentNotificationSendMethod =
  | "PAPER"
  | "WHATSAPP"
  | "PHONE"
  | "OTHER";

export type GradingWorkflowStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "ARCHIVED";

export type AssessmentType =
  | "MONTHLY"
  | "MIDTERM"
  | "FINAL"
  | "QUIZ"
  | "ORAL"
  | "PRACTICAL"
  | "PROJECT";

export type GradingComponentCalculationMode =
  | "MANUAL"
  | "AUTO_ATTENDANCE"
  | "AUTO_HOMEWORK"
  | "AUTO_EXAM";

export type ExamAbsenceType = "EXCUSED" | "UNEXCUSED";

export type TieBreakStrategy =
  | "PERCENTAGE_ONLY"
  | "PERCENTAGE_THEN_TOTAL"
  | "PERCENTAGE_THEN_NAME";

export type StudentBookListItem = {
  id: string;
  studentEnrollmentId: string;
  subjectId: string;
  bookPart: string;
  issuedDate: string;
  dueDate: string | null;
  returnedDate: string | null;
  status: StudentBookStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  studentEnrollment: {
    id: string;
    status: StudentEnrollmentStatus;
    isActive: boolean;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
    academicYear: {
      id: string;
      code: string;
      name: string;
      isCurrent: boolean;
      status: AcademicYearStatus;
    };
    section: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
    };
  };
  subject: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
};

export type StudentTalentListItem = {
  id: string;
  studentId: string;
  talentId: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
  talent: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
};

export type StudentSiblingListItem = {
  id: string;
  studentId: string;
  siblingId: string;
  relationship: StudentSiblingRelationship;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
  sibling: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
};

export type StudentProblemListItem = {
  id: string;
  studentId: string;
  problemDate: string;
  problemType: string | null;
  problemDescription: string;
  actionsTaken: string | null;
  hasMinutes: boolean;
  isResolved: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
};

export type ParentNotificationListItem = {
  id: string;
  notificationNumber: number;
  studentId: string;
  notificationType: ParentNotificationType;
  guardianTitleId: number | null;
  behaviorType: string | null;
  behaviorDescription: string | null;
  requiredAction: string | null;
  sendMethod: ParentNotificationSendMethod;
  messengerName: string | null;
  isSent: boolean;
  sentDate: string | null;
  results: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
    isActive: boolean;
  };
  guardianTitleLookup: {
    id: number;
    code: string;
    nameAr: string;
    gender: "MALE" | "FEMALE" | "ALL";
    isActive: boolean;
  } | null;
};

export type HealthVisitListItem = {
  id: string;
  visitDate: string;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
  };
  nurse: {
    id: string;
    fullName: string;
    jobTitle: string | null;
  } | null;
  healthStatus: {
    id: number;
    code: string;
    nameAr: string;
    requiresDetails: boolean;
  } | null;
  notes: string | null;
  followUpRequired: boolean;
  followUpNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type HealthVisitStatusBreakdownItem = {
  id: number;
  code: string;
  nameAr: string;
  requiresDetails: boolean;
  count: number;
};

export type HealthVisitsSummary = {
  totalVisits: number;
  uniqueStudents: number;
  statusBreakdown: HealthVisitStatusBreakdownItem[];
  latestVisit: HealthVisitListItem | null;
  lastUpdatedAt: string;
};

export type CreateHealthVisitPayload = {
  studentId: string;
  nurseId?: string;
  healthStatusId: number;
  visitDate: string;
  notes?: string;
  followUpRequired?: boolean;
  followUpNotes?: string;
  isActive?: boolean;
};

export type UpdateHealthVisitPayload = {
  studentId?: string;
  nurseId?: string;
  healthStatusId?: number;
  visitDate?: string;
  notes?: string;
  followUpRequired?: boolean;
  followUpNotes?: string;
  isActive?: boolean;
};

export type HomeworkTypeListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  _count: {
    homeworks: number;
  };
};

export type HomeworkListItem = {
  id: string;
  academicYearId: string;
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  homeworkTypeId: string;
  title: string;
  content: string | null;
  homeworkDate: string;
  dueDate: string | null;
  maxScore: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  _count: {
    studentHomeworks: number;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    isCurrent: boolean;
    status: AcademicYearStatus;
  };
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    isActive: boolean;
    startDate: string;
    endDate: string;
  };
  section: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
    };
  };
  subject: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  homeworkType: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
};

export type StudentHomeworkListItem = {
  id: string;
  homeworkId: string;
  studentEnrollmentId: string;
  isCompleted: boolean;
  submittedAt: string | null;
  manualScore: number | null;
  teacherNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  homework: {
    id: string;
    title: string;
    homeworkDate: string;
    dueDate: string | null;
    maxScore: number;
    sectionId: string;
    subjectId: string;
    academicYearId: string;
    isActive: boolean;
    section: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
    };
    subject: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
    };
  };
  studentEnrollment: {
    id: string;
    studentId: string;
    sectionId: string;
    academicYearId: string;
    status: StudentEnrollmentStatus;
    isActive: boolean;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
    academicYear: {
      id: string;
      code: string;
      name: string;
      status: AcademicYearStatus;
      isCurrent: boolean;
    };
    section: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      gradeLevel: {
        id: string;
        code: string;
        name: string;
        stage: GradeStage;
        sequence: number;
      };
    };
  };
};

export type ExamPeriodListItem = {
  id: string;
  academicYearId: string;
  academicTermId: string;
  name: string;
  assessmentType: AssessmentType;
  startDate: string | null;
  endDate: string | null;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  lockedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  lockedByUser: {
    id: string;
    email: string;
  } | null;
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    termType: AcademicTermType;
    isActive: boolean;
  };
};

export type ExamAssessmentListItem = {
  id: string;
  examPeriodId: string;
  sectionId: string;
  subjectId: string;
  title: string;
  examDate: string;
  maxScore: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  examPeriod: {
    id: string;
    name: string;
    assessmentType: AssessmentType;
    status: GradingWorkflowStatus;
    isLocked: boolean;
    startDate: string | null;
    endDate: string | null;
    academicYearId: string;
    academicTermId: string;
  };
  section: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      sequence: number;
    };
  };
  subject: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
};

export type StudentExamScoreListItem = {
  id: string;
  examAssessmentId: string;
  studentEnrollmentId: string;
  score: number;
  isPresent: boolean;
  absenceType: ExamAbsenceType | null;
  excuseDetails: string | null;
  teacherNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  examAssessment: {
    id: string;
    title: string;
    examDate: string;
    maxScore: number;
    sectionId: string;
    subjectId: string;
    examPeriod: {
      id: string;
      name: string;
      assessmentType: AssessmentType;
      status: GradingWorkflowStatus;
      isLocked: boolean;
      academicYearId: string;
    };
    section: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
    };
    subject: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
    };
  };
  studentEnrollment: {
    id: string;
    studentId: string;
    sectionId: string;
    academicYearId: string;
    status: StudentEnrollmentStatus;
    isActive: boolean;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
    academicYear: {
      id: string;
      code: string;
      name: string;
      status: AcademicYearStatus;
      isCurrent: boolean;
    };
    section: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      gradeLevel: {
        id: string;
        code: string;
        name: string;
        sequence: number;
      };
    };
  };
};

export type GradingPolicyListItem = {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  sectionId: string | null;
  academicTermId: string | null;
  teacherEmployeeId: string | null;
  version: number;
  totalMaxScore: number;
  passingScore: number;
  isDefault: boolean;
  status: GradingWorkflowStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear: {
    id: string;
    code: string;
    name: string;
    isCurrent: boolean;
    status: AcademicYearStatus;
  };
  gradeLevel: {
    id: string;
    code: string;
    name: string;
    stage: GradeStage;
    sequence: number;
    isActive: boolean;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    category: SubjectCategory;
    isActive: boolean;
  };
  components: GradingPolicyComponentListItem[];
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type GradingPolicyComponentListItem = {
  id: string;
  gradingPolicyId: string;
  code: string;
  name: string;
  maxScore: number;
  calculationMode: GradingComponentCalculationMode;
  includeInMonthly: boolean;
  includeInSemester: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  gradingPolicy?: {
    id: string;
    academicYearId: string;
    gradeLevelId: string;
    subjectId: string;
    assessmentType: AssessmentType;
    sectionId: string | null;
    academicTermId: string | null;
    teacherEmployeeId: string | null;
    version: number;
    status: GradingWorkflowStatus;
    isActive: boolean;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type PeriodGradeComponentListItem = {
  id: string;
  monthlyGradeId: string;
  gradingPolicyComponentId: string;
  score: number;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
  gradingPolicyComponent: GradingPolicyComponentListItem;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type MonthlyGradeListItem = {
  id: string;
  studentEnrollmentId: string;
  subjectId: string;
  academicMonthId: string;
  academicTermId: string;
  academicYearId: string;
  gradingPolicyId: string;
  attendanceScore: number;
  homeworkScore: number;
  activityScore: number;
  contributionScore: number;
  customComponentsScore: number;
  examScore: number;
  monthlyTotal: number;
  periodGradeComponents: PeriodGradeComponentListItem[];
  status: GradingWorkflowStatus;
  isLocked: boolean;
  lockedAt: string | null;
  calculatedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    customComponentScores: number;
    periodGradeComponents: number;
  };
  studentEnrollment: {
    id: string;
    sectionId: string;
    gradeLevelId: string | null;
    academicYearId: string;
    status: StudentEnrollmentStatus;
    isActive: boolean;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
    section: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      gradeLevel: {
        id: string;
        code: string;
        name: string;
        sequence: number;
      };
    };
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      sequence: number;
    } | null;
    academicYear: {
      id: string;
      code: string;
      name: string;
      status: AcademicYearStatus;
      isCurrent: boolean;
    };
  };
  subject: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  academicMonth: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    startDate: string;
    endDate: string;
    status: GradingWorkflowStatus;
    isCurrent: boolean;
    isActive: boolean;
  };
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    isActive: boolean;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  gradingPolicy: {
    id: string;
    assessmentType: AssessmentType;
    status: GradingWorkflowStatus;
    totalMaxScore: number;
    passingScore: number;
    components: GradingPolicyComponentListItem[];
    isActive: boolean;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  lockedByUser: {
    id: string;
    email: string;
  } | null;
  customComponentScores: Array<{
    id: string;
    score: number;
    notes: string | null;
    isActive: boolean;
    gradingPolicyComponent: {
      id: string;
      code: string;
      name: string;
      maxScore: number;
      includeInMonthly: boolean;
      calculationMode: GradingComponentCalculationMode;
      isActive: boolean;
    };
  }>;
};

export type MonthlyCustomComponentScoreListItem = {
  id: string;
  monthlyGradeId: string;
  gradingPolicyComponentId: string;
  score: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  monthlyGrade: {
    id: string;
    studentEnrollmentId: string;
    subjectId: string;
    academicMonthId: string;
    academicYearId: string;
    gradingPolicyId: string;
    isLocked: boolean;
    isActive: boolean;
    studentEnrollment: {
      id: string;
      sectionId: string;
      student: {
        id: string;
        admissionNo: string | null;
        fullName: string;
      };
      section: {
        id: string;
        code: string;
        name: string;
      };
    };
    subject: {
      id: string;
      code: string;
      name: string;
    };
    academicMonth: {
      id: string;
      code: string;
      name: string;
      sequence: number;
    };
  };
  gradingPolicyComponent: {
    id: string;
    code: string;
    name: string;
    maxScore: number;
    includeInMonthly: boolean;
    calculationMode: GradingComponentCalculationMode;
    isActive: boolean;
    gradingPolicyId: string;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type SemesterGradeListItem = {
  id: string;
  studentEnrollmentId: string;
  subjectId: string;
  academicTermId: string;
  academicYearId: string;
  semesterWorkTotal: number;
  finalExamScore: number | null;
  semesterTotal: number;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  lockedAt: string | null;
  approvedAt: string | null;
  calculatedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  studentEnrollment: {
    id: string;
    studentId: string;
    sectionId: string;
    gradeLevelId: string | null;
    academicYearId: string;
    status: StudentEnrollmentStatus;
    isActive: boolean;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
    section: {
      id: string;
      code: string;
      name: string;
      isActive: boolean;
      gradeLevel: {
        id: string;
        code: string;
        name: string;
        sequence: number;
      };
    };
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      sequence: number;
    } | null;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  academicTerm: {
    id: string;
    code: string;
    name: string;
    sequence: number;
    isActive: boolean;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  lockedByUser: {
    id: string;
    email: string;
  } | null;
  approvedByUser: {
    id: string;
    email: string;
  } | null;
};

export type AnnualStatusListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    annualGrades: number;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type PromotionDecisionListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    annualResults: number;
    conditionalForRules: number;
    retainedForRules: number;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type GradingOutcomeRuleListItem = {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  promotedMaxFailedSubjects: number;
  conditionalMaxFailedSubjects: number;
  conditionalDecisionId: string;
  retainedDecisionId: string;
  tieBreakStrategy: TieBreakStrategy;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  gradeLevel: {
    id: string;
    code: string;
    name: string;
    stage: GradeStage;
    sequence: number;
  };
  conditionalDecision: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  retainedDecision: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type AnnualGradeListItem = {
  id: string;
  studentEnrollmentId: string;
  subjectId: string;
  academicYearId: string;
  semester1Total: number;
  semester2Total: number;
  annualTotal: number;
  annualPercentage: number | null;
  finalStatusId: string;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  lockedAt: string | null;
  approvedAt: string | null;
  calculatedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  termTotals: Array<{
    id: string;
    academicTermId: string;
    termTotal: number;
    academicTerm: {
      id: string;
      code: string;
      name: string;
      sequence: number;
      termType: AcademicTermType;
    };
  }>;
  studentEnrollment: {
    id: string;
    studentId: string;
    sectionId: string;
    gradeLevelId: string | null;
    academicYearId: string;
    status: StudentEnrollmentStatus;
    isActive: boolean;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
    section: {
      id: string;
      code: string;
      name: string;
      gradeLevelId: string;
      isActive: boolean;
      gradeLevel: {
        id: string;
        code: string;
        name: string;
        sequence: number;
      };
    };
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      sequence: number;
    } | null;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  finalStatus: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  lockedByUser: {
    id: string;
    email: string;
  } | null;
  approvedByUser: {
    id: string;
    email: string;
  } | null;
};

export type AnnualResultListItem = {
  id: string;
  studentEnrollmentId: string;
  academicYearId: string;
  totalAllSubjects: number;
  maxPossibleTotal: number;
  percentage: number;
  rankInClass: number | null;
  rankInGrade: number | null;
  passedSubjectsCount: number;
  failedSubjectsCount: number;
  promotionDecisionId: string;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  lockedAt: string | null;
  approvedAt: string | null;
  calculatedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  studentEnrollment: {
    id: string;
    studentId: string;
    sectionId: string;
    gradeLevelId: string | null;
    academicYearId: string;
    status: StudentEnrollmentStatus;
    isActive: boolean;
    student: {
      id: string;
      admissionNo: string | null;
      fullName: string;
      isActive: boolean;
    };
    section: {
      id: string;
      code: string;
      name: string;
      gradeLevelId: string;
      isActive: boolean;
      gradeLevel: {
        id: string;
        code: string;
        name: string;
        sequence: number;
      };
    };
    gradeLevel: {
      id: string;
      code: string;
      name: string;
      sequence: number;
    } | null;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
    isCurrent: boolean;
  };
  promotionDecision: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  lockedByUser: {
    id: string;
    email: string;
  } | null;
  approvedByUser: {
    id: string;
    email: string;
  } | null;
};

export type EmployeeGender = "MALE" | "FEMALE" | "OTHER";

export type EmploymentType = "PERMANENT" | "CONTRACT" | "VOLUNTEER";

export type EmployeeSystemAccessStatus = "GRANTED" | "SUSPENDED";
export type OperationalReadinessFilter = "READY" | "PARTIAL" | "NOT_READY";

export type EmployeeListItem = {
  id: string;
  jobNumber: string | null;
  financialNumber: string | null;
  fullName: string;
  gender: EmployeeGender;
  genderId: number | null;
  birthDate: string | null;
  phonePrimary: string | null;
  phoneSecondary: string | null;
  hasWhatsapp: boolean;
  qualification: string | null;
  qualificationId: number | null;
  qualificationDate: string | null;
  specialization: string | null;
  idNumber: string | null;
  idTypeId: number | null;
  localityId: number | null;
  departmentId: string | null;
  branchId: number | null;
  directManagerEmployeeId: string | null;
  costCenterId: number | null;
  idExpiryDate: string | null;
  experienceYears: number;
  employmentType: EmploymentType | null;
  jobTitle: string | null;
  jobRoleId: number | null;
  hireDate: string | null;
  previousSchool: string | null;
  salaryApproved: boolean;
  systemAccessStatus: EmployeeSystemAccessStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
  idType: {
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  } | null;
  locality: {
    id: number;
    nameAr: string;
    localityType: "RURAL" | "URBAN";
    directorateId: number | null;
    villageId: number | null;
  } | null;
  genderLookup: {
    id: number;
    code: string;
    nameAr: string;
    nameEn: string | null;
    isActive: boolean;
  } | null;
  qualificationLookup: {
    id: number;
    code: string;
    nameAr: string;
    sortOrder: number;
    isActive: boolean;
  } | null;
  jobRoleLookup: {
    id: number;
    code: string;
    nameAr: string;
    nameArFemale: string | null;
    isActive: boolean;
  } | null;
  department: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  } | null;
  branch: {
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  } | null;
  costCenter: {
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  } | null;
  directManager: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
    isActive: boolean;
  } | null;
  userAccount: {
    id: string;
    email: string;
    username: string | null;
    isActive: boolean;
    userRoles: Array<{
      role: {
        id: string;
        code: string;
        name: string;
        isActive: boolean;
      };
    }>;
  } | null;
  operationalScope: {
    activeTeachingAssignments: number;
    activeSectionSupervisions: number;
  };
};

export type EmployeeTeachingAssignmentListItem = {
  id: string;
  employeeId: string;
  sectionId: string;
  subjectId: string;
  academicYearId: string;
  weeklyPeriods: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
  section: {
    id: string;
    code: string;
    name: string;
    gradeLevelId: string;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
    };
  };
  subject: {
    id: string;
    code: string;
    name: string;
    category: SubjectCategory;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
  };
};

export type EmployeeAttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED_ABSENCE"
  | "EARLY_LEAVE";

export type EmployeeAttendanceListItem = {
  id: string;
  employeeId: string;
  attendanceDate: string;
  status: EmployeeAttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
};

export type EmployeeTaskListItem = {
  id: string;
  employeeId: string;
  academicYearId: string | null;
  taskName: string;
  dayOfWeek: TimetableDay | null;
  assignmentDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
  } | null;
};

export type PerformanceRatingLevel =
  | "EXCELLENT"
  | "VERY_GOOD"
  | "GOOD"
  | "ACCEPTABLE"
  | "POOR";

export type EmployeePerformanceEvaluationListItem = {
  id: string;
  employeeId: string;
  academicYearId: string;
  evaluationDate: string;
  score: number;
  ratingLevel: PerformanceRatingLevel;
  evaluatorEmployeeId: string | null;
  strengths: string | null;
  weaknesses: string | null;
  recommendations: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
  evaluator: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  } | null;
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: AcademicYearStatus;
  };
};

export type ViolationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type EmployeeViolationListItem = {
  id: string;
  employeeId: string;
  violationDate: string;
  violationAspect: string;
  violationText: string;
  actionTaken: string | null;
  severity: ViolationSeverity;
  hasWarning: boolean;
  hasMinutes: boolean;
  reportedByEmployeeId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
  reportedBy: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  } | null;
};

export type TalentListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type EmployeeCourseListItem = {
  id: string;
  employeeId: string;
  courseName: string;
  courseProvider: string | null;
  courseDate: string | null;
  durationDays: number | null;
  certificateNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
};

export type EmployeeContractListItem = {
  id: string;
  employeeId: string;
  contractTitle: string;
  contractNumber: string | null;
  contractStartDate: string;
  contractEndDate: string | null;
  salaryAmount: number | string | null;
  notes: string | null;
  isCurrent: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
};

export type GenerateEmployeeContractExpiryAlertsPayload = {
  daysThreshold?: number;
};

export type GenerateEmployeeContractExpiryAlertsResponse = {
  success: boolean;
  scannedCount: number;
  generatedCount: number;
  daysThreshold: number;
};

export type EmployeeDepartmentListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    employees: number;
  };
  createdBy: {
    id: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    email: string;
  } | null;
};

export type UserNotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ACTION_REQUIRED";

export type UserNotificationListItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  notificationType: UserNotificationType;
  resource: string | null;
  resourceId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  triggeredByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type UserNotificationsListResponse = PaginatedResponse<UserNotificationListItem> & {
  unreadCount: number;
};

export type EmployeeDocumentListItem = {
  id: string;
  employeeId: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  fileCategory: string | null;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  } | null;
};

export type EmployeeLeaveType =
  | "ANNUAL"
  | "SICK"
  | "EMERGENCY"
  | "UNPAID"
  | "MATERNITY"
  | "OTHER";

export type EmployeeLeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type EmployeeLifecycleChecklistType = "ONBOARDING" | "OFFBOARDING";

export type EmployeeLifecycleChecklistStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "WAIVED";

export type EmployeeLeaveListItem = {
  id: string;
  employeeId: string;
  leaveType: EmployeeLeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: EmployeeLeaveRequestStatus;
  reason: string | null;
  notes: string | null;
  approvedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
  approvedBy: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type EmployeeLeaveBalanceListItem = {
  id: string;
  employeeId: string;
  leaveType: EmployeeLeaveType;
  balanceYear: number;
  allocatedDays: number;
  carriedForwardDays: number;
  manualAdjustmentDays: number;
  totalEntitledDays: number;
  usedDays: number;
  remainingDays: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
};

export type EmployeeLifecycleChecklistListItem = {
  id: string;
  employeeId: string;
  checklistType: EmployeeLifecycleChecklistType;
  title: string;
  status: EmployeeLifecycleChecklistStatus;
  assignedToEmployeeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
  assignedTo: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  } | null;
};

export type EmployeeOrganizationOptionsResponse = {
  departments: Array<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  }>;
  branches: Array<{
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
  }>;
  costCenters: Array<{
    id: number;
    code: string;
    nameAr: string;
    isActive: boolean;
    branchId: number | null;
  }>;
  managers: Array<{
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
    isActive: boolean;
  }>;
};

export type EmployeeTalentListItem = {
  id: string;
  employeeId: string;
  talentId: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    jobNumber: string | null;
    jobTitle: string | null;
  };
  talent: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
};

export type GradingSummaryReportResponse = {
  generatedAt: string;
  scope: {
    academicYearId: string | null;
    gradeLevelId: string | null;
    sectionId: string | null;
    academicTermId: string | null;
    fromDate: string | null;
    toDate: string | null;
  };
  semesterGrades: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    unlocked: number;
    lockRate: number;
    byStatus: Array<{
      status: GradingWorkflowStatus;
      count: number;
    }>;
  };
  annualGrades: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    unlocked: number;
    lockRate: number;
    byStatus: Array<{
      status: GradingWorkflowStatus;
      count: number;
    }>;
    byFinalStatus: Array<{
      finalStatusId: string;
      code: string;
      name: string;
      count: number;
    }>;
  };
  annualResults: {
    total: number;
    active: number;
    inactive: number;
    locked: number;
    unlocked: number;
    lockRate: number;
    byStatus: Array<{
      status: GradingWorkflowStatus;
      count: number;
    }>;
    byPromotionDecision: Array<{
      promotionDecisionId: string;
      code: string;
      name: string;
      count: number;
    }>;
  };
  rankingReadiness: {
    withClassRank: number;
    withGradeRank: number;
    fullyRanked: number;
    missingClassRank: number;
    missingGradeRank: number;
    notFullyRanked: number;
  };
};

export type GradingDetailedReportItem = {
  id: string;
  studentEnrollmentId: string;
  academicYearId: string;
  totalAllSubjects: number;
  maxPossibleTotal: number;
  percentage: number;
  rankInClass: number | null;
  rankInGrade: number | null;
  passedSubjectsCount: number;
  failedSubjectsCount: number;
  status: GradingWorkflowStatus;
  isLocked: boolean;
  isActive: boolean;
  calculatedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    admissionNo: string | null;
    fullName: string;
  };
  section: {
    id: string;
    code: string;
    name: string;
    gradeLevel: {
      id: string;
      code: string;
      name: string;
    };
  };
  gradeLevel: {
    id: string;
    code: string;
    name: string;
  };
  academicYear: {
    id: string;
    code: string;
    name: string;
  };
  promotionDecision: {
    id: string;
    code: string;
    name: string;
  };
  gradeDescription: {
    id: number;
    minPercentage: number;
    maxPercentage: number;
    nameAr: string;
    nameEn: string | null;
    colorCode: string | null;
    sortOrder: number;
  } | null;
};

export type HrSummaryReportResponse = {
  generatedAt: string;
  scope: {
    fromDate: string | null;
    toDate: string | null;
    employeeId: string | null;
  };
  employees: {
    total: number;
    active: number;
    inactive: number;
    withUserAccount: number;
    withoutUserAccount: number;
  };
  attendance: {
    total: number;
    byStatus: Array<{
      status: EmployeeAttendanceStatus;
      count: number;
    }>;
    indicators: {
      presentRate: number;
      absentRate: number;
      lateRate: number;
      excusedAbsenceRate: number;
      earlyLeaveRate: number;
    };
  };
  violations: {
    total: number;
    withWarning: number;
    bySeverity: Array<{
      severity: ViolationSeverity;
      count: number;
    }>;
  };
  courses: {
    total: number;
  };
  workload: {
    activeTeachingAssignments: number;
    activeTasks: number;
  };
  performance: {
    totalEvaluations: number;
    byRating: Array<{
      ratingLevel: PerformanceRatingLevel;
      count: number;
    }>;
  };
  organization: {
    departmentDistribution: Array<{
      departmentId: string;
      departmentCode: string | null;
      departmentName: string;
      employeeCount: number;
    }>;
    unassignedEmployees: number;
  };
  compliance: {
    thresholdDays: number;
    incompleteProfiles: number;
    employeesWithoutDocuments: number;
    contractsExpiringSoon: number;
    contractsExpired: number;
    documentsExpiringSoon: number;
    documentsExpired: number;
    identitiesExpiringSoon: number;
    identitiesExpired: number;
  };
};

export type CreateUserPayload = {
  email?: string;
  username?: string;
  employeeId?: string;
  guardianId?: string;
  phoneCountryCode: string;
  phoneNationalNumber: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  roleIds?: string[];
};

export type UpdateUserPayload = {
  email?: string;
  username?: string;
  employeeId?: string | null;
  guardianId?: string | null;
  phoneCountryCode?: string;
  phoneNationalNumber?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roleIds?: string[];
};

export type CreatedUserResponse = UserListItem & {
  activationSetup: {
    initialOneTimePassword: string;
    expiresAt: string;
    activationStatus: "ACTIVE" | "PENDING_INITIAL_PASSWORD" | "SUSPENDED";
  };
};

export type DeleteEntityResponse = {
  success: boolean;
  id: string | number;
};

export type CreateRolePayload = {
  code?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: string[];
};

export type UpdateRolePayload = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: string[];
};

export type CreatePermissionPayload = {
  code: string;
  resource: string;
  action: string;
  description?: string;
  isSystem?: boolean;
};

export type UpdatePermissionPayload = {
  code?: string;
  resource?: string;
  action?: string;
  description?: string;
  isSystem?: boolean;
};

export type CreateGlobalSettingPayload = {
  key: string;
  valueType: SettingValueType;
  value: unknown;
  description?: string;
  isPublic?: boolean;
};

export type UpdateGlobalSettingPayload = {
  valueType?: SettingValueType;
  value?: unknown;
  description?: string;
  isPublic?: boolean;
};

export type CreateSystemSettingPayload = {
  settingKey: string;
  settingValue?: string;
  settingType?: SystemSettingType;
  category?: string;
  description?: string;
  isEditable?: boolean;
};

export type UpdateSystemSettingPayload = {
  settingValue?: string;
  settingType?: SystemSettingType;
  category?: string;
  description?: string;
  isEditable?: boolean;
};

export type CreateReminderTickerPayload = {
  content: string;
  tickerType?: ReminderTickerType;
  isActive?: boolean;
  displayOrder?: number;
  startDate?: string;
  endDate?: string;
};

export type UpdateReminderTickerPayload = {
  content?: string;
  tickerType?: ReminderTickerType;
  isActive?: boolean;
  displayOrder?: number;
  startDate?: string;
  endDate?: string;
};

export type UserNotificationsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  notificationType?: UserNotificationType;
  isRead?: boolean;
};

export type CreateUserPermissionPayload = {
  userId: string;
  permissionId: string;
  validFrom?: string;
  validUntil?: string;
  grantReason: string;
  notes?: string;
};

export type UpdateUserPermissionPayload = {
  validFrom?: string;
  validUntil?: string;
  grantReason?: string;
  notes?: string;
};

export type RevokeUserPermissionPayload = {
  revokeReason?: string;
};

export type CreateEmployeeSectionSupervisionPayload = {
  employeeId: string;
  sectionId: string;
  academicYearId: string;
  canViewStudents?: boolean;
  canManageHomeworks?: boolean;
  canManageGrades?: boolean;
  isActive?: boolean;
};

export type UpdateEmployeeSectionSupervisionPayload = {
  employeeId?: string;
  sectionId?: string;
  academicYearId?: string;
  canViewStudents?: boolean;
  canManageHomeworks?: boolean;
  canManageGrades?: boolean;
  isActive?: boolean;
};

export type CreateLookupBloodTypePayload = {
  name: string;
  isActive?: boolean;
};

export type UpdateLookupBloodTypePayload = {
  name?: string;
  isActive?: boolean;
};

export type CreateLookupIdTypePayload = {
  code?: string;
  nameAr: string;
  isActive?: boolean;
};

export type UpdateLookupIdTypePayload = {
  code?: string;
  nameAr?: string;
  isActive?: boolean;
};

export type CreateLookupOwnershipTypePayload = {
  code?: string;
  nameAr: string;
  isActive?: boolean;
};

export type UpdateLookupOwnershipTypePayload = {
  code?: string;
  nameAr?: string;
  isActive?: boolean;
};

export type CreateLookupPeriodPayload = {
  code?: string;
  nameAr: string;
  isActive?: boolean;
};

export type UpdateLookupPeriodPayload = {
  code?: string;
  nameAr?: string;
  isActive?: boolean;
};

export type CreateLookupEnrollmentStatusPayload = {
  code?: string;
  nameAr: string;
  isActive?: boolean;
};

export type UpdateLookupEnrollmentStatusPayload = {
  code?: string;
  nameAr?: string;
  isActive?: boolean;
};

export type CreateLookupOrphanStatusPayload = {
  code?: string;
  nameAr: string;
  isActive?: boolean;
};

export type UpdateLookupOrphanStatusPayload = {
  code?: string;
  nameAr?: string;
  isActive?: boolean;
};

export type CreateLookupAbilityLevelPayload = {
  code?: string;
  nameAr: string;
  isActive?: boolean;
};

export type UpdateLookupAbilityLevelPayload = {
  code?: string;
  nameAr?: string;
  isActive?: boolean;
};

export type CreateLookupActivityTypePayload = {
  code?: string;
  nameAr: string;
  isActive?: boolean;
};

export type UpdateLookupActivityTypePayload = {
  code?: string;
  nameAr?: string;
  isActive?: boolean;
};

export type CreateLookupGradeDescriptionPayload = {
  minPercentage: number;
  maxPercentage: number;
  nameAr: string;
  nameEn?: string;
  colorCode?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateLookupGradeDescriptionPayload = {
  minPercentage?: number;
  maxPercentage?: number;
  nameAr?: string;
  nameEn?: string;
  colorCode?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateLookupCatalogItemPayload = {
  name?: string;
  code?: string;
  nameAr?: string;
  nameEn?: string;
  sortOrder?: number;
  nameArFemale?: string;
  orderNum?: number;
  isWorkingDay?: boolean;
  governorateId?: number;
  directorateId?: number;
  subDistrictId?: number;
  villageId?: number;
  appliesTo?: "STUDENTS" | "EMPLOYEES" | "ALL";
  colorCode?: string;
  requiresDetails?: boolean;
  gender?: "MALE" | "FEMALE" | "ALL";
  localityType?: "RURAL" | "URBAN";
  category?: string;
  isActive?: boolean;
};

export type UpdateLookupCatalogItemPayload = CreateLookupCatalogItemPayload;

export type CreateSchoolProfilePayload = {
  code?: string;
  nameAr: string;
  nameEn?: string;
  ownershipTypeId?: number;
  phone?: string;
  email?: string;
  addressText?: string;
  isActive?: boolean;
};

export type UpdateSchoolProfilePayload = {
  code?: string;
  nameAr?: string;
  nameEn?: string;
  ownershipTypeId?: number;
  phone?: string;
  email?: string;
  addressText?: string;
  isActive?: boolean;
};

export type CreateAcademicYearPayload = {
  code?: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: AcademicYearStatus;
  isCurrent?: boolean;
};

export type UpdateAcademicYearPayload = {
  code?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: AcademicYearStatus;
  isCurrent?: boolean;
};

export type CreateAcademicTermPayload = {
  academicYearId: string;
  code?: string;
  name: string;
  termType?: AcademicTermType;
  sequence: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
};

export type UpdateAcademicTermPayload = {
  academicYearId?: string;
  code?: string;
  name?: string;
  termType?: AcademicTermType;
  sequence?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
};

export type CreateAcademicMonthPayload = {
  academicYearId: string;
  academicTermId: string;
  code?: string;
  name: string;
  sequence: number;
  startDate: string;
  endDate: string;
  status?: GradingWorkflowStatus;
  isCurrent?: boolean;
  isActive?: boolean;
};

export type UpdateAcademicMonthPayload = {
  academicYearId?: string;
  academicTermId?: string;
  code?: string;
  name?: string;
  sequence?: number;
  startDate?: string;
  endDate?: string;
  status?: GradingWorkflowStatus;
  isCurrent?: boolean;
  isActive?: boolean;
};

export type CreateGradeLevelPayload = {
  code?: string;
  name: string;
  stage?: GradeStage;
  sequence: number;
  isActive?: boolean;
};

export type UpdateGradeLevelPayload = {
  code?: string;
  name?: string;
  stage?: GradeStage;
  sequence?: number;
  isActive?: boolean;
};

export type CreateSubjectPayload = {
  code?: string;
  name: string;
  shortName?: string;
  category?: SubjectCategory;
  isActive?: boolean;
};

export type UpdateSubjectPayload = {
  code?: string;
  name?: string;
  shortName?: string;
  category?: SubjectCategory;
  isActive?: boolean;
};

export type CreateSectionPayload = {
  gradeLevelId: string;
  code?: string;
  name: string;
  capacity?: number;
  buildingLookupId?: number;
  roomLabel?: string;
  isActive?: boolean;
};

export type CreateClassroomPayload = {
  code?: string;
  name: string;
  capacity?: number;
  notes?: string;
  buildingLookupId?: number;
  isActive?: boolean;
};

export type UpdateSectionPayload = {
  gradeLevelId?: string;
  code?: string;
  name?: string;
  capacity?: number;
  buildingLookupId?: number | null;
  roomLabel?: string;
  isActive?: boolean;
};

export type UpdateClassroomPayload = {
  code?: string;
  name?: string;
  capacity?: number;
  notes?: string;
  buildingLookupId?: number | null;
  isActive?: boolean;
};

export type CreateSectionClassroomAssignmentPayload = {
  sectionId: string;
  classroomId: string;
  academicYearId: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  notes?: string;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type UpdateSectionClassroomAssignmentPayload = {
  sectionId?: string;
  classroomId?: string;
  academicYearId?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type CreateGradeLevelSubjectPayload = {
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  isMandatory?: boolean;
  weeklyPeriods?: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type UpdateGradeLevelSubjectPayload = {
  academicYearId?: string;
  gradeLevelId?: string;
  subjectId?: string;
  isMandatory?: boolean;
  weeklyPeriods?: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type CreateTermSubjectOfferingPayload = {
  academicTermId: string;
  gradeLevelSubjectId: string;
  weeklyPeriods?: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type UpdateTermSubjectOfferingPayload = {
  academicTermId?: string;
  gradeLevelSubjectId?: string;
  weeklyPeriods?: number;
  displayOrder?: number;
  isActive?: boolean;
};

export type CreateTimetableEntryPayload = {
  academicTermId: string;
  sectionId: string;
  termSubjectOfferingId: string;
  dayOfWeek: TimetableDay;
  periodIndex: number;
  roomLabel?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateTimetableEntryPayload = {
  academicTermId?: string;
  sectionId?: string;
  termSubjectOfferingId?: string;
  dayOfWeek?: TimetableDay;
  periodIndex?: number;
  roomLabel?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateStudentPayload = {
  fullName: string;
  gender?: StudentGender;
  genderId?: number;
  birthDate?: string;
  bloodTypeId?: number | null;
  localityId?: number | null;
  healthStatus?: StudentHealthStatus;
  healthStatusId?: number;
  healthNotes?: string;
  orphanStatus?: StudentOrphanStatus;
  orphanStatusId?: number;
  isActive?: boolean;
};

export type UpdateStudentPayload = {
  fullName?: string;
  gender?: StudentGender;
  genderId?: number;
  birthDate?: string;
  bloodTypeId?: number | null;
  localityId?: number | null;
  healthStatus?: StudentHealthStatus;
  healthStatusId?: number;
  healthNotes?: string;
  orphanStatus?: StudentOrphanStatus;
  orphanStatusId?: number;
  isActive?: boolean;
};

export type CreateGuardianPayload = {
  fullName: string;
  gender?: StudentGender;
  genderId?: number;
  idNumber?: string;
  idTypeId?: number | null;
  localityId?: number | null;
  phonePrimary?: string;
  phoneSecondary?: string;
  whatsappNumber?: string;
  residenceText?: string;
  isActive?: boolean;
};

export type UpdateGuardianPayload = {
  fullName?: string;
  gender?: StudentGender;
  genderId?: number;
  idNumber?: string;
  idTypeId?: number | null;
  localityId?: number | null;
  phonePrimary?: string;
  phoneSecondary?: string;
  whatsappNumber?: string;
  residenceText?: string;
  isActive?: boolean;
};

export type CreateStudentGuardianPayload = {
  studentId: string;
  guardianId: string;
  relationship?: GuardianRelationship;
  relationshipTypeId?: number;
  isPrimary?: boolean;
  canReceiveNotifications?: boolean;
  canPickup?: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateStudentGuardianPayload = {
  studentId?: string;
  guardianId?: string;
  relationship?: GuardianRelationship;
  relationshipTypeId?: number;
  isPrimary?: boolean;
  canReceiveNotifications?: boolean;
  canPickup?: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateStudentEnrollmentPayload = {
  studentId: string;
  academicYearId: string;
  sectionId?: string;
  gradeLevelId?: string;
  yearlyEnrollmentNo?: string;
  distributionStatus?: StudentEnrollmentDistributionStatus;
  enrollmentDate?: string;
  status?: StudentEnrollmentStatus;
  notes?: string;
  isActive?: boolean;
};

export type UpdateStudentEnrollmentPayload = {
  studentId?: string;
  academicYearId?: string;
  sectionId?: string;
  gradeLevelId?: string;
  yearlyEnrollmentNo?: string;
  distributionStatus?: StudentEnrollmentDistributionStatus;
  enrollmentDate?: string;
  status?: StudentEnrollmentStatus;
  notes?: string;
  isActive?: boolean;
};

export type StudentEnrollmentDistributionBoard = {
  summary: {
    pendingCount: number;
    assignedCount: number;
    totalCount: number;
  };
  sections: Array<{
    id: string;
    code: string;
    name: string;
    capacity: number | null;
    assignedCount: number;
    availableSeats: number | null;
  }>;
  pendingEnrollments: StudentEnrollmentListItem[];
  assignedEnrollments: StudentEnrollmentListItem[];
};

export type AutoDistributeStudentEnrollmentsPayload = {
  academicYearId: string;
  gradeLevelId: string;
  sectionIds?: string[];
  limit?: number;
};

export type ManualDistributeStudentEnrollmentsPayload = {
  academicYearId: string;
  gradeLevelId: string;
  assignments: Array<{
    enrollmentId: string;
    sectionId: string;
  }>;
};

export type TransferStudentEnrollmentsPayload = {
  academicYearId: string;
  gradeLevelId: string;
  sourceSectionId: string;
  targetSectionId: string;
  enrollments?: Array<{
    enrollmentId: string;
  }>;
};

export type ReturnStudentEnrollmentsToPendingPayload = {
  academicYearId: string;
  gradeLevelId: string;
  enrollments: Array<{
    enrollmentId: string;
  }>;
};

export type CreateStudentAttendancePayload = {
  studentEnrollmentId: string;
  attendanceDate: string;
  status: StudentAttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateStudentAttendancePayload = {
  studentEnrollmentId?: string;
  attendanceDate?: string;
  status?: StudentAttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateStudentBookPayload = {
  studentEnrollmentId: string;
  subjectId: string;
  bookPart?: string;
  issuedDate: string;
  dueDate?: string;
  returnedDate?: string;
  status?: StudentBookStatus;
  notes?: string;
  isActive?: boolean;
};

export type UpdateStudentBookPayload = {
  studentEnrollmentId?: string;
  subjectId?: string;
  bookPart?: string;
  issuedDate?: string;
  dueDate?: string;
  returnedDate?: string;
  status?: StudentBookStatus;
  notes?: string;
  isActive?: boolean;
};

export type CreateStudentTalentPayload = {
  studentId: string;
  talentId: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateStudentTalentPayload = {
  studentId?: string;
  talentId?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateStudentSiblingPayload = {
  studentId: string;
  siblingId: string;
  relationship: StudentSiblingRelationship;
  notes?: string;
  isActive?: boolean;
};

export type UpdateStudentSiblingPayload = {
  studentId?: string;
  siblingId?: string;
  relationship?: StudentSiblingRelationship;
  notes?: string;
  isActive?: boolean;
};

export type CreateStudentProblemPayload = {
  studentId: string;
  problemDate: string;
  problemType?: string;
  problemDescription: string;
  actionsTaken?: string;
  hasMinutes?: boolean;
  isResolved?: boolean;
  isActive?: boolean;
};

export type UpdateStudentProblemPayload = {
  studentId?: string;
  problemDate?: string;
  problemType?: string;
  problemDescription?: string;
  actionsTaken?: string;
  hasMinutes?: boolean;
  isResolved?: boolean;
  isActive?: boolean;
};

export type CreateParentNotificationPayload = {
  studentId: string;
  notificationType: ParentNotificationType;
  guardianTitleId?: number;
  behaviorType?: string;
  behaviorDescription?: string;
  requiredAction?: string;
  sendMethod?: ParentNotificationSendMethod;
  messengerName?: string;
  isSent?: boolean;
  sentDate?: string;
  results?: string;
  isActive?: boolean;
};

export type UpdateParentNotificationPayload = {
  studentId?: string;
  notificationType?: ParentNotificationType;
  guardianTitleId?: number;
  behaviorType?: string;
  behaviorDescription?: string;
  requiredAction?: string;
  sendMethod?: ParentNotificationSendMethod;
  messengerName?: string;
  isSent?: boolean;
  sentDate?: string;
  results?: string;
  isActive?: boolean;
};

export type CreateHomeworkTypePayload = {
  code?: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
};

export type UpdateHomeworkTypePayload = {
  code?: string;
  name?: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
};

export type CreateHomeworkPayload = {
  academicYearId: string;
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  homeworkTypeId: string;
  title: string;
  content?: string;
  homeworkDate: string;
  dueDate?: string;
  maxScore?: number;
  notes?: string;
  autoPopulateStudents?: boolean;
  isActive?: boolean;
};

export type UpdateHomeworkPayload = {
  academicYearId?: string;
  academicTermId?: string;
  sectionId?: string;
  subjectId?: string;
  homeworkTypeId?: string;
  title?: string;
  content?: string;
  homeworkDate?: string;
  dueDate?: string;
  maxScore?: number;
  notes?: string;
  isActive?: boolean;
};

export type CreateStudentHomeworkPayload = {
  homeworkId: string;
  studentEnrollmentId: string;
  isCompleted?: boolean;
  submittedAt?: string;
  manualScore?: number;
  teacherNotes?: string;
  isActive?: boolean;
};

export type UpdateStudentHomeworkPayload = {
  homeworkId?: string;
  studentEnrollmentId?: string;
  isCompleted?: boolean;
  submittedAt?: string;
  manualScore?: number;
  teacherNotes?: string;
  isActive?: boolean;
};

export type CreateExamPeriodPayload = {
  academicYearId: string;
  academicTermId: string;
  name: string;
  assessmentType: AssessmentType;
  startDate?: string;
  endDate?: string;
  status?: GradingWorkflowStatus;
  isLocked?: boolean;
  isActive?: boolean;
};

export type UpdateExamPeriodPayload = {
  academicYearId?: string;
  academicTermId?: string;
  name?: string;
  assessmentType?: AssessmentType;
  startDate?: string;
  endDate?: string;
  status?: GradingWorkflowStatus;
  isLocked?: boolean;
  isActive?: boolean;
};

export type CreateExamAssessmentPayload = {
  examPeriodId: string;
  sectionId: string;
  subjectId: string;
  title: string;
  examDate: string;
  maxScore?: number;
  notes?: string;
  isActive?: boolean;
};

export type UpdateExamAssessmentPayload = {
  examPeriodId?: string;
  sectionId?: string;
  subjectId?: string;
  title?: string;
  examDate?: string;
  maxScore?: number;
  notes?: string;
  isActive?: boolean;
};

export type CreateStudentExamScorePayload = {
  examAssessmentId: string;
  studentEnrollmentId: string;
  score?: number;
  isPresent?: boolean;
  absenceType?: ExamAbsenceType;
  excuseDetails?: string;
  teacherNotes?: string;
  isActive?: boolean;
};

export type UpdateStudentExamScorePayload = {
  examAssessmentId?: string;
  studentEnrollmentId?: string;
  score?: number;
  isPresent?: boolean;
  absenceType?: ExamAbsenceType;
  excuseDetails?: string;
  teacherNotes?: string;
  isActive?: boolean;
};

export type CreateMonthlyGradePayload = {
  studentEnrollmentId: string;
  subjectId: string;
  academicMonthId: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateMonthlyGradePayload = {
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type CalculateMonthlyGradesPayload = {
  academicMonthId: string;
  sectionId: string;
  subjectId: string;
};

export type CalculateMonthlyGradesResponse = {
  message: string;
  summary: {
    totalEnrollments: number;
    created: number;
    updated: number;
    skippedLocked: number;
  };
};

export type CreateMonthlyCustomComponentScorePayload = {
  monthlyGradeId: string;
  gradingPolicyComponentId: string;
  score: number;
  notes?: string;
  isActive?: boolean;
};

export type UpdateMonthlyCustomComponentScorePayload = {
  score?: number;
  notes?: string;
  isActive?: boolean;
};

export type CreateSemesterGradePayload = {
  studentEnrollmentId: string;
  subjectId: string;
  academicTermId: string;
  semesterWorkTotal?: number;
  finalExamScore?: number | null;
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type UpdateSemesterGradePayload = {
  semesterWorkTotal?: number;
  finalExamScore?: number | null;
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type CalculateSemesterGradesPayload = {
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  overwriteManual?: boolean;
};

export type CalculateSemesterGradesResponse = {
  message: string;
  summary: {
    totalEnrollments: number;
    created: number;
    updated: number;
    skippedLocked: number;
  };
};

export type FillSemesterFinalExamScoresPayload = {
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  overwriteExisting?: boolean;
};

export type FillSemesterFinalExamScoresResponse = {
  message: string;
  summary: {
    totalEnrollments: number;
    created: number;
    updated: number;
    skippedLocked: number;
    skippedExisting: number;
  };
};

export type CreateGradingPolicyPayload = {
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  assessmentType: AssessmentType;
  totalMaxScore?: number;
  sectionId?: string;
  academicTermId?: string;
  teacherEmployeeId?: string;
  passingScore?: number;
  isDefault?: boolean;
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type UpdateGradingPolicyPayload = {
  academicYearId?: string;
  gradeLevelId?: string;
  subjectId?: string;
  assessmentType?: AssessmentType;
  totalMaxScore?: number;
  sectionId?: string;
  academicTermId?: string;
  teacherEmployeeId?: string;
  passingScore?: number;
  isDefault?: boolean;
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type CreateGradingPolicyComponentPayload = {
  gradingPolicyId: string;
  code?: string;
  name: string;
  maxScore: number;
  calculationMode: GradingComponentCalculationMode;
  includeInMonthly?: boolean;
  includeInSemester?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateGradingPolicyComponentPayload = {
  code?: string;
  name?: string;
  maxScore?: number;
  calculationMode?: GradingComponentCalculationMode;
  includeInMonthly?: boolean;
  includeInSemester?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateAnnualStatusPayload = {
  code?: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
};

export type UpdateAnnualStatusPayload = {
  code?: string;
  name?: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
};

export type CreatePromotionDecisionPayload = {
  code?: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
};

export type UpdatePromotionDecisionPayload = {
  code?: string;
  name?: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
};

export type CreateGradingOutcomeRulePayload = {
  academicYearId: string;
  gradeLevelId: string;
  promotedMaxFailedSubjects: number;
  conditionalMaxFailedSubjects: number;
  conditionalDecisionId: string;
  retainedDecisionId: string;
  tieBreakStrategy?: TieBreakStrategy;
  isActive?: boolean;
};

export type UpdateGradingOutcomeRulePayload = {
  academicYearId?: string;
  gradeLevelId?: string;
  promotedMaxFailedSubjects?: number;
  conditionalMaxFailedSubjects?: number;
  conditionalDecisionId?: string;
  retainedDecisionId?: string;
  tieBreakStrategy?: TieBreakStrategy;
  isActive?: boolean;
};

export type CreateAnnualGradePayload = {
  studentEnrollmentId: string;
  subjectId: string;
  academicYearId: string;
  semester1Total?: number;
  semester2Total?: number;
  termTotals?: Array<{
    academicTermId: string;
    termTotal: number;
  }>;
  annualPercentage?: number;
  finalStatusId: string;
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type UpdateAnnualGradePayload = {
  semester1Total?: number;
  semester2Total?: number;
  termTotals?: Array<{
    academicTermId: string;
    termTotal: number;
  }>;
  annualPercentage?: number;
  finalStatusId?: string;
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type CreateAnnualResultPayload = {
  studentEnrollmentId: string;
  academicYearId: string;
  totalAllSubjects?: number;
  maxPossibleTotal?: number;
  percentage?: number;
  rankInClass?: number;
  rankInGrade?: number;
  passedSubjectsCount?: number;
  failedSubjectsCount?: number;
  promotionDecisionId: string;
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type UpdateAnnualResultPayload = {
  totalAllSubjects?: number;
  maxPossibleTotal?: number;
  percentage?: number;
  rankInClass?: number;
  rankInGrade?: number;
  passedSubjectsCount?: number;
  failedSubjectsCount?: number;
  promotionDecisionId?: string;
  status?: GradingWorkflowStatus;
  notes?: string;
  isActive?: boolean;
};

export type CalculateAnnualResultsPayload = {
  academicYearId: string;
  sectionId: string;
};

export type CalculateAnnualResultsResponse = {
  message: string;
  summary: {
    annualGrades: {
      created: number;
      updated: number;
      skippedLocked: number;
    };
    annualResults: {
      created: number;
      updated: number;
      skippedLocked: number;
    };
    rankedClassRows?: number;
    rankedGradeRows?: number;
  };
};

export type PopulateHomeworkStudentsResponse = {
  homeworkId: string;
  insertedCount: number;
  restoredCount: number;
  activeEnrollmentCount: number;
};

export type CreateEmployeePayload = {
  jobNumber?: string;
  financialNumber?: string;
  fullName: string;
  gender?: EmployeeGender;
  genderId?: number;
  birthDate?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  hasWhatsapp?: boolean;
  qualification?: string;
  qualificationId?: number | null;
  qualificationDate?: string;
  specialization?: string;
  idNumber?: string;
  idTypeId?: number | null;
  localityId?: number | null;
  departmentId?: string | null;
  branchId?: number | null;
  directManagerEmployeeId?: string | null;
  costCenterId?: number | null;
  idExpiryDate?: string;
  experienceYears?: number;
  employmentType?: EmploymentType;
  jobTitle?: string;
  jobRoleId?: number | null;
  hireDate?: string;
  previousSchool?: string;
  salaryApproved?: boolean;
  systemAccessStatus?: EmployeeSystemAccessStatus;
  isActive?: boolean;
};

export type UpdateEmployeePayload = {
  jobNumber?: string;
  financialNumber?: string;
  fullName?: string;
  gender?: EmployeeGender;
  genderId?: number;
  birthDate?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  hasWhatsapp?: boolean;
  qualification?: string;
  qualificationId?: number | null;
  qualificationDate?: string;
  specialization?: string;
  idNumber?: string;
  idTypeId?: number | null;
  localityId?: number | null;
  departmentId?: string | null;
  branchId?: number | null;
  directManagerEmployeeId?: string | null;
  costCenterId?: number | null;
  idExpiryDate?: string;
  experienceYears?: number;
  employmentType?: EmploymentType;
  jobTitle?: string;
  jobRoleId?: number | null;
  hireDate?: string;
  previousSchool?: string;
  salaryApproved?: boolean;
  systemAccessStatus?: EmployeeSystemAccessStatus;
  isActive?: boolean;
};

export type CreateEmployeeTeachingAssignmentPayload = {
  employeeId: string;
  sectionId: string;
  subjectId: string;
  academicYearId: string;
  weeklyPeriods?: number;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type UpdateEmployeeTeachingAssignmentPayload = {
  employeeId?: string;
  sectionId?: string;
  subjectId?: string;
  academicYearId?: string;
  weeklyPeriods?: number;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type CreateEmployeeAttendancePayload = {
  employeeId: string;
  attendanceDate: string;
  status: EmployeeAttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateEmployeeAttendancePayload = {
  employeeId?: string;
  attendanceDate?: string;
  status?: EmployeeAttendanceStatus;
  checkInAt?: string;
  checkOutAt?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateEmployeeTaskPayload = {
  employeeId: string;
  academicYearId?: string;
  taskName: string;
  dayOfWeek?: TimetableDay;
  assignmentDate?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateEmployeeTaskPayload = {
  employeeId?: string;
  academicYearId?: string;
  taskName?: string;
  dayOfWeek?: TimetableDay;
  assignmentDate?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateEmployeePerformanceEvaluationPayload = {
  employeeId: string;
  academicYearId: string;
  evaluationDate: string;
  score: number;
  ratingLevel?: PerformanceRatingLevel;
  evaluatorEmployeeId?: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  isActive?: boolean;
};

export type UpdateEmployeePerformanceEvaluationPayload = {
  employeeId?: string;
  academicYearId?: string;
  evaluationDate?: string;
  score?: number;
  ratingLevel?: PerformanceRatingLevel;
  evaluatorEmployeeId?: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  isActive?: boolean;
};

export type CreateEmployeeViolationPayload = {
  employeeId: string;
  violationDate: string;
  violationAspect: string;
  violationText: string;
  actionTaken?: string;
  severity?: ViolationSeverity;
  hasWarning?: boolean;
  hasMinutes?: boolean;
  reportedByEmployeeId?: string;
  isActive?: boolean;
};

export type UpdateEmployeeViolationPayload = {
  employeeId?: string;
  violationDate?: string;
  violationAspect?: string;
  violationText?: string;
  actionTaken?: string;
  severity?: ViolationSeverity;
  hasWarning?: boolean;
  hasMinutes?: boolean;
  reportedByEmployeeId?: string;
  isActive?: boolean;
};

export type CreateTalentPayload = {
  code?: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateTalentPayload = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateEmployeeCoursePayload = {
  employeeId: string;
  courseName: string;
  courseProvider?: string;
  courseDate?: string;
  durationDays?: number;
  certificateNumber?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateEmployeeCoursePayload = {
  employeeId?: string;
  courseName?: string;
  courseProvider?: string;
  courseDate?: string;
  durationDays?: number;
  certificateNumber?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateEmployeeContractPayload = {
  employeeId: string;
  contractTitle: string;
  contractNumber?: string;
  contractStartDate: string;
  contractEndDate?: string;
  salaryAmount?: string;
  notes?: string;
  isCurrent?: boolean;
  isActive?: boolean;
};

export type CreateEmployeeDepartmentPayload = {
  code?: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateEmployeeDepartmentPayload = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateEmployeeContractPayload = {
  employeeId?: string;
  contractTitle?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  salaryAmount?: string;
  notes?: string;
  isCurrent?: boolean;
  isActive?: boolean;
};

export type CreateEmployeeDocumentPayload = {
  employeeId: string;
  fileName: string;
  filePath: string;
  fileType?: string;
  fileSize?: number;
  fileCategory?: string;
  description?: string;
  expiresAt?: string;
};

export type UpdateEmployeeDocumentPayload = {
  employeeId?: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  fileCategory?: string;
  description?: string;
  expiresAt?: string;
};

export type GenerateEmployeeDocumentExpiryAlertsPayload = {
  daysThreshold?: number;
};

export type GenerateEmployeeDocumentExpiryAlertsResponse = {
  success: boolean;
  scannedCount: number;
  generatedCount: number;
  daysThreshold: number;
};

export type CreateEmployeeLeavePayload = {
  employeeId: string;
  leaveType: EmployeeLeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateEmployeeLeavePayload = {
  employeeId?: string;
  leaveType?: EmployeeLeaveType;
  startDate?: string;
  endDate?: string;
  reason?: string;
  notes?: string;
  isActive?: boolean;
};

export type CreateEmployeeLeaveBalancePayload = {
  employeeId: string;
  leaveType: EmployeeLeaveType;
  balanceYear: number;
  allocatedDays: number;
  carriedForwardDays?: number;
  manualAdjustmentDays?: number;
  notes?: string;
  isActive?: boolean;
};

export type UpdateEmployeeLeaveBalancePayload = {
  employeeId?: string;
  leaveType?: EmployeeLeaveType;
  balanceYear?: number;
  allocatedDays?: number;
  carriedForwardDays?: number;
  manualAdjustmentDays?: number;
  notes?: string;
  isActive?: boolean;
};

export type GenerateEmployeeLeaveBalancesPayload = {
  balanceYear: number;
  employeeId?: string;
  leaveType?: EmployeeLeaveType;
};

export type GenerateEmployeeLeaveBalancesResponse = {
  success: boolean;
  balanceYear: number;
  employeesScanned: number;
  generatedCount: number;
  skippedExistingCount: number;
  leaveTypes: EmployeeLeaveType[];
};

export type CreateEmployeeLifecycleChecklistPayload = {
  employeeId: string;
  checklistType: EmployeeLifecycleChecklistType;
  title: string;
  assignedToEmployeeId?: string;
  dueDate?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateEmployeeLifecycleChecklistPayload = {
  employeeId?: string;
  checklistType?: EmployeeLifecycleChecklistType;
  title?: string;
  assignedToEmployeeId?: string;
  dueDate?: string;
  notes?: string;
  isActive?: boolean;
};

export type GenerateEmployeeLifecycleChecklistDueAlertsPayload = {
  daysThreshold?: number;
};

export type GenerateEmployeeLifecycleChecklistDueAlertsResponse = {
  success: boolean;
  scannedCount: number;
  generatedCount: number;
  daysThreshold: number;
};

export type CreateEmployeeTalentPayload = {
  employeeId: string;
  talentId: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateEmployeeTalentPayload = {
  employeeId?: string;
  talentId?: string;
  notes?: string;
  isActive?: boolean;
};

export type FinanceBranchListItem = {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string | null;
  address: string | null;
  phone: string | null;
  isHeadquarters: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    email: string;
  } | null;
  updatedBy?: {
    id: string;
    email: string;
  } | null;
};

export type CreateFinanceBranchPayload = {
  code?: string;
  nameAr: string;
  nameEn?: string;
  address?: string;
  phone?: string;
  isHeadquarters?: boolean;
  isActive?: boolean;
};

export type UpdateFinanceBranchPayload = {
  code?: string;
  nameAr?: string;
  nameEn?: string;
  address?: string;
  phone?: string;
  isHeadquarters?: boolean;
  isActive?: boolean;
};

export type CurrencyListItem = {
  id: number;
  code: string;
  nameAr: string;
  symbol: string;
  decimalPlaces: number;
  isBase: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    email: string;
  } | null;
  updatedBy?: {
    id: string;
    email: string;
  } | null;
};

export type CreateCurrencyPayload = {
  code?: string;
  nameAr: string;
  symbol: string;
  decimalPlaces?: number;
  isBase?: boolean;
  isActive?: boolean;
};

export type UpdateCurrencyPayload = {
  code?: string;
  nameAr?: string;
  symbol?: string;
  decimalPlaces?: number;
  isBase?: boolean;
  isActive?: boolean;
};

export type CurrencyExchangeRateListItem = {
  id: number;
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  effectiveDate: string;
  source: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fromCurrency: {
    id: number;
    code: string;
    nameAr: string;
    symbol: string;
  };
  toCurrency: {
    id: number;
    code: string;
    nameAr: string;
    symbol: string;
  };
};

export type CreateCurrencyExchangeRatePayload = {
  fromCurrencyId: number;
  toCurrencyId: number;
  rate: number;
  effectiveDate: string;
  source?: string;
  isActive?: boolean;
};

export type UpdateCurrencyExchangeRatePayload = {
  fromCurrencyId?: number;
  toCurrencyId?: number;
  rate?: number;
  effectiveDate?: string;
  source?: string;
  isActive?: boolean;
};

export type FiscalYearListItem = {
  id: number;
  nameAr: string;
  startDate: string;
  endDate: string;
  academicYearId: string | null;
  isClosed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  academicYear?: {
    id: string;
    code: string;
    name: string;
    status: string;
    isCurrent: boolean;
  } | null;
};

export type CreateFiscalYearPayload = {
  nameAr: string;
  startDate: string;
  endDate: string;
  academicYearId?: string;
  isClosed?: boolean;
  isActive?: boolean;
};

export type UpdateFiscalYearPayload = {
  nameAr?: string;
  startDate?: string;
  endDate?: string;
  academicYearId?: string;
  isClosed?: boolean;
  isActive?: boolean;
};

export type FiscalPeriodListItem = {
  id: number;
  fiscalYearId: number;
  periodNumber: number;
  nameAr: string;
  periodType: string;
  startDate: string;
  endDate: string;
  status: string;
  closeNotes: string | null;
  reopenReason: string | null;
  reopenDeadline: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fiscalYear: {
    id: number;
    nameAr: string;
    startDate: string;
    endDate: string;
    isClosed: boolean;
  };
};

export type CreateFiscalPeriodPayload = {
  fiscalYearId: number;
  periodNumber: number;
  nameAr: string;
  periodType?: string;
  startDate: string;
  endDate: string;
  status?: string;
  closeNotes?: string;
  reopenReason?: string;
  reopenDeadline?: string;
  isActive?: boolean;
};

export type UpdateFiscalPeriodPayload = {
  fiscalYearId?: number;
  periodNumber?: number;
  nameAr?: string;
  periodType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  closeNotes?: string;
  reopenReason?: string;
  reopenDeadline?: string;
  isActive?: boolean;
};

export type ChartOfAccountListItem = {
  id: number;
  accountCode: string;
  nameAr: string;
  nameEn: string | null;
  accountType: string;
  parentId: number | null;
  isHeader: boolean;
  isBankAccount: boolean;
  defaultCurrencyId: number | null;
  branchId: number | null;
  normalBalance: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent: {
    id: number;
    accountCode: string;
    nameAr: string;
  } | null;
};

export type CreateChartOfAccountPayload = {
  accountCode?: string;
  nameAr: string;
  nameEn?: string;
  accountType: string;
  parentId?: number;
  isHeader?: boolean;
  isBankAccount?: boolean;
  defaultCurrencyId?: number;
  branchId?: number;
  normalBalance?: string;
  isActive?: boolean;
};

export type UpdateChartOfAccountPayload = {
  accountCode?: string;
  nameAr?: string;
  nameEn?: string;
  accountType?: string;
  parentId?: number;
  isHeader?: boolean;
  isBankAccount?: boolean;
  defaultCurrencyId?: number;
  branchId?: number;
  normalBalance?: string;
  isActive?: boolean;
};

export type JournalEntryLineItem = {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string | null;
  costCenterId: string | null;
  account: {
    id: string;
    code: string;
    name: string;
  };
  costCenter: {
    id: string;
    code: string;
    name: string;
  } | null;
};

export type JournalEntryListItem = {
  id: string;
  entryNo: string;
  fiscalPeriodId: string;
  postingDate: string;
  status: string;
  description: string | null;
  totalDebit: number;
  totalCredit: number;
  isPosted: boolean;
  isReversed: boolean;
  createdAt: string;
  updatedAt: string;
  lines: JournalEntryLineItem[];
  fiscalPeriod: {
    id: string;
    code: string;
    name: string;
  };
};

export type CreateJournalEntryPayload = {
  fiscalPeriodId: string;
  postingDate: string;
  description?: string | null;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
    description?: string | null;
    costCenterId?: string | null;
  }>;
};

export type UpdateJournalEntryPayload = {
  fiscalPeriodId?: string;
  postingDate?: string;
  description?: string | null;
  lines?: Array<{
    id?: string;
    accountId: string;
    debit: number;
    credit: number;
    description?: string | null;
    costCenterId?: string | null;
  }>;
};

export type PaymentGatewayType = "ONLINE" | "OFFLINE";

export type PaymentGatewayListItem = {
  id: number;
  nameAr: string;
  nameEn: string;
  providerCode: string;
  gatewayType: PaymentGatewayType;
  apiEndpoint: string | null;
  merchantId: string | null;
  settlementAccountId: number | null;
  settlementAccount: {
    id: number;
    accountCode: string;
    nameAr: string;
  } | null;
  isActive: boolean;
};

export type CreatePaymentGatewayPayload = {
  nameAr: string;
  nameEn: string;
  providerCode?: string;
  gatewayType: PaymentGatewayType;
  apiEndpoint?: string | null;
  merchantId?: string | null;
  settlementAccountId?: number | null;
  isActive?: boolean;
};

export type UpdatePaymentGatewayPayload = {
  nameAr?: string;
  nameEn?: string;
  providerCode?: string;
  gatewayType?: PaymentGatewayType;
  apiEndpoint?: string | null;
  merchantId?: string | null;
  settlementAccountId?: number | null;
  isActive?: boolean;
};

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "BANK_TRANSFER"
  | "MOBILE_WALLET"
  | "CHEQUE";

export type PaymentTransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED";

export type PaymentTransactionListItem = {
  id: string;
  transactionNumber: string;
  gatewayId: number;
  gatewayTransactionId: string | null;
  invoiceId: string | null;
  installmentId: string | null;
  enrollmentId: string | null;
  amount: number;
  currencyId: number | null;
  paymentMethod: PaymentMethod;
  status: PaymentTransactionStatus;
  paidAt: string | null;
  receiptNumber: string | null;
  payerName: string | null;
  payerPhone: string | null;
  journalEntryId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  gateway: {
    id: number;
    nameAr: string;
    nameEn: string;
    providerCode: string;
    gatewayType: PaymentGatewayType;
    apiEndpoint: string | null;
    merchantId: string | null;
    settlementAccountId: number | null;
    isActive: boolean;
  };
  enrollment: {
    id: string;
    studentId: string;
    academicYearId: string;
    sectionId: string | null;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
  installment: {
    id: string;
    installmentNumber: string;
    dueDate: string;
    status: string;
  } | null;
  journalEntry: {
    id: string;
    entryNumber: string;
    status: string;
  } | null;
  createdBy: {
    id: string;
    email: string;
  } | null;
};

export type CreatePaymentTransactionPayload = {
  gatewayId?: number;
  providerCode?: string;
  enrollmentId?: string;
  invoiceId?: string;
  installmentId?: string;
  currencyId?: number;
  amount: number;
  paymentMethod: PaymentMethod;
  status?: PaymentTransactionStatus;
  paidAt?: string;
  receiptNumber?: string;
  gatewayTransactionId?: string;
  payerName?: string;
  payerPhone?: string;
  notes?: string;
};

export type UpdatePaymentTransactionPayload = {
  gatewayId?: number;
  providerCode?: string;
  enrollmentId?: string;
  invoiceId?: string;
  installmentId?: string;
  currencyId?: number;
  amount?: number;
  paymentMethod?: PaymentMethod;
  status?: PaymentTransactionStatus;
  paidAt?: string | null;
  receiptNumber?: string | null;
  gatewayTransactionId?: string | null;
  payerName?: string | null;
  payerPhone?: string | null;
  notes?: string | null;
};

export type BankReconciliationStatus = "OPEN" | "IN_PROGRESS" | "RECONCILED";

export type FeeType =
  | "TUITION"
  | "TRANSPORT"
  | "UNIFORM"
  | "REGISTRATION"
  | "ACTIVITY"
  | "PENALTY"
  | "OTHER";

export type DiscountType =
  | "SIBLING"
  | "ORPHAN"
  | "EMPLOYEE_CHILD"
  | "SCHOLARSHIP"
  | "HARDSHIP"
  | "CUSTOM";

export type DiscountCalculationMethod = "PERCENTAGE" | "FIXED";

export type DiscountAppliesToFeeType = "TUITION" | "TRANSPORT" | "ALL";

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIAL"
  | "PAID"
  | "CANCELLED"
  | "CREDITED";

export type InstallmentStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type BankReconciliationListItem = {
  id: string;
  bankAccountId: number;
  statementDate: string;
  statementReference: string | null;
  bankBalance: number;
  bookBalance: number;
  difference: number;
  status: BankReconciliationStatus;
  reconciledAt: string | null;
  notes: string | null;
  createdAt: string;
  bankAccount: {
    id: number;
    accountCode: string;
    nameAr: string;
    nameEn: string | null;
    accountType: string;
    isBankAccount: boolean;
  };
  reconciledByUser: {
    id: string;
    email: string;
  } | null;
  items?: Array<{
    id: string;
    transactionId: string | null;
    journalEntryId: string | null;
    bankReference: string | null;
    amount: number;
    itemType: string;
    matchedAt: string | null;
  }>;
};

export type CreateBankReconciliationPayload = {
  bankAccountId: number;
  statementDate: string;
  statementReference?: string | null;
  bankBalance: number;
  bookBalance: number;
  status?: BankReconciliationStatus;
  notes?: string | null;
};

export type UpdateBankReconciliationPayload = {
  bankAccountId?: number;
  statementDate?: string;
  statementReference?: string | null;
  bankBalance?: number;
  bookBalance?: number;
  status?: BankReconciliationStatus;
  notes?: string | null;
};

export type BankReconciliationAutoMatchResponse = {
  matchedCount: number;
  totalMatchedAmount: number;
  reconciliation: BankReconciliationListItem | null;
};

export type FeeStructureListItem = {
  id: number;
  nameAr: string;
  academicYearId: string;
  gradeLevelId: string | null;
  feeType: FeeType;
  amount: number;
  currencyId: number | null;
  vatRate: number;
  isActive: boolean;
  createdAt: string;
  academicYear: {
    id: string;
    name: string;
  };
  gradeLevel: {
    id: string;
    name: string;
  } | null;
  currency: {
    id: number;
    code: string;
    nameAr: string;
  } | null;
};

export type CreateFeeStructurePayload = {
  academicYearId: string;
  gradeLevelId?: string;
  feeType: FeeType;
  nameAr: string;
  amount: number;
  currencyId?: number;
  vatRate?: number;
  isActive?: boolean;
};

export type UpdateFeeStructurePayload = {
  academicYearId?: string;
  gradeLevelId?: string;
  feeType?: FeeType;
  nameAr?: string;
  amount?: number;
  currencyId?: number;
  vatRate?: number;
  isActive?: boolean;
};

export type DiscountRuleListItem = {
  id: number;
  nameAr: string;
  discountType: DiscountType;
  calculationMethod: DiscountCalculationMethod;
  value: number;
  appliesToFeeType: DiscountAppliesToFeeType;
  siblingOrderFrom: number | null;
  maxDiscountPercentage: number;
  requiresApproval: boolean;
  discountGlAccountId: number | null;
  contraGlAccountId: number | null;
  academicYearId: string | null;
  isActive: boolean;
  createdAt: string;
  academicYear?: {
    id: string;
    name: string;
  } | null;
  discountGlAccount?: {
    id: number;
    accountCode: string;
    nameAr: string;
  } | null;
  contraGlAccount?: {
    id: number;
    accountCode: string;
    nameAr: string;
  } | null;
};

export type CreateDiscountRulePayload = {
  nameAr: string;
  discountType: DiscountType;
  calculationMethod: DiscountCalculationMethod;
  value: number;
  appliesToFeeType: DiscountAppliesToFeeType;
  siblingOrderFrom?: number;
  maxDiscountPercentage?: number;
  requiresApproval?: boolean;
  discountGlAccountId?: number;
  contraGlAccountId?: number;
  academicYearId?: string;
  isActive?: boolean;
};

export type UpdateDiscountRulePayload = {
  nameAr?: string;
  discountType?: DiscountType;
  calculationMethod?: DiscountCalculationMethod;
  value?: number;
  appliesToFeeType?: DiscountAppliesToFeeType;
  siblingOrderFrom?: number;
  maxDiscountPercentage?: number;
  requiresApproval?: boolean;
  discountGlAccountId?: number;
  contraGlAccountId?: number;
  academicYearId?: string;
  isActive?: boolean;
};

export type TaxType = "OUTPUT" | "INPUT" | "EXEMPT" | "ZERO_RATED";

export type TaxConfigurationListItem = {
  id: number;
  taxCode: string;
  taxNameAr: string;
  taxNameEn: string | null;
  rate: number;
  taxType: TaxType;
  isInclusive: boolean;
  outputGlAccountId: number | null;
  inputGlAccountId: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  outputGlAccount: {
    id: number;
    accountCode: string;
    nameAr: string;
  } | null;
  inputGlAccount: {
    id: number;
    accountCode: string;
    nameAr: string;
  } | null;
};

export type CreateTaxConfigurationPayload = {
  taxCode?: string;
  taxNameAr: string;
  taxNameEn?: string;
  rate: number;
  taxType: TaxType;
  isInclusive?: boolean;
  outputGlAccountId?: number;
  inputGlAccountId?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
};

export type UpdateTaxConfigurationPayload = {
  taxCode?: string;
  taxNameAr?: string;
  taxNameEn?: string | null;
  rate?: number;
  taxType?: TaxType;
  isInclusive?: boolean;
  outputGlAccountId?: number | null;
  inputGlAccountId?: number | null;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  isActive?: boolean;
};

export type StudentInvoiceListItem = {
  id: string;
  invoiceNumber: string;
  enrollmentId: string;
  academicYearId: string;
  branchId: number | null;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  currencyId: number | null;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  enrollment: {
    id: string;
    studentId: string;
    sectionId: string | null;
    student: {
      id: string;
      fullName: string;
    };
  };
  academicYear: {
    id: string;
    name: string;
  };
  branch: {
    id: number;
    nameAr: string;
  } | null;
  currency: {
    id: number;
    code: string;
    nameAr: string;
  } | null;
  createdByUser: {
    id: string;
    email: string;
  } | null;
};

export type CreateStudentInvoicePayload = {
  invoiceNumber?: string;
  enrollmentId: string;
  academicYearId: string;
  branchId?: number;
  invoiceDate: string;
  dueDate: string;
  currencyId?: number;
  status?: InvoiceStatus;
  notes?: string;
  lines: Array<{
    feeType: FeeType;
    feeStructureId?: number;
    descriptionAr: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    discountRuleId?: number;
    discountGlAccountId?: number;
    vatRate?: number;
    vatAmount?: number;
    taxCodeId?: number;
    accountId?: number;
  }>;
  installments?: Array<{
    dueDate: string;
    amount: number;
    installmentNumber: number;
    paymentDate?: string;
    lateFee?: number;
    notes?: string;
  }>;
};

export type UpdateStudentInvoicePayload = {
  invoiceDate?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  branchId?: number;
  currencyId?: number;
  notes?: string;
};

export type InvoiceInstallmentListItem = {
  id: string;
  invoiceId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  paymentDate: string | null;
  status: InstallmentStatus;
  lateFee: number;
  notes: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    enrollmentId: string;
    totalAmount: number;
    status: InvoiceStatus;
  };
};

export type CreateInvoiceInstallmentPayload = {
  invoiceId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status?: InstallmentStatus;
  paymentDate?: string;
  lateFee?: number;
  notes?: string;
};

export type UpdateInvoiceInstallmentPayload = {
  invoiceId?: string;
  installmentNumber?: number;
  dueDate?: string;
  amount?: number;
  paidAmount?: number;
  status?: InstallmentStatus;
  paymentDate?: string;
  lateFee?: number;
  notes?: string;
};

export type BillingEngineBulkGenerateResponse = {
  message: string;
  generated: number;
  skipped: number;
  invoices: Array<{
    enrollmentId: string;
    studentName: string;
    invoiceNumber: string;
    totalAmount: number;
  }>;
  errors?: Array<{
    enrollmentId: string;
    error: string;
  }>;
};

export type BillingEngineSiblingDiscountResponse = {
  message: string;
  applied: number;
  siblings: number;
  details?: Array<{
    studentName: string;
    invoiceNumber: string;
    siblingOrder: number;
    discountPercent: number;
    discountAmount: number;
  }>;
};

export type BillingEngineStudentStatementResponse = {
  student: {
    id: string;
    fullName: string;
    admissionNo: string | null;
  };
  academicYear: {
    id: string;
    name: string;
  };
  enrollmentId: string;
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalCredits: number;
    totalDebits: number;
    balance: number;
    status: string;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    subtotal: number;
    discountAmount: number;
    vatAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
    status: string;
    lines: Array<{
      description: string;
      feeType: string;
      unitPrice: number;
      discountAmount: number;
      vatAmount: number;
      lineTotal: number;
    }>;
    installments: Array<{
      number: number;
      dueDate: string;
      amount: number;
      paidAmount: number;
      status: string;
    }>;
  }>;
  payments: Array<{
    id: string;
    transactionNumber: string;
    amount: number;
    paidAt: string | null;
    paymentMethod: string;
    receiptNumber: string | null;
    gateway: string | null;
  }>;
  creditDebitNotes: Array<{
    id: string;
    noteNumber: string;
    noteType: string;
    amount: number;
    totalAmount: number;
    reason: string;
    status: string;
  }>;
};

export type BillingEngineFamilyBalanceResponse = {
  guardian: {
    id: string;
    fullName: string;
    phone: string | null;
  };
  summary: {
    childrenCount: number;
    totalBilled: number;
    totalPaid: number;
    balance: number;
    status: string;
  };
  children: Array<{
    studentId: string;
    studentName: string;
    admissionNo: string | null;
    relationship: string;
    totalBilled: number;
    totalPaid: number;
    balance: number;
    enrollmentCount: number;
    hasOverdue: boolean;
  }>;
};

export type BillingEngineBulkGeneratePayload = {
  academicYearId: string;
  gradeLevelId?: string | null;
  branchId?: number | null;
  installmentCount?: number | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  applySiblingDiscount?: boolean;
};

export type BillingEngineDefaultsResponse = {
  academicYear: {
    id: string;
    code: string;
    name: string;
    status: string;
    isCurrent: boolean;
  } | null;
  baseCurrency: {
    id: number;
    code: string;
    nameAr: string;
  } | null;
  invoiceDate: string;
  dueDate: string;
  installmentCount: number;
  applySiblingDiscount: boolean;
};

export type BillingEngineApplySiblingDiscountPayload = {
  guardianId: string;
  academicYearId: string;
};

export type BillingEngineProcessWithdrawalPayload = {
  enrollmentId: string;
  withdrawalDate: string;
  academicTermId?: string | null;
  reason?: string | null;
};

export type BillingEngineWithdrawalResponse = {
  enrollmentId: string;
  studentName: string;
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  period: {
    startDate: string;
    endDate: string;
  };
  totals: {
    totalFee: number;
    earnedFee: number;
    totalPaid: number;
    adjustment: number;
  };
  proration: {
    totalSchoolDays: number;
    attendedDays: number;
    ratio: number;
  };
  creditNoteId: string | null;
};

export type PaymentTransactionActionPayload = {
  payload?: Record<string, unknown> | null;
};

export type BudgetType =
  | "ANNUAL"
  | "SEMESTER"
  | "QUARTERLY"
  | "MONTHLY"
  | "PROJECT";

export type BudgetStatus = "DRAFT" | "APPROVED" | "ACTIVE" | "CLOSED" | "REVISED";

export type BudgetListItem = {
  id: number;
  nameAr: string;
  fiscalYearId: number;
  branchId: number | null;
  budgetType: BudgetType;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: BudgetStatus;
  approvedByUserId: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
  fiscalYear: {
    id: number;
    yearName: string;
  };
  branch: {
    id: number;
    nameAr: string;
  } | null;
  createdByUser: {
    id: string;
    email: string;
  } | null;
  approvedByUser?: {
    id: string;
    email: string;
  } | null;
};

export type CreateBudgetPayload = {
  nameAr: string;
  fiscalYearId: number;
  branchId?: number | null;
  budgetType?: BudgetType;
  startDate: string;
  endDate: string;
  notes?: string;
  lines: Array<{
    accountId: number;
    lineDescription?: string;
    budgetedAmount: number;
    notes?: string;
  }>;
};

export type UpdateBudgetPayload = {
  nameAr?: string;
  fiscalYearId?: number;
  branchId?: number | null;
  budgetType?: BudgetType;
  startDate?: string;
  endDate?: string;
  notes?: string;
};

export type CostCenterListItem = {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string | null;
  parentId: number | null;
  branchId: number | null;
  managerEmployeeId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  parent: {
    id: number;
    code: string;
    nameAr: string;
  } | null;
  branch: {
    id: number;
    nameAr: string;
  } | null;
  managerEmployee: {
    id: string;
    fullNameAr: string;
  } | null;
  children: Array<{
    id: number;
    code: string;
    nameAr: string;
  }>;
};

export type CreateCostCenterPayload = {
  code: string;
  nameAr: string;
  nameEn?: string;
  parentId?: number;
  branchId?: number;
  managerEmployeeId?: string;
  isActive?: boolean;
};

export type UpdateCostCenterPayload = {
  code?: string;
  nameAr?: string;
  nameEn?: string;
  parentId?: number | null;
  branchId?: number | null;
  managerEmployeeId?: string | null;
  isActive?: boolean;
};

export type CreditDebitNoteType = "CREDIT" | "DEBIT";
export type CreditDebitNoteStatus = "DRAFT" | "APPROVED" | "APPLIED" | "CANCELLED";
export type CreditDebitNoteReason =
  | "WITHDRAWAL"
  | "OVERCHARGE"
  | "SCHOLARSHIP"
  | "FEE_ADJUSTMENT"
  | "REFUND"
  | "PENALTY"
  | "OTHER";

export type CreditDebitNoteListItem = {
  id: string;
  noteNumber: string;
  noteType: CreditDebitNoteType;
  originalInvoiceId: string;
  enrollmentId: string | null;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  reason: CreditDebitNoteReason;
  reasonDetails: string | null;
  status: CreditDebitNoteStatus;
  appliedAt: string | null;
  journalEntryId: string | null;
  createdByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  originalInvoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
  };
  enrollment: {
    id: string;
    student: {
      id: string;
      fullName: string;
    };
  } | null;
  journalEntry: {
    id: string;
    entryNumber: string;
  } | null;
  createdByUser: {
    id: string;
    email: string;
  } | null;
  approvedByUser: {
    id: string;
    email: string;
  } | null;
};

export type CreateCreditDebitNotePayload = {
  noteType: CreditDebitNoteType;
  originalInvoiceId: string;
  enrollmentId?: string;
  amount: number;
  vatAmount?: number;
  reason: CreditDebitNoteReason;
  reasonDetails?: string;
};

export type UpdateCreditDebitNotePayload = {
  enrollmentId?: string | null;
  amount?: number;
  vatAmount?: number;
  reason?: CreditDebitNoteReason;
  reasonDetails?: string | null;
};

export type RecurringFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMI_ANNUAL"
  | "ANNUAL";

export type RecurringJournalListItem = {
  id: number;
  templateName: string;
  description: string | null;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  branchId: number | null;
  currencyId: number | null;
  entryDescription: string;
  referenceType: string | null;
  totalAmount: number;
  autoPost: boolean;
  isActive: boolean;
  lastGeneratedAt: string | null;
  lastGeneratedJeId: string | null;
  totalGenerated: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string | null;
  branch: {
    id: number;
    nameAr: string;
  } | null;
  createdByUser: {
    id: string;
    email: string;
  } | null;
  lastGeneratedJournalEntry?: {
    id: string;
    entryNumber: string;
  } | null;
};

export type RecurringJournalGenerateResponse = {
  success: boolean;
  journalEntry: {
    id: string;
    entryNumber: string;
    entryDate: string;
    status: string;
    totalDebit: number;
    totalCredit: number;
  };
  message: string;
};

export type CreateRecurringJournalPayload = {
  templateName: string;
  description?: string;
  frequency?: RecurringFrequency;
  startDate: string;
  endDate?: string;
  branchId?: number;
  currencyId?: number;
  entryDescription: string;
  referenceType?: string;
  autoPost?: boolean;
  lines: Array<{
    lineNumber: number;
    accountId: number;
    description?: string;
    debitAmount: number;
    creditAmount: number;
    costCenterId?: number;
  }>;
};

export type UpdateRecurringJournalPayload = {
  templateName?: string;
  description?: string;
  frequency?: RecurringFrequency;
  startDate?: string;
  endDate?: string | null;
  branchId?: number | null;
  currencyId?: number | null;
  entryDescription?: string;
  referenceType?: string | null;
  autoPost?: boolean;
  isActive?: boolean;
};

export type FinancialAuditTrailListItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: unknown;
  occurredAt: string;
  actorUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
};

export type FinancialFundListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateFinancialFundPayload = {
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type UpdateFinancialFundPayload = {
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
};

export type FinancialCategoryListItem = {
  id: string;
  code: string;
  name: string;
  categoryType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateFinancialCategoryPayload = {
  code: string;
  name: string;
  categoryType: string;
  isActive?: boolean;
};

export type UpdateFinancialCategoryPayload = {
  code?: string;
  name?: string;
  categoryType?: string;
  isActive?: boolean;
};

export type RevenueListItem = {
  id: string;
  reference: string | null;
  revenueDate: string;
  amount: number;
  currencyId: string;
  categoryId: string | null;
  fundId: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  currency: {
    id: string;
    code: string;
    name: string;
  };
};

export type CreateRevenuePayload = {
  revenueDate: string;
  amount: number;
  currencyId: string;
  categoryId?: string | null;
  fundId?: string | null;
  reference?: string | null;
  notes?: string | null;
};

export type UpdateRevenuePayload = {
  revenueDate?: string;
  amount?: number;
  currencyId?: string;
  categoryId?: string | null;
  fundId?: string | null;
  reference?: string | null;
  notes?: string | null;
  status?: string;
};

export type ExpenseListItem = {
  id: string;
  reference: string | null;
  expenseDate: string;
  amount: number;
  currencyId: string;
  categoryId: string | null;
  fundId: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  currency: {
    id: string;
    code: string;
    name: string;
  };
};

export type CreateExpensePayload = {
  expenseDate: string;
  amount: number;
  currencyId: string;
  categoryId?: string | null;
  fundId?: string | null;
  reference?: string | null;
  notes?: string | null;
};

export type UpdateExpensePayload = {
  expenseDate?: string;
  amount?: number;
  currencyId?: string;
  categoryId?: string | null;
  fundId?: string | null;
  reference?: string | null;
  notes?: string | null;
  status?: string;
};

export type CommunityContributionListItem = {
  id: string;
  contributorName: string;
  contributionDate: string;
  amount: number;
  currencyId: string;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  currency: {
    id: string;
    code: string;
    name: string;
  };
};

export type CreateCommunityContributionPayload = {
  contributorName: string;
  contributionDate: string;
  amount: number;
  currencyId: string;
  notes?: string | null;
  status?: string;
};

export type UpdateCommunityContributionPayload = {
  contributorName?: string;
  contributionDate?: string;
  amount?: number;
  currencyId?: string;
  notes?: string | null;
  status?: string;
};

export type TrialBalanceReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type GeneralLedgerReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type AccountSummaryReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type IncomeStatementReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type BalanceSheetReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type StudentAccountStatementReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type VatReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type AccountsReceivableAgingReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type BudgetVsActualReportResponse = {
  generatedAt: string;
  scope: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RequestOptions = Omit<RequestInit, "method" | "body"> & {
  json?: unknown;
  withAuth?: boolean;
  _retryAuth?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function resolveErrorMessage(body: unknown, status: number): string {
  // Case 1: Support nested error structure from HttpExceptionFilter { success: false, error: { message: ... } }
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    
    // Check for nested error object (Common in our HttpExceptionFilter)
    const errorObj = b.error;
    if (errorObj && typeof errorObj === "object" && "message" in errorObj) {
      const msg = (errorObj as { message: unknown }).message;
      return Array.isArray(msg) ? msg.join(", ") : String(msg);
    }

    // Check for direct message (Standard NestJS)
    if ("message" in b) {
      const msg = b.message;
      return Array.isArray(msg) ? msg.join(", ") : String(msg);
    }
  }

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  return `فشل الطلب (رمز الحالة: ${status})`;
}

const FINANCE_PATH_PREFIXES = [
  "/branches",
  "/currencies",
  "/currency-exchange-rates",
  "/fiscal-years",
  "/fiscal-periods",
  "/chart-of-accounts",
  "/journal-entries",
  "/payment-gateways",
  "/payment-transactions",
  "/payment-webhooks",
  "/bank-reconciliations",
  "/financial-reports",
  "/reports",
  "/fee-structures",
  "/discount-rules",
  "/student-invoices",
  "/invoice-installments",
  "/tax-configurations",
  "/document-sequences",
  "/billing",
  "/cost-centers",
  "/budgets",
  "/credit-debit-notes",
  "/recurring-journals",
  "/hr-integrations",
  "/procurement-integrations",
  "/transport-integrations",
  "/audit-trail",
  "/financial-funds",
  "/financial-categories",
  "/revenues",
  "/expenses",
  "/community-contributions",
];

function resolveApiPath(path: string): string {
  if (path.startsWith("/finance/") || path === "/finance") {
    return path;
  }

  const basePath = path.split("?")[0];
  const isFinancePath = FINANCE_PATH_PREFIXES.some(
    (prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`),
  );

  return isFinancePath ? `/finance${path}` : path;
}

let refreshPromise: Promise<AuthSession | null> | null = null;

async function tryRefreshAuthSession(): Promise<AuthSession | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(
        `${appConfig.apiProxyPrefix}/auth/refresh`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const body = (await response.json()) as AuthSession;
      if (!body?.accessToken) {
        clearAuthSession();
        return null;
      }

      saveAuthSession(body);
      return body;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  path: string,
  method: HttpMethod = "GET",
  options: RequestOptions = {},
): Promise<T> {
  const { json, withAuth = false, _retryAuth = false, ...fetchOptions } = options;
  const headers = new Headers(options.headers);

  if (withAuth) {
    const accessToken = getAccessTokenFromStorage();

    if (!accessToken) {
      throw new ApiError("جلسة الدخول غير متاحة. يرجى تسجيل الدخول مرة أخرى.", 401);
    }

    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let requestBody: BodyInit | undefined;

  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    requestBody = JSON.stringify(json);
  }

  const response = await fetch(`${appConfig.apiProxyPrefix}${resolveApiPath(path)}`, {
    ...fetchOptions,
    method,
    headers,
    body: requestBody,
    credentials: fetchOptions.credentials ?? "include",
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (withAuth && response.status === 401 && !_retryAuth) {
      const refreshedSession = await tryRefreshAuthSession();

      if (refreshedSession?.accessToken) {
        return request<T>(path, method, {
          ...options,
          _retryAuth: true,
        });
      }
    }

    throw new ApiError(
      resolveErrorMessage(responseBody, response.status),
      response.status,
    );
  }

  return responseBody as T;
}

export const apiClient = {
  healthCheck: () => request<HealthCheckResponse>("/health"),
  login: (payload: LoginPayload) =>
    request<LoginResponse>("/auth/login", "POST", {
      json: payload,
    }),
  identifyAccount: (loginId: string) =>
    request<AccountIdentifyResponse>("/auth/identify", "POST", {
      json: { loginId },
    }),
  beginAccountActivation: (payload: BeginAccountActivationPayload) =>
    request<AuthSession | AccountApprovalPendingResponse>(
      "/auth/activation/begin",
      "POST",
      {
        json: payload,
      },
    ),
  completeAccountActivation: (payload: CompleteAccountActivationPayload) =>
    request<AuthSession>("/auth/activation/complete", "POST", {
      json: payload,
    }),
  beginDeviceApproval: (payload: LoginPayload) =>
    request<LoginResponse>("/auth/device-approval/begin", "POST", {
      json: payload,
    }),
  completeDeviceApproval: (payload: CompleteDeviceApprovalPayload) =>
    request<AuthSession>("/auth/device-approval/complete", "POST", {
      json: payload,
    }),
  beginForgotPasswordReset: (payload: BeginForgotPasswordPayload) =>
    request<AccountApprovalPendingResponse>("/auth/password/forgot/begin", "POST", {
      json: payload,
    }),
  completeForgotPasswordReset: (payload: CompleteForgotPasswordPayload) =>
    request<{ success: true }>("/auth/password/forgot/complete", "POST", {
      json: payload,
    }),
  changePasswordByCredentials: (payload: ChangePasswordByCredentialsPayload) =>
    request<{ success: true }>("/auth/password/change", "POST", {
      json: payload,
    }),
  listPendingAuthApprovals: (query?: {
    page?: number;
    limit?: number;
    purpose?: AuthApprovalPurpose;
    search?: string;
  }) =>
    request<AuthApprovalRequestsResponse>(
      `/auth/approvals/pending${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        purpose: query?.purpose,
        search: query?.search,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  approveAuthApproval: (requestId: string) =>
    request<AuthApprovalRequestItem>(`/auth/approvals/${requestId}/approve`, "PATCH", {
      withAuth: true,
    }),
  rejectAuthApproval: (requestId: string) =>
    request<AuthApprovalRequestItem>(`/auth/approvals/${requestId}/reject`, "PATCH", {
      withAuth: true,
    }),
  reissueAuthApproval: (requestId: string) =>
    request<{ request: AuthApprovalRequestItem; approvalCode: string }>(
      `/auth/approvals/${requestId}/reissue`,
      "POST",
      {
        withAuth: true,
      },
    ),
  verifyLoginMfa: (payload: VerifyLoginMfaPayload) =>
    request<AuthSession>("/auth/mfa/verify", "POST", {
      json: payload,
    }),
  beginWebAuthnRegistration: () =>
    request<BeginWebAuthnRegistrationResponse>(
      "/auth/webauthn/registration/options",
      "POST",
      {
        withAuth: true,
      },
    ),
  finishWebAuthnRegistration: (payload: FinishWebAuthnRegistrationPayload) =>
    request<WebAuthnCredentialListItem>("/auth/webauthn/registration/verify", "POST", {
      withAuth: true,
      json: payload,
    }),
  listWebAuthnCredentials: () =>
    request<WebAuthnCredentialListItem[]>("/auth/webauthn/credentials", "GET", {
      withAuth: true,
    }),
  removeWebAuthnCredential: (credentialId: string) =>
    request<{ success: boolean; credentialId: string }>(
      `/auth/webauthn/credentials/${credentialId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  beginWebAuthnAuthentication: () =>
    request<BeginWebAuthnAuthenticationResponse>(
      "/auth/webauthn/authentication/options",
      "POST",
      {},
    ),
  finishWebAuthnAuthentication: (payload: FinishWebAuthnAuthenticationPayload) =>
    request<AuthSession>("/auth/webauthn/authentication/verify", "POST", {
      json: payload,
    }),
  logout: () =>
    request<{ success: boolean }>("/auth/logout", "POST", {}),
  getProfile: () =>
    request<AuthProfile>("/auth/profile", "GET", {
      withAuth: true,
    }),
  updateProfile: (payload: UpdateProfilePayload) =>
    request<AuthProfile>("/auth/profile", "PATCH", {
      withAuth: true,
      json: payload,
    }),
  listAuthSessions: () =>
    request<AuthSessionView[]>("/auth/sessions", "GET", {
      withAuth: true,
    }),
  revokeAuthSession: (sessionId: string) =>
    request<{ success: boolean; sessionId: string }>(
      `/auth/sessions/${sessionId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listUsers: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<UserListItem>>(
      `/users${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createUser: (payload: CreateUserPayload) =>
    request<CreatedUserResponse>("/users", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateUser: (userId: string, payload: UpdateUserPayload) =>
    request<UserListItem>(`/users/${userId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteUser: (userId: string) =>
    request<DeleteEntityResponse>(`/users/${userId}`, "DELETE", {
      withAuth: true,
    }),
  linkUserEmployee: (userId: string, employeeId: string) =>
    request<UserListItem>(`/users/${userId}/employee-link`, "PATCH", {
      withAuth: true,
      json: { employeeId },
    }),
  unlinkUserEmployee: (userId: string) =>
    request<UserListItem>(`/users/${userId}/employee-link`, "DELETE", {
      withAuth: true,
    }),
  listRoles: (query?: { page?: number; limit?: number; search?: string }) =>
    request<PaginatedResponse<RoleListItem>>(
      `/roles${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createRole: (payload: CreateRolePayload) =>
    request<RoleListItem>("/roles", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateRole: (roleId: string, payload: UpdateRolePayload) =>
    request<RoleListItem>(`/roles/${roleId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  assignRolePermissions: (roleId: string, permissionIds: string[]) =>
    request<RoleListItem>(`/roles/${roleId}/permissions`, "PUT", {
      withAuth: true,
      json: { permissionIds },
    }),
  deleteRole: (roleId: string) =>
    request<DeleteEntityResponse>(`/roles/${roleId}`, "DELETE", {
      withAuth: true,
    }),
  listPermissions: (query?: {
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    request<PaginatedResponse<PermissionListItem>>(
      `/permissions${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createPermission: (payload: CreatePermissionPayload) =>
    request<PermissionListItem>("/permissions", "POST", {
      withAuth: true,
      json: payload,
    }),
  updatePermission: (permissionId: string, payload: UpdatePermissionPayload) =>
    request<PermissionListItem>(`/permissions/${permissionId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deletePermission: (permissionId: string) =>
    request<DeleteEntityResponse>(`/permissions/${permissionId}`, "DELETE", {
      withAuth: true,
    }),
  listGlobalSettings: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isPublic?: boolean;
  }) =>
    request<PaginatedResponse<GlobalSettingListItem>>(
      `/global-settings${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isPublic: query?.isPublic,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createGlobalSetting: (payload: CreateGlobalSettingPayload) =>
    request<GlobalSettingListItem>("/global-settings", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateGlobalSetting: (
    settingId: string,
    payload: UpdateGlobalSettingPayload,
  ) =>
    request<GlobalSettingListItem>(`/global-settings/${settingId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteGlobalSetting: (settingId: string) =>
    request<DeleteEntityResponse>(`/global-settings/${settingId}`, "DELETE", {
      withAuth: true,
    }),
  listSystemSettings: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    settingType?: SystemSettingType;
    isEditable?: boolean;
  }) =>
    request<PaginatedResponse<SystemSettingListItem>>(
      `/system-settings${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        category: query?.category,
        settingType: query?.settingType,
        isEditable: query?.isEditable,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createSystemSetting: (payload: CreateSystemSettingPayload) =>
    request<SystemSettingListItem>("/system-settings", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateSystemSetting: (
    settingId: number,
    payload: UpdateSystemSettingPayload,
  ) =>
    request<SystemSettingListItem>(`/system-settings/${settingId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteSystemSetting: (settingId: number) =>
    request<DeleteEntityResponse>(`/system-settings/${settingId}`, "DELETE", {
      withAuth: true,
    }),
  listRemindersTicker: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    tickerType?: ReminderTickerType;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<ReminderTickerListItem>>(
      `/reminders-ticker${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        tickerType: query?.tickerType,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createReminderTicker: (payload: CreateReminderTickerPayload) =>
    request<ReminderTickerListItem>("/reminders-ticker", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateReminderTicker: (
    reminderTickerId: number,
    payload: UpdateReminderTickerPayload,
  ) =>
    request<ReminderTickerListItem>(
      `/reminders-ticker/${reminderTickerId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteReminderTicker: (reminderTickerId: number) =>
    request<DeleteEntityResponse>(
      `/reminders-ticker/${reminderTickerId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listUserNotifications: (query?: UserNotificationsQuery) =>
    request<UserNotificationsListResponse>(
      `/user-notifications${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        notificationType: query?.notificationType,
        isRead: query?.isRead,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getUserNotificationsUnreadCount: () =>
    request<{ unreadCount: number }>("/user-notifications/unread-count", "GET", {
      withAuth: true,
    }),
  markUserNotificationRead: (notificationId: string) =>
    request<UserNotificationListItem>(`/user-notifications/${notificationId}/read`, "PATCH", {
      withAuth: true,
    }),
  markAllUserNotificationsRead: () =>
    request<{ success: boolean; updatedCount: number }>("/user-notifications/mark-all-read", "PATCH", {
      withAuth: true,
    }),
  deleteUserNotification: (notificationId: string) =>
    request<DeleteEntityResponse>(`/user-notifications/${notificationId}`, "DELETE", {
      withAuth: true,
    }),
  listUserPermissions: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    permissionId?: string;
    isRevoked?: boolean;
    isCurrent?: boolean;
  }) =>
    request<PaginatedResponse<UserPermissionListItem>>(
      `/user-permissions${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        userId: query?.userId,
        permissionId: query?.permissionId,
        isRevoked: query?.isRevoked,
        isCurrent: query?.isCurrent,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createUserPermission: (payload: CreateUserPermissionPayload) =>
    request<UserPermissionListItem>("/user-permissions", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateUserPermission: (
    userPermissionId: number,
    payload: UpdateUserPermissionPayload,
  ) =>
    request<UserPermissionListItem>(
      `/user-permissions/${userPermissionId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  revokeUserPermission: (
    userPermissionId: number,
    payload: RevokeUserPermissionPayload,
  ) =>
    request<UserPermissionListItem>(
      `/user-permissions/${userPermissionId}/revoke`,
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteUserPermission: (userPermissionId: number) =>
    request<DeleteEntityResponse>(
      `/user-permissions/${userPermissionId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listEmployeeSectionSupervisions: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    sectionId?: string;
    academicYearId?: string;
    canViewStudents?: boolean;
    canManageHomeworks?: boolean;
    canManageGrades?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeSectionSupervisionListItem>>(
      `/employee-section-supervisions${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        sectionId: query?.sectionId,
        academicYearId: query?.academicYearId,
        canViewStudents: query?.canViewStudents,
        canManageHomeworks: query?.canManageHomeworks,
        canManageGrades: query?.canManageGrades,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeSectionSupervision: (
    payload: CreateEmployeeSectionSupervisionPayload,
  ) =>
    request<EmployeeSectionSupervisionListItem>(
      "/employee-section-supervisions",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateEmployeeSectionSupervision: (
    supervisionId: string,
    payload: UpdateEmployeeSectionSupervisionPayload,
  ) =>
    request<EmployeeSectionSupervisionListItem>(
      `/employee-section-supervisions/${supervisionId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteEmployeeSectionSupervision: (supervisionId: string) =>
    request<DeleteEntityResponse>(
      `/employee-section-supervisions/${supervisionId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupBloodTypes: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupBloodTypeListItem>>(
      `/lookup/blood-types${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupBloodType: (payload: CreateLookupBloodTypePayload) =>
    request<LookupBloodTypeListItem>("/lookup/blood-types", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateLookupBloodType: (
    lookupBloodTypeId: number,
    payload: UpdateLookupBloodTypePayload,
  ) =>
    request<LookupBloodTypeListItem>(
      `/lookup/blood-types/${lookupBloodTypeId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupBloodType: (lookupBloodTypeId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/blood-types/${lookupBloodTypeId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupIdTypes: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupIdTypeListItem>>(
      `/lookup/id-types${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupIdType: (payload: CreateLookupIdTypePayload) =>
    request<LookupIdTypeListItem>("/lookup/id-types", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateLookupIdType: (
    lookupIdTypeId: number,
    payload: UpdateLookupIdTypePayload,
  ) =>
    request<LookupIdTypeListItem>(
      `/lookup/id-types/${lookupIdTypeId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupIdType: (lookupIdTypeId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/id-types/${lookupIdTypeId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupOwnershipTypes: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupOwnershipTypeListItem>>(
      `/lookup/ownership-types${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupOwnershipType: (payload: CreateLookupOwnershipTypePayload) =>
    request<LookupOwnershipTypeListItem>("/lookup/ownership-types", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateLookupOwnershipType: (
    lookupOwnershipTypeId: number,
    payload: UpdateLookupOwnershipTypePayload,
  ) =>
    request<LookupOwnershipTypeListItem>(
      `/lookup/ownership-types/${lookupOwnershipTypeId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupOwnershipType: (lookupOwnershipTypeId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/ownership-types/${lookupOwnershipTypeId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupPeriods: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupPeriodListItem>>(
      `/lookup/periods${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupPeriod: (payload: CreateLookupPeriodPayload) =>
    request<LookupPeriodListItem>("/lookup/periods", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateLookupPeriod: (
    lookupPeriodId: number,
    payload: UpdateLookupPeriodPayload,
  ) =>
    request<LookupPeriodListItem>(
      `/lookup/periods/${lookupPeriodId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupPeriod: (lookupPeriodId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/periods/${lookupPeriodId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupEnrollmentStatuses: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupEnrollmentStatusListItem>>(
      `/lookup/enrollment-statuses${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupEnrollmentStatus: (
    payload: CreateLookupEnrollmentStatusPayload,
  ) =>
    request<LookupEnrollmentStatusListItem>(
      "/lookup/enrollment-statuses",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateLookupEnrollmentStatus: (
    lookupEnrollmentStatusId: number,
    payload: UpdateLookupEnrollmentStatusPayload,
  ) =>
    request<LookupEnrollmentStatusListItem>(
      `/lookup/enrollment-statuses/${lookupEnrollmentStatusId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupEnrollmentStatus: (lookupEnrollmentStatusId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/enrollment-statuses/${lookupEnrollmentStatusId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupOrphanStatuses: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupOrphanStatusListItem>>(
      `/lookup/orphan-statuses${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupOrphanStatus: (payload: CreateLookupOrphanStatusPayload) =>
    request<LookupOrphanStatusListItem>("/lookup/orphan-statuses", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateLookupOrphanStatus: (
    lookupOrphanStatusId: number,
    payload: UpdateLookupOrphanStatusPayload,
  ) =>
    request<LookupOrphanStatusListItem>(
      `/lookup/orphan-statuses/${lookupOrphanStatusId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupOrphanStatus: (lookupOrphanStatusId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/orphan-statuses/${lookupOrphanStatusId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupAbilityLevels: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupAbilityLevelListItem>>(
      `/lookup/ability-levels${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupAbilityLevel: (payload: CreateLookupAbilityLevelPayload) =>
    request<LookupAbilityLevelListItem>("/lookup/ability-levels", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateLookupAbilityLevel: (
    lookupAbilityLevelId: number,
    payload: UpdateLookupAbilityLevelPayload,
  ) =>
    request<LookupAbilityLevelListItem>(
      `/lookup/ability-levels/${lookupAbilityLevelId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupAbilityLevel: (lookupAbilityLevelId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/ability-levels/${lookupAbilityLevelId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupActivityTypes: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupActivityTypeListItem>>(
      `/lookup/activity-types${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupActivityType: (payload: CreateLookupActivityTypePayload) =>
    request<LookupActivityTypeListItem>("/lookup/activity-types", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateLookupActivityType: (
    lookupActivityTypeId: number,
    payload: UpdateLookupActivityTypePayload,
  ) =>
    request<LookupActivityTypeListItem>(
      `/lookup/activity-types/${lookupActivityTypeId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupActivityType: (lookupActivityTypeId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/activity-types/${lookupActivityTypeId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupGradeDescriptions: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<LookupGradeDescriptionListItem>>(
      `/lookup/grade-descriptions${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupGradeDescription: (
    payload: CreateLookupGradeDescriptionPayload,
  ) =>
    request<LookupGradeDescriptionListItem>(
      "/lookup/grade-descriptions",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateLookupGradeDescription: (
    lookupGradeDescriptionId: number,
    payload: UpdateLookupGradeDescriptionPayload,
  ) =>
    request<LookupGradeDescriptionListItem>(
      `/lookup/grade-descriptions/${lookupGradeDescriptionId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupGradeDescription: (lookupGradeDescriptionId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/grade-descriptions/${lookupGradeDescriptionId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listLookupCatalogItems: (
    lookupType: LookupCatalogType,
    query?: {
      page?: number;
      limit?: number;
      search?: string;
      isActive?: boolean;
      deletedOnly?: boolean;
    },
  ) =>
    request<PaginatedResponse<LookupCatalogListItem>>(
      `/lookup/catalog/${lookupType}${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createLookupCatalogItem: (
    lookupType: LookupCatalogType,
    payload: CreateLookupCatalogItemPayload,
  ) =>
    request<LookupCatalogListItem>(`/lookup/catalog/${lookupType}`, "POST", {
      withAuth: true,
      json: payload,
    }),
  updateLookupCatalogItem: (
    lookupType: LookupCatalogType,
    itemId: number,
    payload: UpdateLookupCatalogItemPayload,
  ) =>
    request<LookupCatalogListItem>(
      `/lookup/catalog/${lookupType}/${itemId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteLookupCatalogItem: (lookupType: LookupCatalogType, itemId: number) =>
    request<DeleteEntityResponse>(
      `/lookup/catalog/${lookupType}/${itemId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listSchoolProfiles: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    ownershipTypeId?: number;
    isActive?: boolean;
    deletedOnly?: boolean;
  }) =>
    request<PaginatedResponse<SchoolProfileListItem>>(
      `/school-profiles${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        ownershipTypeId: query?.ownershipTypeId,
        isActive: query?.isActive,
        deletedOnly: query?.deletedOnly,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createSchoolProfile: (payload: CreateSchoolProfilePayload) =>
    request<SchoolProfileListItem>("/school-profiles", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateSchoolProfile: (
    schoolProfileId: string,
    payload: UpdateSchoolProfilePayload,
  ) =>
    request<SchoolProfileListItem>(
      `/school-profiles/${schoolProfileId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteSchoolProfile: (schoolProfileId: string) =>
    request<DeleteEntityResponse>(
      `/school-profiles/${schoolProfileId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listAuditLogs: (query?: {
    page?: number;
    limit?: number;
    resource?: string;
    action?: string;
    status?: AuditStatus;
    actorUserId?: string;
    from?: string;
    to?: string;
  }) =>
    request<PaginatedResponse<AuditLogListItem>>(
      `/audit-logs${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        resource: query?.resource,
        action: query?.action,
        status: query?.status,
        actorUserId: query?.actorUserId,
        from: query?.from,
        to: query?.to,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  deleteAuditLog: (auditLogId: string) =>
    request<DeleteEntityResponse>(`/audit-logs/${auditLogId}`, "DELETE", {
      withAuth: true,
    }),
  listAcademicYears: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: AcademicYearStatus;
    isCurrent?: boolean;
  }) =>
    request<PaginatedResponse<AcademicYearListItem>>(
      `/academic-years${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        status: query?.status,
        isCurrent: query?.isCurrent,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createAcademicYear: (payload: CreateAcademicYearPayload) =>
    request<AcademicYearListItem>("/academic-years", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateAcademicYear: (
    academicYearId: string,
    payload: UpdateAcademicYearPayload,
  ) =>
    request<AcademicYearListItem>(
      `/academic-years/${academicYearId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteAcademicYear: (academicYearId: string) =>
    request<DeleteEntityResponse>(
      `/academic-years/${academicYearId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listAcademicTerms: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    termType?: AcademicTermType;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<AcademicTermListItem>>(
      `/academic-terms${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        termType: query?.termType,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createAcademicTerm: (payload: CreateAcademicTermPayload) =>
    request<AcademicTermListItem>("/academic-terms", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateAcademicTerm: (
    academicTermId: string,
    payload: UpdateAcademicTermPayload,
  ) =>
    request<AcademicTermListItem>(
      `/academic-terms/${academicTermId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteAcademicTerm: (academicTermId: string) =>
    request<DeleteEntityResponse>(
      `/academic-terms/${academicTermId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listAcademicMonths: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    academicTermId?: string;
    status?: GradingWorkflowStatus;
    isCurrent?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<AcademicMonthListItem>>(
      `/academic-months${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        academicTermId: query?.academicTermId,
        status: query?.status,
        isCurrent: query?.isCurrent,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createAcademicMonth: (payload: CreateAcademicMonthPayload) =>
    request<AcademicMonthListItem>("/academic-months", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateAcademicMonth: (
    academicMonthId: string,
    payload: UpdateAcademicMonthPayload,
  ) =>
    request<AcademicMonthListItem>(
      `/academic-months/${academicMonthId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteAcademicMonth: (academicMonthId: string) =>
    request<DeleteEntityResponse>(
      `/academic-months/${academicMonthId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listGradingPolicies: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    gradeLevelId?: string;
    subjectId?: string;
    sectionId?: string;
    academicTermId?: string;
    teacherEmployeeId?: string;
    assessmentType?: AssessmentType;
    status?: GradingWorkflowStatus;
    isDefault?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<GradingPolicyListItem>>(
      `/grading-policies${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
          academicYearId: query?.academicYearId,
          gradeLevelId: query?.gradeLevelId,
          subjectId: query?.subjectId,
          sectionId: query?.sectionId,
          academicTermId: query?.academicTermId,
          teacherEmployeeId: query?.teacherEmployeeId,
          assessmentType: query?.assessmentType,
          status: query?.status,
          isDefault: query?.isDefault,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createGradingPolicy: (payload: CreateGradingPolicyPayload) =>
    request<GradingPolicyListItem>("/grading-policies", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateGradingPolicy: (
    gradingPolicyId: string,
    payload: UpdateGradingPolicyPayload,
  ) =>
    request<GradingPolicyListItem>(
      `/grading-policies/${gradingPolicyId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteGradingPolicy: (gradingPolicyId: string) =>
    request<DeleteEntityResponse>(
      `/grading-policies/${gradingPolicyId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listGradingPolicyComponents: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    gradingPolicyId?: string;
    calculationMode?: GradingComponentCalculationMode;
    includeInMonthly?: boolean;
    includeInSemester?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<GradingPolicyComponentListItem>>(
      `/grading-policy-components${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        gradingPolicyId: query?.gradingPolicyId,
        calculationMode: query?.calculationMode,
        includeInMonthly: query?.includeInMonthly,
        includeInSemester: query?.includeInSemester,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createGradingPolicyComponent: (payload: CreateGradingPolicyComponentPayload) =>
    request<GradingPolicyComponentListItem>("/grading-policy-components", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateGradingPolicyComponent: (
    gradingPolicyComponentId: string,
    payload: UpdateGradingPolicyComponentPayload,
  ) =>
    request<GradingPolicyComponentListItem>(
      `/grading-policy-components/${gradingPolicyComponentId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteGradingPolicyComponent: (gradingPolicyComponentId: string) =>
    request<DeleteEntityResponse>(
      `/grading-policy-components/${gradingPolicyComponentId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  getGradingSummaryReport: (query?: {
    academicYearId?: string;
    gradeLevelId?: string;
    sectionId?: string;
    academicTermId?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<GradingSummaryReportResponse>(
      `/grading-reports/summary${buildQueryString({
        academicYearId: query?.academicYearId,
        gradeLevelId: query?.gradeLevelId,
        sectionId: query?.sectionId,
        academicTermId: query?.academicTermId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getGradingDetailedReport: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    gradeLevelId?: string;
    sectionId?: string;
    academicTermId?: string;
    promotionDecisionId?: string;
    status?: GradingWorkflowStatus;
    isLocked?: boolean;
    isActive?: boolean;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<PaginatedResponse<GradingDetailedReportItem>>(
      `/grading-reports/details${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        gradeLevelId: query?.gradeLevelId,
        sectionId: query?.sectionId,
        academicTermId: query?.academicTermId,
        promotionDecisionId: query?.promotionDecisionId,
        status: query?.status,
        isLocked: query?.isLocked,
        isActive: query?.isActive,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  listAnnualStatuses: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isSystem?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<AnnualStatusListItem>>(
      `/annual-statuses${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isSystem: query?.isSystem,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createAnnualStatus: (payload: CreateAnnualStatusPayload) =>
    request<AnnualStatusListItem>("/annual-statuses", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateAnnualStatus: (
    annualStatusId: string,
    payload: UpdateAnnualStatusPayload,
  ) =>
    request<AnnualStatusListItem>(
      `/annual-statuses/${annualStatusId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteAnnualStatus: (annualStatusId: string) =>
    request<DeleteEntityResponse>(
      `/annual-statuses/${annualStatusId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listPromotionDecisions: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isSystem?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<PromotionDecisionListItem>>(
      `/promotion-decisions${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isSystem: query?.isSystem,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createPromotionDecision: (payload: CreatePromotionDecisionPayload) =>
    request<PromotionDecisionListItem>("/promotion-decisions", "POST", {
      withAuth: true,
      json: payload,
    }),
  updatePromotionDecision: (
    promotionDecisionId: string,
    payload: UpdatePromotionDecisionPayload,
  ) =>
    request<PromotionDecisionListItem>(
      `/promotion-decisions/${promotionDecisionId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deletePromotionDecision: (promotionDecisionId: string) =>
    request<DeleteEntityResponse>(
      `/promotion-decisions/${promotionDecisionId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listGradingOutcomeRules: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    gradeLevelId?: string;
    tieBreakStrategy?: TieBreakStrategy;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<GradingOutcomeRuleListItem>>(
      `/grading-outcome-rules${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        gradeLevelId: query?.gradeLevelId,
        tieBreakStrategy: query?.tieBreakStrategy,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createGradingOutcomeRule: (payload: CreateGradingOutcomeRulePayload) =>
    request<GradingOutcomeRuleListItem>("/grading-outcome-rules", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateGradingOutcomeRule: (
    gradingOutcomeRuleId: string,
    payload: UpdateGradingOutcomeRulePayload,
  ) =>
    request<GradingOutcomeRuleListItem>(
      `/grading-outcome-rules/${gradingOutcomeRuleId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteGradingOutcomeRule: (gradingOutcomeRuleId: string) =>
    request<DeleteEntityResponse>(
      `/grading-outcome-rules/${gradingOutcomeRuleId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listGradeLevels: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    stage?: GradeStage;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<GradeLevelListItem>>(
      `/grade-levels${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        stage: query?.stage,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createGradeLevel: (payload: CreateGradeLevelPayload) =>
    request<GradeLevelListItem>("/grade-levels", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateGradeLevel: (gradeLevelId: string, payload: UpdateGradeLevelPayload) =>
    request<GradeLevelListItem>(`/grade-levels/${gradeLevelId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteGradeLevel: (gradeLevelId: string) =>
    request<DeleteEntityResponse>(`/grade-levels/${gradeLevelId}`, "DELETE", {
      withAuth: true,
    }),
  listSubjects: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: SubjectCategory;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<SubjectListItem>>(
      `/subjects${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        category: query?.category,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createSubject: (payload: CreateSubjectPayload) =>
    request<SubjectListItem>("/subjects", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateSubject: (subjectId: string, payload: UpdateSubjectPayload) =>
    request<SubjectListItem>(`/subjects/${subjectId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteSubject: (subjectId: string) =>
    request<DeleteEntityResponse>(`/subjects/${subjectId}`, "DELETE", {
      withAuth: true,
    }),
  listSections: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    gradeLevelId?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<SectionListItem>>(
      `/sections${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        gradeLevelId: query?.gradeLevelId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createSection: (payload: CreateSectionPayload) =>
    request<SectionListItem>("/sections", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateSection: (sectionId: string, payload: UpdateSectionPayload) =>
    request<SectionListItem>(`/sections/${sectionId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteSection: (sectionId: string) =>
    request<DeleteEntityResponse>(`/sections/${sectionId}`, "DELETE", {
      withAuth: true,
    }),
  listClassrooms: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    buildingLookupId?: number;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<ClassroomListItem>>(
      `/classrooms${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        buildingLookupId: query?.buildingLookupId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createClassroom: (payload: CreateClassroomPayload) =>
    request<ClassroomListItem>("/classrooms", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateClassroom: (classroomId: string, payload: UpdateClassroomPayload) =>
    request<ClassroomListItem>(`/classrooms/${classroomId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteClassroom: (classroomId: string) =>
    request<DeleteEntityResponse>(`/classrooms/${classroomId}`, "DELETE", {
      withAuth: true,
    }),
  listSectionClassroomAssignments: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    sectionId?: string;
    classroomId?: string;
    academicYearId?: string;
    isActive?: boolean;
    isPrimary?: boolean;
  }) =>
    request<PaginatedResponse<SectionClassroomAssignmentListItem>>(
      `/section-classroom-assignments${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        sectionId: query?.sectionId,
        classroomId: query?.classroomId,
        academicYearId: query?.academicYearId,
        isActive: query?.isActive,
        isPrimary: query?.isPrimary,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createSectionClassroomAssignment: (payload: CreateSectionClassroomAssignmentPayload) =>
    request<SectionClassroomAssignmentListItem>("/section-classroom-assignments", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateSectionClassroomAssignment: (
    assignmentId: string,
    payload: UpdateSectionClassroomAssignmentPayload,
  ) =>
    request<SectionClassroomAssignmentListItem>(
      `/section-classroom-assignments/${assignmentId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteSectionClassroomAssignment: (assignmentId: string) =>
    request<DeleteEntityResponse>(
      `/section-classroom-assignments/${assignmentId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listGradeLevelSubjects: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    gradeLevelId?: string;
    subjectId?: string;
    isMandatory?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<GradeLevelSubjectListItem>>(
      `/grade-level-subjects${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        gradeLevelId: query?.gradeLevelId,
        subjectId: query?.subjectId,
        isMandatory: query?.isMandatory,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createGradeLevelSubject: (payload: CreateGradeLevelSubjectPayload) =>
    request<GradeLevelSubjectListItem>("/grade-level-subjects", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateGradeLevelSubject: (
    mappingId: string,
    payload: UpdateGradeLevelSubjectPayload,
  ) =>
    request<GradeLevelSubjectListItem>(
      `/grade-level-subjects/${mappingId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteGradeLevelSubject: (mappingId: string) =>
    request<DeleteEntityResponse>(
      `/grade-level-subjects/${mappingId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listTermSubjectOfferings: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    academicTermId?: string;
    gradeLevelSubjectId?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<TermSubjectOfferingListItem>>(
      `/term-subject-offerings${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        academicTermId: query?.academicTermId,
        gradeLevelSubjectId: query?.gradeLevelSubjectId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createTermSubjectOffering: (payload: CreateTermSubjectOfferingPayload) =>
    request<TermSubjectOfferingListItem>("/term-subject-offerings", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateTermSubjectOffering: (
    offeringId: string,
    payload: UpdateTermSubjectOfferingPayload,
  ) =>
    request<TermSubjectOfferingListItem>(
      `/term-subject-offerings/${offeringId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteTermSubjectOffering: (offeringId: string) =>
    request<DeleteEntityResponse>(
      `/term-subject-offerings/${offeringId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listTimetableEntries: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicTermId?: string;
    sectionId?: string;
    termSubjectOfferingId?: string;
    dayOfWeek?: TimetableDay;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<TimetableEntryListItem>>(
      `/timetable-entries${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicTermId: query?.academicTermId,
        sectionId: query?.sectionId,
        termSubjectOfferingId: query?.termSubjectOfferingId,
        dayOfWeek: query?.dayOfWeek,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createTimetableEntry: (payload: CreateTimetableEntryPayload) =>
    request<TimetableEntryListItem>("/timetable-entries", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateTimetableEntry: (
    entryId: string,
    payload: UpdateTimetableEntryPayload,
  ) =>
    request<TimetableEntryListItem>(`/timetable-entries/${entryId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteTimetableEntry: (entryId: string) =>
    request<DeleteEntityResponse>(`/timetable-entries/${entryId}`, "DELETE", {
      withAuth: true,
    }),
  listStudents: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    gender?: StudentGender;
    genderId?: number;
    bloodTypeId?: number;
    localityId?: number;
    healthStatus?: StudentHealthStatus;
    healthStatusId?: number;
    orphanStatus?: StudentOrphanStatus;
    orphanStatusId?: number;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentListItem>>(
      `/students${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        gender: query?.gender,
        genderId: query?.genderId,
        bloodTypeId: query?.bloodTypeId,
        localityId: query?.localityId,
        healthStatus: query?.healthStatus,
        healthStatusId: query?.healthStatusId,
        orphanStatus: query?.orphanStatus,
        orphanStatusId: query?.orphanStatusId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudent: (payload: CreateStudentPayload) =>
    request<StudentListItem>("/students", "POST", {
      withAuth: true,
      json: {
        fullName: payload.fullName,
        gender: payload.gender,
        genderId: payload.genderId,
        birthDate: payload.birthDate,
        bloodTypeId: payload.bloodTypeId,
        localityId: payload.localityId,
        healthStatus: payload.healthStatus,
        healthStatusId: payload.healthStatusId,
        healthNotes: payload.healthNotes,
        orphanStatus: payload.orphanStatus,
        orphanStatusId: payload.orphanStatusId,
        isActive: payload.isActive,
      },
    }),
  updateStudent: (studentId: string, payload: UpdateStudentPayload) =>
    request<StudentListItem>(`/students/${studentId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteStudent: (studentId: string) =>
    request<DeleteEntityResponse>(`/students/${studentId}`, "DELETE", {
      withAuth: true,
    }),
  listGuardians: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    gender?: StudentGender;
    genderId?: number;
    idTypeId?: number;
    localityId?: number;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<GuardianListItem>>(
      `/guardians${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        gender: query?.gender,
        genderId: query?.genderId,
        idTypeId: query?.idTypeId,
        localityId: query?.localityId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createGuardian: (payload: CreateGuardianPayload) =>
    request<GuardianListItem>("/guardians", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateGuardian: (guardianId: string, payload: UpdateGuardianPayload) =>
    request<GuardianListItem>(`/guardians/${guardianId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteGuardian: (guardianId: string) =>
    request<DeleteEntityResponse>(`/guardians/${guardianId}`, "DELETE", {
      withAuth: true,
    }),
  listStudentGuardians: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentId?: string;
    guardianId?: string;
    relationship?: GuardianRelationship;
    relationshipTypeId?: number;
    isPrimary?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentGuardianListItem>>(
      `/student-guardians${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentId: query?.studentId,
        guardianId: query?.guardianId,
        relationship: query?.relationship,
        relationshipTypeId: query?.relationshipTypeId,
        isPrimary: query?.isPrimary,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentGuardian: (payload: CreateStudentGuardianPayload) =>
    request<StudentGuardianListItem>("/student-guardians", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentGuardian: (
    relationId: string,
    payload: UpdateStudentGuardianPayload,
  ) =>
    request<StudentGuardianListItem>(
      `/student-guardians/${relationId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteStudentGuardian: (relationId: string) =>
    request<DeleteEntityResponse>(
      `/student-guardians/${relationId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listStudentEnrollments: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentId?: string;
    academicYearId?: string;
    gradeLevelId?: string;
    sectionId?: string;
    status?: StudentEnrollmentStatus;
    distributionStatus?: StudentEnrollmentDistributionStatus;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentEnrollmentListItem>>(
      `/student-enrollments${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentId: query?.studentId,
        academicYearId: query?.academicYearId,
        gradeLevelId: query?.gradeLevelId,
        sectionId: query?.sectionId,
        status: query?.status,
        distributionStatus: query?.distributionStatus,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getStudentEnrollmentDistributionBoard: (query: {
    academicYearId: string;
    gradeLevelId: string;
    search?: string;
    limit?: number;
  }) =>
    request<StudentEnrollmentDistributionBoard>(
      `/student-enrollments/distribution/board${buildQueryString({
        academicYearId: query.academicYearId,
        gradeLevelId: query.gradeLevelId,
        search: query.search,
        limit: query.limit,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  autoDistributeStudentEnrollments: (
    payload: AutoDistributeStudentEnrollmentsPayload,
  ) =>
    request<{
      assignedCount: number;
      skippedCount: number;
      skippedEnrollmentIds: string[];
      sections: Array<{
        id: string;
        code: string;
        name: string;
        capacity: number | null;
        assignedCount: number;
      }>;
    }>("/student-enrollments/distribution/auto-assign", "POST", {
      withAuth: true,
      json: payload,
    }),
  manualDistributeStudentEnrollments: (
    payload: ManualDistributeStudentEnrollmentsPayload,
  ) =>
    request<{
      success: boolean;
      assignedCount: number;
    }>("/student-enrollments/distribution/manual-assign", "POST", {
      withAuth: true,
      json: payload,
    }),
  transferStudentEnrollments: (
    payload: TransferStudentEnrollmentsPayload,
  ) =>
    request<{
      success: boolean;
      transferredCount: number;
      sourceSection: {
        id: string;
        code: string;
        name: string;
      };
      targetSection: {
        id: string;
        code: string;
        name: string;
      };
      enrollments: Array<{
        id: string;
        studentId: string;
        sectionId: string | null;
        yearlyEnrollmentNo: string | null;
      }>;
    }>("/student-enrollments/distribution/transfer-section", "POST", {
      withAuth: true,
      json: payload,
    }),
  returnStudentEnrollmentsToPending: (
    payload: ReturnStudentEnrollmentsToPendingPayload,
  ) =>
    request<{
      success: boolean;
      returnedCount: number;
      enrollments: Array<{
        id: string;
        studentId: string;
        sectionId: string | null;
        yearlyEnrollmentNo: string | null;
      }>;
    }>("/student-enrollments/distribution/return-to-pending", "POST", {
      withAuth: true,
      json: payload,
    }),
  createStudentEnrollment: (payload: CreateStudentEnrollmentPayload) =>
    request<StudentEnrollmentListItem>("/student-enrollments", "POST", {
      withAuth: true,
      json: {
        studentId: payload.studentId,
        academicYearId: payload.academicYearId,
        gradeLevelId: payload.gradeLevelId,
        distributionStatus: payload.distributionStatus,
        enrollmentDate: payload.enrollmentDate,
        status: payload.status,
        notes: payload.notes,
        isActive: payload.isActive,
        ...(payload.sectionId ? { sectionId: payload.sectionId } : {}),
      },
    }),
  updateStudentEnrollment: (
    enrollmentId: string,
    payload: UpdateStudentEnrollmentPayload,
  ) =>
    request<StudentEnrollmentListItem>(
      `/student-enrollments/${enrollmentId}`,
      "PATCH",
      {
        withAuth: true,
        json: {
          studentId: payload.studentId,
          academicYearId: payload.academicYearId,
          gradeLevelId: payload.gradeLevelId,
          distributionStatus: payload.distributionStatus,
          enrollmentDate: payload.enrollmentDate,
          status: payload.status,
          notes: payload.notes,
          isActive: payload.isActive,
          ...(payload.sectionId ? { sectionId: payload.sectionId } : {}),
        },
      },
    ),
  deleteStudentEnrollment: (enrollmentId: string) =>
    request<DeleteEntityResponse>(
      `/student-enrollments/${enrollmentId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listStudentAttendance: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    status?: StudentAttendanceStatus;
    fromDate?: string;
    toDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentAttendanceListItem>>(
      `/student-attendance${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        status: query?.status,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentAttendance: (payload: CreateStudentAttendancePayload) =>
    request<StudentAttendanceListItem>("/student-attendance", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentAttendance: (
    attendanceId: string,
    payload: UpdateStudentAttendancePayload,
  ) =>
    request<StudentAttendanceListItem>(
      `/student-attendance/${attendanceId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteStudentAttendance: (attendanceId: string) =>
    request<DeleteEntityResponse>(
      `/student-attendance/${attendanceId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listStudentBooks: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    subjectId?: string;
    status?: StudentBookStatus;
    fromIssuedDate?: string;
    toIssuedDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentBookListItem>>(
      `/student-books${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        subjectId: query?.subjectId,
        status: query?.status,
        fromIssuedDate: query?.fromIssuedDate,
        toIssuedDate: query?.toIssuedDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentBook: (payload: CreateStudentBookPayload) =>
    request<StudentBookListItem>("/student-books", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentBook: (
    studentBookId: string,
    payload: UpdateStudentBookPayload,
  ) =>
    request<StudentBookListItem>(`/student-books/${studentBookId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteStudentBook: (studentBookId: string) =>
    request<DeleteEntityResponse>(`/student-books/${studentBookId}`, "DELETE", {
      withAuth: true,
    }),
  listStudentTalents: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentId?: string;
    talentId?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentTalentListItem>>(
      `/student-talents${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentId: query?.studentId,
        talentId: query?.talentId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentTalent: (payload: CreateStudentTalentPayload) =>
    request<StudentTalentListItem>("/student-talents", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentTalent: (
    mappingId: string,
    payload: UpdateStudentTalentPayload,
  ) =>
    request<StudentTalentListItem>(`/student-talents/${mappingId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteStudentTalent: (mappingId: string) =>
    request<DeleteEntityResponse>(`/student-talents/${mappingId}`, "DELETE", {
      withAuth: true,
    }),
  listStudentSiblings: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentId?: string;
    siblingId?: string;
    relationship?: StudentSiblingRelationship;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentSiblingListItem>>(
      `/student-siblings${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentId: query?.studentId,
        siblingId: query?.siblingId,
        relationship: query?.relationship,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentSibling: (payload: CreateStudentSiblingPayload) =>
    request<StudentSiblingListItem>("/student-siblings", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentSibling: (
    siblingId: string,
    payload: UpdateStudentSiblingPayload,
  ) =>
    request<StudentSiblingListItem>(`/student-siblings/${siblingId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteStudentSibling: (siblingId: string) =>
    request<DeleteEntityResponse>(`/student-siblings/${siblingId}`, "DELETE", {
      withAuth: true,
    }),
  listStudentProblems: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentId?: string;
    problemType?: string;
    isResolved?: boolean;
    fromProblemDate?: string;
    toProblemDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentProblemListItem>>(
      `/student-problems${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentId: query?.studentId,
        problemType: query?.problemType,
        isResolved: query?.isResolved,
        fromProblemDate: query?.fromProblemDate,
        toProblemDate: query?.toProblemDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentProblem: (payload: CreateStudentProblemPayload) =>
    request<StudentProblemListItem>("/student-problems", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentProblem: (
    problemId: string,
    payload: UpdateStudentProblemPayload,
  ) =>
    request<StudentProblemListItem>(`/student-problems/${problemId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteStudentProblem: (problemId: string) =>
    request<DeleteEntityResponse>(`/student-problems/${problemId}`, "DELETE", {
      withAuth: true,
    }),
  listParentNotifications: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentId?: string;
    notificationType?: ParentNotificationType;
    guardianTitleId?: number;
    sendMethod?: ParentNotificationSendMethod;
    isSent?: boolean;
    fromSentDate?: string;
    toSentDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<ParentNotificationListItem>>(
      `/parent-notifications${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentId: query?.studentId,
        notificationType: query?.notificationType,
        guardianTitleId: query?.guardianTitleId,
        sendMethod: query?.sendMethod,
        isSent: query?.isSent,
        fromSentDate: query?.fromSentDate,
        toSentDate: query?.toSentDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createParentNotification: (payload: CreateParentNotificationPayload) =>
    request<ParentNotificationListItem>("/parent-notifications", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateParentNotification: (
    notificationId: string,
    payload: UpdateParentNotificationPayload,
  ) =>
    request<ParentNotificationListItem>(
      `/parent-notifications/${notificationId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteParentNotification: (notificationId: string) =>
    request<DeleteEntityResponse>(
      `/parent-notifications/${notificationId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listHealthVisits: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    studentId?: string;
    nurseId?: string;
    healthStatusId?: number;
    fromDate?: string;
    toDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<HealthVisitListItem>>(
      `/health/visits${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        studentId: query?.studentId,
        nurseId: query?.nurseId,
        healthStatusId: query?.healthStatusId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getHealthVisit: (visitId: string) =>
    request<HealthVisitListItem>(`/health/visits/${visitId}`, "GET", {
      withAuth: true,
    }),
  createHealthVisit: (payload: CreateHealthVisitPayload) =>
    request<HealthVisitListItem>("/health/visits", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateHealthVisit: (
    visitId: string,
    payload: UpdateHealthVisitPayload,
  ) =>
    request<HealthVisitListItem>(`/health/visits/${visitId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteHealthVisit: (visitId: string) =>
    request<DeleteEntityResponse>(`/health/visits/${visitId}`, "DELETE", {
      withAuth: true,
    }),
  getHealthVisitsSummary: () =>
    request<HealthVisitsSummary>("/health/summary", "GET", {
      withAuth: true,
    }),
  listExamPeriods: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    academicTermId?: string;
    assessmentType?: AssessmentType;
    status?: GradingWorkflowStatus;
    isLocked?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<ExamPeriodListItem>>(
      `/exam-periods${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        academicTermId: query?.academicTermId,
        assessmentType: query?.assessmentType,
        status: query?.status,
        isLocked: query?.isLocked,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createExamPeriod: (payload: CreateExamPeriodPayload) =>
    request<ExamPeriodListItem>("/exam-periods", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateExamPeriod: (examPeriodId: string, payload: UpdateExamPeriodPayload) =>
    request<ExamPeriodListItem>(`/exam-periods/${examPeriodId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteExamPeriod: (examPeriodId: string) =>
    request<DeleteEntityResponse>(`/exam-periods/${examPeriodId}`, "DELETE", {
      withAuth: true,
    }),
  listExamAssessments: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    examPeriodId?: string;
    sectionId?: string;
    subjectId?: string;
    fromExamDate?: string;
    toExamDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<ExamAssessmentListItem>>(
      `/exam-assessments${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        examPeriodId: query?.examPeriodId,
        sectionId: query?.sectionId,
        subjectId: query?.subjectId,
        fromExamDate: query?.fromExamDate,
        toExamDate: query?.toExamDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createExamAssessment: (payload: CreateExamAssessmentPayload) =>
    request<ExamAssessmentListItem>("/exam-assessments", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateExamAssessment: (
    examAssessmentId: string,
    payload: UpdateExamAssessmentPayload,
  ) =>
    request<ExamAssessmentListItem>(
      `/exam-assessments/${examAssessmentId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteExamAssessment: (examAssessmentId: string) =>
    request<DeleteEntityResponse>(
      `/exam-assessments/${examAssessmentId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listStudentExamScores: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    examAssessmentId?: string;
    examPeriodId?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    isPresent?: boolean;
    absenceType?: ExamAbsenceType;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentExamScoreListItem>>(
      `/student-exam-scores${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        examAssessmentId: query?.examAssessmentId,
        examPeriodId: query?.examPeriodId,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        isPresent: query?.isPresent,
        absenceType: query?.absenceType,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentExamScore: (payload: CreateStudentExamScorePayload) =>
    request<StudentExamScoreListItem>("/student-exam-scores", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentExamScore: (
    studentExamScoreId: string,
    payload: UpdateStudentExamScorePayload,
  ) =>
    request<StudentExamScoreListItem>(
      `/student-exam-scores/${studentExamScoreId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteStudentExamScore: (studentExamScoreId: string) =>
    request<DeleteEntityResponse>(
      `/student-exam-scores/${studentExamScoreId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listMonthlyGrades: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    academicTermId?: string;
    academicMonthId?: string;
    sectionId?: string;
    subjectId?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    status?: GradingWorkflowStatus;
    isLocked?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<MonthlyGradeListItem>>(
      `/monthly-grades${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        academicTermId: query?.academicTermId,
        academicMonthId: query?.academicMonthId,
        sectionId: query?.sectionId,
        subjectId: query?.subjectId,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        status: query?.status,
        isLocked: query?.isLocked,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createMonthlyGrade: (payload: CreateMonthlyGradePayload) =>
    request<MonthlyGradeListItem>("/monthly-grades", "POST", {
      withAuth: true,
      json: payload,
    }),
  calculateMonthlyGrades: (payload: CalculateMonthlyGradesPayload) =>
    request<CalculateMonthlyGradesResponse>(
      "/monthly-grades/calculate",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateMonthlyGrade: (
    monthlyGradeId: string,
    payload: UpdateMonthlyGradePayload,
  ) =>
    request<MonthlyGradeListItem>(
      `/monthly-grades/${monthlyGradeId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  lockMonthlyGrade: (monthlyGradeId: string) =>
    request<MonthlyGradeListItem>(
      `/monthly-grades/${monthlyGradeId}/lock`,
      "POST",
      {
        withAuth: true,
      },
    ),
  unlockMonthlyGrade: (monthlyGradeId: string) =>
    request<MonthlyGradeListItem>(
      `/monthly-grades/${monthlyGradeId}/unlock`,
      "POST",
      {
        withAuth: true,
      },
    ),
  deleteMonthlyGrade: (monthlyGradeId: string) =>
    request<DeleteEntityResponse>(
      `/monthly-grades/${monthlyGradeId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listMonthlyCustomComponentScores: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    monthlyGradeId?: string;
    gradingPolicyComponentId?: string;
    academicMonthId?: string;
    subjectId?: string;
    sectionId?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<MonthlyCustomComponentScoreListItem>>(
      `/monthly-custom-component-scores${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        monthlyGradeId: query?.monthlyGradeId,
        gradingPolicyComponentId: query?.gradingPolicyComponentId,
        academicMonthId: query?.academicMonthId,
        subjectId: query?.subjectId,
        sectionId: query?.sectionId,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createMonthlyCustomComponentScore: (
    payload: CreateMonthlyCustomComponentScorePayload,
  ) =>
    request<MonthlyCustomComponentScoreListItem>(
      "/monthly-custom-component-scores",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateMonthlyCustomComponentScore: (
    monthlyCustomComponentScoreId: string,
    payload: UpdateMonthlyCustomComponentScorePayload,
  ) =>
    request<MonthlyCustomComponentScoreListItem>(
      `/monthly-custom-component-scores/${monthlyCustomComponentScoreId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteMonthlyCustomComponentScore: (monthlyCustomComponentScoreId: string) =>
    request<DeleteEntityResponse>(
      `/monthly-custom-component-scores/${monthlyCustomComponentScoreId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listSemesterGrades: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    academicTermId?: string;
    sectionId?: string;
    subjectId?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    status?: GradingWorkflowStatus;
    isLocked?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<SemesterGradeListItem>>(
      `/semester-grades${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        academicTermId: query?.academicTermId,
        sectionId: query?.sectionId,
        subjectId: query?.subjectId,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        status: query?.status,
        isLocked: query?.isLocked,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createSemesterGrade: (payload: CreateSemesterGradePayload) =>
    request<SemesterGradeListItem>("/semester-grades", "POST", {
      withAuth: true,
      json: payload,
    }),
  calculateSemesterGrades: (payload: CalculateSemesterGradesPayload) =>
    request<CalculateSemesterGradesResponse>(
      "/semester-grades/calculate",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  fillSemesterFinalExamScores: (payload: FillSemesterFinalExamScoresPayload) =>
    request<FillSemesterFinalExamScoresResponse>(
      "/semester-grades/fill-final-exam-scores",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateSemesterGrade: (
    semesterGradeId: string,
    payload: UpdateSemesterGradePayload,
  ) =>
    request<SemesterGradeListItem>(
      `/semester-grades/${semesterGradeId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  lockSemesterGrade: (semesterGradeId: string) =>
    request<SemesterGradeListItem>(
      `/semester-grades/${semesterGradeId}/lock`,
      "POST",
      {
        withAuth: true,
      },
    ),
  unlockSemesterGrade: (semesterGradeId: string) =>
    request<SemesterGradeListItem>(
      `/semester-grades/${semesterGradeId}/unlock`,
      "POST",
      {
        withAuth: true,
      },
    ),
  deleteSemesterGrade: (semesterGradeId: string) =>
    request<DeleteEntityResponse>(
      `/semester-grades/${semesterGradeId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listAnnualGrades: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    sectionId?: string;
    subjectId?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    finalStatusId?: string;
    status?: GradingWorkflowStatus;
    isLocked?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<AnnualGradeListItem>>(
      `/annual-grades${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        sectionId: query?.sectionId,
        subjectId: query?.subjectId,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        finalStatusId: query?.finalStatusId,
        status: query?.status,
        isLocked: query?.isLocked,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createAnnualGrade: (payload: CreateAnnualGradePayload) =>
    request<AnnualGradeListItem>("/annual-grades", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateAnnualGrade: (
    annualGradeId: string,
    payload: UpdateAnnualGradePayload,
  ) =>
    request<AnnualGradeListItem>(`/annual-grades/${annualGradeId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  lockAnnualGrade: (annualGradeId: string) =>
    request<AnnualGradeListItem>(
      `/annual-grades/${annualGradeId}/lock`,
      "POST",
      {
        withAuth: true,
      },
    ),
  unlockAnnualGrade: (annualGradeId: string) =>
    request<AnnualGradeListItem>(
      `/annual-grades/${annualGradeId}/unlock`,
      "POST",
      {
        withAuth: true,
      },
    ),
  deleteAnnualGrade: (annualGradeId: string) =>
    request<DeleteEntityResponse>(`/annual-grades/${annualGradeId}`, "DELETE", {
      withAuth: true,
    }),
  listAnnualResults: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    gradeLevelId?: string;
    sectionId?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    promotionDecisionId?: string;
    status?: GradingWorkflowStatus;
    isLocked?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<AnnualResultListItem>>(
      `/annual-results${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        gradeLevelId: query?.gradeLevelId,
        sectionId: query?.sectionId,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        promotionDecisionId: query?.promotionDecisionId,
        status: query?.status,
        isLocked: query?.isLocked,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createAnnualResult: (payload: CreateAnnualResultPayload) =>
    request<AnnualResultListItem>("/annual-results", "POST", {
      withAuth: true,
      json: payload,
    }),
  calculateAnnualResults: (payload: CalculateAnnualResultsPayload) =>
    request<CalculateAnnualResultsResponse>(
      "/annual-results/calculate",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateAnnualResult: (
    annualResultId: string,
    payload: UpdateAnnualResultPayload,
  ) =>
    request<AnnualResultListItem>(
      `/annual-results/${annualResultId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  lockAnnualResult: (annualResultId: string) =>
    request<AnnualResultListItem>(
      `/annual-results/${annualResultId}/lock`,
      "POST",
      {
        withAuth: true,
      },
    ),
  unlockAnnualResult: (annualResultId: string) =>
    request<AnnualResultListItem>(
      `/annual-results/${annualResultId}/unlock`,
      "POST",
      {
        withAuth: true,
      },
    ),
  deleteAnnualResult: (annualResultId: string) =>
    request<DeleteEntityResponse>(
      `/annual-results/${annualResultId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listHomeworkTypes: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isSystem?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<HomeworkTypeListItem>>(
      `/homework-types${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isSystem: query?.isSystem,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createHomeworkType: (payload: CreateHomeworkTypePayload) =>
    request<HomeworkTypeListItem>("/homework-types", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateHomeworkType: (
    homeworkTypeId: string,
    payload: UpdateHomeworkTypePayload,
  ) =>
    request<HomeworkTypeListItem>(
      `/homework-types/${homeworkTypeId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteHomeworkType: (homeworkTypeId: string) =>
    request<DeleteEntityResponse>(
      `/homework-types/${homeworkTypeId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listHomeworks: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    academicTermId?: string;
    sectionId?: string;
    subjectId?: string;
    homeworkTypeId?: string;
    fromHomeworkDate?: string;
    toHomeworkDate?: string;
    fromDueDate?: string;
    toDueDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<HomeworkListItem>>(
      `/homeworks${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        academicTermId: query?.academicTermId,
        sectionId: query?.sectionId,
        subjectId: query?.subjectId,
        homeworkTypeId: query?.homeworkTypeId,
        fromHomeworkDate: query?.fromHomeworkDate,
        toHomeworkDate: query?.toHomeworkDate,
        fromDueDate: query?.fromDueDate,
        toDueDate: query?.toDueDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createHomework: (payload: CreateHomeworkPayload) =>
    request<HomeworkListItem>("/homeworks", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateHomework: (homeworkId: string, payload: UpdateHomeworkPayload) =>
    request<HomeworkListItem>(`/homeworks/${homeworkId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  populateHomeworkStudents: (homeworkId: string) =>
    request<PopulateHomeworkStudentsResponse>(
      `/homeworks/${homeworkId}/populate-students`,
      "POST",
      {
        withAuth: true,
      },
    ),
  deleteHomework: (homeworkId: string) =>
    request<DeleteEntityResponse>(`/homeworks/${homeworkId}`, "DELETE", {
      withAuth: true,
    }),
  listStudentHomeworks: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    homeworkId?: string;
    studentEnrollmentId?: string;
    studentId?: string;
    academicYearId?: string;
    sectionId?: string;
    subjectId?: string;
    isCompleted?: boolean;
    fromSubmittedAt?: string;
    toSubmittedAt?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<StudentHomeworkListItem>>(
      `/student-homeworks${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        homeworkId: query?.homeworkId,
        studentEnrollmentId: query?.studentEnrollmentId,
        studentId: query?.studentId,
        academicYearId: query?.academicYearId,
        sectionId: query?.sectionId,
        subjectId: query?.subjectId,
        isCompleted: query?.isCompleted,
        fromSubmittedAt: query?.fromSubmittedAt,
        toSubmittedAt: query?.toSubmittedAt,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentHomework: (payload: CreateStudentHomeworkPayload) =>
    request<StudentHomeworkListItem>("/student-homeworks", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentHomework: (
    studentHomeworkId: string,
    payload: UpdateStudentHomeworkPayload,
  ) =>
    request<StudentHomeworkListItem>(
      `/student-homeworks/${studentHomeworkId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteStudentHomework: (studentHomeworkId: string) =>
    request<DeleteEntityResponse>(
      `/student-homeworks/${studentHomeworkId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listEmployees: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    gender?: EmployeeGender;
    genderId?: number;
    employmentType?: EmploymentType;
    idTypeId?: number;
    localityId?: number;
    departmentId?: string;
    branchId?: number;
    directManagerEmployeeId?: string;
    costCenterId?: number;
    jobTitle?: string;
    qualificationId?: number;
    jobRoleId?: number;
    isActive?: boolean;
    operationalReadiness?: OperationalReadinessFilter;
  }) =>
    request<PaginatedResponse<EmployeeListItem>>(
      `/employees${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        gender: query?.gender,
        genderId: query?.genderId,
        employmentType: query?.employmentType,
        idTypeId: query?.idTypeId,
        localityId: query?.localityId,
        departmentId: query?.departmentId,
        branchId: query?.branchId,
        directManagerEmployeeId: query?.directManagerEmployeeId,
        costCenterId: query?.costCenterId,
        jobTitle: query?.jobTitle,
        qualificationId: query?.qualificationId,
        jobRoleId: query?.jobRoleId,
        isActive: query?.isActive,
        operationalReadiness: query?.operationalReadiness,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  listEmployeeOrganizationOptions: () =>
    request<EmployeeOrganizationOptionsResponse>(
      "/employees/organization-options",
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployee: (payload: CreateEmployeePayload) =>
    request<EmployeeListItem>("/employees", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployee: (employeeId: string, payload: UpdateEmployeePayload) =>
    request<EmployeeListItem>(`/employees/${employeeId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteEmployee: (employeeId: string) =>
    request<DeleteEntityResponse>(`/employees/${employeeId}`, "DELETE", {
      withAuth: true,
    }),
  listEmployeeTeachingAssignments: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    sectionId?: string;
    subjectId?: string;
    academicYearId?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeTeachingAssignmentListItem>>(
      `/employee-teaching-assignments${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        sectionId: query?.sectionId,
        subjectId: query?.subjectId,
        academicYearId: query?.academicYearId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeTeachingAssignment: (
    payload: CreateEmployeeTeachingAssignmentPayload,
  ) =>
    request<EmployeeTeachingAssignmentListItem>(
      "/employee-teaching-assignments",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateEmployeeTeachingAssignment: (
    assignmentId: string,
    payload: UpdateEmployeeTeachingAssignmentPayload,
  ) =>
    request<EmployeeTeachingAssignmentListItem>(
      `/employee-teaching-assignments/${assignmentId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteEmployeeTeachingAssignment: (assignmentId: string) =>
    request<DeleteEntityResponse>(
      `/employee-teaching-assignments/${assignmentId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listEmployeeAttendance: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    status?: EmployeeAttendanceStatus;
    fromDate?: string;
    toDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeAttendanceListItem>>(
      `/employee-attendance${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        status: query?.status,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeAttendance: (payload: CreateEmployeeAttendancePayload) =>
    request<EmployeeAttendanceListItem>("/employee-attendance", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeAttendance: (
    attendanceId: string,
    payload: UpdateEmployeeAttendancePayload,
  ) =>
    request<EmployeeAttendanceListItem>(
      `/employee-attendance/${attendanceId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteEmployeeAttendance: (attendanceId: string) =>
    request<DeleteEntityResponse>(
      `/employee-attendance/${attendanceId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listEmployeeTasks: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    academicYearId?: string;
    dayOfWeek?: TimetableDay;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeTaskListItem>>(
      `/employee-tasks${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        academicYearId: query?.academicYearId,
        dayOfWeek: query?.dayOfWeek,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeTask: (payload: CreateEmployeeTaskPayload) =>
    request<EmployeeTaskListItem>("/employee-tasks", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeTask: (taskId: string, payload: UpdateEmployeeTaskPayload) =>
    request<EmployeeTaskListItem>(`/employee-tasks/${taskId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteEmployeeTask: (taskId: string) =>
    request<DeleteEntityResponse>(`/employee-tasks/${taskId}`, "DELETE", {
      withAuth: true,
    }),
  listEmployeePerformanceEvaluations: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    academicYearId?: string;
    ratingLevel?: PerformanceRatingLevel;
    evaluatorEmployeeId?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeePerformanceEvaluationListItem>>(
      `/employee-performance-evaluations${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        academicYearId: query?.academicYearId,
        ratingLevel: query?.ratingLevel,
        evaluatorEmployeeId: query?.evaluatorEmployeeId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeePerformanceEvaluation: (
    payload: CreateEmployeePerformanceEvaluationPayload,
  ) =>
    request<EmployeePerformanceEvaluationListItem>(
      "/employee-performance-evaluations",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateEmployeePerformanceEvaluation: (
    evaluationId: string,
    payload: UpdateEmployeePerformanceEvaluationPayload,
  ) =>
    request<EmployeePerformanceEvaluationListItem>(
      `/employee-performance-evaluations/${evaluationId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteEmployeePerformanceEvaluation: (evaluationId: string) =>
    request<DeleteEntityResponse>(
      `/employee-performance-evaluations/${evaluationId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listEmployeeViolations: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    reportedByEmployeeId?: string;
    severity?: ViolationSeverity;
    fromDate?: string;
    toDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeViolationListItem>>(
      `/employee-violations${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        reportedByEmployeeId: query?.reportedByEmployeeId,
        severity: query?.severity,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeViolation: (payload: CreateEmployeeViolationPayload) =>
    request<EmployeeViolationListItem>("/employee-violations", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeViolation: (
    violationId: string,
    payload: UpdateEmployeeViolationPayload,
  ) =>
    request<EmployeeViolationListItem>(
      `/employee-violations/${violationId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteEmployeeViolation: (violationId: string) =>
    request<DeleteEntityResponse>(
      `/employee-violations/${violationId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  getHrSummaryReport: (query?: {
    fromDate?: string;
    toDate?: string;
    employeeId?: string;
  }) =>
    request<HrSummaryReportResponse>(
      `/hr-reports/summary${buildQueryString({
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        employeeId: query?.employeeId,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  listTalents: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<TalentListItem>>(
      `/talents${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createTalent: (payload: CreateTalentPayload) =>
    request<TalentListItem>("/talents", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateTalent: (talentId: string, payload: UpdateTalentPayload) =>
    request<TalentListItem>(`/talents/${talentId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteTalent: (talentId: string) =>
    request<DeleteEntityResponse>(`/talents/${talentId}`, "DELETE", {
      withAuth: true,
    }),
  listEmployeeCourses: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeCourseListItem>>(
      `/employee-courses${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeCourse: (payload: CreateEmployeeCoursePayload) =>
    request<EmployeeCourseListItem>("/employee-courses", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeCourse: (
    courseId: string,
    payload: UpdateEmployeeCoursePayload,
  ) =>
    request<EmployeeCourseListItem>(`/employee-courses/${courseId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteEmployeeCourse: (courseId: string) =>
    request<DeleteEntityResponse>(`/employee-courses/${courseId}`, "DELETE", {
      withAuth: true,
    }),
  listEmployeeContracts: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    fromDate?: string;
    toDate?: string;
    isCurrent?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeContractListItem>>(
      `/employee-contracts${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        isCurrent: query?.isCurrent,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  generateEmployeeContractExpiryAlerts: (
    payload: GenerateEmployeeContractExpiryAlertsPayload = {},
  ) =>
    request<GenerateEmployeeContractExpiryAlertsResponse>(
      "/employee-contracts/generate-expiry-alerts",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  createEmployeeContract: (payload: CreateEmployeeContractPayload) =>
    request<EmployeeContractListItem>("/employee-contracts", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeContract: (
    contractId: string,
    payload: UpdateEmployeeContractPayload,
  ) =>
    request<EmployeeContractListItem>(`/employee-contracts/${contractId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteEmployeeContract: (contractId: string) =>
    request<DeleteEntityResponse>(`/employee-contracts/${contractId}`, "DELETE", {
      withAuth: true,
    }),
  listEmployeeDepartments: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeDepartmentListItem>>(
      `/employee-departments${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeDepartment: (payload: CreateEmployeeDepartmentPayload) =>
    request<EmployeeDepartmentListItem>("/employee-departments", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeDepartment: (
    departmentId: string,
    payload: UpdateEmployeeDepartmentPayload,
  ) =>
    request<EmployeeDepartmentListItem>(
      `/employee-departments/${departmentId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteEmployeeDepartment: (departmentId: string) =>
    request<DeleteEntityResponse>(`/employee-departments/${departmentId}`, "DELETE", {
      withAuth: true,
    }),
  listEmployeeDocuments: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    fileCategory?: string;
    fileType?: string;
  }) =>
    request<PaginatedResponse<EmployeeDocumentListItem>>(
      `/employee-documents${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        fileCategory: query?.fileCategory,
        fileType: query?.fileType,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeDocument: (payload: CreateEmployeeDocumentPayload) =>
    request<EmployeeDocumentListItem>("/employee-documents", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeDocument: (
    documentId: string,
    payload: UpdateEmployeeDocumentPayload,
  ) =>
    request<EmployeeDocumentListItem>(`/employee-documents/${documentId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteEmployeeDocument: (documentId: string) =>
    request<DeleteEntityResponse>(`/employee-documents/${documentId}`, "DELETE", {
      withAuth: true,
    }),
  generateEmployeeDocumentExpiryAlerts: (
    payload: GenerateEmployeeDocumentExpiryAlertsPayload = {},
  ) =>
    request<GenerateEmployeeDocumentExpiryAlertsResponse>(
      "/employee-documents/generate-expiry-alerts",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  listEmployeeLeaves: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    leaveType?: EmployeeLeaveType;
    status?: EmployeeLeaveRequestStatus;
    fromDate?: string;
    toDate?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeLeaveListItem>>(
      `/employee-leaves${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        leaveType: query?.leaveType,
        status: query?.status,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeLeave: (payload: CreateEmployeeLeavePayload) =>
    request<EmployeeLeaveListItem>("/employee-leaves", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeLeave: (leaveId: string, payload: UpdateEmployeeLeavePayload) =>
    request<EmployeeLeaveListItem>(`/employee-leaves/${leaveId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  approveEmployeeLeave: (leaveId: string) =>
    request<EmployeeLeaveListItem>(`/employee-leaves/${leaveId}/approve`, "PATCH", {
      withAuth: true,
    }),
  rejectEmployeeLeave: (leaveId: string) =>
    request<EmployeeLeaveListItem>(`/employee-leaves/${leaveId}/reject`, "PATCH", {
      withAuth: true,
    }),
  deleteEmployeeLeave: (leaveId: string) =>
    request<DeleteEntityResponse>(`/employee-leaves/${leaveId}`, "DELETE", {
      withAuth: true,
    }),
  listEmployeeLeaveBalances: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    leaveType?: EmployeeLeaveType;
    balanceYear?: number;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeLeaveBalanceListItem>>(
      `/employee-leave-balances${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        leaveType: query?.leaveType,
        balanceYear: query?.balanceYear,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeLeaveBalance: (payload: CreateEmployeeLeaveBalancePayload) =>
    request<EmployeeLeaveBalanceListItem>("/employee-leave-balances", "POST", {
      withAuth: true,
      json: payload,
    }),
  generateEmployeeLeaveBalances: (payload: GenerateEmployeeLeaveBalancesPayload) =>
    request<GenerateEmployeeLeaveBalancesResponse>(
      "/employee-leave-balances/generate",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateEmployeeLeaveBalance: (
    balanceId: string,
    payload: UpdateEmployeeLeaveBalancePayload,
  ) =>
    request<EmployeeLeaveBalanceListItem>(
      `/employee-leave-balances/${balanceId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteEmployeeLeaveBalance: (balanceId: string) =>
    request<DeleteEntityResponse>(`/employee-leave-balances/${balanceId}`, "DELETE", {
      withAuth: true,
    }),
  listEmployeeLifecycleChecklists: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    assignedToEmployeeId?: string;
    checklistType?: EmployeeLifecycleChecklistType;
    status?: EmployeeLifecycleChecklistStatus;
    dueDateFrom?: string;
    dueDateTo?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeLifecycleChecklistListItem>>(
      `/employee-lifecycle-checklists${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        assignedToEmployeeId: query?.assignedToEmployeeId,
        checklistType: query?.checklistType,
        status: query?.status,
        dueDateFrom: query?.dueDateFrom,
        dueDateTo: query?.dueDateTo,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeLifecycleChecklist: (
    payload: CreateEmployeeLifecycleChecklistPayload,
  ) =>
    request<EmployeeLifecycleChecklistListItem>(
      "/employee-lifecycle-checklists",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateEmployeeLifecycleChecklist: (
    checklistId: string,
    payload: UpdateEmployeeLifecycleChecklistPayload,
  ) =>
    request<EmployeeLifecycleChecklistListItem>(
      `/employee-lifecycle-checklists/${checklistId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  startEmployeeLifecycleChecklist: (checklistId: string) =>
    request<EmployeeLifecycleChecklistListItem>(
      `/employee-lifecycle-checklists/${checklistId}/start`,
      "PATCH",
      {
        withAuth: true,
      },
    ),
  completeEmployeeLifecycleChecklist: (checklistId: string) =>
    request<EmployeeLifecycleChecklistListItem>(
      `/employee-lifecycle-checklists/${checklistId}/complete`,
      "PATCH",
      {
        withAuth: true,
      },
    ),
  waiveEmployeeLifecycleChecklist: (checklistId: string) =>
    request<EmployeeLifecycleChecklistListItem>(
      `/employee-lifecycle-checklists/${checklistId}/waive`,
      "PATCH",
      {
        withAuth: true,
      },
    ),
  generateEmployeeLifecycleChecklistDueAlerts: (
    payload: GenerateEmployeeLifecycleChecklistDueAlertsPayload,
  ) =>
    request<GenerateEmployeeLifecycleChecklistDueAlertsResponse>(
      "/employee-lifecycle-checklists/generate-due-alerts",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteEmployeeLifecycleChecklist: (checklistId: string) =>
    request<DeleteEntityResponse>(
      `/employee-lifecycle-checklists/${checklistId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listEmployeeTalents: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    employeeId?: string;
    talentId?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<EmployeeTalentListItem>>(
      `/employee-talents${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        employeeId: query?.employeeId,
        talentId: query?.talentId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createEmployeeTalent: (payload: CreateEmployeeTalentPayload) =>
    request<EmployeeTalentListItem>("/employee-talents", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateEmployeeTalent: (
    mappingId: string,
    payload: UpdateEmployeeTalentPayload,
  ) =>
    request<EmployeeTalentListItem>(`/employee-talents/${mappingId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteEmployeeTalent: (mappingId: string) =>
    request<DeleteEntityResponse>(`/employee-talents/${mappingId}`, "DELETE", {
      withAuth: true,
    }),
  listBranches: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isHeadquarters?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<FinanceBranchListItem>>(
      `/branches${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isHeadquarters: query?.isHeadquarters,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createBranch: (payload: CreateFinanceBranchPayload) =>
    request<FinanceBranchListItem>("/branches", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateBranch: (branchId: string, payload: UpdateFinanceBranchPayload) =>
    request<FinanceBranchListItem>(`/branches/${branchId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteBranch: (branchId: string) =>
    request<DeleteEntityResponse>(`/branches/${branchId}`, "DELETE", {
      withAuth: true,
    }),
  listCurrencies: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isBase?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<CurrencyListItem>>(
      `/currencies${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isBase: query?.isBase,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createCurrency: (payload: CreateCurrencyPayload) =>
    request<CurrencyListItem>("/currencies", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateCurrency: (currencyId: string, payload: UpdateCurrencyPayload) =>
    request<CurrencyListItem>(`/currencies/${currencyId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteCurrency: (currencyId: string) =>
    request<DeleteEntityResponse>(`/currencies/${currencyId}`, "DELETE", {
      withAuth: true,
    }),
  listCurrencyExchangeRates: (query?: {
    page?: number;
    limit?: number;
    fromCurrencyId?: number;
    toCurrencyId?: number;
    dateFrom?: string;
    dateTo?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<CurrencyExchangeRateListItem>>(
      `/currency-exchange-rates${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        fromCurrencyId: query?.fromCurrencyId,
        toCurrencyId: query?.toCurrencyId,
        dateFrom: query?.dateFrom,
        dateTo: query?.dateTo,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createCurrencyExchangeRate: (payload: CreateCurrencyExchangeRatePayload) =>
    request<CurrencyExchangeRateListItem>(
      "/currency-exchange-rates",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateCurrencyExchangeRate: (
    exchangeRateId: string,
    payload: UpdateCurrencyExchangeRatePayload,
  ) =>
    request<CurrencyExchangeRateListItem>(
      `/currency-exchange-rates/${exchangeRateId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteCurrencyExchangeRate: (exchangeRateId: string) =>
    request<DeleteEntityResponse>(
      `/currency-exchange-rates/${exchangeRateId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listFiscalYears: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    dateFrom?: string;
    dateTo?: string;
    isClosed?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<FiscalYearListItem>>(
      `/fiscal-years${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        dateFrom: query?.dateFrom,
        dateTo: query?.dateTo,
        isClosed: query?.isClosed,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createFiscalYear: (payload: CreateFiscalYearPayload) =>
    request<FiscalYearListItem>("/fiscal-years", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateFiscalYear: (fiscalYearId: string, payload: UpdateFiscalYearPayload) =>
    request<FiscalYearListItem>(`/fiscal-years/${fiscalYearId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteFiscalYear: (fiscalYearId: string) =>
    request<DeleteEntityResponse>(`/fiscal-years/${fiscalYearId}`, "DELETE", {
      withAuth: true,
    }),
  listFiscalPeriods: (query?: {
    page?: number;
    limit?: number;
    fiscalYearId?: number;
    periodType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<FiscalPeriodListItem>>(
      `/fiscal-periods${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        fiscalYearId: query?.fiscalYearId,
        periodType: query?.periodType,
        status: query?.status,
        dateFrom: query?.dateFrom,
        dateTo: query?.dateTo,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createFiscalPeriod: (payload: CreateFiscalPeriodPayload) =>
    request<FiscalPeriodListItem>("/fiscal-periods", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateFiscalPeriod: (
    fiscalPeriodId: string,
    payload: UpdateFiscalPeriodPayload,
  ) =>
    request<FiscalPeriodListItem>(`/fiscal-periods/${fiscalPeriodId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteFiscalPeriod: (fiscalPeriodId: string) =>
    request<DeleteEntityResponse>(
      `/fiscal-periods/${fiscalPeriodId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listChartOfAccounts: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    accountType?: string;
    parentId?: number;
    branchId?: number;
    isHeader?: boolean;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<ChartOfAccountListItem>>(
      `/chart-of-accounts${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        accountType: query?.accountType,
        parentId: query?.parentId,
        branchId: query?.branchId,
        isHeader: query?.isHeader,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createChartOfAccount: (payload: CreateChartOfAccountPayload) =>
    request<ChartOfAccountListItem>("/chart-of-accounts", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateChartOfAccount: (
    accountId: string,
    payload: UpdateChartOfAccountPayload,
  ) =>
    request<ChartOfAccountListItem>(
      `/chart-of-accounts/${accountId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteChartOfAccount: (accountId: string) =>
    request<DeleteEntityResponse>(`/chart-of-accounts/${accountId}`, "DELETE", {
      withAuth: true,
    }),
  listJournalEntries: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    fiscalYearId?: number;
    fiscalPeriodId?: number;
    branchId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<JournalEntryListItem>>(
      `/journal-entries${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        fiscalYearId: query?.fiscalYearId,
        fiscalPeriodId: query?.fiscalPeriodId,
        branchId: query?.branchId,
        status: query?.status,
        dateFrom: query?.dateFrom,
        dateTo: query?.dateTo,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createJournalEntry: (payload: CreateJournalEntryPayload) =>
    request<JournalEntryListItem>("/journal-entries", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateJournalEntry: (
    journalEntryId: string,
    payload: UpdateJournalEntryPayload,
  ) =>
    request<JournalEntryListItem>(
      `/journal-entries/${journalEntryId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  approveJournalEntry: (journalEntryId: string) =>
    request<JournalEntryListItem>(
      `/journal-entries/${journalEntryId}/approve`,
      "PATCH",
      {
        withAuth: true,
      },
    ),
  postJournalEntry: (journalEntryId: string) =>
    request<JournalEntryListItem>(
      `/journal-entries/${journalEntryId}/post`,
      "PATCH",
      {
        withAuth: true,
      },
    ),
  reverseJournalEntry: (journalEntryId: string, reason: string) =>
    request<JournalEntryListItem>(
      `/journal-entries/${journalEntryId}/reverse`,
      "POST",
      {
        withAuth: true,
        json: { reason },
      },
    ),
  deleteJournalEntry: (journalEntryId: string) =>
    request<DeleteEntityResponse>(
      `/journal-entries/${journalEntryId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listPaymentGateways: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    gatewayType?: PaymentGatewayType;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<PaymentGatewayListItem>>(
      `/payment-gateways${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        gatewayType: query?.gatewayType,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createPaymentGateway: (payload: CreatePaymentGatewayPayload) =>
    request<PaymentGatewayListItem>("/payment-gateways", "POST", {
      withAuth: true,
      json: payload,
    }),
  updatePaymentGateway: (
    gatewayId: number,
    payload: UpdatePaymentGatewayPayload,
  ) =>
    request<PaymentGatewayListItem>(`/payment-gateways/${gatewayId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deletePaymentGateway: (gatewayId: number) =>
    request<DeleteEntityResponse>(`/payment-gateways/${gatewayId}`, "DELETE", {
      withAuth: true,
    }),
  listPaymentTransactions: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    gatewayId?: number;
    enrollmentId?: string;
    status?: PaymentTransactionStatus;
  }) =>
    request<PaginatedResponse<PaymentTransactionListItem>>(
      `/payment-transactions${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        gatewayId: query?.gatewayId,
        enrollmentId: query?.enrollmentId,
        status: query?.status,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createPaymentTransaction: (payload: CreatePaymentTransactionPayload) =>
    request<PaymentTransactionListItem>("/payment-transactions", "POST", {
      withAuth: true,
      json: payload,
    }),
  updatePaymentTransaction: (
    paymentTransactionId: string,
    payload: UpdatePaymentTransactionPayload,
  ) =>
    request<PaymentTransactionListItem>(
      `/payment-transactions/${paymentTransactionId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  completeAndReconcilePaymentTransaction: (paymentTransactionId: string) =>
    request<PaymentTransactionListItem>(
      `/payment-transactions/${paymentTransactionId}/complete-and-reconcile`,
      "POST",
      {
        withAuth: true,
      },
    ),
  simulatePaymentTransaction: (payload?: PaymentTransactionActionPayload) =>
    request<PaymentTransactionListItem>("/payment-transactions/simulate", "POST", {
      withAuth: true,
      json: payload ?? {},
    }),
  reconcilePaymentTransaction: (
    paymentTransactionId: string,
    payload?: PaymentTransactionActionPayload,
  ) =>
    request<PaymentTransactionListItem>(
      `/payment-transactions/${paymentTransactionId}/reconcile`,
      "POST",
      {
        withAuth: true,
        json: payload ?? {},
      },
    ),
  deletePaymentTransaction: (paymentTransactionId: string) =>
    request<DeleteEntityResponse>(
      `/payment-transactions/${paymentTransactionId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listBankReconciliations: (query?: {
    page?: number;
    limit?: number;
    bankAccountId?: number;
    status?: BankReconciliationStatus;
    dateFrom?: string;
    dateTo?: string;
  }) =>
    request<PaginatedResponse<BankReconciliationListItem>>(
      `/bank-reconciliations${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        bankAccountId: query?.bankAccountId,
        status: query?.status,
        dateFrom: query?.dateFrom,
        dateTo: query?.dateTo,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createBankReconciliation: (payload: CreateBankReconciliationPayload) =>
    request<BankReconciliationListItem>("/bank-reconciliations", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateBankReconciliation: (
    reconciliationId: string,
    payload: UpdateBankReconciliationPayload,
  ) =>
    request<BankReconciliationListItem>(
      `/bank-reconciliations/${reconciliationId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  autoMatchBankReconciliationTransactions: (reconciliationId: string) =>
    request<BankReconciliationAutoMatchResponse>(
      `/bank-reconciliations/${reconciliationId}/auto-match-transactions`,
      "POST",
      {
        withAuth: true,
      },
    ),
  deleteBankReconciliation: (reconciliationId: string) =>
    request<DeleteEntityResponse>(
      `/bank-reconciliations/${reconciliationId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listFeeStructures: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    academicYearId?: string;
    gradeLevelId?: string;
    feeType?: FeeType;
    currencyId?: number;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<FeeStructureListItem>>(
      `/fee-structures${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        academicYearId: query?.academicYearId,
        gradeLevelId: query?.gradeLevelId,
        feeType: query?.feeType,
        currencyId: query?.currencyId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createFeeStructure: (payload: CreateFeeStructurePayload) =>
    request<FeeStructureListItem>("/fee-structures", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateFeeStructure: (
    feeStructureId: string,
    payload: UpdateFeeStructurePayload,
  ) =>
    request<FeeStructureListItem>(`/fee-structures/${feeStructureId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteFeeStructure: (feeStructureId: string) =>
    request<DeleteEntityResponse>(`/fee-structures/${feeStructureId}`, "DELETE", {
      withAuth: true,
    }),
  listDiscountRules: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    discountType?: DiscountType;
    appliesToFeeType?: DiscountAppliesToFeeType;
    academicYearId?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<DiscountRuleListItem>>(
      `/discount-rules${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        discountType: query?.discountType,
        appliesToFeeType: query?.appliesToFeeType,
        academicYearId: query?.academicYearId,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createDiscountRule: (payload: CreateDiscountRulePayload) =>
    request<DiscountRuleListItem>("/discount-rules", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateDiscountRule: (
    discountRuleId: string,
    payload: UpdateDiscountRulePayload,
  ) =>
    request<DiscountRuleListItem>(`/discount-rules/${discountRuleId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteDiscountRule: (discountRuleId: string) =>
    request<DeleteEntityResponse>(
      `/discount-rules/${discountRuleId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listTaxConfigurations: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    taxType?: TaxType;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<TaxConfigurationListItem>>(
      `/tax-configurations${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        taxType: query?.taxType,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createTaxConfiguration: (payload: CreateTaxConfigurationPayload) =>
    request<TaxConfigurationListItem>("/tax-configurations", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateTaxConfiguration: (
    taxConfigurationId: number,
    payload: UpdateTaxConfigurationPayload,
  ) =>
    request<TaxConfigurationListItem>(
      `/tax-configurations/${taxConfigurationId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteTaxConfiguration: (taxConfigurationId: number) =>
    request<DeleteEntityResponse>(
      `/tax-configurations/${taxConfigurationId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listStudentInvoices: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    enrollmentId?: string;
    academicYearId?: string;
    branchId?: number;
    currencyId?: number;
    status?: InvoiceStatus;
  }) =>
    request<PaginatedResponse<StudentInvoiceListItem>>(
      `/student-invoices${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        enrollmentId: query?.enrollmentId,
        academicYearId: query?.academicYearId,
        branchId: query?.branchId,
        currencyId: query?.currencyId,
        status: query?.status,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createStudentInvoice: (payload: CreateStudentInvoicePayload) =>
    request<StudentInvoiceListItem>("/student-invoices", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateStudentInvoice: (
    invoiceId: string,
    payload: UpdateStudentInvoicePayload,
  ) =>
    request<StudentInvoiceListItem>(`/student-invoices/${invoiceId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteStudentInvoice: (invoiceId: string) =>
    request<DeleteEntityResponse>(`/student-invoices/${invoiceId}`, "DELETE", {
      withAuth: true,
    }),
  listInvoiceInstallments: (query?: {
    page?: number;
    limit?: number;
    invoiceId?: string;
    status?: InstallmentStatus;
    dueDateFrom?: string;
    dueDateTo?: string;
  }) =>
    request<PaginatedResponse<InvoiceInstallmentListItem>>(
      `/invoice-installments${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        invoiceId: query?.invoiceId,
        status: query?.status,
        dueDateFrom: query?.dueDateFrom,
        dueDateTo: query?.dueDateTo,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createInvoiceInstallment: (payload: CreateInvoiceInstallmentPayload) =>
    request<InvoiceInstallmentListItem>("/invoice-installments", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateInvoiceInstallment: (
    installmentId: string,
    payload: UpdateInvoiceInstallmentPayload,
  ) =>
    request<InvoiceInstallmentListItem>(
      `/invoice-installments/${installmentId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteInvoiceInstallment: (installmentId: string) =>
    request<DeleteEntityResponse>(
      `/invoice-installments/${installmentId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  bulkGenerateBilling: (payload: BillingEngineBulkGeneratePayload) =>
    request<BillingEngineBulkGenerateResponse>(
      "/billing/bulk-generate",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  getBillingDefaults: () =>
    request<BillingEngineDefaultsResponse>("/billing/defaults", "GET", {
      withAuth: true,
    }),
  applySiblingDiscount: (payload: BillingEngineApplySiblingDiscountPayload) =>
    request<BillingEngineSiblingDiscountResponse>(
      "/billing/apply-sibling-discount",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  getStudentStatement: (enrollmentId: string) =>
    request<BillingEngineStudentStatementResponse>(
      `/billing/student-statement/${enrollmentId}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getFamilyBalance: (guardianId: string) =>
    request<BillingEngineFamilyBalanceResponse>(
      `/billing/family-balance/${guardianId}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  processBillingWithdrawal: (payload: BillingEngineProcessWithdrawalPayload) =>
    request<BillingEngineWithdrawalResponse>(
      "/billing/process-withdrawal",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  listBudgets: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: BudgetStatus;
    budgetType?: BudgetType;
    fiscalYearId?: number;
    branchId?: number;
  }) =>
    request<PaginatedResponse<BudgetListItem>>(
      `/budgets${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        status: query?.status,
        budgetType: query?.budgetType,
        fiscalYearId: query?.fiscalYearId,
        branchId: query?.branchId,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createBudget: (payload: CreateBudgetPayload) =>
    request<BudgetListItem>("/budgets", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateBudget: (budgetId: number, payload: UpdateBudgetPayload) =>
    request<BudgetListItem>(`/budgets/${budgetId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  approveBudget: (budgetId: number) =>
    request<BudgetListItem>(`/budgets/${budgetId}/approve`, "PATCH", {
      withAuth: true,
    }),
  deleteBudget: (budgetId: number) =>
    request<DeleteEntityResponse>(`/budgets/${budgetId}`, "DELETE", {
      withAuth: true,
    }),
  getBudgetVsActual: (budgetId: number) =>
    request<BudgetVsActualReportResponse>(
      `/budgets/${budgetId}/budget-vs-actual`,
      "GET",
      {
        withAuth: true,
      },
    ),
  listCostCenters: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    branchId?: number;
  }) =>
    request<PaginatedResponse<CostCenterListItem>>(
      `/cost-centers${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
        branchId: query?.branchId,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createCostCenter: (payload: CreateCostCenterPayload) =>
    request<CostCenterListItem>("/cost-centers", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateCostCenter: (costCenterId: number, payload: UpdateCostCenterPayload) =>
    request<CostCenterListItem>(`/cost-centers/${costCenterId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteCostCenter: (costCenterId: number) =>
    request<DeleteEntityResponse>(`/cost-centers/${costCenterId}`, "DELETE", {
      withAuth: true,
    }),
  listCreditDebitNotes: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    noteType?: CreditDebitNoteType;
    status?: CreditDebitNoteStatus;
    reason?: CreditDebitNoteReason;
  }) =>
    request<PaginatedResponse<CreditDebitNoteListItem>>(
      `/credit-debit-notes${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        noteType: query?.noteType,
        status: query?.status,
        reason: query?.reason,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createCreditDebitNote: (payload: CreateCreditDebitNotePayload) =>
    request<CreditDebitNoteListItem>("/credit-debit-notes", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateCreditDebitNote: (
    noteId: string,
    payload: UpdateCreditDebitNotePayload,
  ) =>
    request<CreditDebitNoteListItem>(`/credit-debit-notes/${noteId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  approveCreditDebitNote: (noteId: string) =>
    request<CreditDebitNoteListItem>(
      `/credit-debit-notes/${noteId}/approve`,
      "PATCH",
      {
        withAuth: true,
      },
    ),
  applyCreditDebitNote: (noteId: string) =>
    request<CreditDebitNoteListItem>(`/credit-debit-notes/${noteId}/apply`, "PATCH", {
      withAuth: true,
    }),
  deleteCreditDebitNote: (noteId: string) =>
    request<DeleteEntityResponse>(`/credit-debit-notes/${noteId}`, "DELETE", {
      withAuth: true,
    }),
  listRecurringJournals: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    frequency?: RecurringFrequency;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<RecurringJournalListItem>>(
      `/recurring-journals${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        frequency: query?.frequency,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createRecurringJournal: (payload: CreateRecurringJournalPayload) =>
    request<RecurringJournalListItem>("/recurring-journals", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateRecurringJournal: (
    recurringJournalId: number,
    payload: UpdateRecurringJournalPayload,
  ) =>
    request<RecurringJournalListItem>(
      `/recurring-journals/${recurringJournalId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  generateRecurringJournal: (recurringJournalId: number) =>
    request<RecurringJournalGenerateResponse>(
      `/recurring-journals/${recurringJournalId}/generate`,
      "POST",
      {
        withAuth: true,
      },
    ),
  deleteRecurringJournal: (recurringJournalId: number) =>
    request<DeleteEntityResponse>(
      `/recurring-journals/${recurringJournalId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  getTrialBalanceReport: (query?: {
    fiscalYearId?: string;
    fiscalPeriodId?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<TrialBalanceReportResponse>(
      `/reports/trial-balance${buildQueryString({
        fiscalYearId: query?.fiscalYearId,
        fiscalPeriodId: query?.fiscalPeriodId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getGeneralLedgerReport: (query?: {
    accountId?: string;
    fiscalYearId?: string;
    fiscalPeriodId?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<GeneralLedgerReportResponse>(
      `/reports/general-ledger${buildQueryString({
        accountId: query?.accountId,
        fiscalYearId: query?.fiscalYearId,
        fiscalPeriodId: query?.fiscalPeriodId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getAccountSummaryReport: (query?: {
    accountId?: string;
    fiscalYearId?: string;
    fiscalPeriodId?: string;
  }) =>
    request<AccountSummaryReportResponse>(
      `/reports/account-summary${buildQueryString({
        accountId: query?.accountId,
        fiscalYearId: query?.fiscalYearId,
        fiscalPeriodId: query?.fiscalPeriodId,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getIncomeStatementReport: (query?: {
    fiscalYearId?: string;
    fiscalPeriodId?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<IncomeStatementReportResponse>(
      `/reports/income-statement${buildQueryString({
        fiscalYearId: query?.fiscalYearId,
        fiscalPeriodId: query?.fiscalPeriodId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getBalanceSheetReport: (query?: {
    fiscalYearId?: string;
    fiscalPeriodId?: string;
    asOfDate?: string;
  }) =>
    request<BalanceSheetReportResponse>(
      `/reports/balance-sheet${buildQueryString({
        fiscalYearId: query?.fiscalYearId,
        fiscalPeriodId: query?.fiscalPeriodId,
        asOfDate: query?.asOfDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getStudentAccountStatementReport: (query?: {
    studentId?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<StudentAccountStatementReportResponse>(
      `/reports/student-account-statement${buildQueryString({
        studentId: query?.studentId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getVatReport: (query?: {
    fiscalYearId?: string;
    fiscalPeriodId?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<VatReportResponse>(
      `/reports/vat-report${buildQueryString({
        fiscalYearId: query?.fiscalYearId,
        fiscalPeriodId: query?.fiscalPeriodId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getAccountsReceivableAgingReport: (query?: {
    asOfDate?: string;
    studentId?: string;
  }) =>
    request<AccountsReceivableAgingReportResponse>(
      `/reports/accounts-receivable-aging${buildQueryString({
        asOfDate: query?.asOfDate,
        studentId: query?.studentId,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  getFinancialBudgetVsActualReport: (query?: {
    budgetId?: string;
    fiscalYearId?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<BudgetVsActualReportResponse>(
      `/reports/budget-vs-actual${buildQueryString({
        budgetId: query?.budgetId,
        fiscalYearId: query?.fiscalYearId,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  listAuditTrail: (query?: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<PaginatedResponse<FinancialAuditTrailListItem>>(
      `/audit-trail${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        action: query?.action,
        entity: query?.entity,
        status: query?.status,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  listFinancialFunds: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<FinancialFundListItem>>(
      `/financial-funds${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createFinancialFund: (payload: CreateFinancialFundPayload) =>
    request<FinancialFundListItem>("/financial-funds", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateFinancialFund: (
    fundId: string,
    payload: UpdateFinancialFundPayload,
  ) =>
    request<FinancialFundListItem>(`/financial-funds/${fundId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteFinancialFund: (fundId: string) =>
    request<DeleteEntityResponse>(`/financial-funds/${fundId}`, "DELETE", {
      withAuth: true,
    }),
  listFinancialCategories: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryType?: string;
    isActive?: boolean;
  }) =>
    request<PaginatedResponse<FinancialCategoryListItem>>(
      `/financial-categories${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        categoryType: query?.categoryType,
        isActive: query?.isActive,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createFinancialCategory: (payload: CreateFinancialCategoryPayload) =>
    request<FinancialCategoryListItem>("/financial-categories", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateFinancialCategory: (
    categoryId: string,
    payload: UpdateFinancialCategoryPayload,
  ) =>
    request<FinancialCategoryListItem>(
      `/financial-categories/${categoryId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteFinancialCategory: (categoryId: string) =>
    request<DeleteEntityResponse>(
      `/financial-categories/${categoryId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
  listRevenues: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    fundId?: string;
    currencyId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<PaginatedResponse<RevenueListItem>>(
      `/revenues${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        categoryId: query?.categoryId,
        fundId: query?.fundId,
        currencyId: query?.currencyId,
        status: query?.status,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createRevenue: (payload: CreateRevenuePayload) =>
    request<RevenueListItem>("/revenues", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateRevenue: (revenueId: string, payload: UpdateRevenuePayload) =>
    request<RevenueListItem>(`/revenues/${revenueId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  deleteRevenue: (revenueId: string) =>
    request<DeleteEntityResponse>(`/revenues/${revenueId}`, "DELETE", {
      withAuth: true,
    }),
  listExpenses: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    fundId?: string;
    currencyId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<PaginatedResponse<ExpenseListItem>>(
      `/expenses${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        categoryId: query?.categoryId,
        fundId: query?.fundId,
        currencyId: query?.currencyId,
        status: query?.status,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createExpense: (payload: CreateExpensePayload) =>
    request<ExpenseListItem>("/expenses", "POST", {
      withAuth: true,
      json: payload,
    }),
  updateExpense: (expenseId: string, payload: UpdateExpensePayload) =>
    request<ExpenseListItem>(`/expenses/${expenseId}`, "PATCH", {
      withAuth: true,
      json: payload,
    }),
  approveExpense: (expenseId: string) =>
    request<ExpenseListItem>(`/expenses/${expenseId}/approve`, "POST", {
      withAuth: true,
    }),
  deleteExpense: (expenseId: string) =>
    request<DeleteEntityResponse>(`/expenses/${expenseId}`, "DELETE", {
      withAuth: true,
    }),
  listCommunityContributions: (query?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    request<PaginatedResponse<CommunityContributionListItem>>(
      `/community-contributions${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        status: query?.status,
        fromDate: query?.fromDate,
        toDate: query?.toDate,
      })}`,
      "GET",
      {
        withAuth: true,
      },
    ),
  createCommunityContribution: (payload: CreateCommunityContributionPayload) =>
    request<CommunityContributionListItem>(
      "/community-contributions",
      "POST",
      {
        withAuth: true,
        json: payload,
      },
    ),
  updateCommunityContribution: (
    contributionId: string,
    payload: UpdateCommunityContributionPayload,
  ) =>
    request<CommunityContributionListItem>(
      `/community-contributions/${contributionId}`,
      "PATCH",
      {
        withAuth: true,
        json: payload,
      },
    ),
  deleteCommunityContribution: (contributionId: string) =>
    request<DeleteEntityResponse>(
      `/community-contributions/${contributionId}`,
      "DELETE",
      {
        withAuth: true,
      },
    ),
};

