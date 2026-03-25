"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import Link from "next/link";
import {
  BadgeDollarSign,
  Briefcase,
  Calendar,
  GraduationCap,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneContactInput } from "@/components/ui/phone-contact-input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useGeographyOptionsQuery } from "@/features/lookup-catalog/hooks/use-geography-options-query";
import {
  buildGeographyMaps,
  formatLocalityHierarchyLabel,
  resolveSelectionFromLocality,
} from "@/features/lookup-catalog/lib/geography";
import {
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useUpdateEmployeeMutation,
} from "@/features/employees/hooks/use-employees-mutations";
import { useGenderOptionsQuery } from "@/features/employees/hooks/use-gender-options-query";
import { useIdTypeOptionsQuery } from "@/features/employees/hooks/use-id-type-options-query";
import { useJobRoleOptionsQuery } from "@/features/employees/hooks/use-job-role-options-query";
import { useEmployeesQuery } from "@/features/employees/hooks/use-employees-query";
import { useQualificationOptionsQuery } from "@/features/employees/hooks/use-qualification-options-query";
import {
  translateEmployeeGender,
  translateEmployeeSystemAccessStatus,
  translateEmploymentType,
  translateRoleCode,
} from "@/lib/i18n/ar";
import type {
  EmployeeGender,
  EmployeeListItem,
  EmployeeSystemAccessStatus,
  EmploymentType,
  LookupCatalogListItem,
  OperationalReadinessFilter,
} from "@/lib/api/client";

type EmployeeFormState = {
  jobNumber: string;
  financialNumber: string;
  fullName: string;
  genderId: string;
  birthDate: string;
  phonePrimary: string;
  phoneSecondary: string;
  hasWhatsapp: boolean;
  qualificationId: string;
  qualificationDate: string;
  specialization: string;
  idNumber: string;
  idTypeId: string;
  localityId: string;
  idExpiryDate: string;
  experienceYears: string;
  employmentType: EmploymentType | "";
  jobRoleId: string;
  hireDate: string;
  previousSchool: string;
  salaryApproved: boolean;
  systemAccessStatus: EmployeeSystemAccessStatus;
  isActive: boolean;
};

