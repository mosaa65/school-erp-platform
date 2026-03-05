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
  useCreateTermSubjectOfferingMutation,
  useDeleteTermSubjectOfferingMutation,
  useUpdateTermSubjectOfferingMutation,
} from "@/features/term-subject-offerings/hooks/use-term-subject-offerings-mutations";
import { useTermSubjectOfferingsQuery } from "@/features/term-subject-offerings/hooks/use-term-subject-offerings-query";
import { useAcademicYearOptionsQuery } from "@/features/term-subject-offerings/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/term-subject-offerings/hooks/use-academic-term-options-query";
import { useGradeLevelSubjectOptionsQuery } from "@/features/term-subject-offerings/hooks/use-grade-level-subject-options-query";
import type {
  AcademicTermListItem,
  GradeLevelSubjectListItem,
  TermSubjectOfferingListItem,
} from "@/lib/api/client";

type TermSubjectOfferingFormState = {
  academicTermId: string;
  gradeLevelSubjectId: string;
  weeklyPeriods: string;
  displayOrder: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: TermSubjectOfferingFormState = {
  academicTermId: "",
  gradeLevelSubjectId: "",
  weeklyPeriods: "1",
  displayOrder: "",
  isActive: true,
};

function toFormState(offering: TermSubjectOfferingListItem): TermSubjectOfferingFormState {
  return {
    academicTermId: offering.academicTermId,
    gradeLevelSubjectId: offering.gradeLevelSubjectId,
    weeklyPeriods: String(offering.weeklyPeriods),
    displayOrder: offering.displayOrder === null ? "" : String(offering.displayOrder),
    isActive: offering.isActive,
  };
}

function findTermById(terms: AcademicTermListItem[], termId: string): AcademicTermListItem | null {
  return terms.find((term) => term.id === termId) ?? null;
}

function findMappingById(
  mappings: GradeLevelSubjectListItem[],
  mappingId: string,
): GradeLevelSubjectListItem | null {
  return mappings.find((mapping) => mapping.id === mappingId) ?? null;
}

export function TermSubjectOfferingsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("term-subject-offerings.create");
  const canUpdate = hasPermission("term-subject-offerings.update");
  const canDelete = hasPermission("term-subject-offerings.delete");
  const canReadAcademicYears = hasPermission("academic-years.read");
  const canReadAcademicTerms = hasPermission("academic-terms.read");
  const canReadGradeLevelSubjects = hasPermission("grade-level-subjects.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [termFilter, setTermFilter] = React.useState("all");
  const [mappingFilter, setMappingFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingOfferingId, setEditingOfferingId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<TermSubjectOfferingFormState>(
    DEFAULT_FORM_STATE,
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const offeringsQuery = useTermSubjectOfferingsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    gradeLevelSubjectId: mappingFilter === "all" ? undefined : mappingFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const academicYearOptionsQuery = useAcademicYearOptionsQuery();
  const allAcademicTermOptionsQuery = useAcademicTermOptionsQuery();
  const filterGradeLevelSubjectOptionsQuery = useGradeLevelSubjectOptionsQuery({
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
  });

  const allAcademicTerms = React.useMemo(
    () => allAcademicTermOptionsQuery.data ?? [],
    [allAcademicTermOptionsQuery.data],
  );
  const selectedFormTerm = React.useMemo(
    () => findTermById(allAcademicTerms, formState.academicTermId),
    [allAcademicTerms, formState.academicTermId],
  );
  const selectedFormAcademicYearId = selectedFormTerm?.academicYearId;

  const formGradeLevelSubjectOptionsQuery = useGradeLevelSubjectOptionsQuery({
    academicYearId: selectedFormAcademicYearId,
  });

  const createMutation = useCreateTermSubjectOfferingMutation();
  const updateMutation = useUpdateTermSubjectOfferingMutation();
  const deleteMutation = useDeleteTermSubjectOfferingMutation();

  const offerings = React.useMemo(
    () => offeringsQuery.data?.data ?? [],
    [offeringsQuery.data?.data],
  );
  const pagination = offeringsQuery.data?.pagination;
  const yearOptions = React.useMemo(
    () => academicYearOptionsQuery.data ?? [],
    [academicYearOptionsQuery.data],
  );
  const filterTermOptions = React.useMemo(() => {
    if (yearFilter === "all") {
      return allAcademicTerms;
    }

    return allAcademicTerms.filter((term) => term.academicYearId === yearFilter);
  }, [allAcademicTerms, yearFilter]);
  const filterMappingOptions = React.useMemo(
    () => filterGradeLevelSubjectOptionsQuery.data ?? [],
    [filterGradeLevelSubjectOptionsQuery.data],
  );
  const formMappingOptions = React.useMemo(
    () => formGradeLevelSubjectOptionsQuery.data ?? [],
    [formGradeLevelSubjectOptionsQuery.data],
  );
  const isEditing = editingOfferingId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = offerings.some((offering) => offering.id === editingOfferingId);
    if (!stillExists) {
      setEditingOfferingId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
    }
  }, [editingOfferingId, isEditing, offerings]);

  const resetForm = () => {
    setEditingOfferingId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.academicTermId || !formState.gradeLevelSubjectId) {
      setFormError("الحقول الأساسية مطلوبة: الفصل الأكاديمي وربط الصف مع المادة.");
      return false;
    }

    const weeklyPeriods = Number(formState.weeklyPeriods);
    if (!Number.isInteger(weeklyPeriods) || weeklyPeriods < 1 || weeklyPeriods > 60) {
      setFormError("عدد الحصص الأسبوعية يجب أن يكون رقمًا صحيحًا بين 1 و 60.");
      return false;
    }

    if (formState.displayOrder.trim()) {
      const displayOrder = Number(formState.displayOrder);
      if (!Number.isInteger(displayOrder) || displayOrder < 1 || displayOrder > 500) {
        setFormError("ترتيب العرض يجب أن يكون رقمًا صحيحًا بين 1 و 500.");
        return false;
      }
    }

    const selectedTerm = findTermById(allAcademicTerms, formState.academicTermId);
    const selectedMapping = findMappingById(formMappingOptions, formState.gradeLevelSubjectId);

    if (selectedTerm && selectedMapping) {
      if (selectedTerm.academicYearId !== selectedMapping.academicYearId) {
        setFormError(
          "الفصل الأكاديمي وربط الصف مع المادة يجب أن يكونا ضمن نفس السنة الأكاديمية.",
        );
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
      academicTermId: formState.academicTermId,
      gradeLevelSubjectId: formState.gradeLevelSubjectId,
      weeklyPeriods: Number(formState.weeklyPeriods),
      displayOrder: formState.displayOrder.trim() ? Number(formState.displayOrder) : undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingOfferingId) {
      if (!canUpdate) {
        setFormError("لا تملك صلاحية term-subject-offerings.update.");
        return;
      }

      updateMutation.mutate(
        {
          offeringId: editingOfferingId,
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
      setFormError("لا تملك صلاحية term-subject-offerings.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (offering: TermSubjectOfferingListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingOfferingId(offering.id);
    setFormState(toFormState(offering));
  };

  const handleDelete = (offering: TermSubjectOfferingListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف عرض المادة: ${offering.gradeLevelSubject.subject.name} - ${offering.academicTerm.name}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(offering.id, {
      onSuccess: () => {
        if (editingOfferingId === offering.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions =
    canReadAcademicTerms && canReadGradeLevelSubjects;

  return (
    <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cable className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل عرض مادة للفصل" : "إنشاء عرض مادة للفصل"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل ربط المادة بالفصل وعدد الحصص الأسبوعية."
              : "إنشاء عرض مادة ضمن فصل أكاديمي محدد."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>term-subject-offerings.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm} data-testid="offering-form">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  الفصل الأكاديمي *
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.academicTermId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      academicTermId: event.target.value,
                    }))
                  }
                  disabled={!canReadAcademicTerms}
                  data-testid="offering-form-term"
                >
                  <option value="">اختر الفصل الدراسي</option>
                  {allAcademicTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({term.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  ربط الصف مع المادة *
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={formState.gradeLevelSubjectId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      gradeLevelSubjectId: event.target.value,
                    }))
                  }
                  disabled={!canReadGradeLevelSubjects}
                  data-testid="offering-form-mapping"
                >
                  <option value="">اختر الربط</option>
                  {formMappingOptions.map((mapping) => (
                    <option key={mapping.id} value={mapping.id}>
                      {mapping.gradeLevel.code} - {mapping.subject.code} ({mapping.academicYear.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    الحصص الأسبوعية *
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
                    data-testid="offering-form-weekly-periods"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    ترتيب العرض
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
                    data-testid="offering-form-display-order"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>نشط</span>
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                  data-testid="offering-form-active"
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

              {!hasDependenciesReadPermissions ? (
                <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  يلزم صلاحيات القراءة المرتبطة: <code>academic-terms.read</code>,{" "}
                  <code>grade-level-subjects.read</code>.
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
                  data-testid="offering-form-submit"
                >
                  {isFormSubmitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cable className="h-4 w-4" />
                  )}
                  {isEditing ? "حفظ التعديلات" : "إنشاء عرض مادة"}
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
            <CardTitle>عروض المواد للفصول</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة عروض المواد للفصول الأكاديمية مع فلترة متعددة.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_170px_170px_220px_140px_auto]"
            data-testid="offering-filters-form"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالفصل/الصف/المادة..."
                className="pr-8"
                data-testid="offering-filter-search"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={yearFilter}
              onChange={(event) => {
                setPage(1);
                setYearFilter(event.target.value);
                setTermFilter("all");
                setMappingFilter("all");
              }}
              disabled={!canReadAcademicYears}
              data-testid="offering-filter-year"
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
              value={termFilter}
              onChange={(event) => {
                setPage(1);
                setTermFilter(event.target.value);
              }}
              disabled={!canReadAcademicTerms}
              data-testid="offering-filter-term"
            >
              <option value="all">كل الفصول</option>
              {filterTermOptions.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={mappingFilter}
              onChange={(event) => {
                setPage(1);
                setMappingFilter(event.target.value);
              }}
              disabled={!canReadGradeLevelSubjects}
              data-testid="offering-filter-mapping"
            >
              <option value="all">كل الربوط</option>
              {filterMappingOptions.map((mapping) => (
                <option key={mapping.id} value={mapping.id}>
                  {mapping.gradeLevel.code} - {mapping.subject.code}
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
              data-testid="offering-filter-active"
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
          {offeringsQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {offeringsQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {offeringsQuery.error instanceof Error
                ? offeringsQuery.error.message
                : "فشل التحميل"}
            </div>
          ) : null}

          {!offeringsQuery.isPending && offerings.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد عروض مطابقة.
            </div>
          ) : null}

          {offerings.map((offering) => (
            <div
              key={offering.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              data-testid="offering-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">
                    {offering.gradeLevelSubject.subject.name} - {offering.academicTerm.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الفصل: <code>{offering.academicTerm.code}</code> | السنة:{" "}
                    <code>{offering.gradeLevelSubject.academicYear.code}</code>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الصف: {offering.gradeLevelSubject.gradeLevel.name} (
                    {offering.gradeLevelSubject.gradeLevel.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الحصص الأسبوعية: {offering.weeklyPeriods}
                    {offering.displayOrder !== null ? ` | ترتيب العرض: ${offering.displayOrder}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={offering.gradeLevelSubject.isMandatory ? "default" : "secondary"}>
                    {offering.gradeLevelSubject.isMandatory ? "إلزامية" : "اختيارية"}
                  </Badge>
                  <Badge variant={offering.isActive ? "default" : "outline"}>
                    {offering.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(offering)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(offering)}
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
                disabled={!pagination || pagination.page <= 1 || offeringsQuery.isFetching}
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
                  offeringsQuery.isFetching
                }
              >
                التالي
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void offeringsQuery.refetch()}
                disabled={offeringsQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${offeringsQuery.isFetching ? "animate-spin" : ""}`}
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





