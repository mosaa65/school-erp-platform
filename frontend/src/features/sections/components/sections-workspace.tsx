"use client";

import * as React from "react";
import {
  Layers2,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
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
import {
  useCreateSectionMutation,
  useDeleteSectionMutation,
  useUpdateSectionMutation,
} from "@/features/sections/hooks/use-sections-mutations";
import { useSectionsQuery } from "@/features/sections/hooks/use-sections-query";
import { useGradeLevelOptionsQuery } from "@/features/sections/hooks/use-grade-level-options-query";
import type { SectionListItem } from "@/lib/api/client";

type SectionFormState = {
  gradeLevelId: string;
  code: string;
  name: string;
  capacity: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: SectionFormState = {
  gradeLevelId: "",
  code: "",
  name: "",
  capacity: "",
  isActive: true,
};

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function toFormState(section: SectionListItem): SectionFormState {
  return {
    gradeLevelId: section.gradeLevelId,
    code: section.code,
    name: section.name,
    capacity: section.capacity === null ? "" : String(section.capacity),
    isActive: section.isActive,
  };
}

function translateStage(stage: string): string {
  const labels: Record<string, string> = {
    KINDERGARTEN: "رياض الأطفال",
    PRIMARY: "ابتدائي",
    MIDDLE: "إعدادي/متوسط",
    SECONDARY: "ثانوي",
  };

  return labels[stage] ?? stage;
}

export function SectionsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("sections.create");
  const canUpdate = hasPermission("sections.update");
  const canDelete = hasPermission("sections.delete");
  const canReadGradeLevels = hasPermission("grade-levels.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [gradeLevelFilter, setGradeLevelFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<SectionFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  const sectionsQuery = useSectionsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    gradeLevelId: gradeLevelFilter === "all" ? undefined : gradeLevelFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const gradeLevelOptionsQuery = useGradeLevelOptionsQuery();

  const createMutation = useCreateSectionMutation();
  const updateMutation = useUpdateSectionMutation();
  const deleteMutation = useDeleteSectionMutation();

  const sections = React.useMemo(() => sectionsQuery.data?.data ?? [], [sectionsQuery.data?.data]);
  const pagination = sectionsQuery.data?.pagination;
  const gradeLevelOptions = React.useMemo(
    () => gradeLevelOptionsQuery.data ?? [],
    [gradeLevelOptionsQuery.data],
  );
  const isEditing = editingSectionId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = sections.some((section) => section.id === editingSectionId);
    if (!stillExists) {
      setEditingSectionId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingSectionId, isEditing, sections]);

  const resetForm = () => {
    setEditingSectionId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    const code = normalizeCode(formState.code);
    const name = formState.name.trim();

    if (!formState.gradeLevelId || !code || !name) {
      setFormError("الحقول الأساسية مطلوبة: المرحلة الدراسية والكود والاسم.");
      return false;
    }

    if (!/^[a-z0-9_.:-]+$/.test(code)) {
      setFormError("صيغة الكود غير صحيحة.");
      return false;
    }

    if (formState.capacity.trim()) {
      const capacity = Number(formState.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
        setFormError("السعة يجب أن تكون رقمًا صحيحًا بين 1 و 1000.");
        return false;
      }
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

    const payload = {
      gradeLevelId: formState.gradeLevelId,
      code: normalizeCode(formState.code),
      name: formState.name.trim(),
      capacity: formState.capacity.trim() ? Number(formState.capacity) : undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingSectionId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: sections.update.");
        return;
      }

      updateMutation.mutate(
        {
          sectionId: editingSectionId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث الشعبة بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: sections.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
        setActionSuccess("تم إنشاء الشعبة بنجاح.");
      },
    });
  };

  const handleStartEdit = (section: SectionListItem) => {
    if (!canUpdate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingSectionId(section.id);
    setFormState(toFormState(section));
  };

  const handleDelete = (section: SectionListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الشعبة ${section.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(section.id, {
      onSuccess: () => {
        if (editingSectionId === section.id) {
          resetForm();
        }
        setActionSuccess("تم حذف الشعبة بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers2 className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل شعبة" : "إنشاء شعبة"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل ارتباط الشعبة بالصف وسعتها."
              : "إضافة شعبة جديدة داخل صف/مرحلة محددة."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك الصلاحية المطلوبة: <code>sections.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الصف/المرحلة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.gradeLevelId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      gradeLevelId: event.target.value,
                    }))
                  }
                  disabled={!canReadGradeLevels}
                >
                  <option value="">اختر المستوى الدراسي</option>
                  {gradeLevelOptions.map((gradeLevel) => (
                    <option key={gradeLevel.id} value={gradeLevel.id}>
                      {gradeLevel.name} ({gradeLevel.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">الكود *</label>
                  <Input
                    value={formState.code}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, code: event.target.value }))
                    }
                    placeholder="مثال: g1-a"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">السعة</label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={formState.capacity}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, capacity: event.target.value }))
                    }
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الاسم *</label>
                <Input
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="الشعبة أ"
                  required
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

              {!canReadGradeLevels ? (
                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  يتطلب هذا الجزء الصلاحية: <code>grade-levels.read</code> لاختيار الصف.
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={
                    isFormSubmitting || (!canCreate && !isEditing) || !canReadGradeLevels
                  }
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Layers2 className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء شعبة"}
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
            <CardTitle>قائمة الشعب</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة الشعب وربطها بالصفوف مع فلترة بالبحث والحالة.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_200px_140px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالاسم/الكود/الصف..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={gradeLevelFilter}
              onChange={(event) => {
                setPage(1);
                setGradeLevelFilter(event.target.value);
              }}
            >
              <option value="all">كل الصفوف</option>
              {gradeLevelOptions.map((gradeLevel) => (
                <option key={gradeLevel.id} value={gradeLevel.id}>
                  {gradeLevel.code}
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
          {sectionsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}

          {sectionsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {sectionsQuery.error instanceof Error
                ? sectionsQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}

          {!sectionsQuery.isPending && sections.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد شعب مطابقة.
            </div>
          ) : null}

          {sections.map((section) => (
            <div
              key={section.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{section.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <code>{section.code}</code>
                    {section.capacity !== null ? ` - السعة: ${section.capacity}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الصف: {section.gradeLevel.name} ({section.gradeLevel.code})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{translateStage(section.gradeLevel.stage)}</Badge>
                  <Badge variant={section.isActive ? "default" : "outline"}>
                    {section.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(section)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(section)}
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
                disabled={!pagination || pagination.page <= 1 || sectionsQuery.isFetching}
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
                  sectionsQuery.isFetching
                }
              >
                التالي
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void sectionsQuery.refetch()}
                disabled={sectionsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${sectionsQuery.isFetching ? "animate-spin" : ""}`}
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





