"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import Link from "next/link";
import {
  BadgeDollarSign,
  Briefcase,
  Calendar,
  GitBranch,
  GraduationCap,
  Hash,
  LoaderCircle,
  MapPinned,
  Network,
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
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
import { Label } from "@/components/ui/label";
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
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useGeographyOptionsQuery } from "@/features/lookup-catalog/hooks/use-geography-options-query";
import {
  buildGeographyMaps,
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
import { useEmployeeOrganizationOptionsQuery } from "@/features/employees/hooks/use-employee-organization-options-query";
import { useEmployeesQuery } from "@/features/employees/hooks/use-employees-query";
import { useQualificationOptionsQuery } from "@/features/employees/hooks/use-qualification-options-query";
import {
  translateEmployeeGender,
  translateEmploymentType,
} from "@/lib/i18n/ar";
import type {
  EmployeeGender,
  EmployeeListItem,
  EmployeeSystemAccessStatus,
  EmploymentType,
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
  departmentId: string;
  branchId: string;
  directManagerEmployeeId: string;
  costCenterId: string;
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
  department: string;
  branch: string;
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
  departmentId: "",
  branchId: "",
  directManagerEmployeeId: "",
  costCenterId: "",
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
  department: "all",
  branch: "all",
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
    departmentId: employee.departmentId ?? "",
    branchId: employee.branchId ? String(employee.branchId) : "",
    directManagerEmployeeId: employee.directManagerEmployeeId ?? "",
    costCenterId: employee.costCenterId ? String(employee.costCenterId) : "",
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
  const canReadGenders = hasPermission("lookup-genders.read");
  const canReadQualifications = hasPermission("lookup-qualifications.read");
  const canReadJobRoles = hasPermission("lookup-job-roles.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<string>("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = React.useState<
    EmploymentType | "all"
  >("all");
  const [idTypeFilter, setIdTypeFilter] = React.useState<string>("all");
  const [localityFilter, setLocalityFilter] = React.useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = React.useState<string>("all");
  const [branchFilter, setBranchFilter] = React.useState<string>("all");
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
  const [formGovernorateId, setFormGovernorateId] = React.useState<string>("");
  const [formDirectorateId, setFormDirectorateId] = React.useState<string>("");
  const [formSubDistrictId, setFormSubDistrictId] = React.useState<string>("");
  const [formVillageId, setFormVillageId] = React.useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formError, setFormError] = React.useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const employeesQuery = useEmployeesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    genderId: genderFilter === "all" ? undefined : Number(genderFilter),
    employmentType:
      employmentTypeFilter === "all" ? undefined : employmentTypeFilter,
    idTypeId: idTypeFilter === "all" ? undefined : Number(idTypeFilter),
    localityId: localityFilter === "all" ? undefined : Number(localityFilter),
    departmentId: departmentFilter === "all" ? undefined : departmentFilter,
    branchId: branchFilter === "all" ? undefined : Number(branchFilter),
    qualificationId:
      qualificationFilter === "all" ? undefined : Number(qualificationFilter),
    jobRoleId: jobRoleFilter === "all" ? undefined : Number(jobRoleFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
    operationalReadiness:
      operationalReadinessFilter === "all"
        ? undefined
        : operationalReadinessFilter,
  });
  useIdTypeOptionsQuery();
  const genderOptionsQuery = useGenderOptionsQuery();
  const geographyOptionsQuery = useGeographyOptionsQuery("employees");
  const organizationOptionsQuery = useEmployeeOrganizationOptionsQuery();
  const qualificationOptionsQuery = useQualificationOptionsQuery();
  const jobRoleOptionsQuery = useJobRoleOptionsQuery();

  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const deleteMutation = useDeleteEmployeeMutation();

  const employees = React.useMemo(
    () => employeesQuery.data?.data ?? [],
    [employeesQuery.data?.data],
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
  const departmentOptions = React.useMemo(
    () => organizationOptionsQuery.data?.departments ?? [],
    [organizationOptionsQuery.data?.departments],
  );
  const branchOptions = React.useMemo(
    () => organizationOptionsQuery.data?.branches ?? [],
    [organizationOptionsQuery.data?.branches],
  );
  const costCenterOptions = React.useMemo(
    () => organizationOptionsQuery.data?.costCenters ?? [],
    [organizationOptionsQuery.data?.costCenters],
  );
  const managerOptions = React.useMemo(
    () => organizationOptionsQuery.data?.managers ?? [],
    [organizationOptionsQuery.data?.managers],
  );
  const visibleCostCenterOptions = React.useMemo(() => {
    if (!formState.branchId) {
      return costCenterOptions;
    }

    return costCenterOptions.filter(
      (option) => option.branchId === null || option.branchId === Number(formState.branchId),
    );
  }, [costCenterOptions, formState.branchId]);
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
      department: departmentFilter,
      branch: branchFilter,
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
    branchFilter,
    departmentFilter,
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

  React.useEffect(() => {
    if (!formState.costCenterId) {
      return;
    }

    const selectedExists = visibleCostCenterOptions.some(
      (option) => String(option.id) === formState.costCenterId,
    );

    if (!selectedExists) {
      setFormState((prev) => ({ ...prev, costCenterId: "" }));
    }
  }, [formState.costCenterId, visibleCostCenterOptions]);

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
    setDepartmentFilter("all");
    setBranchFilter("all");
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
    setDepartmentFilter(filterDraft.department);
    setBranchFilter(filterDraft.branch);
    setQualificationFilter(filterDraft.qualification);
    setJobRoleFilter(filterDraft.jobRole);
    setActiveFilter(filterDraft.active);
    setOperationalReadinessFilter(filterDraft.operationalReadiness);
    setPage(1);
    setIsFilterOpen(false);
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
      departmentId: formState.departmentId || null,
      branchId: formState.branchId ? Number(formState.branchId) : null,
      directManagerEmployeeId: formState.directManagerEmployeeId || null,
      costCenterId: formState.costCenterId ? Number(formState.costCenterId) : null,
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
      departmentFilter,
      branchFilter,
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
    branchFilter,
    departmentFilter,
    operationalReadinessFilter,
    qualificationFilter,
  ]);

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  return (
    <>
      <div className="space-y-4">
        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلترة الموظفين"
          renderInPortal
          overlayClassName="z-[70]"
          actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
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
              <Label>القسم</Label>
              <SelectField
                value={filterDraft.department}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    department: event.target.value,
                  }))
                }
                disabled={organizationOptionsQuery.isLoading}
                icon={<Network className="h-4 w-4" />}
              >
                <option value="all">كل الأقسام</option>
                {departmentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>الفرع</Label>
              <SelectField
                value={filterDraft.branch}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    branch: event.target.value,
                  }))
                }
                disabled={organizationOptionsQuery.isLoading}
                icon={<GitBranch className="h-4 w-4" />}
              >
                <option value="all">كل الفروع</option>
                {branchOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.nameAr}
                  </option>
                ))}
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

        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="ابحث بالاسم، الرقم، الهاتف..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        {actionSuccess ? (
          <div
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
            data-testid="employee-success-banner"
          >
            {actionSuccess}
          </div>
        ) : null}

        {mutationError ? (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            data-testid="employee-error-banner"
          >
            {mutationError}
          </div>
        ) : null}

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة الموظفين</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
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
                  data-testid="employee-card"
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
                        <span className="flex items-center gap-1.5">
                          <Network className="h-3.5 w-3.5 opacity-70" />
                          القسم: {employee.department?.name ?? "-"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5 opacity-70" />
                          الفرع: {employee.branch?.nameAr ?? "-"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPinned className="h-3.5 w-3.5 opacity-70" />
                          مركز التكلفة: {employee.costCenter?.nameAr ?? "-"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 opacity-70" />
                          المدير المباشر: {employee.directManager?.fullName ?? "-"}
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
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground text-center">
            لا تملك الصلاحية المطلوبة: <code>employees.create</code>.
          </div>
        ) : (
          <form
            className="space-y-6"
            onSubmit={handleSubmitForm}
            data-testid="employee-form"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>الرقم الوظيفي</Label>
                <Input
                  value={formState.jobNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, jobNumber: event.target.value }))}
                  placeholder="وظ-0012"
                  icon={<Hash className="h-4 w-4" />}
                  data-testid="employee-form-job-number"
                />
              </div>
              <div className="space-y-1">
                <Label>الرقم المالي</Label>
                <Input
                  value={formState.financialNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, financialNumber: event.target.value }))}
                  placeholder="مالي-88991"
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                  data-testid="employee-form-financial-number"
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
                data-testid="employee-form-full-name"
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
                  data-testid="employee-form-gender"
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
                  data-testid="employee-form-birth-date"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 border-t pt-4 border-border/40">
              <div className="space-y-1">
                <Label>الهاتف الأساسي</Label>
                <InternationalPhoneField
                  value={formState.phonePrimary}
                  onChange={(next) =>
                    setFormState((prev) => ({
                      ...prev,
                      phonePrimary: next.e164,
                    }))
                  }
                  placeholder="7XXXXXXXX"
                  enableContactPicker
                />
              </div>
              <div className="space-y-1">
                <Label>الهاتف الاحتياطي</Label>
                <InternationalPhoneField
                  value={formState.phoneSecondary}
                  onChange={(next) =>
                    setFormState((prev) => ({
                      ...prev,
                      phoneSecondary: next.e164,
                    }))
                  }
                  placeholder="7XXXXXXXX"
                  enableContactPicker
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
                  data-testid="employee-form-qualification"
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
                  data-testid="employee-form-job-role"
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

            <div className="grid gap-4 md:grid-cols-2 border-t pt-4 border-border/40">
              <div className="space-y-1">
                <Label>القسم</Label>
                <SelectField
                  value={formState.departmentId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, departmentId: event.target.value }))
                  }
                  disabled={organizationOptionsQuery.isLoading}
                  icon={<Network className="h-4 w-4" />}
                  data-testid="employee-form-department"
                >
                  <option value="">غير محدد</option>
                  {departmentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-1">
                <Label>الفرع</Label>
                <SelectField
                  value={formState.branchId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, branchId: event.target.value }))
                  }
                  disabled={organizationOptionsQuery.isLoading}
                  icon={<GitBranch className="h-4 w-4" />}
                  data-testid="employee-form-branch"
                >
                  <option value="">غير محدد</option>
                  {branchOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.nameAr}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 border-t pt-4 border-border/40">
              <div className="space-y-1">
                <Label>المدير المباشر</Label>
                <SelectField
                  value={formState.directManagerEmployeeId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      directManagerEmployeeId: event.target.value,
                    }))
                  }
                  disabled={organizationOptionsQuery.isLoading}
                  icon={<User className="h-4 w-4" />}
                  data-testid="employee-form-manager"
                >
                  <option value="">غير محدد</option>
                  {managerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.fullName}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-1">
                <Label>مركز التكلفة</Label>
                <SelectField
                  value={formState.costCenterId}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, costCenterId: event.target.value }))
                  }
                  disabled={organizationOptionsQuery.isLoading}
                  icon={<MapPinned className="h-4 w-4" />}
                  data-testid="employee-form-cost-center"
                >
                  <option value="">غير محدد</option>
                  {visibleCostCenterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.nameAr}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {formError ? (
                <div
                  className="w-full rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
                  data-testid="employee-form-error"
                >
                  {formError}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
                disabled={isFormSubmitting}
                data-testid="employee-form-submit"
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
