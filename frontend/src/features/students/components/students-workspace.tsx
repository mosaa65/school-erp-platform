"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ArrowUpRight,
  CalendarDays,
  Eye,
  HeartPulse,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  ScanSearch,
  Trash2,
  Users,
  User,
  UserCheck,
  MapPin,
  Droplets,
  Heart,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
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
import { Fab } from "@/components/ui/fab";
import { EntityDetailsShell } from "@/presentation/entity-surface/entity-details-shell";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceGrid } from "@/presentation/entity-surface/entity-surface-grid";
import { EntitySurfaceHeaderActionButton } from "@/presentation/entity-surface/entity-surface-header-action-button";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import { getEntitySurfaceDefinition } from "@/presentation/entity-surface/entity-surface-registry";
import { EntitySurfaceRow } from "@/presentation/entity-surface/entity-surface-row";
import type {
  EntityDetailsMode,
  EntitySurfaceViewMode,
  EntitySurfaceQuickAction,
} from "@/presentation/entity-surface/entity-surface-types";
import { useEntitySurface } from "@/hooks/use-entity-surface";
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
import { StudentDetailsContent } from "@/features/students/components/student-details-content";
import {
  STUDENT_DETAILS_PERMISSION_CODES,
  STUDENT_SENSITIVE_PERMISSION_CODES,
  buildStudentSurfacePreview,
  getStudentDetailsPath,
  getStudentPlacementLongLabel,
  getStudentStatusChips,
  studentSurfaceDefinition,
} from "@/features/students/presentation/student-surface-definition";
import {
  translateStudentGender,
  translateStudentHealthStatus,
} from "@/lib/i18n/ar";
import { cn } from "@/lib/utils";
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

function resolveStudentsViewMode(
  requestedMode: EntitySurfaceViewMode,
  allowedViewModes: EntitySurfaceViewMode[] | undefined,
  fallbackMode: EntitySurfaceViewMode,
): EntitySurfaceViewMode {
  if (!allowedViewModes || allowedViewModes.length === 0) {
    return requestedMode;
  }

  if (allowedViewModes.includes(requestedMode)) {
    return requestedMode;
  }

  return allowedViewModes.includes(fallbackMode) ? fallbackMode : allowedViewModes[0];
}

function resolveStudentsDetailsMode(
  requestedMode: string,
  currentViewMode: EntitySurfaceViewMode,
  defaultMode: EntityDetailsMode,
): EntityDetailsMode {
  if (requestedMode === "screen-default") {
    return currentViewMode === "dense-row" ? "inline" : defaultMode;
  }

  return requestedMode as EntityDetailsMode;
}

