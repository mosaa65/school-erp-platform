"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  ClipboardList,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FormBooleanField } from "@/components/ui/form-boolean-field";
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateHomeworkMutation,
  useDeleteHomeworkMutation,
  usePopulateHomeworkStudentsMutation,
  useUpdateHomeworkMutation,
} from "@/features/assignments/homeworks/hooks/use-homeworks-mutations";
import { useHomeworksQuery } from "@/features/assignments/homeworks/hooks/use-homeworks-query";
import { useAcademicYearOptionsQuery } from "@/features/assignments/homeworks/hooks/use-academic-year-options-query";
import { useAcademicTermOptionsQuery } from "@/features/assignments/homeworks/hooks/use-academic-term-options-query";
import { useSectionOptionsQuery } from "@/features/assignments/homeworks/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/assignments/homeworks/hooks/use-subject-options-query";
import { useHomeworkTypeOptionsQuery } from "@/features/assignments/homeworks/hooks/use-homework-type-options-query";
import type { HomeworkListItem } from "@/lib/api/client";
import {
  formatNameCodeLabel,
  formatSectionWithGradeLabel,
} from "@/lib/option-labels";

type HomeworkFormState = {
  academicYearId: string;
  academicTermId: string;
  sectionId: string;
  subjectId: string;
  homeworkTypeId: string;
  title: string;
  homeworkDate: string;
  dueDate: string;
  maxScore: string;
  content: string;
  notes: string;
  autoPopulateStudents: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_DUE_DATE_OFFSET_DAYS = 5;

const DEFAULT_FORM_STATE: HomeworkFormState = {
  academicYearId: "",
  academicTermId: "",
  sectionId: "",
  subjectId: "",
  homeworkTypeId: "",
  title: "",
  homeworkDate: "",
  dueDate: "",
  maxScore: "",
  content: "",
  notes: "",
  autoPopulateStudents: true,
  isActive: true,
};

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDaysToDateInput(value: string, days: number): string {
  const baseDate = fromDateInput(value);
  baseDate.setDate(baseDate.getDate() + days);
  return toLocalDateInput(baseDate);
}

function createDefaultFormState(): HomeworkFormState {
  const homeworkDate = toLocalDateInput(new Date());
  return {
    ...DEFAULT_FORM_STATE,
    homeworkDate,
    dueDate: addDaysToDateInput(homeworkDate, DEFAULT_DUE_DATE_OFFSET_DAYS),
  };
}

function shouldAutoAdjustDueDate(
  previousHomeworkDate: string,
  previousDueDate: string,
): boolean {
  if (!previousDueDate) {
    return true;
  }

  if (!previousHomeworkDate) {
    return false;
  }

  return (
    previousDueDate ===
    addDaysToDateInput(previousHomeworkDate, DEFAULT_DUE_DATE_OFFSET_DAYS)
  );
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

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("ar-SA");
}

function toFormState(item: HomeworkListItem): HomeworkFormState {
  return {
    academicYearId: item.academicYearId,
    academicTermId: item.academicTermId,
    sectionId: item.sectionId,
    subjectId: item.subjectId,
    homeworkTypeId: item.homeworkTypeId,
    title: item.title,
    homeworkDate: toDateInput(item.homeworkDate),
    dueDate: toDateInput(item.dueDate),
    maxScore: String(item.maxScore),
    content: item.content ?? "",
    notes: item.notes ?? "",
    autoPopulateStudents: true,
    isActive: item.isActive,
  };
}

export function HomeworksWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("homeworks.create");
  const canUpdate = hasPermission("homeworks.update");
  const canDelete = hasPermission("homeworks.delete");
  const canReadAcademicYears = hasPermission("academic-years.read");
  const canReadAcademicTerms = hasPermission("academic-terms.read");
  const canReadSections = hasPermission("sections.read");
  const canReadSubjects = hasPermission("subjects.read");
  const canReadHomeworkTypes = hasPermission("homework-types.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [academicTermFilter, setAcademicTermFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [subjectFilter, setSubjectFilter] = React.useState("all");
  const [homeworkTypeFilter, setHomeworkTypeFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    year: string;
    term: string;
    section: string;
    subject: string;
    homeworkType: string;
    active: "all" | "active" | "inactive";
  }>({
    year: "all",
    term: "all",
    section: "all",
    subject: "all",
    homeworkType: "all",
    active: "all",
  });

  const [editingHomeworkId, setEditingHomeworkId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<HomeworkFormState>(
    createDefaultFormState,
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionInfo, setActionInfo] = React.useState<string | null>(null);

  const homeworksQuery = useHomeworksQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: academicYearFilter === "all" ? undefined : academicYearFilter,
    academicTermId: academicTermFilter === "all" ? undefined : academicTermFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    subjectId: subjectFilter === "all" ? undefined : subjectFilter,
    homeworkTypeId: homeworkTypeFilter === "all" ? undefined : homeworkTypeFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const academicTermsQuery = useAcademicTermOptionsQuery(
    formState.academicYearId || (academicYearFilter === "all" ? undefined : academicYearFilter),
  );
  const draftYearForTerms = isFilterOpen ? filterDraft.year : academicYearFilter;
  const filterTermOptionsQuery = useAcademicTermOptionsQuery(
    draftYearForTerms === "all" ? undefined : draftYearForTerms,
  );
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const homeworkTypesQuery = useHomeworkTypeOptionsQuery();

  const createMutation = useCreateHomeworkMutation();
  const updateMutation = useUpdateHomeworkMutation();
  const populateMutation = usePopulateHomeworkStudentsMutation();
  const deleteMutation = useDeleteHomeworkMutation();

  const homeworks = React.useMemo(() => homeworksQuery.data?.data ?? [], [homeworksQuery.data?.data]);
  const pagination = homeworksQuery.data?.pagination;
  const isEditing = editingHomeworkId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (populateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }
    const stillExists = homeworks.some((item) => item.id === editingHomeworkId);
    if (!stillExists) {
      setEditingHomeworkId(null);
      setFormState(createDefaultFormState());
      setFormError(null);
      setActionInfo(null);
      setIsFormOpen(false);
    }
  }, [editingHomeworkId, homeworks, isEditing]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      year: academicYearFilter,
      term: academicTermFilter,
      section: sectionFilter,
      subject: subjectFilter,
      homeworkType: homeworkTypeFilter,
      active: activeFilter,
    });
  }, [
    academicTermFilter,
    academicYearFilter,
    activeFilter,
    homeworkTypeFilter,
    isFilterOpen,
    sectionFilter,
    subjectFilter,
  ]);

  const resetFormState = () => {
    setEditingHomeworkId(null);
    setFormState(createDefaultFormState());
    setFormError(null);
    setActionInfo(null);
  };

  const resetForm = () => {
    resetFormState();
    setIsFormOpen(false);
    setActionInfo(null);
  };

  const validateForm = (): boolean => {
    if (
      !formState.academicYearId ||
      !formState.academicTermId ||
      !formState.sectionId ||
      !formState.subjectId ||
      !formState.homeworkTypeId ||
      !formState.title.trim() ||
      !formState.homeworkDate
    ) {
      setFormError("الحقول الأساسية مطلوبة.");
      return false;
    }

    if (!formState.maxScore.trim()) {
      setFormError("الدرجة القصوى مطلوبة.");
      return false;
    }

    const maxScore = Number(formState.maxScore);
    if (!Number.isFinite(maxScore) || maxScore < 0.01) {
      setFormError("الدرجة القصوى يجب أن تكون أكبر من 0.");
      return false;
    }

    if (
      formState.dueDate &&
      formState.homeworkDate &&
      formState.dueDate.localeCompare(formState.homeworkDate) < 0
    ) {
      setFormError("تاريخ التسليم يجب أن يكون في نفس يوم تاريخ الواجب أو بعده.");
      return false;
    }

    if (formState.title.trim().length > 120) {
      setFormError("عنوان الواجب يجب ألا يتجاوز 120 حرفًا.");
      return false;
    }

    if (formState.content.trim().length > 5000) {
      setFormError("المحتوى يجب ألا يتجاوز 5000 حرف.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmitForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionInfo(null);

    if (!validateForm()) {
      return;
    }

    const basePayload = {
      academicYearId: formState.academicYearId,
      academicTermId: formState.academicTermId,
      sectionId: formState.sectionId,
      subjectId: formState.subjectId,
      homeworkTypeId: formState.homeworkTypeId,
      title: formState.title.trim(),
      content: toOptionalString(formState.content),
      homeworkDate: toDateIso(formState.homeworkDate),
      dueDate: formState.dueDate ? toDateIso(formState.dueDate) : undefined,
      maxScore: Number(formState.maxScore),
      notes: toOptionalString(formState.notes),
      isActive: formState.isActive,
    };

    if (isEditing && editingHomeworkId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: homeworks.update.");
        return;
      }

      updateMutation.mutate(
        {
          homeworkId: editingHomeworkId,
          payload: basePayload,
        },
        {
          onSuccess: () => {
            resetFormState();
            setActionInfo("تم تحديث الواجب بنجاح.");
          },
        },
      );
      return;
    }

    if (!canCreate) {
      setFormError("لا تملك الصلاحية المطلوبة: homeworks.create.");
      return;
    }

    createMutation.mutate(
      {
        ...basePayload,
        autoPopulateStudents: formState.autoPopulateStudents,
      },
      {
        onSuccess: () => {
          resetFormState();
          setPage(1);
          setActionInfo("تم إنشاء الواجب بنجاح.");
        },
      },
    );
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setActionInfo(null);
    setEditingHomeworkId(null);
    setFormState(createDefaultFormState());
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: HomeworkListItem) => {
    if (!canUpdate) {
      return;
    }
    setFormError(null);
    setActionInfo(null);
    setEditingHomeworkId(item.id);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleToggleActive = (item: HomeworkListItem) => {
    if (!canUpdate) {
      return;
    }
    updateMutation.mutate(
      {
        homeworkId: item.id,
        payload: {
          isActive: !item.isActive,
        },
      },
      {
        onSuccess: () => {
          setActionInfo(item.isActive ? "تم تعطيل الواجب بنجاح." : "تم تفعيل الواجب بنجاح.");
        },
      },
    );
  };

  const handlePopulateStudents = (item: HomeworkListItem) => {
    if (!canUpdate) {
      return;
    }
    populateMutation.mutate(item.id, {
      onSuccess: (result) => {
        setActionInfo(
          `تمت تعبئة الطلاب: مضاف=${result.insertedCount}، مستعاد=${result.restoredCount}، التسجيلات النشطة=${result.activeEnrollmentCount}`,
        );
      },
    });
  };

  const handleDelete = (item: HomeworkListItem) => {
    if (!canDelete) {
      return;
    }
    const confirmed = window.confirm(`تأكيد حذف الواجب ${item.title}؟`);
    if (!confirmed) {
      return;
    }
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        if (editingHomeworkId === item.id) {
          resetForm();
        }
        setActionInfo("تم حذف الواجب بنجاح.");
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions =
    canReadAcademicYears &&
    canReadAcademicTerms &&
    canReadSections &&
    canReadSubjects &&
    canReadHomeworkTypes;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setAcademicYearFilter("all");
    setAcademicTermFilter("all");
    setSectionFilter("all");
    setSubjectFilter("all");
    setHomeworkTypeFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setAcademicYearFilter(filterDraft.year);
    setAcademicTermFilter(filterDraft.term);
    setSectionFilter(filterDraft.section);
    setSubjectFilter(filterDraft.subject);
    setHomeworkTypeFilter(filterDraft.homeworkType);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    const count = [
      searchInput.trim() ? 1 : 0,
      academicYearFilter !== "all" ? 1 : 0,
      academicTermFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      subjectFilter !== "all" ? 1 : 0,
      homeworkTypeFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
    return count;
  }, [
    academicTermFilter,
    academicYearFilter,
    activeFilter,
    homeworkTypeFilter,
    searchInput,
    sectionFilter,
    subjectFilter,
  ]);

  return (
    <>
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen((prev) => !prev)}
        />

        <FilterDrawer
            open={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
          title="فلاتر الواجبات"
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
              value={filterDraft.year}
              onChange={(event) => {
                const nextYear = event.target.value;
                setFilterDraft((prev) => ({
                  ...prev,
                  year: nextYear,
                  term: nextYear === "all" ? "all" : prev.term,
                }));
              }}
              disabled={!canReadAcademicYears}
            >
              <option value="all">كل السنوات</option>
              {(academicYearsQuery.data ?? []).map((year) => (
                <option key={year.id} value={year.id}>
                  {formatNameCodeLabel(year.name, year.code)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.term}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, term: event.target.value }))
              }
              disabled={!canReadAcademicTerms}
            >
              <option value="all">كل الفصول</option>
              {(filterTermOptionsQuery.data ?? []).map((term) => (
                <option key={term.id} value={term.id}>
                  {formatNameCodeLabel(term.name, term.code)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.section}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, section: event.target.value }))
              }
              disabled={!canReadSections}
            >
              <option value="all">كل الشعب</option>
              {(sectionsQuery.data ?? []).map((section) => (
                <option key={section.id} value={section.id}>
                  {formatSectionWithGradeLabel(section)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.subject}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, subject: event.target.value }))
              }
              disabled={!canReadSubjects}
            >
              <option value="all">كل المواد</option>
              {(subjectsQuery.data ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {formatNameCodeLabel(subject.name, subject.code)}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.homeworkType}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, homeworkType: event.target.value }))
              }
              disabled={!canReadHomeworkTypes}
            >
              <option value="all">كل الأنواع</option>
              {(homeworkTypesQuery.data ?? []).map((typeItem) => (
                <option key={typeItem.id} value={typeItem.id}>
                  {formatNameCodeLabel(typeItem.name, typeItem.code)}
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
              <option value="all">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>الواجبات</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>قائمة الواجبات مع عمليات التحديث والتعبئة والحذف.</CardDescription>

        </CardHeader>

        <CardContent className="space-y-3">
          {homeworksQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ تحميل البيانات...
            </div>
          ) : null}
          {homeworksQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {homeworksQuery.error instanceof Error
                ? homeworksQuery.error.message
                : "تعذّر تحميل البيانات."}
            </div>
          ) : null}
          {!homeworksQuery.isPending && homeworks.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد نتائج مطابقة.
            </div>
          ) : null}

          {homeworks.map((item) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNameCodeLabel(item.academicYear.name, item.academicYear.code)} / {formatNameCodeLabel(item.academicTerm.name, item.academicTerm.code)} - {formatSectionWithGradeLabel(item.section)} -{" "}
                    {formatNameCodeLabel(item.subject.name, item.subject.code)} - {formatNameCodeLabel(item.homeworkType.name, item.homeworkType.code)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الواجب: {formatDate(item.homeworkDate)} | الاستحقاق: {formatDate(item.dueDate)} |
                    الدرجة القصوى: {item.maxScore}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الطلاب المرتبطون: {item._count.studentHomeworks}
                  </p>
                </div>
                <Badge variant={item.isActive ? "default" : "outline"}>
                  {item.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleStartEdit(item)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handlePopulateStudents(item)}
                  disabled={!canUpdate || populateMutation.isPending}
                >
                  <UsersRound className="h-3.5 w-3.5" />
                  تعبئة الطلاب
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(item)}
                  disabled={!canUpdate || updateMutation.isPending}
                >
                  {item.isActive ? "تعطيل" : "تفعيل"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(item)}
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
                disabled={!pagination || pagination.page <= 1 || homeworksQuery.isFetching}
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
                  homeworksQuery.isFetching
                }
              >
                التالي
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void homeworksQuery.refetch()}
                disabled={homeworksQuery.isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${homeworksQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء واجب"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل واجب" : "إنشاء واجب"}
        onClose={resetForm}
        onSubmit={() => undefined}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء واجب"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>homeworks.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <CardDescription>إدارة واجبات الطلاب على مستوى الفصل والشعبة.</CardDescription>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={formState.academicYearId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    academicYearId: event.target.value,
                    academicTermId: "",
                  }))
                }
                disabled={!canReadAcademicYears}
              >
                <option value="">اختر السنة</option>
                {(academicYearsQuery.data ?? []).map((year) => (
                  <option key={year.id} value={year.id}>
                    {formatNameCodeLabel(year.name, year.code)}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={formState.academicTermId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, academicTermId: event.target.value }))
                }
                disabled={!canReadAcademicTerms}
              >
                <option value="">اختر الفصل</option>
                {(academicTermsQuery.data ?? []).map((term) => (
                  <option key={term.id} value={term.id}>
                    {formatNameCodeLabel(term.name, term.code)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={formState.sectionId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, sectionId: event.target.value }))
                }
                disabled={!canReadSections}
              >
                <option value="">اختر الشعبة</option>
                {(sectionsQuery.data ?? []).map((section) => (
                  <option key={section.id} value={section.id}>
                    {formatSectionWithGradeLabel(section)}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={formState.subjectId}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, subjectId: event.target.value }))
                }
                disabled={!canReadSubjects}
              >
                <option value="">اختر المادة</option>
                {(subjectsQuery.data ?? []).map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {formatNameCodeLabel(subject.name, subject.code)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              ملاحظة: الشعبة مرتبطة بالصف، أما القاعة/مكان الحصة فيتم ضبطه من شاشة{" "}
              <code>الجدول الدراسي</code> عبر حقل القاعة.
            </p>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={formState.homeworkTypeId}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, homeworkTypeId: event.target.value }))
              }
              disabled={!canReadHomeworkTypes}
            >
              <option value="">اختر نوع الواجب</option>
              {(homeworkTypesQuery.data ?? []).map((typeItem) => (
                <option key={typeItem.id} value={typeItem.id}>
                  {formatNameCodeLabel(typeItem.name, typeItem.code)}
                </option>
              ))}
            </select>

            <Input
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="عنوان الواجب"
              required
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="date"
                value={formState.homeworkDate}
                onChange={(event) =>
                  setFormState((prev) => {
                    const nextHomeworkDate = event.target.value;

                    if (!nextHomeworkDate) {
                      return {
                        ...prev,
                        homeworkDate: "",
                      };
                    }

                    const autoAdjustDueDate = shouldAutoAdjustDueDate(
                      prev.homeworkDate,
                      prev.dueDate,
                    );

                    return {
                      ...prev,
                      homeworkDate: nextHomeworkDate,
                      dueDate: autoAdjustDueDate
                        ? addDaysToDateInput(
                            nextHomeworkDate,
                            DEFAULT_DUE_DATE_OFFSET_DAYS,
                          )
                        : prev.dueDate,
                    };
                  })
                }
                required
              />
              <Input
                type="date"
                value={formState.dueDate}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, dueDate: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={formState.maxScore}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, maxScore: event.target.value }))
                }
              />
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="ملاحظات"
              />
            </div>

            <Input
              value={formState.content}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, content: event.target.value }))
              }
              placeholder="المحتوى"
            />

            <div className="grid gap-2 md:grid-cols-2">
              {!isEditing ? (
                <FormBooleanField
                  label="تعبئة الطلاب تلقائيًا"
                  checked={formState.autoPopulateStudents}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({
                      ...prev,
                      autoPopulateStudents: checked,
                    }))
                  }
                />
              ) : (
                <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  بعد التعديل استخدم إجراء <code>تعبئة الطلاب</code>.
                </div>
              )}
              <FormBooleanField
                label="نشط"
                checked={formState.isActive}
                onCheckedChange={(checked) =>
                  setFormState((prev) => ({ ...prev, isActive: checked }))
                }
              />
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
            {actionInfo ? (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-xs text-primary">
                {actionInfo}
              </div>
            ) : null}
            {!hasDependenciesReadPermissions ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء صلاحيات قراءة المراجع (السنة/الفصل/الشعبة/المادة/نوع الواجب).
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
                  <ClipboardList className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء واجب"}
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