type EmployeeFilterDraft = {
  gender: string;
  employmentType: EmploymentType | "all";
  idType: string;
  locality: string;
  qualification: string;
  jobRole: string;
  active: "all" | "active" | "inactive";
  operationalReadiness: OperationalReadinessFilter | "all";
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: EmployeeFormState = {
  jobNumber: "",
  financialNumber: "",
  fullName: "",
  genderId: "",
  birthDate: "",
  phonePrimary: "",
  phoneSecondary: "",
  hasWhatsapp: true,
  qualificationId: "",
  qualificationDate: "",
  specialization: "",
  idNumber: "",
  idTypeId: "",
  localityId: "",
  idExpiryDate: "",
  experienceYears: "0",
  employmentType: "",
  jobRoleId: "",
  hireDate: "",
  previousSchool: "",
  salaryApproved: false,
  systemAccessStatus: "GRANTED",
  isActive: true,
};

const DEFAULT_FILTER_DRAFT: EmployeeFilterDraft = {
  gender: "all",
  employmentType: "all",
  idType: "all",
  locality: "all",
  qualification: "all",
  jobRole: "all",
  active: "all",
  operationalReadiness: "all",
};

const EMPLOYEE_GENDER_CODES: EmployeeGender[] = ["MALE", "FEMALE", "OTHER"];

function isEmployeeGenderCode(value: string): value is EmployeeGender {
  return EMPLOYEE_GENDER_CODES.includes(value as EmployeeGender);
}

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toDateInput(isoDate: string | null): string {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toDateIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function resolveOperationalReadiness(employee: EmployeeListItem): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  if (!employee.userAccount) {
    return {
      label: "غير جاهز: بدون حساب",
      variant: "outline",
    };
  }

  const activeRolesCount = employee.userAccount.userRoles.filter(
    (item) => item.role.isActive,
  ).length;
  if (activeRolesCount === 0) {
    return {
      label: "غير جاهز: بدون أدوار",
      variant: "outline",
    };
  }

  const hasOperationalScope =
    employee.operationalScope.activeTeachingAssignments > 0 ||
    employee.operationalScope.activeSectionSupervisions > 0;

  if (!hasOperationalScope) {
    return {
      label: "جاهزية جزئية: بدون نطاق",
      variant: "secondary",
    };
  }

  return {
    label: "جاهز تشغيليًا",
    variant: "default",
  };
}

type LocalityLabelInput = {
  id: number;
  nameAr?: string;
  name?: string;
  localityType?: "RURAL" | "URBAN";
  directorateId?: number | null;
  villageId?: number | null;
};

function toFormState(employee: EmployeeListItem): EmployeeFormState {
  return {
    jobNumber: employee.jobNumber ?? "",
    financialNumber: employee.financialNumber ?? "",
    fullName: employee.fullName,
    genderId: employee.genderId ? String(employee.genderId) : "",
    birthDate: toDateInput(employee.birthDate),
    phonePrimary: employee.phonePrimary ?? "",
    phoneSecondary: employee.phoneSecondary ?? "",
    hasWhatsapp: employee.hasWhatsapp,
    qualificationId: employee.qualificationId
      ? String(employee.qualificationId)
      : "",
    qualificationDate: toDateInput(employee.qualificationDate),
    specialization: employee.specialization ?? "",
    idNumber: employee.idNumber ?? "",
    idTypeId: employee.idTypeId ? String(employee.idTypeId) : "",
    localityId: employee.localityId ? String(employee.localityId) : "",
    idExpiryDate: toDateInput(employee.idExpiryDate),
    experienceYears: String(employee.experienceYears),
    employmentType: employee.employmentType ?? "",
    jobRoleId: employee.jobRoleId ? String(employee.jobRoleId) : "",
    hireDate: toDateInput(employee.hireDate),
    previousSchool: employee.previousSchool ?? "",
    salaryApproved: employee.salaryApproved,
    systemAccessStatus: employee.systemAccessStatus,
    isActive: employee.isActive,
  };
}

export function EmployeesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employees.create");
  const canUpdate = hasPermission("employees.update");
  const canDelete = hasPermission("employees.delete");
  const canReadIdTypes = hasPermission("lookup-id-types.read");
  const canReadGenders = hasPermission("lookup-genders.read");
  const canReadQualifications = hasPermission("lookup-qualifications.read");
  const canReadJobRoles = hasPermission("lookup-job-roles.read");
  const canReadLocalities = hasPermission("localities.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<string>("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = React.useState<
    EmploymentType | "all"
  >("all");
  const [idTypeFilter, setIdTypeFilter] = React.useState<string>("all");
  const [localityFilter, setLocalityFilter] = React.useState<string>("all");
  const [qualificationFilter, setQualificationFilter] =
    React.useState<string>("all");
  const [jobRoleFilter, setJobRoleFilter] = React.useState<string>("all");
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "active" | "inactive"
  >("all");
  const [operationalReadinessFilter, setOperationalReadinessFilter] =
    React.useState<OperationalReadinessFilter | "all">("all");
  const [filterDraft, setFilterDraft] =
    React.useState<EmployeeFilterDraft>(DEFAULT_FILTER_DRAFT);

  const [editingEmployeeId, setEditingEmployeeId] = React.useState<
    string | null
  >(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] =
    React.useState<EmployeeFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [formGovernorateId, setFormGovernorateId] = React.useState<string>("");
  const [formDirectorateId, setFormDirectorateId] = React.useState<string>("");
  const [formSubDistrictId, setFormSubDistrictId] = React.useState<string>("");
  const [formVillageId, setFormVillageId] = React.useState<string>("");

  const employeesQuery = useEmployeesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    genderId: genderFilter === "all" ? undefined : Number(genderFilter),
    employmentType:
      employmentTypeFilter === "all" ? undefined : employmentTypeFilter,
    idTypeId: idTypeFilter === "all" ? undefined : Number(idTypeFilter),
    localityId: localityFilter === "all" ? undefined : Number(localityFilter),
    qualificationId:
      qualificationFilter === "all" ? undefined : Number(qualificationFilter),
    jobRoleId: jobRoleFilter === "all" ? undefined : Number(jobRoleFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    operationalReadiness:
      operationalReadinessFilter === "all"
        ? undefined
        : operationalReadinessFilter,
  });
  const idTypeOptionsQuery = useIdTypeOptionsQuery();
  const genderOptionsQuery = useGenderOptionsQuery();
  const geographyOptionsQuery = useGeographyOptionsQuery("employees");
  const qualificationOptionsQuery = useQualificationOptionsQuery();
  const jobRoleOptionsQuery = useJobRoleOptionsQuery();

  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const deleteMutation = useDeleteEmployeeMutation();

  const employees = React.useMemo(
    () => employeesQuery.data?.data ?? [],
    [employeesQuery.data?.data],
  );
  const idTypeOptions = React.useMemo(
    () => idTypeOptionsQuery.data ?? [],
    [idTypeOptionsQuery.data],
  );
  const genderOptions = React.useMemo(
    () => genderOptionsQuery.data ?? [],
    [genderOptionsQuery.data],
  );
  const governorateOptions = React.useMemo(
    () => geographyOptionsQuery.data?.governorates ?? [],
    [geographyOptionsQuery.data?.governorates],
  );
  const directorateOptions = React.useMemo(
    () => geographyOptionsQuery.data?.directorates ?? [],
    [geographyOptionsQuery.data?.directorates],
  );
  const subDistrictOptions = React.useMemo(
    () => geographyOptionsQuery.data?.subDistricts ?? [],
    [geographyOptionsQuery.data?.subDistricts],
  );
  const villageOptions = React.useMemo(
    () => geographyOptionsQuery.data?.villages ?? [],
    [geographyOptionsQuery.data?.villages],
  );
  const localityOptions = React.useMemo(
    () => geographyOptionsQuery.data?.localities ?? [],
    [geographyOptionsQuery.data?.localities],
  );
  const geographyMaps = React.useMemo(
    () =>
      buildGeographyMaps({
        governorates: governorateOptions,
        directorates: directorateOptions,
        subDistricts: subDistrictOptions,
        villages: villageOptions,
        localities: localityOptions,
      }),
    [
      directorateOptions,
      governorateOptions,
      localityOptions,
      subDistrictOptions,
      villageOptions,
    ],
  );
  const hasGeographyHierarchy = React.useMemo(
    () => governorateOptions.length > 0 && directorateOptions.length > 0,
    [directorateOptions.length, governorateOptions.length],
  );
  const filteredDirectorates = React.useMemo(() => {
    if (!formGovernorateId) {
      return [];
    }

    const governorateId = Number(formGovernorateId);
    return directorateOptions.filter(
      (item) => item.governorateId === governorateId,
    );
  }, [directorateOptions, formGovernorateId]);
  const filteredSubDistricts = React.useMemo(() => {
    if (!formDirectorateId) {
      return [];
    }

    const directorateId = Number(formDirectorateId);
    return subDistrictOptions.filter(
      (item) => item.directorateId === directorateId,
    );
  }, [formDirectorateId, subDistrictOptions]);
  const filteredVillages = React.useMemo(() => {
    if (!formSubDistrictId) {
      return [];
    }

    const subDistrictId = Number(formSubDistrictId);
    return villageOptions.filter(
      (item) => item.subDistrictId === subDistrictId,
    );
  }, [formSubDistrictId, villageOptions]);
  const filteredLocalities = React.useMemo(() => {
    if (!formDirectorateId) {
      return [];
    }

    const directorateId = Number(formDirectorateId);
    const selectedVillageId = formVillageId ? Number(formVillageId) : null;

    return localityOptions.filter((item) => {
      if (item.localityType === "URBAN") {
        return item.directorateId === directorateId;
      }

      if (!selectedVillageId) {
        return false;
      }

      return item.villageId === selectedVillageId;
    });
  }, [formDirectorateId, formVillageId, localityOptions]);
  const formSelectedLocality = React.useMemo(
    () =>
      formState.localityId
        ? geographyMaps.localityById.get(Number(formState.localityId))
        : undefined,
    [formState.localityId, geographyMaps],
  );
  const qualificationOptions = React.useMemo(
    () => qualificationOptionsQuery.data ?? [],
    [qualificationOptionsQuery.data],
  );
  const jobRoleOptions = React.useMemo(
    () => jobRoleOptionsQuery.data ?? [],
    [jobRoleOptionsQuery.data],
  );
  const pagination = employeesQuery.data?.pagination;
  const isEditing = editingEmployeeId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      gender: genderFilter,
      employmentType: employmentTypeFilter,
      idType: idTypeFilter,
      locality: localityFilter,
      qualification: qualificationFilter,
      jobRole: jobRoleFilter,
      active: activeFilter,
      operationalReadiness: operationalReadinessFilter,
    });
  }, [
    activeFilter,
    employmentTypeFilter,
    genderFilter,
    idTypeFilter,
    isFilterOpen,
    jobRoleFilter,
    localityFilter,
    operationalReadinessFilter,
    qualificationFilter,
  ]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = employees.some(
      (employee) => employee.id === editingEmployeeId,
    );
    if (!stillExists) {
      setEditingEmployeeId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setFormGovernorateId("");
      setFormDirectorateId("");
      setFormSubDistrictId("");
      setFormVillageId("");
      setIsFormOpen(false);
    }
  }, [editingEmployeeId, employees, isEditing]);

  React.useEffect(() => {
    if (isEditing || formState.genderId || !canReadGenders) {
      return;
    }

    if (genderOptions.length === 0) {
      return;
    }

    const preferred = genderOptions.find((option) => option.code === "MALE");
    const defaultGender = preferred ?? genderOptions[0];
    setFormState((prev) =>
      prev.genderId
        ? prev
        : {
            ...prev,
            genderId: String(defaultGender.id),
          },
    );
  }, [canReadGenders, formState.genderId, genderOptions, isEditing]);

  React.useEffect(() => {
    if (!formState.localityId) {
      return;
    }

    const locality = geographyMaps.localityById.get(
      Number(formState.localityId),
    );
    const selection = resolveSelectionFromLocality(locality, geographyMaps);

    if (selection.governorateId !== formGovernorateId) {
      setFormGovernorateId(selection.governorateId);
    }

    if (selection.directorateId !== formDirectorateId) {
      setFormDirectorateId(selection.directorateId);
    }

    if (selection.subDistrictId !== formSubDistrictId) {
      setFormSubDistrictId(selection.subDistrictId);
    }

    if (selection.villageId !== formVillageId) {
      setFormVillageId(selection.villageId);
    }
  }, [
    formDirectorateId,
    formGovernorateId,
    formState.localityId,
    formSubDistrictId,
    formVillageId,
    geographyMaps,
  ]);

  const resetForm = () => {
    setEditingEmployeeId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setFormGovernorateId("");
    setFormDirectorateId("");
    setFormSubDistrictId("");
    setFormVillageId("");
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setActionSuccess(null);
    setEditingEmployeeId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setFormGovernorateId("");
    setFormDirectorateId("");
    setFormSubDistrictId("");
    setFormVillageId("");
    setIsFormOpen(true);
  };

  const clearFilters = () => {
    setFilterDraft(DEFAULT_FILTER_DRAFT);
    setGenderFilter("all");
    setEmploymentTypeFilter("all");
    setIdTypeFilter("all");
    setLocalityFilter("all");
    setQualificationFilter("all");
    setJobRoleFilter("all");
    setActiveFilter("all");
    setOperationalReadinessFilter("all");
    setPage(1);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setGenderFilter(filterDraft.gender);
    setEmploymentTypeFilter(filterDraft.employmentType);
    setIdTypeFilter(filterDraft.idType);
    setLocalityFilter(filterDraft.locality);
    setQualificationFilter(filterDraft.qualification);
    setJobRoleFilter(filterDraft.jobRole);
    setActiveFilter(filterDraft.active);
    setOperationalReadinessFilter(filterDraft.operationalReadiness);
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleGovernorateChange = (value: string) => {
    setFormGovernorateId(value);
    setFormDirectorateId("");
    setFormSubDistrictId("");
    setFormVillageId("");
    setFormState((prev) => ({ ...prev, localityId: "" }));
  };

  const handleDirectorateChange = (value: string) => {
    setFormDirectorateId(value);
    setFormSubDistrictId("");
    setFormVillageId("");
    setFormState((prev) => ({ ...prev, localityId: "" }));
  };

  const handleSubDistrictChange = (value: string) => {
    setFormSubDistrictId(value);
    setFormVillageId("");
    setFormState((prev) => ({ ...prev, localityId: "" }));
  };

  const handleVillageChange = (value: string) => {
    setFormVillageId(value);
    setFormState((prev) => ({ ...prev, localityId: "" }));
  };

  const handleLocalityChange = (value: string) => {
    setFormState((prev) => ({ ...prev, localityId: value }));
  };

  const validateForm = (): boolean => {
    if (!formState.fullName.trim()) {
      setFormError("الاسم الكامل مطلوب.");
      return false;
    }

    if (!formState.genderId) {
      setFormError("الجنس مطلوب.");
      return false;
    }

    const experienceYears = Number(formState.experienceYears);
    if (
      !Number.isInteger(experienceYears) ||
      experienceYears < 0 ||
      experienceYears > 80
    ) {
      setFormError("سنوات الخبرة يجب أن تكون رقمًا صحيحًا بين 0 و80.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const selectedGender = genderOptions.find(
      (option) => option.id === Number(formState.genderId),
    );
    const selectedQualification = qualificationOptions.find(
      (option) => option.id === Number(formState.qualificationId),
    );
    const selectedJobRole = jobRoleOptions.find(
      (option) => option.id === Number(formState.jobRoleId),
    );
    const mappedGender =
      selectedGender?.code && isEmployeeGenderCode(selectedGender.code)
        ? selectedGender.code
        : undefined;

    const payload = {
      jobNumber: toOptionalString(formState.jobNumber),
      financialNumber: toOptionalString(formState.financialNumber),
      fullName: formState.fullName.trim(),
      gender: mappedGender,
      genderId: formState.genderId ? Number(formState.genderId) : undefined,
      birthDate: formState.birthDate
        ? toDateIso(formState.birthDate)
        : undefined,
      phonePrimary: toOptionalString(formState.phonePrimary),
      phoneSecondary: toOptionalString(formState.phoneSecondary),
      hasWhatsapp: formState.hasWhatsapp,
      qualification: toOptionalString(selectedQualification?.nameAr ?? ""),
      qualificationId: formState.qualificationId
        ? Number(formState.qualificationId)
        : null,
      qualificationDate: formState.qualificationDate
        ? toDateIso(formState.qualificationDate)
        : undefined,
      specialization: toOptionalString(formState.specialization),
      idNumber: toOptionalString(formState.idNumber),
      idTypeId: formState.idTypeId ? Number(formState.idTypeId) : null,
      localityId: formState.localityId ? Number(formState.localityId) : null,
      idExpiryDate: formState.idExpiryDate
        ? toDateIso(formState.idExpiryDate)
        : undefined,
      experienceYears: Number(formState.experienceYears),
      employmentType: formState.employmentType || undefined,
      jobTitle: toOptionalString(
        selectedJobRole?.nameAr ?? selectedJobRole?.name ?? "",
      ),
      jobRoleId: formState.jobRoleId ? Number(formState.jobRoleId) : null,
      hireDate: formState.hireDate ? toDateIso(formState.hireDate) : undefined,
      previousSchool: toOptionalString(formState.previousSchool),
      salaryApproved: formState.salaryApproved,
      systemAccessStatus: formState.systemAccessStatus,
      isActive: formState.isActive,
    };

    if (isEditing && editingEmployeeId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: employees.update.");
        return;
      }

      updateMutation.mutate(
        {
          employeeId: editingEmployeeId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث الموظف بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: employees.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء الموظف بنجاح.");
      },
    });
  };

  const handleStartEdit = (employee: EmployeeListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingEmployeeId(employee.id);

    const nextState = toFormState(employee);
    if (!nextState.genderId) {
      const mapped = genderOptions.find(
        (option) => option.code === employee.gender,
      );
      if (mapped) {
        nextState.genderId = String(mapped.id);
      }
    }

    if (!nextState.localityId) {
      setFormGovernorateId("");
      setFormDirectorateId("");
      setFormSubDistrictId("");
      setFormVillageId("");
    } else {
      const locality = geographyMaps.localityById.get(
        Number(nextState.localityId),
      );
      const selection = resolveSelectionFromLocality(locality, geographyMaps);
      setFormGovernorateId(selection.governorateId);
      setFormDirectorateId(selection.directorateId);
      setFormSubDistrictId(selection.subDistrictId);
      setFormVillageId(selection.villageId);
    }

    setFormState(nextState);
    setIsFormOpen(true);
  };

  const handleToggleActive = (employee: EmployeeListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate(
      {
        employeeId: employee.id,
        payload: {
          isActive: !employee.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            employee.isActive
              ? "تم تعطيل الموظف بنجاح."
              : "تم تفعيل الموظف بنجاح.",
          );
        },
      },
    );
  };

  const handleDelete = (employee: EmployeeListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الموظف ${employee.fullName}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(employee.id, {
      onSuccess: () => {
        if (editingEmployeeId === employee.id) {
          resetForm();
        }
        setActionSuccess("تم حذف الموظف بنجاح.");
      },
    });
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      genderFilter,
      employmentTypeFilter,
      idTypeFilter,
      localityFilter,
      qualificationFilter,
      jobRoleFilter,
      activeFilter,
      operationalReadinessFilter,
    ].filter((value) => value !== "all").length;
  }, [
    activeFilter,
    employmentTypeFilter,
    genderFilter,
    idTypeFilter,
    jobRoleFilter,
    localityFilter,
    operationalReadinessFilter,
    qualificationFilter,
  ]);

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <SearchField
              containerClassName="min-w-0"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="ابحث عن موظف أو رقم وظيفي..."
            />
          </div>
          <div className="flex items-center justify-end">
            <FilterTriggerButton
              count={activeFiltersCount}
              className="px-3 sm:px-4"
              onClick={() => setIsFilterOpen((prev) => !prev)}
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة الموظفين"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="flex-1 gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                مسح
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1 gap-1.5">
                تطبيق
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>الجنس</Label>
              <SelectField
                value={filterDraft.gender}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    gender: event.target.value,
                  }))
                }
                disabled={!canReadGenders || genderOptionsQuery.isLoading}
                icon={<User className="h-4 w-4" />}
              >
                <option value="all">كل الأجناس</option>
                {genderOptions.map((option) => {
                  const translated =
                    option.code && isEmployeeGenderCode(option.code)
                      ? translateEmployeeGender(option.code)
                      : (option.nameAr ??
                        option.name ??
                        option.code ??
                        String(option.id));

                  return (
                    <option key={option.id} value={option.id}>
                      {option.nameAr ?? translated}
                    </option>
                  );
                })}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>نوع التوظيف</Label>
              <SelectField
                value={filterDraft.employmentType}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    employmentType: event.target.value as EmploymentType | "all",
                  }))
                }
                icon={<Briefcase className="h-4 w-4" />}
              >
                <option value="all">كل أنواع التوظيف</option>
                <option value="PERMANENT">
                  {translateEmploymentType("PERMANENT")}
                </option>
                <option value="CONTRACT">
                  {translateEmploymentType("CONTRACT")}
                </option>
                <option value="VOLUNTEER">
                  {translateEmploymentType("VOLUNTEER")}
                </option>
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>الجاهزية التشغيلية</Label>
              <SelectField
                value={filterDraft.operationalReadiness}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    operationalReadiness: event.target.value as
                      | OperationalReadinessFilter
                      | "all",
                  }))
                }
                icon={<PencilLine className="h-4 w-4" />}
              >
                <option value="all">كل حالات الجاهزية</option>
                <option value="READY">جاهز بالكامل</option>
                <option value="PARTIAL">جاهز جزئيًا</option>
                <option value="NOT_READY">غير جاهز</option>
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>الحالة</Label>
              <SelectField
                value={filterDraft.active}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    active: event.target.value as "all" | "active" | "inactive",
                  }))
                }
                icon={<LoaderCircle className="h-4 w-4" />}
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">غير نشط فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة الموظفين</CardTitle>
              <Badge variant="secondary">
                الإجمالي: {pagination?.total ?? 0}
              </Badge>
            </div>
            <CardDescription>إدارة بيانات الموظفين وصلاحيات الوصول للنظام.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {employeesQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground text-center">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {employees.map((employee) => {
              const readiness = resolveOperationalReadiness(employee);
              return (
                <div
                  key={employee.id}
                  className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4 transition-all hover:bg-background/80"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{employee.fullName}</p>
                        <Badge variant={readiness.variant} className="text-[10px] h-5">
                          {readiness.label}
                        </Badge>
                      </div>
                      <div className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 opacity-70" />
                          {employee.jobRoleLookup?.nameAr ?? employee.jobTitle ?? "-"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 opacity-70" />
                          الرقم الوظيفي: {employee.jobNumber ?? "-"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BadgeDollarSign className="h-3.5 w-3.5 opacity-70" />
                          الرقم المالي: {employee.financialNumber ?? "-"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5 opacity-70" />
                          {employee.qualificationLookup?.nameAr ?? "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">
                        {translateEmployeeGender(employee.gender)}
                      </Badge>
                      <Badge variant={employee.isActive ? "default" : "outline"}>
                        {employee.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      asChild
                      variant={employee.userAccount ? "secondary" : "default"}
                      size="sm"
                      className="rounded-xl h-8 px-4"
                    >
                      <Link href={`/app/users?q=${encodeURIComponent(employee.userAccount?.email ?? employee.fullName)}`}>
                        {employee.userAccount ? "إدارة الحساب" : "إنشاء حساب"}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-8 px-4 gap-1.5"
                      onClick={() => handleStartEdit(employee)}
                      disabled={!canUpdate || updateMutation.isPending}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-xl h-8 px-4 gap-1.5"
                      onClick={() => handleDelete(employee)}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </Button>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p className="text-xs text-muted-foreground">
                صفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || employeesQuery.isFetching}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))}
                  disabled={!pagination || pagination.page >= pagination.totalPages || employeesQuery.isFetching}
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void employeesQuery.refetch()}
                  disabled={employeesQuery.isFetching}
                >
                  <RefreshCw className={`h-4 w-4 ${employeesQuery.isFetching ? "animate-spin" : ""}`} />
                  تحديث
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Plus className="h-4 w-4" />}
        label="إضافة"
        ariaLabel="إضافة موظف"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل موظف" : "إضافة موظف"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "تحديث الموظف" : "إضافة موظف"}
        showFooter={false}
        renderInPortal
        overlayClassName="z-[70]"
        panelClassName="md:max-w-[760px]"
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground text-center">
            لا تملك الصلاحية المطلوبة: <code>employees.create</code>.
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmitForm}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>الرقم الوظيفي</Label>
                <Input
                  value={formState.jobNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, jobNumber: event.target.value }))}
                  placeholder="وظ-0012"
                  icon={<Hash className="h-4 w-4" />}
                />
              </div>
              <div className="space-y-1">
                <Label>الرقم المالي</Label>
                <Input
                  value={formState.financialNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, financialNumber: event.target.value }))}
                  placeholder="مالي-88991"
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label required>الاسم الكامل</Label>
              <Input
                value={formState.fullName}
                onChange={(event) => setFormState((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="أحمد علي حسن"
                icon={<User className="h-5 w-5" />}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label required>الجنس</Label>
                <SelectField
                  value={formState.genderId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, genderId: event.target.value }))}
                  disabled={!canReadGenders || genderOptionsQuery.isLoading}
                  icon={<User className="h-4 w-4" />}
                >
                  <option value="">اختر الجنس</option>
                  {genderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.nameAr ?? option.name ?? option.code}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-1">
                <Label>تاريخ الميلاد</Label>
                <Input
                  type="date"
                  value={formState.birthDate}
                  onChange={(event) => setFormState((prev) => ({ ...prev, birthDate: event.target.value }))}
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 border-t pt-4 border-border/40">
              <div className="space-y-1">
                <Label>الهاتف الأساسي</Label>
                <PhoneContactInput
                  value={formState.phonePrimary}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, phonePrimary: value }))}
                  placeholder="+967777111222"
                />
              </div>
              <div className="space-y-1">
                <Label>الهاتف الاحتياطي</Label>
                <PhoneContactInput
                  value={formState.phoneSecondary}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, phoneSecondary: value }))}
                  placeholder="+967733444555"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 border-t pt-4 border-border/40">
              <div className="space-y-1">
                <Label>المؤهل العلمي</Label>
                <SelectField
                  value={formState.qualificationId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, qualificationId: event.target.value }))}
                  disabled={!canReadQualifications || qualificationOptionsQuery.isLoading}
                  icon={<GraduationCap className="h-4 w-4" />}
                >
                  <option value="">غير محدد</option>
                  {qualificationOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.nameAr ?? option.name}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="space-y-1">
                <Label>المسمى الوظيفي</Label>
                <SelectField
                  value={formState.jobRoleId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, jobRoleId: event.target.value }))}
                  disabled={!canReadJobRoles || jobRoleOptionsQuery.isLoading}
                  icon={<Briefcase className="h-4 w-4" />}
                >
                  <option value="">غير محدد</option>
                  {jobRoleOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.nameAr ?? option.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
                disabled={isFormSubmitting}
              >
                {isFormSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isEditing ? "حفظ التعديلات" : "إضافة الموظف"}
              </button>
              <Button type="button" variant="outline" className="rounded-2xl h-12" onClick={resetForm}>
                إلغاء
              </Button>
            </div>
          </form>
        )}
      </BottomSheetForm>
    </>
  );
}

function Hash({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}
