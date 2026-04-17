"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ArrowUpRight,
  Eye,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  ScanSearch,
  Trash2,
  Users,
  User,
  IdCard,
  MapPin,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InternationalPhoneField } from "@/components/ui/international-phone-field";
import { Label } from "@/components/ui/label";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterDrawerActions } from "@/components/ui/filter-drawer-actions";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { EntityDetailsShell } from "@/presentation/entity-surface/entity-details-shell";
import { EntitySurfaceCard } from "@/presentation/entity-surface/entity-surface-card";
import { EntitySurfaceGrid } from "@/presentation/entity-surface/entity-surface-grid";
import { EntitySurfaceHeaderActionButton } from "@/presentation/entity-surface/entity-surface-header-action-button";
import { EntitySurfaceQuickActions } from "@/presentation/entity-surface/entity-surface-quick-actions";
import { getEntitySurfaceDefinition } from "@/presentation/entity-surface/entity-surface-registry";
import { EntitySurfaceRow } from "@/presentation/entity-surface/entity-surface-row";
import type {
  EntityDetailsMode,
  EntitySurfaceQuickAction,
  EntitySurfaceViewMode,
} from "@/presentation/entity-surface/entity-surface-types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEntitySurface } from "@/hooks/use-entity-surface";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useGeographyOptionsQuery } from "@/features/lookup-catalog/hooks/use-geography-options-query";
import {
  buildGeographyMaps,
  formatLocalityHierarchyLabel,
  resolveSelectionFromLocality,
} from "@/features/lookup-catalog/lib/geography";
import { GuardianDetailsContent } from "@/features/guardians/components/guardian-details-content";
import {
  useCreateGuardianMutation,
  useDeleteGuardianMutation,
  useUpdateGuardianMutation,
} from "@/features/guardians/hooks/use-guardians-mutations";
import { useGuardianGenderOptionsQuery } from "@/features/guardians/hooks/use-gender-options-query";
import { useGuardianIdTypeOptionsQuery } from "@/features/guardians/hooks/use-id-type-options-query";
import { useGuardiansQuery } from "@/features/guardians/hooks/use-guardians-query";
import {
  buildGuardianSurfacePreview,
  GUARDIAN_DETAILS_PERMISSION_CODES,
  getGuardianDetailsPath,
  getGuardianStatusChips,
  guardianSurfaceDefinition,
} from "@/features/guardians/presentation/guardian-surface-definition";
import { translateGuardianRelationship, translateStudentGender } from "@/lib/i18n/ar";
import {
  DEFAULT_COUNTRY_ISO2,
  normalizePhoneValue,
  parseStoredPhoneValue,
} from "@/lib/intl/phone";
import { cn } from "@/lib/utils";
import type {
  GuardianListItem,
  GuardianRelationship,
  StudentGender,
} from "@/lib/api/client";

type GuardianFormState = {
  fullName: string;
  genderId: string;
  idNumber: string;
  idTypeId: string;
  localityId: string;
  phonePrimary: string;
  phonePrimaryCountryIso2: string;
  phonePrimaryNationalNumber: string;
  phoneSecondary: string;
  phoneSecondaryCountryIso2: string;
  phoneSecondaryNationalNumber: string;
  whatsappNumber: string;
  whatsappCountryIso2: string;
  whatsappNationalNumber: string;
  residenceText: string;
  isActive: boolean;
};

type GuardianFilterDraft = {
  gender: string;
  idType: string;
  locality: string;
  active: "all" | "active" | "inactive";
};

const PAGE_SIZE = 12;

const RELATIONSHIP_ORDER: GuardianRelationship[] = [
  "FATHER",
  "MOTHER",
  "BROTHER",
  "SISTER",
  "UNCLE",
  "AUNT",
  "GRANDFATHER",
  "GRANDMOTHER",
  "OTHER",
];

const STUDENT_GENDER_CODES: StudentGender[] = ["MALE", "FEMALE", "OTHER"];

