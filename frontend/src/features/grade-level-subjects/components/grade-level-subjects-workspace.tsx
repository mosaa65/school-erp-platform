"use client";

import * as React from "react";
import {
  Cable,
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
  useCreateGradeLevelSubjectMutation,
  useDeleteGradeLevelSubjectMutation,
  useUpdateGradeLevelSubjectMutation,
} from "@/features/grade-level-subjects/hooks/use-grade-level-subjects-mutations";
import { useGradeLevelSubjectsQuery } from "@/features/grade-level-subjects/hooks/use-grade-level-subjects-query";
import { useAcademicYearOptionsQuery } from "@/features/grade-level-subjects/hooks/use-academic-year-options-query";
import { useGradeLevelOptionsQuery } from "@/features/grade-level-subjects/hooks/use-grade-level-options-query";
import { useSubjectOptionsQuery } from "@/features/grade-level-subjects/hooks/use-subject-options-query";
import type { GradeLevelSubjectListItem } from "@/lib/api/client";

type GradeLevelSubjectFormState = {
  academicYearId: string;
  gradeLevelId: string;
  subjectId: string;
  isMandatory: boolean;
  weeklyPeriods: string;
  displayOrder: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: GradeLevelSubjectFormState = {
  academicYearId: "",
  gradeLevelId: "",
  subjectId: "",
  isMandatory: true,
  weeklyPeriods: "1",
  displayOrder: "",
  isActive: true,
};

function toFormState(mapping: GradeLevelSubjectListItem): GradeLevelSubjectFormState {
  return {
    academicYearId: mapping.academicYearId,
    gradeLevelId: mapping.gradeLevelId,
    subjectId: mapping.subjectId,
    isMandatory: mapping.isMandatory,
    weeklyPeriods: String(mapping.weeklyPeriods),
    displayOrder: mapping.displayOrder === null ? "" : String(mapping.displayOrder),
    isActive: mapping.isActive,
  };
}

export function GradeLevelSubjectsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("grade-level-subjects.create");
  const canUpdate = hasPermission("grade-level-subjects.update");
  const canDelete = hasPermission("grade-level-subjects.delete");
  const canReadAcademicYears = hasPermission("academic-years.read");
  const canReadGradeLevels = hasPermission("grade-levels.read");
  const canReadSubjects = hasPermission("subjects.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [gradeLevelFilter, setGradeLevelFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [mandatoryFilter, setMandatoryFilter] = React.useState<
    "all" | "mandatory" | "optional"
  >("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingMappingId, setEditingMappingId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<GradeLevelSubjectFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const mappingsQuery = useGradeLevelSubjectsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    gradeLevelId: gradeLevelFilter === "all" ? undefined : gradeLevelFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    isMandatory:
      mandatoryFilter === "all" ? undefined : mandatoryFilter === "mandatory",
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const academicYearOptionsQuery = useAcademicYearOptionsQuery();
  const gradeLevelOptionsQuery = useGradeLevelOptionsQuery();
  const subjectOptionsQuery = useSubjectOptionsQuery();

  const createMutation = useCreateGradeLevelSubjectMutation();
  const updateMutation = useUpdateGradeLevelSubjectMutation();
  const deleteMutation = useDeleteGradeLevelSubjectMutation();

  const mappings = React.useMemo(() => mappingsQuery.data?.data ?? [], [mappingsQuery.data?.data]);
  const pagination = mappingsQuery.data?.pagination;
  const yearOptions = React.useMemo(
    () => academicYearOptionsQuery.data ?? [],
    [academicYearOptionsQuery.data],
  );
  const gradeLevelOptions = React.useMemo(
    () => gradeLevelOptionsQuery.data ?? [],
    [gradeLevelOptionsQuery.data],
  );
  const subjectOptions = React.useMemo(
    () => subjectOptionsQuery.data ?? [],
    [subjectOptionsQuery.data],
  );
  const isEditing = editingMappingId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = mappings.some((mapping) => mapping.id === editingMappingId);
    if (!stillExists) {
      setEditingMappingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingMappingId, isEditing, mappings]);

  const resetForm = () => {
    setEditingMappingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.academicYearId || !formState.gradeLevelId || !formState.subjectId) {
      setFormError("الحقول الأساسية مطلوبة: academic year, grade level, subject.");
      return false;
    }

    const weeklyPeriods = Number(formState.weeklyPeriods);
    if (!Number.isInteger(weeklyPeriods) || weeklyPeriods < 1 || weeklyPeriods > 60) {
      setFormError("weeklyPeriods يجب أن يكون رقمًا صحيحًا بين 1 و 60.");
      return false;
    }

    if (formState.displayOrder.trim()) {
      const displayOrder = Number(formState.displayOrder);
      if (!Number.isInteger(displayOrder) || displayOrder < 1 || displayOrder > 500) {
        setFormError("displayOrder يجب أن يكون رقمًا صحيحًا بين 1 و 500.");
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      academicYearId: formState.academicYearId,
      gradeLevelId: formState.gradeLevelId,
      subjectId: formState.subjectId,
      isMandatory: formState.isMandatory,
      weeklyPeriods: Number(formState.weeklyPeriods),
      displayOrder: formState.displayOrder.trim()
        ? Number(formState.displayOrder)
        : undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingMappingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية grade-level-subjects.update.");
        return;
      }

      updateMutation.mutate(
        {
          mappingId: editingMappingId,
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
      setFormError("لا تملك صلاحية grade-level-subjects.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (mapping: GradeLevelSubjectListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingMappingId(mapping.id);
    setFormState(toFormState(mapping));
  };

  const handleDelete = (mapping: GradeLevelSubjectListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف الربط: ${mapping.gradeLevel.name} - ${mapping.subject.name}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(mapping.id, {
      onSuccess: () => {
        if (editingMappingId === mapping.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions =
    canReadAcademicYears && canReadGradeLevels && canReadSubjects;

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل ربط صف بمادة" : "إنشاء ربط صف بمادة"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل بيانات الربط وساعات المادة الأسبوعية."
              : "ربط مادة بصف دراسي لسنة أكاديمية محددة."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>grade-level-subjects.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Academic Year *
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.academicYearId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      academicYearId: event.target.value,
                    }))
                  }
                  disabled={!canReadAcademicYears}
                >
                  <option value="">اختر السنة الدراسية</option>
                  {yearOptions.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} ({year.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Grade Level *
                </label>
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

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">المادة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.subjectId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      subjectId: event.target.value,
                    }))
                  }
                  disabled={!canReadSubjects}
                >
                  <option value="">اختر المادة</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Weekly Periods *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={formState.weeklyPeriods}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        weeklyPeriods: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={formState.displayOrder}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        displayOrder: event.target.value,
                      }))
                    }
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>Mandatory</span>
                  <input
                    type="checkbox"
                    checked={formState.isMandatory}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        isMandatory: event.target.checked,
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

              {!hasDependenciesReadPermissions ? (
                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  يلزم صلاحيات القراءة المرتبطة: <code>academic-years.read</code>,{" "}
                  <code>grade-levels.read</code>, <code>subjects.read</code>.
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={
                    isFormSubmitting ||
                    (!canCreate && !isEditing) ||
                    !hasDependenciesReadPermissions
                  }
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cable className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء Mapping"}
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
            <CardTitle>Grade-Level Subject Mappings</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة ربط الصفوف بالمواد الدراسية على مستوى السنة الأكاديمية.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_170px_170px_170px_150px_140px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالسنة/الصف/المادة..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={yearFilter}
              onChange={(event) => {
                setPage(1);
                setYearFilter(event.target.value);
              }}
            >
              <option value="all">كل السنوات</option>
              {yearOptions.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={gradeLevelFilter}
              onChange={(event) => {
                setPage(1);
                setGradeLevelFilter(event.target.value);
              }}
            >
              <option value="all">All grade levels</option>
              {gradeLevelOptions.map((gradeLevel) => (
                <option key={gradeLevel.id} value={gradeLevel.id}>
                  {gradeLevel.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={subjectFilter}
              onChange={(event) => {
                setPage(1);
                setSubjectFilter(event.target.value);
              }}
            >
              <option value="all">كل المواد</option>
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={mandatoryFilter}
              onChange={(event) => {
                setPage(1);
                setMandatoryFilter(event.target.value as "all" | "mandatory" | "optional");
              }}
            >
              <option value="all">كل الأنواع</option>
              <option value="mandatory">Mandatory</option>
              <option value="optional">Optional</option>
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
          {mappingsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {mappingsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {mappingsQuery.error instanceof Error
                ? mappingsQuery.error.message
                : "فشل التحميل"}
            </div>
          ) : null}

          {!mappingsQuery.isPending && mappings.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد روابط مطابقة.
            </div>
          ) : null}

          {mappings.map((mapping) => (
            <div
              key={mapping.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {mapping.gradeLevel.name} - {mapping.subject.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Year: {mapping.academicYear.name} ({mapping.academicYear.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Subject: <code>{mapping.subject.code}</code> | Grade:{" "}
                    <code>{mapping.gradeLevel.code}</code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Weekly Periods: {mapping.weeklyPeriods}
                    {mapping.displayOrder !== null ? ` | Display Order: ${mapping.displayOrder}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={mapping.isMandatory ? "default" : "secondary"}>
                    {mapping.isMandatory ? "Mandatory" : "Optional"}
                  </Badge>
                  <Badge variant={mapping.isActive ? "default" : "outline"}>
                    {mapping.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(mapping)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(mapping)}
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
                disabled={!pagination || pagination.page <= 1 || mappingsQuery.isFetching}
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
                  mappingsQuery.isFetching
                }
              >
                التالي
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void mappingsQuery.refetch()}
                disabled={mappingsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${mappingsQuery.isFetching ? "animate-spin" : ""}`}
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





