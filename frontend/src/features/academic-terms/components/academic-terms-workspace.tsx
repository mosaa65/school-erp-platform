"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarRange,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  CalendarDays,
  Hash,
  Type,
  Activity,
  Calendar,
  LayoutGrid,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
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
import {
  useCreateAcademicTermMutation,
  useDeleteAcademicTermMutation,
  useUpdateAcademicTermMutation,
} from "@/features/academic-terms/hooks/use-academic-terms-mutations";
import { useAcademicTermsQuery } from "@/features/academic-terms/hooks/use-academic-terms-query";
import { useAcademicYearOptionsQuery } from "@/features/academic-terms/hooks/use-academic-year-options-query";
import type { AcademicTermListItem, AcademicTermType } from "@/lib/api/client";

type AcademicTermFormState = {
  academicYearId: string;
  code: string;
  name: string;
  termType: AcademicTermType;
  sequence: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: AcademicTermFormState = {
  academicYearId: "",
  code: "",
  name: "",
  termType: "SEMESTER",
  sequence: "1",
  startDate: "",
  endDate: "",
  isActive: true,
};


function formatDateInput(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toUtcStartIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function toUtcEndIso(dateInput: string): string {
  return `${dateInput}T23:59:59.999Z`;
}

function toFormState(term: AcademicTermListItem): AcademicTermFormState {
  return {
    academicYearId: term.academicYearId,
    code: term.code,
    name: term.name,
    termType: term.termType,
    sequence: String(term.sequence),
    startDate: formatDateInput(term.startDate),
    endDate: formatDateInput(term.endDate),
    isActive: term.isActive,
  };
}

function termTypeBadgeVariant(
  type: AcademicTermType,
): "default" | "secondary" | "outline" {
  switch (type) {
    case "SEMESTER":
      return "default";
    case "TRIMESTER":
      return "secondary";
    default:
      return "outline";
  }
}

function termTypeLabel(type: AcademicTermType): string {
  switch (type) {
    case "SEMESTER":
      return "فصلي";
    case "TRIMESTER":
      return "ثلاثي";
    case "QUARTER":
      return "ربعي";
    case "CUSTOM":
      return "مخصص";
    default:
      return type;
  }
}

export function AcademicTermsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("academic-terms.create");
  const canUpdate = hasPermission("academic-terms.update");
  const canDelete = hasPermission("academic-terms.delete");
  const canReadAcademicYears = hasPermission("academic-years.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState<AcademicTermType | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState<{
    year: string;
    type: AcademicTermType | "all";
    active: "all" | "active" | "inactive";
  }>({
    year: "all",
    type: "all",
    active: "all",
  });

  const [editingTermId, setEditingTermId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<AcademicTermFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const termsQuery = useAcademicTermsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    termType: typeFilter === "all" ? undefined : typeFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const academicYearOptionsQuery = useAcademicYearOptionsQuery();

  const createMutation = useCreateAcademicTermMutation();
  const updateMutation = useUpdateAcademicTermMutation();
  const deleteMutation = useDeleteAcademicTermMutation();

  const terms = React.useMemo(() => termsQuery.data?.data ?? [], [termsQuery.data?.data]);
  const pagination = termsQuery.data?.pagination;
  const yearOptions = React.useMemo(
    () => academicYearOptionsQuery.data ?? [],
    [academicYearOptionsQuery.data],
  );
  const isEditing = editingTermId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = terms.some((term) => term.id === editingTermId);
    if (!stillExists) {
      setEditingTermId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingTermId, isEditing, terms]);

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      year: yearFilter,
      type: typeFilter,
      active: activeFilter,
    });
  }, [activeFilter, isFilterOpen, typeFilter, yearFilter]);

  const resetForm = () => {
    setEditingTermId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingTermId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.academicYearId || !formState.name) {
      setFormError("الحقول الأساسية مطلوبة: السنة الأكاديمية والاسم.");
      return false;
    }

    const sequence = Number(formState.sequence);
    if (!Number.isInteger(sequence) || sequence < 1 || sequence > 20) {
      setFormError("الترتيب يجب أن يكون رقمًا صحيحًا بين 1 و 20.");
      return false;
    }

    if (!formState.startDate || !formState.endDate) {
      setFormError("تاريخ البداية والنهاية مطلوبان.");
      return false;
    }

    const start = new Date(toUtcStartIso(formState.startDate));
    const end = new Date(toUtcEndIso(formState.endDate));

    if (start >= end) {
      setFormError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
      return false;
    }

    const selectedYear = yearOptions.find((year) => year.id === formState.academicYearId);
    if (selectedYear) {
      const yearStart = new Date(selectedYear.startDate);
      const yearEnd = new Date(selectedYear.endDate);
      if (start < yearStart || end > yearEnd) {
        setFormError("تواريخ الفصل يجب أن تكون ضمن نطاق السنة الأكاديمية المختارة.");
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      academicYearId: formState.academicYearId,
      name: formState.name.trim(),
      termType: formState.termType,
      sequence: Number(formState.sequence),
      startDate: toUtcStartIso(formState.startDate),
      endDate: toUtcEndIso(formState.endDate),
      isActive: formState.isActive,
    };

    if (isEditing && editingTermId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: academic-terms.update.");
        return;
      }

      updateMutation.mutate(
        {
          academicTermId: editingTermId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: academic-terms.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (term: AcademicTermListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingTermId(term.id);
    setFormState(toFormState(term));
    setIsFormOpen(true);
  };

  const handleDelete = (term: AcademicTermListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(`تأكيد حذف الفصل ${term.name}؟`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(term.id, {
      onSuccess: () => {
        if (editingTermId === term.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setTypeFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setTypeFilter(filterDraft.type);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      yearFilter !== "all" ? 1 : 0,
      typeFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, searchInput, typeFilter, yearFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0 sm:min-w-[240px] max-w-lg">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالاسم..."
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
          title="فلاتر الفصول الأكاديمية"
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
              <Label>السنة الأكاديمية</Label>
              <SelectField
                value={filterDraft.year}
                onChange={(event) =>
                  setFilterDraft((prev) => ({ ...prev, year: event.target.value }))
                }
                disabled={!canReadAcademicYears || academicYearOptionsQuery.isLoading}
                icon={<Calendar className="h-4 w-4" />}
              >
                <option value="all">كل السنوات</option>
                {yearOptions.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.code}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1">
              <Label>نوع الفصل</Label>
              <SelectField
                value={filterDraft.type}
                onChange={(event) =>
                  setFilterDraft((prev) => ({
                    ...prev,
                    type: event.target.value as AcademicTermType | "all",
                  }))
                }
                icon={<LayoutGrid className="h-4 w-4" />}
              >
                <option value="all">كل الأنواع</option>
                <option value="SEMESTER">فصلي</option>
                <option value="TRIMESTER">ثلاثي</option>
                <option value="QUARTER">ربعي</option>
                <option value="CUSTOM">مخصص</option>
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
                <option value="active">النشطة فقط</option>
                <option value="inactive">غير النشطة فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>قائمة الفصول الأكاديمية</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الفصول الأكاديمية مع فلترة بالبحث والسنة والنوع والحالة.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {termsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {termsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {termsQuery.error instanceof Error
                  ? termsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {!termsQuery.isPending && terms.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد فصول مطابقة.
              </div>
            ) : null}

            {terms.map((term) => (
              <div
                key={term.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">{term.name}</p>
                    <p className="text-xs text-muted-foreground">
                      <code>{term.code}</code> - الترتيب: {term.sequence}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(term.startDate).toLocaleDateString()} -{" "}
                      {new Date(term.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      السنة: {term.academicYear.name} ({term.academicYear.code})
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={termTypeBadgeVariant(term.termType)}>
                      {termTypeLabel(term.termType)}
                    </Badge>
                    <Badge variant={term.isActive ? "default" : "outline"}>
                      {term.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(term)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(term)}
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
                  disabled={!pagination || pagination.page <= 1 || termsQuery.isFetching}
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
                    termsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void termsQuery.refetch()}
                  disabled={termsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${termsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء فصل أكاديمي"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        title={isEditing ? "تعديل فصل أكاديمي" : "إنشاء فصل أكاديمي"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء فصل أكاديمي"}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>academic-terms.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1">
              <Label required>السنة الأكاديمية</Label>
              <SelectField
                value={formState.academicYearId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    academicYearId: event.target.value,
                  }))
                }
                disabled={!canReadAcademicYears}
                icon={<Calendar className="h-4 w-4" />}
                required
              >
                <option value="">اختر السنة الدراسية</option>
                {yearOptions.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name} ({year.code})
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label required>الترتيب</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formState.sequence}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, sequence: event.target.value }))
                  }
                  icon={<Hash className="h-4 w-4" />}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label required>الاسم</Label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="الفصل الأول"
                icon={<Type className="h-4 w-4" />}
                required
              />
            </div>

            <div className="space-y-1">
              <Label required>نوع الفصل</Label>
              <SelectField
                value={formState.termType}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    termType: event.target.value as AcademicTermType,
                  }))
                }
                icon={<LayoutGrid className="h-4 w-4" />}
                required
              >
                <option value="SEMESTER">فصلي</option>
                <option value="TRIMESTER">ثلاثي</option>
                <option value="QUARTER">ربعي</option>
                <option value="CUSTOM">مخصص</option>
              </SelectField>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label required>تاريخ البداية</Label>
                <Input
                  type="date"
                  value={formState.startDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  icon={<CalendarDays className="h-4 w-4" />}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label required>تاريخ النهاية</Label>
                <Input
                  type="date"
                  value={formState.endDate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  icon={<CalendarDays className="h-4 w-4" />}
                  required
                />
              </div>
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

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isFormSubmitting || (!canCreate && !isEditing)}
              >
                {isFormSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarRange className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء فصل أكاديمي"}
              </Button>
              {isEditing ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              ) : null}
            </div>
          </form>
        )}
      </CrudFormSheet>
    </>
  );
}
