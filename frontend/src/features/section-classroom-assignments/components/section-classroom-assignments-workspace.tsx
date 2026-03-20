"use client";

import * as React from "react";
import {
  CalendarRange,
  Lightbulb,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BottomSheetForm } from "@/components/ui/bottom-sheet-form";
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { FilterTriggerButton } from "@/components/ui/filter-trigger-button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAcademicYearOptionsQuery } from "@/features/student-enrollments/hooks/use-academic-year-options-query";
import { useSectionOptionsQuery } from "@/features/student-enrollments/hooks/use-section-options-query";
import {
  useCreateSectionClassroomAssignmentMutation,
  useDeleteSectionClassroomAssignmentMutation,
  useUpdateSectionClassroomAssignmentMutation,
} from "@/features/section-classroom-assignments/hooks/use-section-classroom-assignments-mutations";
import { useClassroomOptionsQuery } from "@/features/section-classroom-assignments/hooks/use-classroom-options-query";
import { useSectionClassroomAssignmentsQuery } from "@/features/section-classroom-assignments/hooks/use-section-classroom-assignments-query";
import type { SectionClassroomAssignmentListItem } from "@/lib/api/client";

type FilterState = {
  academicYearId: string;
  sectionId: string;
  classroomId: string;
  active: "all" | "active" | "inactive";
  primary: "all" | "primary" | "secondary";
};

type AssignmentFormState = {
  academicYearId: string;
  sectionId: string;
  classroomId: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
  isPrimary: boolean;
  isActive: boolean;
};

type SectionClassroomAssignmentsWorkspaceProps = {
  initialSectionId?: string;
  initialGradeLevelId?: string;
  initialClassroomId?: string;
  initialAcademicYearId?: string;
  initialMode?: string;
};

const PAGE_SIZE = 12;

const DEFAULT_FILTER_STATE: FilterState = {
  academicYearId: "all",
  sectionId: "all",
  classroomId: "all",
  active: "all",
  primary: "all",
};

const DEFAULT_FORM_STATE: AssignmentFormState = {
  academicYearId: "",
  sectionId: "",
  classroomId: "",
  effectiveFrom: "",
  effectiveTo: "",
  notes: "",
  isPrimary: false,
  isActive: true,
};

function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function toIsoDate(value: string) {
  return value ? `${value}T00:00:00.000Z` : undefined;
}

