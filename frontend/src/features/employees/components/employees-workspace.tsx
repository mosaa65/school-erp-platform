"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import Link from "next/link";
import {
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function findLookupByText(
  options: LookupCatalogListItem[],
  value: string,
): LookupCatalogListItem | undefined {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  return options.find((option) => {
    const haystack = [
      option.code,
      option.name,
      option.nameAr,
      option.nameEn,
      option.nameArFemale,
    ]
      .filter((field): field is string => Boolean(field))
      .map((field) => field.toLowerCase());

    return haystack.includes(normalized);
  });
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

    if (!nextState.qualificationId && employee.qualification) {
      const mapped = findLookupByText(
        qualificationOptions,
        employee.qualification,
      );
      if (mapped) {
        nextState.qualificationId = String(mapped.id);
      }
    }

    if (!nextState.jobRoleId && employee.jobTitle) {
      const mapped = findLookupByText(jobRoleOptions, employee.jobTitle);
      if (mapped) {
        nextState.jobRoleId = String(mapped.id);
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
              className="px-3 sm:px-4 [&>span:nth-child(2)]:hidden [&>span:nth-child(3)]:hidden sm:[&>span:nth-child(2)]:inline-flex sm:[&>span:nth-child(3)]:inline-flex"
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
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              value={filterDraft.gender}
              onChange={(event) => setFilterDraft((prev) => ({ ...prev, gender: event.target.value }))}
              disabled={!canReadGenders || genderOptionsQuery.isLoading}
            >
              <option value="all">كل الجنسيات</option>
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

            <SelectField
              value={filterDraft.employmentType}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  employmentType: event.target.value as EmploymentType | "all",
                }))
              }
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

            <SelectField
              value={filterDraft.idType}
              onChange={(event) => setFilterDraft((prev) => ({ ...prev, idType: event.target.value }))}
              disabled={!canReadIdTypes || idTypeOptionsQuery.isLoading}
            >
              <option value="all">كل أنواع الهوية</option>
              {idTypeOptions.map((idType) => (
                <option key={idType.id} value={idType.id}>
                  {idType.nameAr}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.locality}
              onChange={(event) => setFilterDraft((prev) => ({ ...prev, locality: event.target.value }))}
              disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
            >
              <option value="all">كل المواقع</option>
              {localityOptions.map((locality) => (
                <option key={locality.id} value={locality.id}>
                  {formatLocalityHierarchyLabel(locality, geographyMaps)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.qualification}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, qualification: event.target.value }))
              }
              disabled={!canReadQualifications || qualificationOptionsQuery.isLoading}
            >
              <option value="all">كل المؤهلات</option>
              {qualificationOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nameAr ?? option.name ?? option.code ?? String(option.id)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.jobRole}
              onChange={(event) => setFilterDraft((prev) => ({ ...prev, jobRole: event.target.value }))}
              disabled={!canReadJobRoles || jobRoleOptionsQuery.isLoading}
            >
              <option value="all">كل المسميات الوظيفية</option>
              {jobRoleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nameAr ?? option.name ?? option.code ?? String(option.id)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.active}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  active: event.target.value as "all" | "active" | "inactive",
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط فقط</option>
              <option value="inactive">غير نشط فقط</option>
            </SelectField>

            <SelectField
              value={filterDraft.operationalReadiness}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  operationalReadiness: event.target.value as OperationalReadinessFilter | "all",
                }))
              }
            >
              <option value="all">كل حالات الجاهزية التشغيلية</option>
              <option value="READY">جاهز بالكامل</option>
              <option value="PARTIAL">جاهز جزئيًا</option>
              <option value="NOT_READY">غير جاهز</option>
            </SelectField>
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
          <CardDescription>
            إدارة الموظفين مع فلترة بالبحث والجنس ونوع التوظيف والمسمى والمؤهل
            والموقع.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {employeesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل قائمة الموظفين...
            </div>
          ) : null}

          {employeesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {employeesQuery.error instanceof Error
                ? employeesQuery.error.message
                : "فشل تحميل قائمة الموظفين"}
            </div>
          ) : null}

          {!employeesQuery.isPending && employees.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد سجلات مطابقة.
            </div>
          ) : null}

          {employees.map((employee) => {
            const readiness = resolveOperationalReadiness(employee);

            return (
              <div
                key={employee.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Badge
                    variant={readiness.variant}
                    className="order-2 md:order-none"
                  >
                    {readiness.label}
                  </Badge>
                  <div className="space-y-1">
                    <p className="font-medium">{employee.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      المسمى:{" "}
                      {employee.jobRoleLookup?.nameAr ??
                        employee.jobTitle ??
                        "-"}{" "}
                      | الرقم الوظيفي: {employee.jobNumber ?? "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الرقم المالي: {employee.financialNumber ?? "-"} | الخبرة:{" "}
                      {employee.experienceYears}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      المؤهل:{" "}
                      {employee.qualificationLookup?.nameAr ??
                        employee.qualification ??
                        "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الهوية: {employee.idNumber ?? "-"} | النوع:{" "}
                      {employee.idType?.nameAr ?? "غير محدد"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الموقع:{" "}
                      {employee.locality
                        ? formatLocalityHierarchyLabel(
                            (geographyMaps.localityById.get(
                              employee.locality.id,
                            ) ?? employee.locality) as LocalityLabelInput,
                            geographyMaps,
                          )
                        : "غير محدد"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      حساب المستخدم:{" "}
                      {employee.userAccount
                        ? `${employee.userAccount.email}${employee.userAccount.username ? ` (${employee.userAccount.username})` : ""}`
                        : "غير مرتبط"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الأدوار:{" "}
                      {employee.userAccount &&
                      employee.userAccount.userRoles.length > 0
                        ? employee.userAccount.userRoles
                            .filter((item) => item.role.isActive)
                            .map((item) => translateRoleCode(item.role.code))
                            .join("، ")
                        : "لا يوجد"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      النطاق التشغيلي: إسناد تدريس{" "}
                      {employee.operationalScope.activeTeachingAssignments} |
                      إشراف{" "}
                      {employee.operationalScope.activeSectionSupervisions}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">
                      {employee.genderLookup?.nameAr ??
                        translateEmployeeGender(employee.gender)}
                    </Badge>
                    <Badge variant="secondary">
                      {employee.employmentType
                        ? translateEmploymentType(employee.employmentType)
                        : "غير محدد"}
                    </Badge>
                    <Badge
                      variant={
                        employee.systemAccessStatus === "GRANTED"
                          ? "default"
                          : "outline"
                      }
                    >
                      {translateEmployeeSystemAccessStatus(
                        employee.systemAccessStatus,
                      )}
                    </Badge>
                    <Badge
                      variant={employee.userAccount ? "default" : "outline"}
                    >
                      {employee.userAccount ? "لديه حساب" : "بدون حساب"}
                    </Badge>
                    <Badge variant={employee.isActive ? "default" : "outline"}>
                      {employee.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    asChild
                    variant={employee.userAccount ? "secondary" : "default"}
                    size="sm"
                  >
                    <Link
                      href={`/app/users?q=${encodeURIComponent(
                        employee.userAccount?.email ?? employee.fullName,
                      )}`}
                    >
                      {employee.userAccount ? "إدارة الحساب" : "إنشاء/ربط حساب"}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(employee)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(employee)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    {employee.isActive ? "تعطيل" : "تفعيل"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
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
                disabled={
                  !pagination ||
                  pagination.page <= 1 ||
                  employeesQuery.isFetching
                }
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((prev) =>
                    pagination
                      ? Math.min(prev + 1, pagination.totalPages)
                      : prev,
                  )
                }
                disabled={
                  !pagination ||
                  pagination.page >= pagination.totalPages ||
                  employeesQuery.isFetching
                }
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
                <RefreshCw
                  className={`h-4 w-4 ${employeesQuery.isFetching ? "animate-spin" : ""}`}
                />
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
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>employees.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
              <p className="text-sm text-muted-foreground">
                {isEditing
                  ? "عدّل بيانات الموظف الحالية."
                  : "أدخل بيانات الموظف الأساسية لإنشاء سجل جديد."}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الرقم الوظيفي
                  </label>
                  <Input
                    value={formState.jobNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        jobNumber: event.target.value,
                      }))
                    }
                    placeholder="وظ-0012"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الرقم المالي
                  </label>
                  <Input
                    value={formState.financialNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        financialNumber: event.target.value,
                      }))
                    }
                    placeholder="مالي-88991"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الاسم الكامل *
                </label>
                <Input
                  value={formState.fullName}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      fullName: event.target.value,
                    }))
                  }
                  placeholder="أحمد علي حسن"
                  required
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الجنس *
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.genderId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        genderId: event.target.value,
                      }))
                    }
                    disabled={!canReadGenders || genderOptionsQuery.isLoading}
                  >
                    <option value="">اختر الجنس</option>
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
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ الميلاد
                  </label>
                  <Input
                    type="date"
                    value={formState.birthDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        birthDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الهاتف الأساسي
                  </label>
                  <PhoneContactInput
                    value={formState.phonePrimary}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        phonePrimary: value,
                      }))
                    }
                    placeholder="+967777111222"
                    autoComplete="tel"
                    inputMode="tel"
                    buttonTestId="employee-phone-primary-contact-picker"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الهاتف الاحتياطي
                  </label>
                  <PhoneContactInput
                    value={formState.phoneSecondary}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        phoneSecondary: value,
                      }))
                    }
                    placeholder="+967733444555"
                    autoComplete="tel"
                    inputMode="tel"
                    buttonTestId="employee-phone-secondary-contact-picker"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    المؤهل العلمي
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.qualificationId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        qualificationId: event.target.value,
                      }))
                    }
                    disabled={
                      !canReadQualifications ||
                      qualificationOptionsQuery.isLoading
                    }
                  >
                    <option value="">غير محدد</option>
                    {qualificationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nameAr ??
                          option.name ??
                          option.code ??
                          String(option.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ المؤهل
                  </label>
                  <Input
                    type="date"
                    value={formState.qualificationDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        qualificationDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    التخصص
                  </label>
                  <Input
                    value={formState.specialization}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        specialization: event.target.value,
                      }))
                    }
                    placeholder="رياضيات"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    سنوات الخبرة
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={80}
                    value={formState.experienceYears}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        experienceYears: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    رقم الهوية
                  </label>
                  <Input
                    value={formState.idNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        idNumber: event.target.value,
                      }))
                    }
                    placeholder="A123456789"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    نوع الهوية
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.idTypeId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        idTypeId: event.target.value,
                      }))
                    }
                    disabled={!canReadIdTypes || idTypeOptionsQuery.isLoading}
                  >
                    <option value="">غير محدد</option>
                    {idTypeOptions.map((idType) => (
                      <option key={idType.id} value={idType.id}>
                        {idType.nameAr} ({idType.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ انتهاء الهوية
                  </label>
                  <Input
                    type="date"
                    value={formState.idExpiryDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        idExpiryDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  الموقع الجغرافي (هرمي)
                </label>
                {hasGeographyHierarchy ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={formGovernorateId}
                      onChange={(event) =>
                        handleGovernorateChange(event.target.value)
                      }
                      disabled={
                        !canReadLocalities || geographyOptionsQuery.isLoading
                      }
                    >
                      <option value="">اختر المحافظة</option>
                      {governorateOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nameAr ?? item.name ?? `محافظة #${item.id}`}
                        </option>
                      ))}
                    </select>

                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={formDirectorateId}
                      onChange={(event) =>
                        handleDirectorateChange(event.target.value)
                      }
                      disabled={
                        !canReadLocalities ||
                        geographyOptionsQuery.isLoading ||
                        !formGovernorateId
                      }
                    >
                      <option value="">اختر المديرية</option>
                      {filteredDirectorates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nameAr ?? item.name ?? `مديرية #${item.id}`}
                        </option>
                      ))}
                    </select>

                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={formSubDistrictId}
                      onChange={(event) =>
                        handleSubDistrictChange(event.target.value)
                      }
                      disabled={
                        !canReadLocalities ||
                        geographyOptionsQuery.isLoading ||
                        !formDirectorateId
                      }
                    >
                      <option value="">اختر العزلة</option>
                      {filteredSubDistricts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nameAr ?? item.name ?? `عزلة #${item.id}`}
                        </option>
                      ))}
                    </select>

                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={formVillageId}
                      onChange={(event) =>
                        handleVillageChange(event.target.value)
                      }
                      disabled={
                        !canReadLocalities ||
                        geographyOptionsQuery.isLoading ||
                        !formSubDistrictId
                      }
                    >
                      <option value="">اختر القرية (اختياري للحضر)</option>
                      {filteredVillages.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nameAr ?? item.name ?? `قرية #${item.id}`}
                        </option>
                      ))}
                    </select>

                    <div className="md:col-span-2">
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={formState.localityId}
                        onChange={(event) =>
                          handleLocalityChange(event.target.value)
                        }
                        disabled={
                          !canReadLocalities ||
                          geographyOptionsQuery.isLoading ||
                          !formDirectorateId
                        }
                      >
                        <option value="">اختر المحلة</option>
                        {filteredLocalities.map((locality) => (
                          <option key={locality.id} value={locality.id}>
                            {formatLocalityHierarchyLabel(
                              locality,
                              geographyMaps,
                            )}
                          </option>
                        ))}
                      </select>
                    </div>

                    <p className="text-xs text-muted-foreground md:col-span-2">
                      {formSelectedLocality
                        ? `المحدد: ${formatLocalityHierarchyLabel(
                            formSelectedLocality,
                            geographyMaps,
                          )}`
                        : "يمكن اختيار محلة حضرية بعد تحديد المديرية، أو محلة ريفية بعد اختيار العزلة والقرية."}
                    </p>
                  </div>
                ) : (
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.localityId}
                    onChange={(event) =>
                      handleLocalityChange(event.target.value)
                    }
                    disabled={
                      !canReadLocalities || geographyOptionsQuery.isLoading
                    }
                  >
                    <option value="">غير محدد</option>
                    {localityOptions.map((locality) => (
                      <option key={locality.id} value={locality.id}>
                        {formatLocalityHierarchyLabel(locality, geographyMaps)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    نوع التوظيف
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.employmentType}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        employmentType: event.target.value as
                          | EmploymentType
                          | "",
                      }))
                    }
                  >
                    <option value="">غير محدد</option>
                    <option value="PERMANENT">
                      {translateEmploymentType("PERMANENT")}
                    </option>
                    <option value="CONTRACT">
                      {translateEmploymentType("CONTRACT")}
                    </option>
                    <option value="VOLUNTEER">
                      {translateEmploymentType("VOLUNTEER")}
                    </option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    المسمى الوظيفي
                  </label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.jobRoleId}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        jobRoleId: event.target.value,
                      }))
                    }
                    disabled={!canReadJobRoles || jobRoleOptionsQuery.isLoading}
                  >
                    <option value="">غير محدد</option>
                    {jobRoleOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nameAr ??
                          option.name ??
                          option.code ??
                          String(option.id)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    تاريخ التعيين
                  </label>
                  <Input
                    type="date"
                    value={formState.hireDate}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        hireDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    المدرسة السابقة
                  </label>
                  <Input
                    value={formState.previousSchool}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        previousSchool: event.target.value,
                      }))
                    }
                    placeholder="مدرسة النور الأهلية"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  حالة صلاحية النظام
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.systemAccessStatus}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      systemAccessStatus: event.target
                        .value as EmployeeSystemAccessStatus,
                    }))
                  }
                >
                  <option value="GRANTED">
                    {translateEmployeeSystemAccessStatus("GRANTED")}
                  </option>
                  <option value="SUSPENDED">
                    {translateEmployeeSystemAccessStatus("SUSPENDED")}
                  </option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  هذه الحالة تخص ملف الموظف فقط. إنشاء حساب الدخول وربط الأدوار
                  يتم من شاشة المستخدمين.
                </p>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>لديه واتساب</span>
                  <input
                    type="checkbox"
                    checked={formState.hasWhatsapp}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        hasWhatsapp: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>الراتب معتمد</span>
                  <input
                    type="checkbox"
                    checked={formState.salaryApproved}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        salaryApproved: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>نشط</span>
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>

              {formError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {formError}
                </div>
              ) : null}

              {mutationError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {mutationError}
                </div>
              ) : null}
              {actionSuccess ? (
                <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-2 text-xs text-emerald-700 dark:text-emerald-300">
                  {actionSuccess}
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isFormSubmitting || (!canCreate && !isEditing)}
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء موظف"}
                </Button>
                {isEditing ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </form>
        )}
      </BottomSheetForm>
    </>
  );
}
