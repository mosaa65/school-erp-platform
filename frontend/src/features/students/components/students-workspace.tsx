"use client";

import * as React from "react";
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
import { useLookupOrphanStatusesQuery } from "@/features/lookup-orphan-statuses/hooks/use-lookup-orphan-statuses-query";
import {
  useCreateStudentMutation,
  useDeleteStudentMutation,
  useUpdateStudentMutation,
} from "@/features/students/hooks/use-students-mutations";
import { useBloodTypeOptionsQuery } from "@/features/students/hooks/use-blood-type-options-query";
import { useStudentGenderOptionsQuery } from "@/features/students/hooks/use-gender-options-query";
import { useHealthStatusOptionsQuery } from "@/features/students/hooks/use-health-status-options-query";
import { useStudentsQuery } from "@/features/students/hooks/use-students-query";
import {
  translateStudentEnrollmentStatus,
  translateStudentGender,
  translateStudentHealthStatus,
  translateStudentOrphanStatus,
} from "@/lib/i18n/ar";
import type {
  StudentGender,
  StudentHealthStatus,
  StudentListItem,
  StudentOrphanStatus,
} from "@/lib/api/client";

type StudentFormState = {
  admissionNo: string;
  fullName: string;
  genderId: string;
  birthDate: string;
  bloodTypeId: string;
  localityId: string;
  healthStatusId: string;
  healthNotes: string;
  orphanStatusId: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const STUDENT_GENDER_CODES: StudentGender[] = ["MALE", "FEMALE", "OTHER"];
const STUDENT_HEALTH_STATUS_CODES: StudentHealthStatus[] = [
  "HEALTHY",
  "CHRONIC_DISEASE",
  "SPECIAL_NEEDS",
  "DISABILITY",
  "OTHER",
];
const ORPHAN_OPTIONS: StudentOrphanStatus[] = [
  "NONE",
  "FATHER_DECEASED",
  "MOTHER_DECEASED",
  "BOTH_DECEASED",
];

const ORPHAN_STATUS_FALLBACK_OPTIONS: Array<{
  id: number;
  code: StudentOrphanStatus;
  nameAr: string;
}> = [
  { id: -1, code: "NONE", nameAr: "غير يتيم" },
  { id: -2, code: "FATHER_DECEASED", nameAr: "يتيم الأب" },
  { id: -3, code: "MOTHER_DECEASED", nameAr: "يتيم الأم" },
  { id: -4, code: "BOTH_DECEASED", nameAr: "يتيم الأبوين" },
];

function isStudentOrphanStatus(value: string): value is StudentOrphanStatus {
  return ORPHAN_OPTIONS.includes(value as StudentOrphanStatus);
}

const DEFAULT_FORM_STATE: StudentFormState = {
  admissionNo: "",
  fullName: "",
  genderId: "",
  birthDate: "",
  bloodTypeId: "",
  localityId: "",
  healthStatusId: "",
  healthNotes: "",
  orphanStatusId: "",
  isActive: true,
};

function isStudentGenderCode(value: string): value is StudentGender {
  return STUDENT_GENDER_CODES.includes(value as StudentGender);
}

function isStudentHealthStatusCode(value: string): value is StudentHealthStatus {
  return STUDENT_HEALTH_STATUS_CODES.includes(value as StudentHealthStatus);
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

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) {
    return "-";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

type LocalityLabelInput = {
  id: number;
  nameAr?: string;
  name?: string;
  localityType?: "RURAL" | "URBAN";
  directorateId?: number;
  villageId?: number;
};

function toFormState(student: StudentListItem): StudentFormState {
  return {
    admissionNo: student.admissionNo ?? "",
    fullName: student.fullName,
    genderId: student.genderId ? String(student.genderId) : "",
    birthDate: toDateInput(student.birthDate),
    bloodTypeId: student.bloodTypeId ? String(student.bloodTypeId) : "",
    localityId: student.localityId ? String(student.localityId) : "",
    healthStatusId: student.healthStatusId ? String(student.healthStatusId) : "",
    healthNotes: student.healthNotes ?? "",
    orphanStatusId: student.orphanStatusId ? String(student.orphanStatusId) : "",
    isActive: student.isActive,
  };
}

function orphanBadgeVariant(
  orphanStatus: StudentOrphanStatus,
): "default" | "secondary" | "outline" {
  if (orphanStatus === "NONE") {
    return "outline";
  }

  if (orphanStatus === "BOTH_DECEASED") {
    return "default";
  }

  return "secondary";
}

function healthBadgeVariant(
  healthStatus: StudentHealthStatus | null,
): "default" | "secondary" | "outline" {
  if (!healthStatus) {
    return "outline";
  }

  if (healthStatus === "HEALTHY") {
    return "secondary";
  }

  return "default";
}

export function StudentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("students.create");
  const canUpdate = hasPermission("students.update");
  const canDelete = hasPermission("students.delete");
  const canReadGenders = hasPermission("lookup-genders.read");
  const canReadBloodTypes = hasPermission("lookup-blood-types.read");
  const canReadLocalities = hasPermission("localities.read");
  const canReadHealthStatuses = hasPermission("lookup-health-statuses.read");
  const canReadOrphanStatuses = hasPermission("lookup-orphan-statuses.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounceTimer, setDebounceTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [genderFilter, setGenderFilter] = React.useState<string>("all");
  const [bloodTypeFilter, setBloodTypeFilter] = React.useState<string>("all");
  const [localityFilter, setLocalityFilter] = React.useState<string>("all");
  const [orphanFilter, setOrphanFilter] = React.useState<string>("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    gender: string;
    bloodType: string;
    locality: string;
    orphan: string;
    active: "all" | "active" | "inactive";
  }>({
    gender: "all",
    bloodType: "all",
    locality: "all",
    orphan: "all",
    active: "all",
  });

  const [editingStudentId, setEditingStudentId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<StudentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [formGovernorateId, setFormGovernorateId] = React.useState<string>("");
  const [formDirectorateId, setFormDirectorateId] = React.useState<string>("");
  const [formSubDistrictId, setFormSubDistrictId] = React.useState<string>("");
  const [formVillageId, setFormVillageId] = React.useState<string>("");

  const studentsQuery = useStudentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    genderId: genderFilter === "all" ? undefined : Number(genderFilter),
    bloodTypeId: bloodTypeFilter === "all" ? undefined : Number(bloodTypeFilter),
    localityId: localityFilter === "all" ? undefined : Number(localityFilter),
    orphanStatusId: orphanFilter === "all" ? undefined : Number(orphanFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const genderOptionsQuery = useStudentGenderOptionsQuery();
  const bloodTypeOptionsQuery = useBloodTypeOptionsQuery();
  const geographyOptionsQuery = useGeographyOptionsQuery("students");
  const healthStatusOptionsQuery = useHealthStatusOptionsQuery();
  const orphanStatusesQuery = useLookupOrphanStatusesQuery({
    page: 1,
    limit: 100,
    isActive: true,
    enabled: canReadOrphanStatuses,
  });

  const createMutation = useCreateStudentMutation();
  const updateMutation = useUpdateStudentMutation();
  const deleteMutation = useDeleteStudentMutation();

  const students = React.useMemo(() => studentsQuery.data?.data ?? [], [studentsQuery.data?.data]);
  const genderOptions = React.useMemo(
    () => genderOptionsQuery.data ?? [],
    [genderOptionsQuery.data],
  );
  const bloodTypeOptions = React.useMemo(
    () => bloodTypeOptionsQuery.data ?? [],
    [bloodTypeOptionsQuery.data],
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
    return directorateOptions.filter((item) => item.governorateId === governorateId);
  }, [directorateOptions, formGovernorateId]);
  const filteredSubDistricts = React.useMemo(() => {
    if (!formDirectorateId) {
      return [];
    }

    const directorateId = Number(formDirectorateId);
    return subDistrictOptions.filter((item) => item.directorateId === directorateId);
  }, [formDirectorateId, subDistrictOptions]);
  const filteredVillages = React.useMemo(() => {
    if (!formSubDistrictId) {
      return [];
    }

    const subDistrictId = Number(formSubDistrictId);
    return villageOptions.filter((item) => item.subDistrictId === subDistrictId);
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
  const healthStatusOptions = React.useMemo(
    () => healthStatusOptionsQuery.data ?? [],
    [healthStatusOptionsQuery.data],
  );
  const orphanStatusOptions = React.useMemo(() => {
    const items = orphanStatusesQuery.data?.data ?? [];
    const normalized = items.filter((item) => isStudentOrphanStatus(item.code));

    return normalized.length > 0 ? normalized : ORPHAN_STATUS_FALLBACK_OPTIONS;
  }, [orphanStatusesQuery.data?.data]);
  const orphanStatusOptionsById = React.useMemo(
    () => new Map(orphanStatusOptions.map((item) => [item.id, item])),
    [orphanStatusOptions],
  );
  const orphanStatusLabels = React.useMemo(
    () => new Map(orphanStatusOptions.map((item) => [item.code, item.nameAr])),
    [orphanStatusOptions],
  );
  const pagination = studentsQuery.data?.pagination;
  const isEditing = editingStudentId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = students.some((student) => student.id === editingStudentId);
    if (!stillExists) {
      setEditingStudentId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingStudentId, isEditing, students]);

  React.useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);

    setDebounceTimer(timer);

    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      gender: genderFilter,
      bloodType: bloodTypeFilter,
      locality: localityFilter,
      orphan: orphanFilter,
      active: activeFilter,
    });
  }, [activeFilter, bloodTypeFilter, genderFilter, isFilterOpen, localityFilter, orphanFilter]);

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
    if (isEditing || formState.orphanStatusId) {
      return;
    }

    if (orphanStatusOptions.length === 0) {
      return;
    }

    const preferred = orphanStatusOptions.find((item) => item.code === "NONE");
    const defaultOrphan = preferred ?? orphanStatusOptions[0];
    setFormState((prev) =>
      prev.orphanStatusId
        ? prev
        : {
            ...prev,
            orphanStatusId: String(defaultOrphan.id),
          },
    );
  }, [formState.orphanStatusId, isEditing, orphanStatusOptions]);

  React.useEffect(() => {
    if (!formState.localityId) {
      return;
    }

    const locality = geographyMaps.localityById.get(Number(formState.localityId));
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
    setEditingStudentId(null);
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
    setFormError(null);
    setEditingStudentId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormGovernorateId("");
    setFormDirectorateId("");
    setFormSubDistrictId("");
    setFormVillageId("");
    setIsFormOpen(true);
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

    if (!formState.orphanStatusId) {
      setFormError("حالة اليتم مطلوبة.");
      return false;
    }

    if (formState.admissionNo.trim().length > 40) {
      setFormError("رقم القيد يجب ألا يتجاوز 40 حرفًا.");
      return false;
    }

    if (formState.fullName.trim().length > 150) {
      setFormError("الاسم الكامل يجب ألا يتجاوز 150 حرفًا.");
      return false;
    }

    if (formState.healthNotes.trim().length > 1000) {
      setFormError("الملاحظات الصحية يجب ألا تتجاوز 1000 حرف.");
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
    const selectedOrphanStatus = orphanStatusOptionsById.get(
      Number(formState.orphanStatusId),
    );
    const selectedHealthStatus = healthStatusOptions.find(
      (option) => option.id === Number(formState.healthStatusId),
    );
    const orphanStatusIdNumeric = Number(formState.orphanStatusId);
    const mappedGender =
      selectedGender?.code && isStudentGenderCode(selectedGender.code)
        ? selectedGender.code
        : undefined;
    const mappedOrphanStatus =
      selectedOrphanStatus?.code && isStudentOrphanStatus(selectedOrphanStatus.code)
        ? selectedOrphanStatus.code
        : undefined;
    const mappedHealthStatus =
      selectedHealthStatus?.code &&
      isStudentHealthStatusCode(selectedHealthStatus.code)
        ? selectedHealthStatus.code
        : undefined;

    const payload = {
      admissionNo: toOptionalString(formState.admissionNo),
      fullName: formState.fullName.trim(),
      gender: mappedGender,
      genderId: formState.genderId ? Number(formState.genderId) : undefined,
      birthDate: formState.birthDate ? toDateIso(formState.birthDate) : undefined,
      bloodTypeId: formState.bloodTypeId ? Number(formState.bloodTypeId) : null,
      localityId: formState.localityId ? Number(formState.localityId) : null,
      healthStatus: mappedHealthStatus,
      healthStatusId: formState.healthStatusId
        ? Number(formState.healthStatusId)
        : undefined,
      healthNotes: toOptionalString(formState.healthNotes),
      orphanStatus: mappedOrphanStatus,
      orphanStatusId:
        formState.orphanStatusId && orphanStatusIdNumeric > 0
          ? orphanStatusIdNumeric
          : undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingStudentId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: students.update.");
        return;
      }

      updateMutation.mutate(
        {
          studentId: editingStudentId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث الطالب بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: students.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء الطالب بنجاح.");
      },
    });
  };

  const handleStartEdit = (student: StudentListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setActionSuccess(null);
    setEditingStudentId(student.id);
    const nextState = toFormState(student);
    if (!nextState.genderId) {
      const mapped = genderOptions.find((option) => option.code === student.gender);
      if (mapped) {
        nextState.genderId = String(mapped.id);
      }
    }
    if (!nextState.orphanStatusId) {
      const mapped = orphanStatusOptions.find(
        (option) => option.code === student.orphanStatus,
      );
      if (mapped) {
        nextState.orphanStatusId = String(mapped.id);
      }
    }
    if (!nextState.healthStatusId && student.healthStatus) {
      const mapped = healthStatusOptions.find((option) => {
        const code = option.code?.toUpperCase();

        if (!code) {
          return false;
        }

        if (code === student.healthStatus) {
          return true;
        }

        if (student.healthStatus === "CHRONIC_DISEASE" && code === "SICK") {
          return true;
        }

        if (student.healthStatus === "DISABILITY" && code === "DISABLED") {
          return true;
        }

        return false;
      });
      if (mapped) {
        nextState.healthStatusId = String(mapped.id);
      }
    }

    if (!nextState.localityId) {
      setFormGovernorateId("");
      setFormDirectorateId("");
      setFormSubDistrictId("");
      setFormVillageId("");
    } else {
      const locality = geographyMaps.localityById.get(Number(nextState.localityId));
      const selection = resolveSelectionFromLocality(locality, geographyMaps);
      setFormGovernorateId(selection.governorateId);
      setFormDirectorateId(selection.directorateId);
      setFormSubDistrictId(selection.subDistrictId);
      setFormVillageId(selection.villageId);
    }

    setFormState(nextState);
    setIsFormOpen(true);
  };

  const handleToggleActive = (student: StudentListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate(
      {
        studentId: student.id,
        payload: {
          isActive: !student.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            student.isActive
              ? "تم تعطيل الطالب بنجاح."
              : "تم تفعيل الطالب بنجاح.",
          );
        },
      },
    );
  };

  const handleDelete = (student: StudentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الطالب ${student.fullName}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(student.id, {
      onSuccess: () => {
        if (editingStudentId === student.id) {
          resetForm();
        }
        setActionSuccess("تم حذف الطالب بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const getOrphanStatusLabel = (value: StudentOrphanStatus) =>
    orphanStatusLabels.get(value) ?? translateStudentOrphanStatus(value);

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setGenderFilter("all");
    setBloodTypeFilter("all");
    setLocalityFilter("all");
    setOrphanFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setGenderFilter(filterDraft.gender);
    setBloodTypeFilter(filterDraft.bloodType);
    setLocalityFilter(filterDraft.locality);
    setOrphanFilter(filterDraft.orphan);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      genderFilter !== "all" ? 1 : 0,
      bloodTypeFilter !== "all" ? 1 : 0,
      localityFilter !== "all" ? 1 : 0,
      orphanFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [
    activeFilter,
    bloodTypeFilter,
    genderFilter,
    localityFilter,
    orphanFilter,
    searchInput,
  ]);


  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالاسم أو رقم القيد..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
            />
          </div>
        </div>

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الطلاب"
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
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, gender: event.target.value }))
              }
              disabled={!canReadGenders || genderOptionsQuery.isLoading}
            >
              <option value="all">كل الأجناس</option>
              {genderOptions.map((option) => {
                const translated =
                  option.code && isStudentGenderCode(option.code)
                    ? translateStudentGender(option.code)
                    : option.nameAr ?? option.name ?? option.code ?? String(option.id);

                return (
                  <option key={option.id} value={option.id}>
                    {option.nameAr ?? translated}
                  </option>
                );
              })}
            </SelectField>

            <SelectField
              value={filterDraft.bloodType}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, bloodType: event.target.value }))
              }
              disabled={!canReadBloodTypes || bloodTypeOptionsQuery.isLoading}
            >
              <option value="all">كل الفصائل</option>
              {bloodTypeOptions.map((bloodType) => (
                <option key={bloodType.id} value={bloodType.id}>
                  {bloodType.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.locality}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, locality: event.target.value }))
              }
              disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
            >
              <option value="all">كل المحلات</option>
              {localityOptions.map((locality) => (
                <option key={locality.id} value={locality.id}>
                  {formatLocalityHierarchyLabel(locality, geographyMaps)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.orphan}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, orphan: event.target.value }))
              }
              disabled={!canReadOrphanStatuses || orphanStatusesQuery.isLoading}
            >
              <option value="all">كل حالات اليتم</option>
              {orphanStatusOptions.map((orphanStatus) => (
                <option key={orphanStatus.id} value={orphanStatus.id}>
                  {orphanStatus.nameAr}
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
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>قائمة الطلاب</CardTitle>
                    <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
                  </div>
                  <CardDescription>إدارة الطلاب مع الفلترة حسب النوع الاجتماعي وحالة اليتم.</CardDescription>
        </CardHeader>

                <CardContent className="space-y-3">
                  {studentsQuery.isPending ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      جارٍ تحميل قائمة الطلاب...
                    </div>
                  ) : null}

                  {studentsQuery.error ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {studentsQuery.error instanceof Error
                        ? studentsQuery.error.message
                        : "فشل تحميل قائمة الطلاب"}
                    </div>
                  ) : null}

                  {!studentsQuery.isPending && students.length === 0 ? (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      لا توجد سجلات مطابقة.
                    </div>
                  ) : null}

                  {students.map((student) => {
                    const latestEnrollment = student.enrollments[0];

                    return (
                      <div
                        key={student.id}
                        className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="font-medium">{student.fullName}</p>
                            <p className="text-xs text-muted-foreground">
                              رقم القيد: {student.admissionNo ?? "-"} | الميلاد: {formatDate(student.birthDate)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              أولياء الأمور: {student.guardians.length} | القيود: {student.enrollments.length}
                            </p>
                            {latestEnrollment ? (
                              <p className="text-xs text-muted-foreground">
                                آخر قيد: {latestEnrollment.academicYear.code} /{" "}
                                {latestEnrollment.section.code} (
                                {translateStudentEnrollmentStatus(latestEnrollment.status)})
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              الموقع:{" "}
                              {student.locality
                                ? formatLocalityHierarchyLabel(
                                    (geographyMaps.localityById.get(student.locality.id) ??
                                      student.locality) as LocalityLabelInput,
                                    geographyMaps,
                                  )
                                : "غير محدد"}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline">
                              {student.genderLookup?.nameAr ?? translateStudentGender(student.gender)}
                            </Badge>
                            <Badge variant="outline">
                              {student.bloodType ? student.bloodType.name : "بدون فصيلة"}
                            </Badge>
                            <Badge variant={orphanBadgeVariant(student.orphanStatus)}>
                              {student.orphanStatusLookup?.nameAr ?? getOrphanStatusLabel(student.orphanStatus)}
                            </Badge>
                            <Badge variant={healthBadgeVariant(student.healthStatus)}>
                              {student.healthStatusLookup?.nameAr ??
                                (student.healthStatus
                                  ? translateStudentHealthStatus(student.healthStatus)
                                  : "غير محدد")}
                            </Badge>
                            <Badge variant={student.isActive ? "default" : "outline"}>
                              {student.isActive ? "نشط" : "غير نشط"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleStartEdit(student)}
                            disabled={!canUpdate || updateMutation.isPending}
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            تعديل
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(student)}
                            disabled={!canUpdate || updateMutation.isPending}
                          >
                            {student.isActive ? "تعطيل" : "تفعيل"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleDelete(student)}
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
                        disabled={!pagination || pagination.page <= 1 || studentsQuery.isFetching}
                      >
                        السابق
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((prev) =>
                            pagination ? Math.min(prev + 1, pagination.totalPages) : prev,
                          )
                        }
                        disabled={
                          !pagination ||
                          pagination.page >= pagination.totalPages ||
                          studentsQuery.isFetching
                        }
                      >
                        التالي
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void studentsQuery.refetch()}
                        disabled={studentsQuery.isFetching}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${studentsQuery.isFetching ? "animate-spin" : ""}`}
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
        label="إنشاء"
        ariaLabel="إنشاء طالب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل طالب" : "إنشاء طالب"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء طالب"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>students.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">رقم القيد</label>
              <Input
                value={formState.admissionNo}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, admissionNo: event.target.value }))
                }
                placeholder="ق-2026-00123"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الاسم الكامل *</label>
              <Input
                value={formState.fullName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                }
                placeholder="محمد أحمد علي"
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الجنس *</label>
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
                      option.code && isStudentGenderCode(option.code)
                        ? translateStudentGender(option.code)
                        : option.nameAr ?? option.name ?? option.code ?? String(option.id);

                    return (
                      <option key={option.id} value={option.id}>
                        {option.nameAr ?? translated}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">تاريخ الميلاد</label>
                <Input
                  type="date"
                  value={formState.birthDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, birthDate: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">فصيلة الدم</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.bloodTypeId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      bloodTypeId: event.target.value,
                    }))
                  }
                  disabled={!canReadBloodTypes || bloodTypeOptionsQuery.isLoading}
                >
                  <option value="">غير محدد</option>
                  {bloodTypeOptions.map((bloodType) => (
                    <option key={bloodType.id} value={bloodType.id}>
                      {bloodType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الحالة الصحية</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.healthStatusId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      healthStatusId: event.target.value,
                    }))
                  }
                  disabled={!canReadHealthStatuses || healthStatusOptionsQuery.isLoading}
                >
                  <option value="">غير محدد</option>
                  {healthStatusOptions.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.nameAr ??
                        (status.code && isStudentHealthStatusCode(status.code)
                          ? translateStudentHealthStatus(status.code)
                          : status.code ?? String(status.id))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">حالة اليتم *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.orphanStatusId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      orphanStatusId: event.target.value,
                    }))
                  }
                  disabled={!canReadOrphanStatuses || orphanStatusesQuery.isLoading}
                >
                  <option value="">اختر حالة اليتم</option>
                  {orphanStatusOptions.map((orphanStatus) => (
                    <option key={orphanStatus.id} value={orphanStatus.id}>
                      {orphanStatus.nameAr}
                    </option>
                  ))}
                </select>
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
                    onChange={(event) => handleGovernorateChange(event.target.value)}
                    disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
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
                    onChange={(event) => handleDirectorateChange(event.target.value)}
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
                    onChange={(event) => handleSubDistrictChange(event.target.value)}
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
                    onChange={(event) => handleVillageChange(event.target.value)}
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
                      onChange={(event) => handleLocalityChange(event.target.value)}
                      disabled={
                        !canReadLocalities ||
                        geographyOptionsQuery.isLoading ||
                        !formDirectorateId
                      }
                    >
                      <option value="">اختر المحلة</option>
                      {filteredLocalities.map((locality) => (
                        <option key={locality.id} value={locality.id}>
                          {formatLocalityHierarchyLabel(locality, geographyMaps)}
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
                  onChange={(event) => handleLocalityChange(event.target.value)}
                  disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
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

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات صحية</label>
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formState.healthNotes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, healthNotes: event.target.value }))
                }
                placeholder="ملاحظات صحية إضافية (اختياري)"
              />
            </div>

            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>نشط</span>
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
            </label>

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
                {isEditing ? "حفظ التعديلات" : "إنشاء طالب"}
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