function toFormState(
  assignment: SectionClassroomAssignmentListItem,
): AssignmentFormState {
  return {
    academicYearId: assignment.academicYear.id,
    sectionId: assignment.section.id,
    classroomId: assignment.classroom.id,
    effectiveFrom: toDateInputValue(assignment.effectiveFrom),
    effectiveTo: toDateInputValue(assignment.effectiveTo),
    notes: assignment.notes ?? "",
    isPrimary: assignment.isPrimary,
    isActive: assignment.isActive,
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function formatBuildingLabel(building?: {
  id: number;
  code: string;
  nameAr: string;
  nameEn?: string | null;
} | null) {
  if (!building) {
    return "بدون مبنى";
  }

  return building.nameAr || building.nameEn || building.code || `مبنى ${building.id}`;
}

type ClassroomSuggestion = {
  classroom: {
    id: string;
    code: string;
    name: string;
    capacity: number | null;
    notes: string | null;
    activeAssignmentsCount: number;
    building: {
      id: number;
      code: string;
      nameAr: string;
      nameEn?: string | null;
      isActive: boolean;
    } | null;
  };
  reason: string;
  fitsCapacity: boolean;
  matchesBuilding: boolean;
};

export function SectionClassroomAssignmentsWorkspace({
  initialSectionId,
  initialGradeLevelId,
  initialClassroomId,
  initialAcademicYearId,
  initialMode,
}: SectionClassroomAssignmentsWorkspaceProps) {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("sections.create");
  const canUpdate = hasPermission("sections.update");
  const canDelete = hasPermission("sections.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<FilterState>(() => ({
    ...DEFAULT_FILTER_STATE,
    academicYearId: initialAcademicYearId ?? "all",
    sectionId: initialSectionId ?? "all",
    classroomId: initialClassroomId ?? "all",
  }));
  const [filterDraft, setFilterDraft] = React.useState<FilterState>(() => ({
    ...DEFAULT_FILTER_STATE,
    academicYearId: initialAcademicYearId ?? "all",
    sectionId: initialSectionId ?? "all",
    classroomId: initialClassroomId ?? "all",
  }));
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<AssignmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    if (isFilterOpen) {
      setFilterDraft(filters);
    }
  }, [filters, isFilterOpen]);

  const assignmentsQuery = useSectionClassroomAssignmentsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicYearId: filters.academicYearId === "all" ? undefined : filters.academicYearId,
    sectionId: filters.sectionId === "all" ? undefined : filters.sectionId,
    classroomId: filters.classroomId === "all" ? undefined : filters.classroomId,
    isActive: filters.active === "all" ? undefined : filters.active === "active",
    isPrimary: filters.primary === "all" ? undefined : filters.primary === "primary",
  });

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery({
    gradeLevelId: initialGradeLevelId,
  });
  const classroomsQuery = useClassroomOptionsQuery();

  const createMutation = useCreateSectionClassroomAssignmentMutation();
  const updateMutation = useUpdateSectionClassroomAssignmentMutation();
  const deleteMutation = useDeleteSectionClassroomAssignmentMutation();

  const assignments = React.useMemo(
    () => assignmentsQuery.data?.data ?? [],
    [assignmentsQuery.data?.data],
  );
  const pagination = assignmentsQuery.data?.pagination;
  const academicYears = React.useMemo(
    () => academicYearsQuery.data ?? [],
    [academicYearsQuery.data],
  );
  const sections = React.useMemo(
    () => sectionsQuery.data ?? [],
    [sectionsQuery.data],
  );
  const classrooms = React.useMemo(
    () => classroomsQuery.data ?? [],
    [classroomsQuery.data],
  );
  const isEditing = editingAssignmentId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const currentAcademicYear = React.useMemo(
    () => academicYears.find((year) => year.isCurrent) ?? null,
    [academicYears],
  );
  const selectedSection = React.useMemo(
    () => sections.find((section) => section.id === formState.sectionId) ?? null,
    [formState.sectionId, sections],
  );

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  const resetForm = React.useCallback(() => {
    setEditingAssignmentId(null);
    setFormState({
      ...DEFAULT_FORM_STATE,
      academicYearId: initialAcademicYearId ?? currentAcademicYear?.id ?? "",
      sectionId: initialSectionId ?? "",
      classroomId: initialClassroomId ?? "",
    });
    setFormError(null);
    setIsFormOpen(false);
  }, [currentAcademicYear?.id, initialAcademicYearId, initialClassroomId, initialSectionId]);

  React.useEffect(() => {
    const nextAcademicYearId = initialAcademicYearId ?? currentAcademicYear?.id;
    if (!nextAcademicYearId) {
      return;
    }

    setFilters((prev) =>
      prev.academicYearId === "all"
        ? { ...prev, academicYearId: nextAcademicYearId }
        : prev,
    );
    setFilterDraft((prev) =>
      prev.academicYearId === "all"
        ? { ...prev, academicYearId: nextAcademicYearId }
        : prev,
    );
    setFormState((prev) =>
      prev.academicYearId
        ? prev
        : {
            ...prev,
            academicYearId: nextAcademicYearId,
          },
    );
  }, [currentAcademicYear?.id, initialAcademicYearId]);

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = assignments.some((assignment) => assignment.id === editingAssignmentId);
    if (!stillExists) {
      resetForm();
    }
  }, [assignments, editingAssignmentId, isEditing, resetForm]);

  const classroomSuggestion = React.useMemo<ClassroomSuggestion | null>(() => {
    if (!selectedSection || classrooms.length === 0) {
      return null;
    }

    const sectionCapacity = selectedSection.capacity;
    const sectionBuildingId = selectedSection.building?.id ?? null;
    const sectionBuildingTerms = [selectedSection.building?.nameAr, selectedSection.building?.code]
      .filter(Boolean)
      .map((value) => normalizeText(String(value)));

    const ranked = classrooms
      .map((classroom) => {
        const roomText = normalizeText(
          [
            classroom.code,
            classroom.name,
            classroom.notes ?? "",
            classroom.building?.nameAr ?? "",
            classroom.building?.code ?? "",
          ].join(" "),
        );
        const matchesBuilding =
          (sectionBuildingId !== null && classroom.building?.id === sectionBuildingId) ||
          (sectionBuildingTerms.length > 0 &&
            sectionBuildingTerms.some((term) => term.length > 0 && roomText.includes(term)));

        let score = 0;
        let fitsCapacity = true;
        const reasonParts: string[] = [];

        if (sectionCapacity !== null) {
          if (classroom.capacity === null) {
            score += 1000;
            fitsCapacity = false;
            reasonParts.push("السعة غير محددة");
          } else if (classroom.capacity >= sectionCapacity) {
            score += classroom.capacity - sectionCapacity;
            reasonParts.push(`السعة ${classroom.capacity} مناسبة`);
          } else {
            score += 500 + (sectionCapacity - classroom.capacity);
            fitsCapacity = false;
            reasonParts.push(`السعة أقل من المطلوب (${classroom.capacity}/${sectionCapacity})`);
          }
        } else if (classroom.capacity !== null) {
          score += classroom.capacity;
          reasonParts.push(`السعة المتاحة ${classroom.capacity}`);
        } else {
          score += 1000;
        }

        if (matchesBuilding) {
          score -= 200;
          reasonParts.push("يطابق المبنى");
        }

        if (classroom.activeAssignmentsCount > 0) {
          score += classroom.activeAssignmentsCount * 10;
          reasonParts.push(`مرتبط حاليًا بـ ${classroom.activeAssignmentsCount} شعبة`);
        } else {
          score -= 20;
          reasonParts.push("غير مزدحم حاليًا");
        }

        return {
          classroom,
          score,
          reason: reasonParts.join("، "),
          fitsCapacity,
          matchesBuilding,
        };
      })
      .sort((left, right) => {
        if (left.score !== right.score) {
          return left.score - right.score;
        }

        const leftCapacity = left.classroom.capacity ?? Number.MAX_SAFE_INTEGER;
        const rightCapacity = right.classroom.capacity ?? Number.MAX_SAFE_INTEGER;
        return leftCapacity - rightCapacity;
      });

    const best = ranked[0];
    if (!best) {
      return null;
    }

    return {
      classroom: best.classroom,
      reason: best.reason || "اقتراح تلقائي مبني على البيانات المتاحة",
      fitsCapacity: best.fitsCapacity,
      matchesBuilding: best.matchesBuilding,
    };
  }, [classrooms, selectedSection]);

  const handleStartCreate = React.useCallback(() => {
    if (!canCreate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingAssignmentId(null);
    setFormState({
      ...DEFAULT_FORM_STATE,
      academicYearId:
        filters.academicYearId !== "all"
          ? filters.academicYearId
          : initialAcademicYearId ?? currentAcademicYear?.id ?? "",
      sectionId: filters.sectionId !== "all" ? filters.sectionId : initialSectionId ?? "",
      classroomId:
        filters.classroomId !== "all" ? filters.classroomId : initialClassroomId ?? "",
    });
    setIsFormOpen(true);
  }, [
    canCreate,
    currentAcademicYear?.id,
    filters.academicYearId,
    filters.classroomId,
    filters.sectionId,
    initialAcademicYearId,
    initialClassroomId,
    initialSectionId,
  ]);

  React.useEffect(() => {
    if (initialMode !== "create" || isFormOpen || isEditing) {
      return;
    }

    if (
      initialSectionId ||
      initialClassroomId ||
      initialAcademicYearId ||
      currentAcademicYear?.id
    ) {
      handleStartCreate();
    }
  }, [
    currentAcademicYear?.id,
    handleStartCreate,
    initialAcademicYearId,
    initialClassroomId,
    initialMode,
    initialSectionId,
    isEditing,
    isFormOpen,
  ]);

  const handleStartEdit = (assignment: SectionClassroomAssignmentListItem) => {
    if (!canUpdate) {
      return;
    }

    setActionSuccess(null);
    setFormError(null);
    setEditingAssignmentId(assignment.id);
    setFormState(toFormState(assignment));
    setIsFormOpen(true);
  };

  const validateForm = () => {
    if (!formState.academicYearId || !formState.sectionId || !formState.classroomId) {
      setFormError("السنة والشعبة والغرفة حقول مطلوبة.");
      return false;
    }

    if (formState.effectiveFrom && formState.effectiveTo) {
      if (new Date(formState.effectiveTo) < new Date(formState.effectiveFrom)) {
        setFormError("تاريخ النهاية يجب أن يكون بعد أو مساويًا لتاريخ البداية.");
        return false;
      }
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    setFormError(null);
    return true;
  };

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setActionSuccess(null);

    if (!validateForm()) {
      return;
    }

    const payload = {
      academicYearId: formState.academicYearId,
      sectionId: formState.sectionId,
      classroomId: formState.classroomId,
      effectiveFrom: toIsoDate(formState.effectiveFrom),
      effectiveTo: toIsoDate(formState.effectiveTo),
      notes: formState.notes.trim() || undefined,
      isPrimary: formState.isPrimary,
      isActive: formState.isActive,
    };

    if (isEditing && editingAssignmentId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: sections.update.");
        return;
      }

      updateMutation.mutate(
        {
          assignmentId: editingAssignmentId,
          payload,
        },
        {
          onSuccess: () => {
            resetForm();
            setActionSuccess("تم تحديث الربط بين الشعبة والغرفة بنجاح.");
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
        setActionSuccess("تم حفظ ربط الشعبة بالغرفة بنجاح.");
      },
    });
  };

  const handleDelete = (assignment: SectionClassroomAssignmentListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف ربط ${assignment.section.name} مع ${assignment.classroom.name}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(assignment.id, {
      onSuccess: () => {
        if (editingAssignmentId === assignment.id) {
          resetForm();
        }
        setActionSuccess("تم حذف الربط بنجاح.");
      },
    });
  };

  const applyFilters = () => {
    setPage(1);
    setFilters(filterDraft);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setFilters(DEFAULT_FILTER_STATE);
    setFilterDraft(DEFAULT_FILTER_STATE);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(
    () =>
      [
        searchInput.trim() ? 1 : 0,
        filters.academicYearId !== "all" ? 1 : 0,
        filters.sectionId !== "all" ? 1 : 0,
        filters.classroomId !== "all" ? 1 : 0,
        filters.active !== "all" ? 1 : 0,
        filters.primary !== "all" ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    [filters, searchInput],
  );

  const handleUseClassroomSuggestion = () => {
    if (!classroomSuggestion) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      classroomId: classroomSuggestion.classroom.id,
    }));
  };

  return (
    <>
      <div className="space-y-4">
        {initialSectionId ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              تم فتح شاشة الربط مع شعبة محددة مسبقًا، ويمكنك اختيار الغرفة المناسبة مباشرة.
            </p>
          </div>
        ) : null}

        {!initialSectionId && initialClassroomId ? (
          <div className="flex items-start gap-2 rounded-md border border-sky-300/40 bg-sky-500/10 p-3 text-sm text-sky-900 dark:text-sky-200">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <p>تم فتح الشاشة مع غرفة محددة مسبقًا لتسهيل مراجعة الروابط أو إنشاء ربط جديد عليها.</p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-[240px] max-w-lg flex-1 flex-wrap items-center gap-2">
            <SearchField
              containerClassName="flex-1"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="بحث بالشعبة أو الغرفة أو السنة..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterTriggerButton
              count={activeFiltersCount}
              onClick={() => setIsFilterOpen((prev) => !prev)}
            />
          </div>
        </div>

        {actionSuccess ? (
          <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {actionSuccess}
          </div>
        ) : null}

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر ربط الشعب بالغرف"
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
              value={filterDraft.academicYearId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, academicYearId: event.target.value }))
              }
            >
              <option value="all">كل السنوات</option>
              {academicYears.map((academicYear) => (
                <option key={academicYear.id} value={academicYear.id}>
                  {academicYear.name}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.sectionId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, sectionId: event.target.value }))
              }
            >
              <option value="all">كل الشعب</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.gradeLevel.code} - {section.name}
                  {section.capacity !== null ? ` | السعة ${section.capacity}` : ""}
                  {section.building ? ` | المبنى ${section.building.nameAr}` : ""}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.classroomId}
              onChange={(event) =>
                setFilterDraft((prev) => ({ ...prev, classroomId: event.target.value }))
              }
            >
              <option value="all">كل الغرف</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                  {classroom.building ? ` | ${formatBuildingLabel(classroom.building)}` : ""}
                  {classroom.activeAssignmentsCount > 0
                    ? ` | روابط نشطة ${classroom.activeAssignmentsCount}`
                    : ""}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.active}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  active: event.target.value as FilterState["active"],
                }))
              }
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </SelectField>

            <SelectField
              value={filterDraft.primary}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  primary: event.target.value as FilterState["primary"],
                }))
              }
            >
              <option value="all">كل أنواع الربط</option>
              <option value="primary">الرئيسية فقط</option>
              <option value="secondary">الثانوية فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>ربط الشعب بالغرف</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الربط التشغيلي بين الشعبة والغرفة لكل سنة دراسية، مع دعم الربط
              الرئيسي والمدد الزمنية.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {mutationError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {mutationError}
              </div>
            ) : null}

            {assignmentsQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل بيانات الربط...
              </div>
            ) : null}

            {assignmentsQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {assignmentsQuery.error instanceof Error
                  ? assignmentsQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {!assignmentsQuery.isPending && assignments.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد روابط مطابقة بعد.
              </div>
            ) : null}

            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {assignment.section.gradeLevel.name} - {assignment.section.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الغرفة: {assignment.classroom.name} ({assignment.classroom.code})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      السنة: {assignment.academicYear.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      المدة: {formatDate(assignment.effectiveFrom)} إلى{" "}
                      {formatDate(assignment.effectiveTo)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الملاحظات: {assignment.notes ?? "—"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={assignment.isPrimary ? "default" : "outline"}>
                      {assignment.isPrimary ? "ربط رئيسي" : "ربط ثانوي"}
                    </Badge>
                    <Badge variant={assignment.isActive ? "secondary" : "outline"}>
                      {assignment.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(assignment)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(assignment)}
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
                  disabled={!pagination || pagination.page <= 1 || assignmentsQuery.isFetching}
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
                    assignmentsQuery.isFetching
                  }
                >
                  التالي
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void assignmentsQuery.refetch()}
                  disabled={assignmentsQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${assignmentsQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء ربط جديد للشعبة والغرفة"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <BottomSheetForm
        open={isFormOpen}
        title={isEditing ? "تعديل ربط الشعبة بالغرفة" : "إنشاء ربط شعبة بغرفة"}
        onClose={resetForm}
        onSubmit={() => handleSubmit()}
        isSubmitting={isSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء الربط"}
        showFooter={false}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>sections.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">السنة الدراسية *</label>
                <SelectField
                  value={formState.academicYearId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      academicYearId: event.target.value,
                    }))
                  }
                >
                  <option value="">اختر السنة</option>
                  {academicYears.map((academicYear) => (
                    <option key={academicYear.id} value={academicYear.id}>
                      {academicYear.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الشعبة *</label>
                <SelectField
                  value={formState.sectionId}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      sectionId: event.target.value,
                    }))
                  }
                >
                  <option value="">اختر الشعبة</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.gradeLevel.code} - {section.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الغرفة *</label>
              <SelectField
                value={formState.classroomId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    classroomId: event.target.value,
                  }))
                }
              >
                <option value="">اختر الغرفة</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name} ({classroom.code})
                    {classroom.capacity !== null ? ` | السعة ${classroom.capacity}` : ""}
                    {classroom.activeAssignmentsCount > 0
                      ? ` | روابط نشطة ${classroom.activeAssignmentsCount}`
                      : ""}
                  </option>
                ))}
              </SelectField>
            </div>

            {selectedSection ? (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>
                    الشعبة المختارة: {selectedSection.gradeLevel.name} - {selectedSection.name}
                  </span>
                </div>
                <p className="mt-1">
                  {selectedSection.capacity !== null
                    ? `سعة الشعبة: ${selectedSection.capacity}`
                    : "سعة الشعبة غير محددة"}
                  {selectedSection.building
                    ? ` | المبنى: ${selectedSection.building.nameAr}`
                    : " | لا يوجد مبنى محدد للشعبة"}
                </p>
              </div>
            ) : null}

            {selectedSection && classroomSuggestion ? (
              <div className="rounded-md border border-amber-200/60 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                      <p className="font-medium">اقتراح غرفة مناسب</p>
                    </div>
                    <p className="text-muted-foreground dark:text-amber-100/80">
                      {classroomSuggestion.classroom.name} ({classroomSuggestion.classroom.code})
                      {classroomSuggestion.classroom.capacity !== null
                        ? ` - السعة ${classroomSuggestion.classroom.capacity}`
                        : ""}
                    </p>
                    <p className="text-muted-foreground dark:text-amber-100/80">
                      {classroomSuggestion.classroom.building
                        ? `المبنى: ${formatBuildingLabel(classroomSuggestion.classroom.building)}`
                        : "المبنى: غير محدد"}
                    </p>
                    <p className="text-muted-foreground dark:text-amber-100/80">
                      {classroomSuggestion.classroom.activeAssignmentsCount > 0
                        ? `الروابط النشطة الحالية: ${classroomSuggestion.classroom.activeAssignmentsCount}`
                        : "لا توجد روابط نشطة حاليًا على هذه الغرفة"}
                    </p>
                    <p className="text-muted-foreground dark:text-amber-100/80">
                      {classroomSuggestion.reason}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-amber-300/70 bg-background/80 text-amber-900 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-500/10"
                    onClick={handleUseClassroomSuggestion}
                  >
                    استخدام الاقتراح
                  </Button>
                </div>
              </div>
            ) : null}

            {selectedSection && !classroomSuggestion ? (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                لا يوجد اقتراح واضح من الغرف المتاحة لهذه الشعبة حاليًا.
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">يبدأ من</label>
                <Input
                  type="date"
                  value={formState.effectiveFrom}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      effectiveFrom: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ينتهي في</label>
                <Input
                  type="date"
                  value={formState.effectiveTo}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      effectiveTo: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder="مثال: القاعة الرئيسية للحصة الصباحية"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>ربط رئيسي</span>
                <input
                  type="checkbox"
                  checked={formState.isPrimary}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      isPrimary: event.target.checked,
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

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarRange className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء الربط"}
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
