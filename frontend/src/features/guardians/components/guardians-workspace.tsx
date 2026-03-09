"use client";

import * as React from "react";
import { LoaderCircle, PencilLine, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useGeographyOptionsQuery } from "@/features/lookup-catalog/hooks/use-geography-options-query";
import {
  buildGeographyMaps,
  formatLocalityHierarchyLabel,
  resolveSelectionFromLocality,
} from "@/features/lookup-catalog/lib/geography";
import {
  useCreateGuardianMutation,
  useDeleteGuardianMutation,
  useUpdateGuardianMutation,
} from "@/features/guardians/hooks/use-guardians-mutations";
import { useGuardianGenderOptionsQuery } from "@/features/guardians/hooks/use-gender-options-query";
import { useGuardianIdTypeOptionsQuery } from "@/features/guardians/hooks/use-id-type-options-query";
import { useGuardiansQuery } from "@/features/guardians/hooks/use-guardians-query";
import { translateGuardianRelationship, translateStudentGender } from "@/lib/i18n/ar";
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
  phoneSecondary: string;
  whatsappNumber: string;
  residenceText: string;
  isActive: boolean;
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
  phoneSecondary: "",
  whatsappNumber: "",
  residenceText: "",
  isActive: true,
};

function toOptionalString(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isStudentGenderCode(value: string): value is StudentGender {
  return STUDENT_GENDER_CODES.includes(value as StudentGender);
}

type LocalityLabelInput = {
  id: number;
  nameAr?: string;
  name?: string;
  localityType?: "RURAL" | "URBAN";
  directorateId?: number;
  villageId?: number;
};

function toFormState(guardian: GuardianListItem): GuardianFormState {
  return {
    fullName: guardian.fullName,
    genderId: guardian.genderId ? String(guardian.genderId) : "",
    idNumber: guardian.idNumber ?? "",
    idTypeId: guardian.idTypeId ? String(guardian.idTypeId) : "",
    localityId: guardian.localityId ? String(guardian.localityId) : "",
    phonePrimary: guardian.phonePrimary ?? "",
    phoneSecondary: guardian.phoneSecondary ?? "",
    whatsappNumber: guardian.whatsappNumber ?? "",
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

export function GuardiansWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("guardians.create");
  const canUpdate = hasPermission("guardians.update");
  const canDelete = hasPermission("guardians.delete");
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

  const [editingGuardianId, setEditingGuardianId] = React.useState<string | null>(null);
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
  const isEditing = editingGuardianId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

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

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
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

    if (formState.phonePrimary.trim().length > 20) {
      setFormError("الهاتف الأساسي يجب ألا يتجاوز 20 حرفًا.");
      return false;
    }

    if (formState.phoneSecondary.trim().length > 20) {
      setFormError("الهاتف الاحتياطي يجب ألا يتجاوز 20 حرفًا.");
      return false;
    }

    if (formState.whatsappNumber.trim().length > 20) {
      setFormError("رقم واتساب يجب ألا يتجاوز 20 حرفًا.");
      return false;
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
      phonePrimary: toOptionalString(formState.phonePrimary),
      phoneSecondary: toOptionalString(formState.phoneSecondary),
      whatsappNumber: toOptionalString(formState.whatsappNumber),
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
        setActionSuccess("تم حذف ولي الأمر بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[390px_1fr]">
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
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم الكامل *</label>
                <Input
                  value={formState.fullName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  placeholder="أحمد محمد صالح"
                  required
                />
              </div>

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

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">رقم الهوية</label>
                  <Input
                    value={formState.idNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, idNumber: event.target.value }))
                    }
                    placeholder="مثال: 90909012"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">نوع الهوية</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={formState.idTypeId}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, idTypeId: event.target.value }))
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
                  <label className="text-xs font-medium text-muted-foreground">الهاتف الأساسي</label>
                  <Input
                    value={formState.phonePrimary}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, phonePrimary: event.target.value }))
                    }
                    placeholder="+967777111222"
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

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الهاتف الاحتياطي
                  </label>
                  <Input
                    value={formState.phoneSecondary}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, phoneSecondary: event.target.value }))
                    }
                    placeholder="+967733444555"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    رقم واتساب
                  </label>
                  <Input
                    value={formState.whatsappNumber}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        whatsappNumber: event.target.value,
                      }))
                    }
                    placeholder="+967777111222"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">العنوان</label>
                <Input
                  value={formState.residenceText}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      residenceText: event.target.value,
                    }))
                  }
                  placeholder="صنعاء - حي الصافية"
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
                  {isEditing ? "حفظ التعديلات" : "إنشاء ولي أمر"}
                </Button>
                {isEditing ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
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

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_150px_170px_220px_130px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم/الهاتف/الهوية..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={genderFilter}
              onChange={(event) => {
                setPage(1);
                setGenderFilter(event.target.value);
              }}
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
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={idTypeFilter}
              onChange={(event) => {
                setPage(1);
                setIdTypeFilter(event.target.value);
              }}
              disabled={!canReadIdTypes || idTypeOptionsQuery.isLoading}
            >
              <option value="all">كل أنواع الهوية</option>
              {idTypeOptions.map((idType) => (
                <option key={idType.id} value={idType.id}>
                  {idType.nameAr}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={localityFilter}
              onChange={(event) => {
                setPage(1);
                setLocalityFilter(event.target.value);
              }}
              disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
            >
              <option value="all">كل المحلات</option>
              {localityOptions.map((locality) => (
                <option key={locality.id} value={locality.id}>
                  {formatLocalityHierarchyLabel(locality, geographyMaps)}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </select>

            <Button type="submit" variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              تطبيق
            </Button>
          </form>
        </CardHeader>

        <CardContent className="space-y-3">
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

          {guardians.map((guardian) => (
            <div
              key={guardian.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{guardian.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    الهوية: {guardian.idNumber ?? "-"} ({guardian.idType?.nameAr ?? "غير محدد"}) | الهاتف:{" "}
                    {guardian.phonePrimary ?? "-"} | واتساب:{" "}
                    {guardian.whatsappNumber ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الطلاب: {guardian.students.length} ({toRelationshipPreview(guardian)})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الموقع:{" "}
                    {guardian.locality
                      ? formatLocalityHierarchyLabel(
                          (geographyMaps.localityById.get(guardian.locality.id) ??
                            guardian.locality) as LocalityLabelInput,
                          geographyMaps,
                        )
                      : "غير محدد"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">
                    {guardian.genderLookup?.nameAr ?? translateStudentGender(guardian.gender)}
                  </Badge>
                  <Badge variant={guardian.isActive ? "default" : "outline"}>
                    {guardian.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(guardian)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(guardian)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {guardian.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(guardian)}
                  disabled={!canDelete || deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف
                </Button>
              </div>
            </div>
          ))}

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
    </div>
  );
}