export function StudentsWorkspace() {
  const router = useRouter();
  const { hasAnyPermission, hasPermission } = useRbac();
  const entitySurface = useEntitySurface();
  const studentsSurface = React.useMemo(
    () => getEntitySurfaceDefinition<StudentListItem>("students") ?? studentSurfaceDefinition,
    [],
  );
  const canCreate = hasPermission("students.create");
  const canUpdate = hasPermission("students.update");
  const canDelete = hasPermission("students.delete");
  const canReadDetails = hasAnyPermission([...STUDENT_DETAILS_PERMISSION_CODES]);
  const canReadSensitiveFields = hasAnyPermission([...STUDENT_SENSITIVE_PERMISSION_CODES]);
  const canReadGenders = hasPermission("lookup-genders.read");
  const canReadBloodTypes = hasPermission("lookup-blood-types.read");
  const canReadLocalities = hasPermission("localities.read");
  const canReadHealthStatuses = hasPermission("lookup-health-statuses.read");
  const canReadOrphanStatuses = hasPermission("lookup-orphan-statuses.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
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
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [contextStudentId, setContextStudentId] = React.useState<string | null>(null);
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
  const resolvedViewMode = React.useMemo(
    () =>
      resolveStudentsViewMode(
        entitySurface.defaultViewMode,
        studentsSurface.allowedViewModes,
        studentsSurface.defaultViewMode ?? "list",
      ),
    [entitySurface.defaultViewMode, studentsSurface.allowedViewModes, studentsSurface.defaultViewMode],
  );

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
  const pagination = studentsQuery.data?.pagination;
  const isEditing = editingStudentId !== null;
  const selectedStudent = React.useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );
  const contextStudent = React.useMemo(
    () => students.find((student) => student.id === contextStudentId) ?? null,
    [contextStudentId, students],
  );
  const studentDetailsMode = resolveStudentsDetailsMode(
    entitySurface.detailsOpenMode,
    resolvedViewMode,
    studentsSurface.detailsMode ?? "dialog",
  );
  const showStudentCardDetails =
    canReadDetails && entitySurface.showExtendedDetailsInCards;
  const usesBlurBackdrop = entitySurface.longPressMode === "enabled-with-blur";

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
    if (selectedStudentId && !students.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(null);
    }

    if (contextStudentId && !students.some((student) => student.id === contextStudentId)) {
      setContextStudentId(null);
    }
  }, [contextStudentId, selectedStudentId, students]);

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
    setSelectedStudentId(null);
    setContextStudentId(null);
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
    setSelectedStudentId(null);
    setContextStudentId(null);
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
        if (selectedStudentId === student.id) {
          setSelectedStudentId(null);
        }
        if (contextStudentId === student.id) {
          setContextStudentId(null);
        }
        setActionSuccess("تم حذف الطالب بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const handleOpenStudentDetails = React.useCallback(
    (student: StudentListItem) => {
      setContextStudentId(null);

      if (!canReadDetails) {
        return;
      }

      if (studentDetailsMode === "page") {
        router.push(getStudentDetailsPath(student));
        return;
      }

      setSelectedStudentId(student.id);
    },
    [canReadDetails, router, studentDetailsMode],
  );
  const renderStudentHeaderActions = (student: StudentListItem) => {
    if (!canReadDetails && !canUpdate && !canDelete) {
      return null;
    }

    return (
      <div className="flex items-center gap-1">
        {canReadDetails ? (
          <EntitySurfaceHeaderActionButton
            label="معاينة"
            icon={<Eye className="h-3.5 w-3.5" />}
            tone="preview"
            colorMode={entitySurface.colorMode}
            entityKey="students"
            onClick={() => handleOpenStudentDetails(student)}
          />
        ) : null}

        {canUpdate ? (
          <EntitySurfaceHeaderActionButton
            label="تعديل"
            icon={<PencilLine className="h-3.5 w-3.5" />}
            tone="edit"
            colorMode={entitySurface.colorMode}
            entityKey="students"
            disabled={updateMutation.isPending}
            onClick={() => handleStartEdit(student)}
          />
        ) : null}

        {canDelete ? (
          <EntitySurfaceHeaderActionButton
            label="حذف"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            tone="delete"
            disabled={deleteMutation.isPending}
            onClick={() => handleDelete(student)}
          />
        ) : null}
      </div>
    );
  };
  const buildStudentQuickActions = (
    student: StudentListItem,
  ): EntitySurfaceQuickAction[] => {
    const actions: EntitySurfaceQuickAction[] = [];

    if (canReadDetails) {
      actions.push({
        key: "details",
        label: studentDetailsMode === "page" ? "فتح الصفحة" : "تفاصيل",
        icon:
          studentDetailsMode === "page" ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ScanSearch className="h-3.5 w-3.5" />
          ),
        tone: "accent",
        onClick: () => handleOpenStudentDetails(student),
      });
    }

    if (canUpdate) {
      actions.push(
        {
          key: "edit",
          label: "تعديل",
          icon: <PencilLine className="h-3.5 w-3.5" />,
          onClick: () => handleStartEdit(student),
          disabled: updateMutation.isPending,
        },
        {
          key: "toggle-active",
          label: student.isActive ? "تعطيل" : "تفعيل",
          icon: <Activity className="h-3.5 w-3.5" />,
          tone: "ghost",
          onClick: () => handleToggleActive(student),
          disabled: updateMutation.isPending,
        },
      );
    }

    if (canDelete) {
      actions.push({
        key: "delete",
        label: "حذف",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        tone: "danger",
        onClick: () => handleDelete(student),
        disabled: deleteMutation.isPending,
      });
    }

    return actions;
  };

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
    return [
      searchInput.trim() ? 1 : 0,
      genderFilter !== "all" ? 1 : 0,
      bloodTypeFilter !== "all" ? 1 : 0,
      localityFilter !== "all" ? 1 : 0,
      orphanFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [
    activeFilter,
    bloodTypeFilter,
    genderFilter,
    localityFilter,
    orphanFilter,
    searchInput,
  ]);
  const contextStudentQuickActions = contextStudent ? buildStudentQuickActions(contextStudent) : [];
  const selectedStudentQuickActions = selectedStudent
    ? buildStudentQuickActions(selectedStudent).filter((action) => action.key !== "details")
    : [];

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالاسم أو رقم الطالب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>النوع الاجتماعي</Label>
              <SelectField
                value={filterDraft.gender}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, gender: event.target.value }))
                }
                disabled={!canReadGenders || genderOptionsQuery.isLoading}
                icon={<User className="h-4 w-4" />}
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
            </div>

            <div className="space-y-1">
              <Label>فصيلة الدم</Label>
              <SelectField
                value={filterDraft.bloodType}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, bloodType: event.target.value }))
                }
                disabled={!canReadBloodTypes || bloodTypeOptionsQuery.isLoading}
                icon={<Droplets className="h-4 w-4" />}
              >
                <option value="all">كل الفصائل</option>
                {bloodTypeOptions.map((bloodType) => (
                  <option key={bloodType.id} value={bloodType.id}>
                    {bloodType.name}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>المحلّة</Label>
              <SelectField
                value={filterDraft.locality}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, locality: event.target.value }))
                }
                disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
                icon={<MapPin className="h-4 w-4" />}
              >
                <option value="all">كل المحلات</option>
                {localityOptions.map((locality) => (
                  <option key={locality.id} value={locality.id}>
                    {formatLocalityHierarchyLabel(locality, geographyMaps)}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>حالة اليتم</Label>
              <SelectField
                value={filterDraft.orphan}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, orphan: event.target.value }))
                }
                disabled={!canReadOrphanStatuses || orphanStatusesQuery.isLoading}
                icon={<Heart className="h-4 w-4" />}
              >
                <option value="all">كل حالات اليتم</option>
                {orphanStatusOptions.map((orphanStatus) => (
                  <option key={orphanStatus.id} value={orphanStatus.id}>
                    {orphanStatus.nameAr}
                  </option>
                ))}
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
                icon={<Activity className="h-4 w-4" />}
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

            {!studentsQuery.isPending && students.length > 0 ? (
              <EntitySurfaceGrid
                viewMode={resolvedViewMode}
                density={entitySurface.density}
                richness={entitySurface.richness}
                colorMode={entitySurface.colorMode}
                visualStyle={entitySurface.visualStyle}
                effectsPreset={entitySurface.effectsPreset}
                shapePreset={entitySurface.shapePreset}
                entityKey="students"
                inlineActionsMode={entitySurface.inlineActionsMode}
              >
                {students.map((student) => {
                  const preview =
                    studentsSurface.buildPreview?.(student) ?? buildStudentSurfacePreview(student);
                  const contextQuickActions = buildStudentQuickActions(student);
                  const headerActions = renderStudentHeaderActions(student);
                  const canOpenContext =
                    entitySurface.longPressMode !== "disabled" && contextQuickActions.length > 0;
                  const handleCardClick = canReadDetails
                    ? () => handleOpenStudentDetails(student)
                    : undefined;

                  if (resolvedViewMode === "dense-row") {
                    return (
                      <EntitySurfaceRow
                        key={student.id}
                        title={preview.title}
                        subtitle={showStudentCardDetails ? preview.subtitle : undefined}
                        meta={showStudentCardDetails ? preview.meta : undefined}
                        avatar={preview.avatar}
                        headerActions={headerActions}
                        statusChips={showStudentCardDetails ? preview.statusChips : undefined}
                        density={entitySurface.density}
                        richness={entitySurface.richness}
                        colorMode={entitySurface.colorMode}
                        visualStyle={entitySurface.visualStyle}
                        effectsPreset={entitySurface.effectsPreset}
                        shapePreset={entitySurface.shapePreset}
                        entityKey="students"
                        inlineActionsMode={entitySurface.inlineActionsMode}
                        motionPreset={entitySurface.motionPreset}
                        reducedMotion={entitySurface.reducedMotion}
                        longPressMode={entitySurface.longPressMode}
                        avatarMode={entitySurface.avatarMode}
                        contextOpen={contextStudentId === student.id}
                        onClick={handleCardClick}
                        onLongPress={() => {
                          if (!canOpenContext) {
                            return;
                          }
                          setContextStudentId(student.id);
                        }}
                      />
                    );
                  }

                  return (
                    <EntitySurfaceCard
                      key={student.id}
                      title={preview.title}
                      subtitle={showStudentCardDetails ? preview.subtitle : undefined}
                      description={showStudentCardDetails ? preview.description : undefined}
                      avatar={preview.avatar}
                      headerActions={headerActions}
                      fields={showStudentCardDetails ? preview.fields : undefined}
                      statusChips={showStudentCardDetails ? preview.statusChips : undefined}
                      viewMode={resolvedViewMode}
                      density={entitySurface.density}
                      richness={entitySurface.richness}
                      colorMode={entitySurface.colorMode}
                      visualStyle={entitySurface.visualStyle}
                      effectsPreset={entitySurface.effectsPreset}
                      shapePreset={entitySurface.shapePreset}
                      entityKey="students"
                      inlineActionsMode={entitySurface.inlineActionsMode}
                      motionPreset={entitySurface.motionPreset}
                      reducedMotion={entitySurface.reducedMotion}
                      longPressMode={entitySurface.longPressMode}
                      avatarMode={entitySurface.avatarMode}
                      contextOpen={contextStudentId === student.id}
                      onClick={handleCardClick}
                      onLongPress={() => {
                        if (!canOpenContext) {
                          return;
                        }
                        setContextStudentId(student.id);
                      }}
                    />
                  );
                })}
              </EntitySurfaceGrid>
            ) : null}

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

      {contextStudent ? (
        <div className="fixed inset-0 z-[85]">
          <div
            className={cn(
              "absolute inset-0",
              usesBlurBackdrop ? "bg-black/24 backdrop-blur-sm" : "bg-black/18",
            )}
            onClick={() => setContextStudentId(null)}
          />
          <div className="absolute inset-x-4 bottom-4 mx-auto max-w-sm">
            <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-3 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/88">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                اختصارات الطالب
              </p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                {contextStudent.fullName} • {contextStudent.admissionNo ?? "بدون رقم"}
              </p>
              {contextStudentQuickActions.length > 0 ? (
                <EntitySurfaceQuickActions actions={contextStudentQuickActions} className="mt-3" />
              ) : (
                <p className="mt-3 text-xs text-slate-500 dark:text-white/55">
                  لا توجد اختصارات متاحة لهذا المستخدم.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedStudent ? (
        <EntityDetailsShell
          open
          mode={studentDetailsMode}
          title={selectedStudent.fullName}
          subtitle={`${selectedStudent.admissionNo ?? "بدون رقم"} • ${getStudentPlacementLongLabel(selectedStudent)}`}
          statusChips={getStudentStatusChips(selectedStudent)}
          actions={selectedStudentQuickActions}
          density={entitySurface.density}
          visualStyle={entitySurface.visualStyle}
          effectsPreset={entitySurface.effectsPreset}
          shapePreset={entitySurface.shapePreset}
          onClose={() => setSelectedStudentId(null)}
        >
          <StudentDetailsContent
            student={selectedStudent}
            canReadSensitive={canReadSensitiveFields}
            quickActions={selectedStudentQuickActions}
          />
        </EntityDetailsShell>
      ) : null}

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
            <div className="space-y-1">
              <Label>رقم الطالب</Label>
              {isEditing ? (
                <Input
                  value={formState.admissionNo}
                  readOnly
                  placeholder="سيتم توليده تلقائيًا"
                  icon={<UserCheck className="h-4 w-4" />}
                />
              ) : (
                <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  سيُولد رقم الطالب تلقائيًا بعد الحفظ.
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label required>الاسم الكامل</Label>
              <Input
                value={formState.fullName}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                }
                placeholder="محمد أحمد علي"
                icon={<User className="h-4 w-4" />}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label required>الجنس</Label>
                <SelectField
                  value={formState.genderId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      genderId: event.target.value,
                    }))
                  }
                  disabled={!canReadGenders || genderOptionsQuery.isLoading}
                  icon={<User className="h-4 w-4" />}
                  required
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
                </SelectField>
              </div>

              <div className="space-y-1">
                <Label>تاريخ الميلاد</Label>
                <Input
                  type="date"
                  value={formState.birthDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, birthDate: event.target.value }))
                  }
                  icon={<CalendarDays className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>فصيلة الدم</Label>
                <SelectField
                  value={formState.bloodTypeId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      bloodTypeId: event.target.value,
                    }))
                  }
                  disabled={!canReadBloodTypes || bloodTypeOptionsQuery.isLoading}
                  icon={<Droplets className="h-4 w-4" />}
                >
                  <option value="">غير محدد</option>
                  {bloodTypeOptions.map((bloodType) => (
                    <option key={bloodType.id} value={bloodType.id}>
                      {bloodType.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-1">
                <Label>الحالة الصحية</Label>
                <SelectField
                  value={formState.healthStatusId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      healthStatusId: event.target.value,
                    }))
                  }
                  disabled={!canReadHealthStatuses || healthStatusOptionsQuery.isLoading}
                  icon={<HeartPulse className="h-4 w-4" />}
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
                </SelectField>
              </div>

              <div className="space-y-1">
                <Label required>حالة اليتم</Label>
                <SelectField
                  value={formState.orphanStatusId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      orphanStatusId: event.target.value,
                    }))
                  }
                  disabled={!canReadOrphanStatuses || orphanStatusesQuery.isLoading}
                  icon={<Heart className="h-4 w-4" />}
                  required
                >
                  <option value="">اختر حالة اليتم</option>
                  {orphanStatusOptions.map((orphanStatus) => (
                    <option key={orphanStatus.id} value={orphanStatus.id}>
                      {orphanStatus.nameAr}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="space-y-2">
              <Label>الموقع الجغرافي (هرمي)</Label>
              {hasGeographyHierarchy ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <SelectField
                    value={formGovernorateId}
                    onChange={(event) => handleGovernorateChange(event.target.value)}
                    disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
                    icon={<MapPin className="h-4 w-4" />}
                  >
                    <option value="">اختر المحافظة</option>
                    {governorateOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nameAr ?? item.name ?? `محافظة #${item.id}`}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    value={formDirectorateId}
                    onChange={(event) => handleDirectorateChange(event.target.value)}
                    disabled={
                      !canReadLocalities ||
                      geographyOptionsQuery.isLoading ||
                      !formGovernorateId
                    }
                    icon={<MapPin className="h-4 w-4" />}
                  >
                    <option value="">اختر المديرية</option>
                    {filteredDirectorates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nameAr ?? item.name ?? `مديرية #${item.id}`}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    value={formSubDistrictId}
                    onChange={(event) => handleSubDistrictChange(event.target.value)}
                    disabled={
                      !canReadLocalities ||
                      geographyOptionsQuery.isLoading ||
                      !formDirectorateId
                    }
                    icon={<MapPin className="h-4 w-4" />}
                  >
                    <option value="">اختر العزلة</option>
                    {filteredSubDistricts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nameAr ?? item.name ?? `عزلة #${item.id}`}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    value={formVillageId}
                    onChange={(event) => handleVillageChange(event.target.value)}
                    disabled={
                      !canReadLocalities ||
                      geographyOptionsQuery.isLoading ||
                      !formSubDistrictId
                    }
                    icon={<MapPin className="h-4 w-4" />}
                  >
                    <option value="">اختر القرية</option>
                    {filteredVillages.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nameAr ?? item.name ?? `قرية #${item.id}`}
                      </option>
                    ))}
                  </SelectField>

                  <div className="md:col-span-2">
                    <SelectField
                      value={formState.localityId}
                      onChange={(event) => handleLocalityChange(event.target.value)}
                      disabled={
                        !canReadLocalities ||
                        geographyOptionsQuery.isLoading ||
                        !formDirectorateId
                      }
                      icon={<MapPin className="h-4 w-4" />}
                    >
                      <option value="">اختر المحلة</option>
                      {filteredLocalities.map((locality) => (
                        <option key={locality.id} value={locality.id}>
                          {formatLocalityHierarchyLabel(locality, geographyMaps)}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <p className="text-xs text-muted-foreground md:col-span-2 px-1">
                    {formSelectedLocality
                      ? `المحدد: ${formatLocalityHierarchyLabel(
                        formSelectedLocality,
                        geographyMaps,
                      )}`
                      : "يمكن اختيار محلة حضرية بعد تحديد المديرية، أو محلة ريفية بعد اختيار العزلة والقرية."}
                  </p>
                </div>
              ) : (
                <SelectField
                  value={formState.localityId}
                  onChange={(event) => handleLocalityChange(event.target.value)}
                  disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
                  icon={<MapPin className="h-4 w-4" />}
                >
                  <option value="">غير محدد</option>
                  {localityOptions.map((locality) => (
                    <option key={locality.id} value={locality.id}>
                      {formatLocalityHierarchyLabel(locality, geographyMaps)}
                    </option>
                  ))}
                </SelectField>
              )}
            </div>

            <div className="space-y-1">
              <Label>ملاحظات صحية</Label>
              <textarea
                className="min-h-20 w-full rounded-2xl border border-input bg-background/50 px-3 py-2 text-sm backdrop-blur-sm transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                value={formState.healthNotes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, healthNotes: event.target.value }))
                }
                placeholder="ملاحظات صحية إضافية (اختياري)"
              />
            </div>

            <div className="space-y-1">
              <Label>الحالة</Label>
              <SelectField
                value={formState.isActive ? "active" : "inactive"}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: event.target.value === "active",
                  }))
                }
                icon={<Activity className="h-4 w-4" />}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </SelectField>
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

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء طالب"}
              </button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm} className="rounded-2xl">
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
