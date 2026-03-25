"use client";

import * as React from "react";
import {
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
  Users,
  User,
  IdCard,
  Phone,
  MessageSquare,
  MapPin,
  Activity,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { PhoneContactInput } from "@/components/ui/phone-contact-input";
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
                  <PhoneContactInput
                    value={formState.phonePrimary}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, phonePrimary: value }))
                    }
                    placeholder="+967777111222"
                    autoComplete="tel"
                    inputMode="tel"
                    buttonTestId="guardian-phone-primary-contact-picker"
                  />
                </div>
                <div className="space-y-1">
                  <Label>الهاتف الاحتياطي</Label>
                  <PhoneContactInput
                    value={formState.phoneSecondary}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, phoneSecondary: value }))
                    }
                    placeholder="+967733444555"
                    autoComplete="tel"
                    inputMode="tel"
                    buttonTestId="guardian-phone-secondary-contact-picker"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>رقم واتساب</Label>
                <PhoneContactInput
                  value={formState.whatsappNumber}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      whatsappNumber: value,
                    }))
                  }
                  placeholder="+967777111222"
                  autoComplete="tel"
                  inputMode="tel"
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
                      <option value="">اختر القرية (اختياري للحضر)</option>
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

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto_auto]"
          >
            <div className="relative flex-1">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث..."
                className="pr-10"
                icon={<Search className="h-4 w-4" />}
              />
            </div>

            <SelectField
              className="w-full md:w-[140px]"
              value={genderFilter}
              onChange={(event) => {
                setPage(1);
                setGenderFilter(event.target.value);
              }}
              disabled={!canReadGenders || genderOptionsQuery.isLoading}
              icon={<User className="h-3.5 w-3.5" />}
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
              className="w-full md:w-[160px]"
              value={idTypeFilter}
              onChange={(event) => {
                setPage(1);
                setIdTypeFilter(event.target.value);
              }}
              disabled={!canReadIdTypes || idTypeOptionsQuery.isLoading}
              icon={<IdCard className="h-3.5 w-3.5" />}
            >
              <option value="all">كل الهويات</option>
              {idTypeOptions.map((idType) => (
                <option key={idType.id} value={idType.id}>
                  {idType.nameAr}
                </option>
              ))}
            </SelectField>

            <SelectField
              className="w-full md:w-[160px]"
              value={localityFilter}
              onChange={(event) => {
                setPage(1);
                setLocalityFilter(event.target.value);
              }}
              disabled={!canReadLocalities || geographyOptionsQuery.isLoading}
              icon={<MapPin className="h-3.5 w-3.5" />}
            >
              <option value="all">كل المحلات</option>
              {localityOptions.map((locality) => (
                <option key={locality.id} value={locality.id}>
                  {formatLocalityHierarchyLabel(locality, geographyMaps)}
                </option>
              ))}
            </SelectField>

            <SelectField
              className="w-full md:w-[140px]"
              value={activeFilter}
              onChange={(event) => {
                setPage(1);
                setActiveFilter(event.target.value as "all" | "active" | "inactive");
              }}
              icon={<Activity className="h-3.5 w-3.5" />}
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة</option>
              <option value="inactive">غير النشطة</option>
            </SelectField>

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
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{guardian.fullName}</p>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {guardian.genderLookup?.nameAr ?? translateStudentGender(guardian.gender)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <IdCard className="h-3 w-3" />
                      {guardian.idNumber ?? "-"} ({guardian.idType?.nameAr ?? "بدون"})
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {guardian.phonePrimary ?? "-"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {guardian.whatsappNumber ?? "-"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الطلاب: {guardian.students.length} ({toRelationshipPreview(guardian)})
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
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
                  <Badge variant={guardian.isActive ? "default" : "outline"}>
                    {guardian.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 transition-all duration-300 hover:bg-primary/5"
                  onClick={() => handleStartEdit(guardian)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="transition-all duration-300"
                  onClick={() => handleToggleActive(guardian)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {guardian.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 transition-all duration-300"
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