const DEFAULT_FORM_STATE: GuardianFormState = {
  fullName: "",
  genderId: "",
  idNumber: "",
  idTypeId: "",
  localityId: "",
  phonePrimary: "",
  phonePrimaryCountryIso2: DEFAULT_COUNTRY_ISO2,
  phonePrimaryNationalNumber: "",
  phoneSecondary: "",
  phoneSecondaryCountryIso2: DEFAULT_COUNTRY_ISO2,
  phoneSecondaryNationalNumber: "",
  whatsappNumber: "",
  whatsappCountryIso2: DEFAULT_COUNTRY_ISO2,
  whatsappNationalNumber: "",
  residenceText: "",
  isActive: true,
};

const DEFAULT_FILTER_DRAFT: GuardianFilterDraft = {
  gender: "all",
  idType: "all",
  locality: "all",
  active: "all",
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isStudentGenderCode(value: string): value is StudentGender {
  return STUDENT_GENDER_CODES.includes(value as StudentGender);
}

function toPhoneFieldState(value: string | null | undefined): {
  phone: string;
  countryIso2: string;
  nationalNumber: string;
} {
  const parsed = parseStoredPhoneValue(value, DEFAULT_COUNTRY_ISO2);
  return {
    phone: parsed.e164,
    countryIso2: parsed.countryIso2,
    nationalNumber: parsed.nationalNumber,
  };
}

function composePhoneValue(countryIso2: string, nationalNumber: string): string | undefined {
  const normalizedNationalNumber = nationalNumber.trim();
  if (!normalizedNationalNumber) {
    return undefined;
  }

  const normalized = normalizePhoneValue({
    countryIso2,
    nationalNumber: normalizedNationalNumber,
  });

  return normalized.ok ? normalized.e164 : undefined;
}

function toFormState(guardian: GuardianListItem): GuardianFormState {
  const primaryPhone = toPhoneFieldState(guardian.phonePrimary);
  const secondaryPhone = toPhoneFieldState(guardian.phoneSecondary);
  const whatsappPhone = toPhoneFieldState(guardian.whatsappNumber);

  return {
    fullName: guardian.fullName,
    genderId: guardian.genderId ? String(guardian.genderId) : "",
    idNumber: guardian.idNumber ?? "",
    idTypeId: guardian.idTypeId ? String(guardian.idTypeId) : "",
    localityId: guardian.localityId ? String(guardian.localityId) : "",
    phonePrimary: primaryPhone.phone,
    phonePrimaryCountryIso2: primaryPhone.countryIso2,
    phonePrimaryNationalNumber: primaryPhone.nationalNumber,
    phoneSecondary: secondaryPhone.phone,
    phoneSecondaryCountryIso2: secondaryPhone.countryIso2,
    phoneSecondaryNationalNumber: secondaryPhone.nationalNumber,
    whatsappNumber: whatsappPhone.phone,
    whatsappCountryIso2: whatsappPhone.countryIso2,
    whatsappNationalNumber: whatsappPhone.nationalNumber,
    residenceText: guardian.residenceText ?? "",
    isActive: guardian.isActive,
  };
}

function toRelationshipPreview(guardian: GuardianListItem): string {
  if (guardian.students.length === 0) {
    return "لا يوجد طلاب مرتبطون";
  }

  const primary = guardian.students.find((item) => item.isPrimary);
  if (primary) {
    return `${translateGuardianRelationship(primary.relationship)} - ${primary.student.fullName}`;
  }

  const sorted = [...guardian.students].sort(
    (a, b) =>
      RELATIONSHIP_ORDER.indexOf(a.relationship) - RELATIONSHIP_ORDER.indexOf(b.relationship),
  );
  const first = sorted[0];
  return `${translateGuardianRelationship(first.relationship)} - ${first.student.fullName}`;
}

function resolveGuardiansViewMode(
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

function resolveGuardiansDetailsMode(
  requestedMode: string,
  currentViewMode: EntitySurfaceViewMode,
  defaultMode: EntityDetailsMode,
): EntityDetailsMode {
  if (requestedMode === "screen-default") {
    return currentViewMode === "dense-row" ? "inline" : defaultMode;
  }

  return requestedMode as EntityDetailsMode;
}

export function GuardiansWorkspace() {
  const { hasAnyPermission, hasPermission } = useRbac();
  const entitySurface = useEntitySurface();
  const guardiansSurface = React.useMemo(
    () => getEntitySurfaceDefinition<GuardianListItem>("guardians") ?? guardianSurfaceDefinition,
    [],
  );
  const canCreate = hasPermission("guardians.create");
  const canReadDetails = hasAnyPermission([...GUARDIAN_DETAILS_PERMISSION_CODES]);
  const canUpdate = hasPermission("guardians.update");
  const canDelete = hasPermission("guardians.delete");
  const canUseQuickActions = canReadDetails || canUpdate || canDelete;
  const canReadGenders = hasPermission("lookup-genders.read");
  const canReadIdTypes = hasPermission("lookup-id-types.read");
  const canReadLocalities = hasPermission("localities.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<string>("all");
  const [idTypeFilter, setIdTypeFilter] = React.useState<string>("all");
  const [localityFilter, setLocalityFilter] = React.useState<string>("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [filterDraft, setFilterDraft] = React.useState<GuardianFilterDraft>(
    DEFAULT_FILTER_DRAFT,
  );

  const [editingGuardianId, setEditingGuardianId] = React.useState<string | null>(null);
  const [selectedGuardianId, setSelectedGuardianId] = React.useState<string | null>(null);
  const [contextGuardianId, setContextGuardianId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<GuardianFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [formGovernorateId, setFormGovernorateId] = React.useState<string>("");
  const [formDirectorateId, setFormDirectorateId] = React.useState<string>("");
  const [formSubDistrictId, setFormSubDistrictId] = React.useState<string>("");
  const [formVillageId, setFormVillageId] = React.useState<string>("");

  const guardiansQuery = useGuardiansQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    genderId: genderFilter === "all" ? undefined : Number(genderFilter),
    idTypeId: idTypeFilter === "all" ? undefined : Number(idTypeFilter),
    localityId: localityFilter === "all" ? undefined : Number(localityFilter),
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });
  const genderOptionsQuery = useGuardianGenderOptionsQuery();
  const idTypeOptionsQuery = useGuardianIdTypeOptionsQuery();
  const geographyOptionsQuery = useGeographyOptionsQuery("guardians");

  const createMutation = useCreateGuardianMutation();
  const updateMutation = useUpdateGuardianMutation();
  const deleteMutation = useDeleteGuardianMutation();

  const guardians = React.useMemo(
    () => guardiansQuery.data?.data ?? [],
    [guardiansQuery.data?.data],
  );
  const genderOptions = React.useMemo(
    () => genderOptionsQuery.data ?? [],
    [genderOptionsQuery.data],
  );
  const idTypeOptions = React.useMemo(
    () => idTypeOptionsQuery.data ?? [],
    [idTypeOptionsQuery.data],
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
  const pagination = guardiansQuery.data?.pagination;
  const selectedGuardian = React.useMemo(
    () => guardians.find((guardian) => guardian.id === selectedGuardianId) ?? null,
    [guardians, selectedGuardianId],
  );
  const contextGuardian = React.useMemo(
    () => guardians.find((guardian) => guardian.id === contextGuardianId) ?? null,
    [contextGuardianId, guardians],
  );
  const resolvedViewMode = React.useMemo(
    () =>
      resolveGuardiansViewMode(
        entitySurface.defaultViewMode,
        guardiansSurface.allowedViewModes,
        guardiansSurface.defaultViewMode ?? "list",
      ),
    [entitySurface.defaultViewMode, guardiansSurface.allowedViewModes, guardiansSurface.defaultViewMode],
  );
  const guardianDetailsMode = React.useMemo(
    () =>
      resolveGuardiansDetailsMode(
        entitySurface.detailsOpenMode,
        resolvedViewMode,
        guardiansSurface.detailsMode ?? "sheet",
      ),
    [entitySurface.detailsOpenMode, guardiansSurface.detailsMode, resolvedViewMode],
  );
  const isEditing = editingGuardianId !== null;

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
    if (!isEditing) {
      return;
    }

    const stillExists = guardians.some((guardian) => guardian.id === editingGuardianId);
    if (!stillExists) {
      setEditingGuardianId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingGuardianId, guardians, isEditing]);

  React.useEffect(() => {
    if (selectedGuardianId && !guardians.some((guardian) => guardian.id === selectedGuardianId)) {
      setSelectedGuardianId(null);
    }

    if (contextGuardianId && !guardians.some((guardian) => guardian.id === contextGuardianId)) {
      setContextGuardianId(null);
    }
  }, [contextGuardianId, guardians, selectedGuardianId]);

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
    setEditingGuardianId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setFormGovernorateId("");
    setFormDirectorateId("");
    setFormSubDistrictId("");
    setFormVillageId("");
  };

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      gender: genderFilter,
      idType: idTypeFilter,
      locality: localityFilter,
      active: activeFilter,
    });
  }, [activeFilter, genderFilter, idTypeFilter, isFilterOpen, localityFilter]);

  const clearFilters = () => {
    setFilterDraft(DEFAULT_FILTER_DRAFT);
    setGenderFilter("all");
    setIdTypeFilter("all");
    setLocalityFilter("all");
    setActiveFilter("all");
    setPage(1);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setGenderFilter(filterDraft.gender);
    setIdTypeFilter(filterDraft.idType);
    setLocalityFilter(filterDraft.locality);
    setActiveFilter(filterDraft.active);
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

    if (formState.fullName.trim().length > 150) {
      setFormError("الاسم الكامل يجب ألا يتجاوز 150 حرفًا.");
      return false;
    }

    if (formState.idNumber.trim().length > 30) {
      setFormError("رقم الهوية يجب ألا يتجاوز 30 حرفًا.");
      return false;
    }

    const primaryPhone = formState.phonePrimaryNationalNumber.trim();
    if (primaryPhone) {
      const normalizedPrimary = normalizePhoneValue({
        countryIso2: formState.phonePrimaryCountryIso2,
        nationalNumber: primaryPhone,
      });

      if (!normalizedPrimary.ok) {
        setFormError("الهاتف الأساسي غير صالح.");
        return false;
      }
    }

    const secondaryPhone = formState.phoneSecondaryNationalNumber.trim();
    if (secondaryPhone) {
      const normalizedSecondary = normalizePhoneValue({
        countryIso2: formState.phoneSecondaryCountryIso2,
        nationalNumber: secondaryPhone,
      });

      if (!normalizedSecondary.ok) {
        setFormError("الهاتف الاحتياطي غير صالح.");
        return false;
      }
    }

    const whatsappPhone = formState.whatsappNationalNumber.trim();
    if (whatsappPhone) {
      const normalizedWhatsapp = normalizePhoneValue({
        countryIso2: formState.whatsappCountryIso2,
        nationalNumber: whatsappPhone,
      });

      if (!normalizedWhatsapp.ok) {
        setFormError("رقم واتساب غير صالح.");
        return false;
      }
    }

    if (formState.residenceText.trim().length > 255) {
      setFormError("العنوان يجب ألا يتجاوز 255 حرفًا.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const selectedGender = genderOptions.find(
      (option) => option.id === Number(formState.genderId),
    );
    const mappedGender =
      selectedGender?.code && isStudentGenderCode(selectedGender.code)
        ? selectedGender.code
        : undefined;

    const payload = {
      fullName: formState.fullName.trim(),
      gender: mappedGender,
      genderId: formState.genderId ? Number(formState.genderId) : undefined,
      idNumber: toOptionalString(formState.idNumber),
      idTypeId: formState.idTypeId ? Number(formState.idTypeId) : null,
      localityId: formState.localityId ? Number(formState.localityId) : null,
      phonePrimary: composePhoneValue(
        formState.phonePrimaryCountryIso2,
        formState.phonePrimaryNationalNumber,
      ),
      phoneSecondary: composePhoneValue(
        formState.phoneSecondaryCountryIso2,
        formState.phoneSecondaryNationalNumber,
      ),
      whatsappNumber: composePhoneValue(
        formState.whatsappCountryIso2,
        formState.whatsappNationalNumber,
      ),
      residenceText: toOptionalString(formState.residenceText),
      isActive: formState.isActive,
    };

    if (isEditing && editingGuardianId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: guardians.update.");
        return;
      }

      updateMutation.mutate(
        {
          guardianId: editingGuardianId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث ولي الأمر بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: guardians.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء ولي الأمر بنجاح.");
      },
    });
  };

  const handleStartEdit = (guardian: GuardianListItem) => {
    if (!canUpdate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingGuardianId(guardian.id);
    const nextState = toFormState(guardian);
    if (!nextState.genderId) {
      const mapped = genderOptions.find((option) => option.code === guardian.gender);
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
      const locality = geographyMaps.localityById.get(Number(nextState.localityId));
      const selection = resolveSelectionFromLocality(locality, geographyMaps);
      setFormGovernorateId(selection.governorateId);
      setFormDirectorateId(selection.directorateId);
      setFormSubDistrictId(selection.subDistrictId);
      setFormVillageId(selection.villageId);
    }

    setFormState(nextState);
  };

  const handleToggleActive = (guardian: GuardianListItem) => {
    if (!canUpdate) {
      return;
    }

    updateMutation.mutate(
      {
        guardianId: guardian.id,
        payload: {
          isActive: !guardian.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionSuccess(
            guardian.isActive ? "تم تعطيل ولي الأمر بنجاح." : "تم تفعيل ولي الأمر بنجاح.",
          );
        },
      },
    );
  };

  const handleDelete = (guardian: GuardianListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف ولي الأمر ${guardian.fullName}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(guardian.id, {
      onSuccess: () => {
        if (editingGuardianId === guardian.id) {
          resetForm();
        }
        if (selectedGuardianId === guardian.id) {
          setSelectedGuardianId(null);
        }
        if (contextGuardianId === guardian.id) {
          setContextGuardianId(null);
        }
        setActionSuccess("تم حذف ولي الأمر بنجاح.");
      },
    });
  };

  const handleOpenGuardianDetails = React.useCallback((guardian: GuardianListItem) => {
    setContextGuardianId(null);

    if (!canReadDetails) {
      return;
    }

    if (guardianDetailsMode === "page") {
      window.location.hash = getGuardianDetailsPath(guardian);
      return;
    }

    setSelectedGuardianId(guardian.id);
  }, [canReadDetails, guardianDetailsMode]);

  const renderGuardianHeaderActions = (guardian: GuardianListItem) => {
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
            onClick={() => handleOpenGuardianDetails(guardian)}
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
            onClick={() => handleStartEdit(guardian)}
          />
        ) : null}

        {canDelete ? (
          <EntitySurfaceHeaderActionButton
            label="حذف"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            tone="delete"
            disabled={deleteMutation.isPending}
            onClick={() => handleDelete(guardian)}
          />
        ) : null}
      </div>
    );
  };

  const buildGuardianQuickActions = (
    guardian: GuardianListItem,
  ): EntitySurfaceQuickAction[] => {
    if (!canUseQuickActions) {
      return [];
    }

    const actions: EntitySurfaceQuickAction[] = [];

    if (canReadDetails) {
      actions.push({
        key: "details",
        label: guardianDetailsMode === "page" ? "فتح الصفحة" : "تفاصيل",
        icon:
          guardianDetailsMode === "page" ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ScanSearch className="h-3.5 w-3.5" />
          ),
        tone: "accent",
        onClick: () => handleOpenGuardianDetails(guardian),
      });
    }

    if (canUpdate) {
      actions.push(
        {
          key: "edit",
          label: "تعديل",
          icon: <PencilLine className="h-3.5 w-3.5" />,
          onClick: () => handleStartEdit(guardian),
          disabled: updateMutation.isPending,
        },
        {
          key: "toggle-active",
          label: guardian.isActive ? "تعطيل" : "تفعيل",
          icon: <Activity className="h-3.5 w-3.5" />,
          tone: "ghost",
          onClick: () => handleToggleActive(guardian),
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
        onClick: () => handleDelete(guardian),
        disabled: deleteMutation.isPending,
      });
    }

    return actions;
  };

  const activeFiltersCount = React.useMemo(() => {
    return [genderFilter, idTypeFilter, localityFilter, activeFilter].filter(
      (value) => value !== "all",
    ).length;
  }, [activeFilter, genderFilter, idTypeFilter, localityFilter]);
  const showGuardianCardDetails =
    canReadDetails && entitySurface.showExtendedDetailsInCards;
  const usesBlurBackdrop = entitySurface.longPressMode === "enabled-with-blur";
  const contextGuardianQuickActions = contextGuardian ? buildGuardianQuickActions(contextGuardian) : [];
  const selectedGuardianQuickActions = selectedGuardian
    ? buildGuardianQuickActions(selectedGuardian).filter((action) => action.key !== "details")
    : [];

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل ولي أمر" : "إنشاء ولي أمر"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تحديث بيانات ولي الأمر."
              : "إضافة ملف جديد لولي الأمر ضمن نظام الطلاب."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>guardians.create</code>.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmitForm}>
              <div className="space-y-1">
                <Label required>الاسم الكامل</Label>
                <Input
                  value={formState.fullName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  placeholder="أحمد محمد صالح"
                  icon={<User className="h-4 w-4" />}
                  required
                />
              </div>

              <div className="rounded-2xl border border-sky-500/15 bg-sky-500/5 p-3 text-xs leading-6 text-foreground/75">
                إذا احتاج ولي الأمر لحساب دخول، يُنشأ حساب مستخدم مستقل برقم الهاتف من
                شاشة المستخدمين، وتُدار كلمة المرور الأولية لمرة واحدة هناك من دون تعيين
                كلمة مرور يدويًا.
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
                  <Label>نوع الهوية</Label>
                  <SelectField
                    value={formState.idTypeId}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, idTypeId: event.target.value }))
                    }
                    disabled={!canReadIdTypes || idTypeOptionsQuery.isLoading}
                    icon={<IdCard className="h-4 w-4" />}
                  >
                    <option value="">غير محدد</option>
                    {idTypeOptions.map((idType) => (
                      <option key={idType.id} value={idType.id}>
                        {idType.nameAr}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>

              <div className="space-y-1">
                <Label>رقم الهوية</Label>
                <Input
                  value={formState.idNumber}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, idNumber: event.target.value }))
                  }
                  placeholder="مثال: 90909012"
                  icon={<IdCard className="h-4 w-4" />}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>الهاتف الأساسي</Label>
                <InternationalPhoneField
                  countryIso2={formState.phonePrimaryCountryIso2}
                  nationalNumber={formState.phonePrimaryNationalNumber}
                  onChange={(next) =>
                    setFormState((prev) => ({
                      ...prev,
                      phonePrimary: next.e164,
                      phonePrimaryCountryIso2: next.countryIso2,
                      phonePrimaryNationalNumber: next.nationalNumber,
                    }))
                  }
                  placeholder="7XXXXXXXX"
                  enableContactPicker
                  buttonTestId="guardian-phone-primary-contact-picker"
                  />
                </div>
              <div className="space-y-1">
                <Label>الهاتف الاحتياطي</Label>
                <InternationalPhoneField
                  countryIso2={formState.phoneSecondaryCountryIso2}
                  nationalNumber={formState.phoneSecondaryNationalNumber}
                  onChange={(next) =>
                    setFormState((prev) => ({
                      ...prev,
                      phoneSecondary: next.e164,
                      phoneSecondaryCountryIso2: next.countryIso2,
                      phoneSecondaryNationalNumber: next.nationalNumber,
                    }))
                  }
                  placeholder="7XXXXXXXX"
                  enableContactPicker
                  buttonTestId="guardian-phone-secondary-contact-picker"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>رقم واتساب</Label>
                <InternationalPhoneField
                  countryIso2={formState.whatsappCountryIso2}
                  nationalNumber={formState.whatsappNationalNumber}
                  onChange={(next) =>
                    setFormState((prev) => ({
                      ...prev,
                      whatsappNumber: next.e164,
                      whatsappCountryIso2: next.countryIso2,
                      whatsappNationalNumber: next.nationalNumber,
                    }))
                  }
                  placeholder="7XXXXXXXX"
                  enableContactPicker
                  buttonTestId="guardian-whatsapp-contact-picker"
                />
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

                    <p className="text-[10px] text-muted-foreground md:col-span-2 px-1">
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
                <Label>العنوان</Label>
                <Input
                  value={formState.residenceText}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      residenceText: event.target.value,
                    }))
                  }
                  placeholder="صنعاء - حي الصافية"
                  icon={<MapPin className="h-4 w-4" />}
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
                  {isEditing ? "حفظ التعديلات" : "إنشاء ولي أمر"}
                </button>
                {isEditing ? (
                  <Button type="button" variant="outline" onClick={resetForm} className="rounded-2xl">
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>قائمة أولياء الأمور</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>إدارة أولياء الأمور مع فلترة حسب النوع والحالة.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <ManagementToolbar
            searchValue={searchInput}
            onSearchChange={(event) => setSearchInput(event.target.value)}
            searchPlaceholder="ابحث بالاسم، الرقم، الهاتف..."
            filterCount={activeFiltersCount}
            onFilterClick={() => setIsFilterOpen((prev) => !prev)}
            actionsClassName="justify-start lg:justify-end"
          />

          <FilterDrawer
            open={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            title="فلترة أولياء الأمور"
            actionButtons={<FilterDrawerActions onClear={clearFilters} onApply={applyFilters} />}
            renderInPortal
            overlayClassName="z-[70]"
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
                <Label>نوع الهوية</Label>
                <SelectField
                  value={filterDraft.idType}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      idType: event.target.value,
                    }))
                  }
                  disabled={!canReadIdTypes || idTypeOptionsQuery.isLoading}
                  icon={<IdCard className="h-4 w-4" />}
                >
                  <option value="all">كل الهويات</option>
                  {idTypeOptions.map((idType) => (
                    <option key={idType.id} value={idType.id}>
                      {idType.nameAr}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-1">
                <Label>المحلة</Label>
                <SelectField
                  value={filterDraft.locality}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      locality: event.target.value,
                    }))
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
                  <option value="active">النشطة</option>
                  <option value="inactive">غير النشطة</option>
                </SelectField>
              </div>
            </div>
          </FilterDrawer>

          {guardiansQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {guardiansQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {guardiansQuery.error instanceof Error
                ? guardiansQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!guardiansQuery.isPending && guardians.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد سجلات مطابقة.
            </div>
          ) : null}

          {!guardiansQuery.isPending && guardians.length > 0 ? (
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
              {guardians.map((guardian) => {
                const preview =
                  guardiansSurface.buildPreview?.(guardian) ?? buildGuardianSurfacePreview(guardian);
                const contextQuickActions = buildGuardianQuickActions(guardian);
                const headerActions = renderGuardianHeaderActions(guardian);
                const canOpenContext =
                  entitySurface.longPressMode !== "disabled" && contextQuickActions.length > 0;
                const handleCardClick = canReadDetails
                  ? () => handleOpenGuardianDetails(guardian)
                  : undefined;

                if (resolvedViewMode === "dense-row") {
                  return (
                    <EntitySurfaceRow
                      key={guardian.id}
                      title={preview.title}
                      subtitle={showGuardianCardDetails ? preview.subtitle : undefined}
                      meta={showGuardianCardDetails ? preview.meta ?? preview.description : undefined}
                      avatar={preview.avatar}
                      headerActions={headerActions}
                      statusChips={showGuardianCardDetails ? getGuardianStatusChips(guardian) : undefined}
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
                      contextOpen={contextGuardianId === guardian.id}
                      onClick={handleCardClick}
                      onLongPress={() => {
                        if (!canOpenContext) {
                          return;
                        }
                        setContextGuardianId(guardian.id);
                      }}
                    />
                  );
                }

                return (
                  <EntitySurfaceCard
                    key={guardian.id}
                    title={preview.title}
                    subtitle={showGuardianCardDetails ? preview.subtitle : undefined}
                    description={showGuardianCardDetails ? preview.description : undefined}
                    avatar={preview.avatar}
                    headerActions={headerActions}
                    fields={showGuardianCardDetails ? preview.fields : undefined}
                    statusChips={showGuardianCardDetails ? getGuardianStatusChips(guardian) : undefined}
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
                    contextOpen={contextGuardianId === guardian.id}
                    onClick={handleCardClick}
                    onLongPress={() => {
                      if (!canOpenContext) {
                        return;
                      }
                      setContextGuardianId(guardian.id);
                    }}
                  />
                );
              })}
            </EntitySurfaceGrid>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
            <p className="text-xs text-muted-foreground">
              الصفحة {pagination?.page ?? 1} من {pagination?.totalPages ?? 1}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={!pagination || pagination.page <= 1 || guardiansQuery.isFetching}
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
                  guardiansQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void guardiansQuery.refetch()}
                disabled={guardiansQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${guardiansQuery.isFetching ? "animate-spin" : ""}`}
                />
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {contextGuardian ? (
        <div className="fixed inset-0 z-[85]">
          <div
            className={cn(
              "absolute inset-0",
              usesBlurBackdrop ? "bg-black/24 backdrop-blur-sm" : "bg-black/18",
            )}
            onClick={() => setContextGuardianId(null)}
          />
          <div className="absolute inset-x-4 bottom-4 mx-auto max-w-sm">
            <div className="rounded-[1.6rem] border border-white/70 bg-white/88 p-3 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/88">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">اختصارات ولي الأمر</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-white/55">
                {contextGuardian.fullName} • {contextGuardian.phonePrimary ?? "بدون هاتف"}
              </p>
              {contextGuardianQuickActions.length > 0 ? (
                <EntitySurfaceQuickActions actions={contextGuardianQuickActions} className="mt-3" />
              ) : (
                <p className="mt-3 text-xs text-slate-500 dark:text-white/55">
                  لا توجد اختصارات متاحة حاليًا.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedGuardian ? (
        <EntityDetailsShell
          open
          mode={guardianDetailsMode}
          title={selectedGuardian.fullName}
          subtitle={`${selectedGuardian.phonePrimary ?? "بدون هاتف"} • ${toRelationshipPreview(selectedGuardian)}`}
          statusChips={getGuardianStatusChips(selectedGuardian)}
          actions={selectedGuardianQuickActions}
          density={entitySurface.density}
          visualStyle={entitySurface.visualStyle}
          effectsPreset={entitySurface.effectsPreset}
          shapePreset={entitySurface.shapePreset}
          onClose={() => setSelectedGuardianId(null)}
        >
          <GuardianDetailsContent
            guardian={selectedGuardian}
            quickActions={selectedGuardianQuickActions}
          />
        </EntityDetailsShell>
      ) : null}
    </div>
  );
}
