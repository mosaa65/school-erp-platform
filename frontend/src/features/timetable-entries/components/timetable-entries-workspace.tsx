"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarClock,
  LoaderCircle,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { PageShell } from "@/components/ui/page-shell";
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
import { Fab } from "@/components/ui/fab";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateTimetableEntryMutation,
  useDeleteTimetableEntryMutation,
  useUpdateTimetableEntryMutation,
} from "@/features/timetable-entries/hooks/use-timetable-entries-mutations";
import { useTimetableEntriesQuery } from "@/features/timetable-entries/hooks/use-timetable-entries-query";
import { useAcademicTermOptionsQuery } from "@/features/timetable-entries/hooks/use-academic-term-options-query";
import { useSectionOptionsQuery } from "@/features/timetable-entries/hooks/use-section-options-query";
import { useTermSubjectOfferingOptionsQuery } from "@/features/timetable-entries/hooks/use-term-subject-offering-options-query";
import type {
  AcademicTermListItem,
  SectionListItem,
  TermSubjectOfferingListItem,
  TimetableDay,
  TimetableEntryListItem,
} from "@/lib/api/client";
import { translateTimetableDay } from "@/lib/i18n/ar";

type TimetableEntryFormState = {
  academicTermId: string;
  sectionId: string;
  termSubjectOfferingId: string;
  dayOfWeek: TimetableDay;
  periodIndex: string;
  roomLabel: string;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DAY_OPTIONS: TimetableDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DEFAULT_FORM_STATE: TimetableEntryFormState = {
  academicTermId: "",
  sectionId: "",
  termSubjectOfferingId: "",
  dayOfWeek: "MONDAY",
  periodIndex: "1",
  roomLabel: "",
  notes: "",
  isActive: true,
};

function toFormState(entry: TimetableEntryListItem): TimetableEntryFormState {
  return {
    academicTermId: entry.academicTermId,
    sectionId: entry.sectionId,
    termSubjectOfferingId: entry.termSubjectOfferingId,
    dayOfWeek: entry.dayOfWeek,
    periodIndex: String(entry.periodIndex),
    roomLabel: entry.roomLabel ?? "",
    notes: entry.notes ?? "",
    isActive: entry.isActive,
  };
}

function findTermById(terms: AcademicTermListItem[], termId: string): AcademicTermListItem | null {
  return terms.find((term) => term.id === termId) ?? null;
}

function findSectionById(sections: SectionListItem[], sectionId: string): SectionListItem | null {
  return sections.find((section) => section.id === sectionId) ?? null;
}

function findOfferingById(
  offerings: TermSubjectOfferingListItem[],
  offeringId: string,
): TermSubjectOfferingListItem | null {
  return offerings.find((offering) => offering.id === offeringId) ?? null;
}

export function TimetableEntriesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("timetable-entries.create");
  const canUpdate = hasPermission("timetable-entries.update");
  const canDelete = hasPermission("timetable-entries.delete");
  const canReadAcademicTerms = hasPermission("academic-terms.read");
  const canReadSections = hasPermission("sections.read");
  const canReadTermSubjectOfferings = hasPermission("term-subject-offerings.read");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");  const [termFilter, setTermFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [offeringFilter, setOfferingFilter] = React.useState("all");
  const [dayFilter, setDayFilter] = React.useState<TimetableDay | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );
  const [filterDraft, setFilterDraft] = React.useState<{
    term: string;
    section: string;
    offering: string;
    day: TimetableDay | "all";
    active: "all" | "active" | "inactive";
  }>({
    term: "all",
    section: "all",
    offering: "all",
    day: "all",
    active: "all",
  });

  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<TimetableEntryFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const entriesQuery = useTimetableEntriesQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    termSubjectOfferingId: offeringFilter === "all" ? undefined : offeringFilter,
    dayOfWeek: dayFilter === "all" ? undefined : dayFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const academicTermOptionsQuery = useAcademicTermOptionsQuery();
  const filterSectionOptionsQuery = useSectionOptionsQuery();
  const filterOfferingTermId = isFilterOpen ? filterDraft.term : termFilter;
  const filterOfferingOptionsQuery = useTermSubjectOfferingOptionsQuery({
    academicTermId: filterOfferingTermId === "all" ? undefined : filterOfferingTermId,
  });

  const formOfferingOptionsQuery = useTermSubjectOfferingOptionsQuery({
    academicTermId: formState.academicTermId || undefined,
  });

  const formOfferings = React.useMemo(
    () => formOfferingOptionsQuery.data ?? [],
    [formOfferingOptionsQuery.data],
  );
  const selectedFormOffering = React.useMemo(
    () => findOfferingById(formOfferings, formState.termSubjectOfferingId),
    [formOfferings, formState.termSubjectOfferingId],
  );

  const formSectionOptionsQuery = useSectionOptionsQuery({
    gradeLevelId: selectedFormOffering?.gradeLevelSubject.gradeLevelId,
  });

  const createMutation = useCreateTimetableEntryMutation();
  const updateMutation = useUpdateTimetableEntryMutation();
  const deleteMutation = useDeleteTimetableEntryMutation();

  const entries = React.useMemo(() => entriesQuery.data?.data ?? [], [entriesQuery.data?.data]);
  const pagination = entriesQuery.data?.pagination;
  const termOptions = React.useMemo(
    () => academicTermOptionsQuery.data ?? [],
    [academicTermOptionsQuery.data],
  );
  const filterSectionOptions = React.useMemo(
    () => filterSectionOptionsQuery.data ?? [],
    [filterSectionOptionsQuery.data],
  );
  const filterOfferingOptions = React.useMemo(
    () => filterOfferingOptionsQuery.data ?? [],
    [filterOfferingOptionsQuery.data],
  );
  const formSectionOptions = React.useMemo(
    () => formSectionOptionsQuery.data ?? [],
    [formSectionOptionsQuery.data],
  );
  const isEditing = editingEntryId !== null;

  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    (deleteMutation.error as Error | null)?.message ??
    null;

  React.useEffect(() => {
    if (!isEditing) {
      return;
    }

    const stillExists = entries.some((entry) => entry.id === editingEntryId);
    if (!stillExists) {
      setEditingEntryId(null);
      setFormState(DEFAULT_FORM_STATE);
      setFormError(null);
      setIsFormOpen(false);
    }
  }, [editingEntryId, entries, isEditing]);

  useDebounceEffect(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    setFilterDraft({
      term: termFilter,
      section: sectionFilter,
      offering: offeringFilter,
      day: dayFilter,
      active: activeFilter,
    });
  }, [activeFilter, dayFilter, isFilterOpen, offeringFilter, sectionFilter, termFilter]);

  React.useEffect(() => {
    if (!formState.termSubjectOfferingId || formOfferingOptionsQuery.isPending) {
      return;
    }

    const exists = formOfferings.some((offering) => offering.id === formState.termSubjectOfferingId);
    if (!exists) {
      setFormState((prev) => ({
        ...prev,
        termSubjectOfferingId: "",
        sectionId: "",
      }));
    }
  }, [formOfferingOptionsQuery.isPending, formOfferings, formState.termSubjectOfferingId]);

  React.useEffect(() => {
    if (!formState.sectionId || formSectionOptionsQuery.isPending) {
      return;
    }

    const exists = formSectionOptions.some((section) => section.id === formState.sectionId);
    if (!exists) {
      setFormState((prev) => ({ ...prev, sectionId: "" }));
    }
  }, [formSectionOptions, formSectionOptionsQuery.isPending, formState.sectionId]);

  const resetForm = () => {
    setEditingEntryId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) {
      return;
    }

    setFormError(null);
    setEditingEntryId(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    if (!formState.academicTermId || !formState.sectionId || !formState.termSubjectOfferingId) {
      setFormError("الحقول الأساسية مطلوبة: الفصل الأكاديمي، الشعبة، وعرض المادة.");
      return false;
    }

    const periodIndex = Number(formState.periodIndex);
    if (!Number.isInteger(periodIndex) || periodIndex < 1 || periodIndex > 20) {
      setFormError("رقم الحصة يجب أن يكون رقمًا صحيحًا بين 1 و20.");
      return false;
    }

    if (formState.roomLabel.trim().length > 80) {
      setFormError("اسم القاعة يجب ألا يتجاوز 80 حرفًا.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("الملاحظات يجب ألا تتجاوز 255 حرفًا.");
      return false;
    }

    const selectedTerm = findTermById(termOptions, formState.academicTermId);
    const selectedSection = findSectionById(formSectionOptions, formState.sectionId);
    const offering = selectedFormOffering;

    if (formState.termSubjectOfferingId && !offering) {
      setFormError("عرض المادة المختار غير صالح أو غير متوافق مع الفصل.");
      return false;
    }

    if (offering) {
      if (offering.academicTermId !== formState.academicTermId) {
        setFormError("الفصل الأكاديمي يجب أن يطابق الفصل المرتبط بعرض المادة.");
        return false;
      }

      if (selectedSection) {
        if (selectedSection.gradeLevelId !== offering.gradeLevelSubject.gradeLevelId) {
          setFormError("شعبة الصف يجب أن تطابق الصف المرتبط بعرض المادة.");
          return false;
        }
      } else {
        setFormError("الشعبة المختارة غير متوافقة مع عرض المادة الحالي.");
        return false;
      }

      if (selectedTerm) {
        if (selectedTerm.academicYearId !== offering.gradeLevelSubject.academicYearId) {
          setFormError(
            "الفصل الأكاديمي وربط الصف مع المادة يجب أن يكونا ضمن نفس السنة الأكاديمية.",
          );
          return false;
        }
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
      academicTermId: formState.academicTermId,
      sectionId: formState.sectionId,
      termSubjectOfferingId: formState.termSubjectOfferingId,
      dayOfWeek: formState.dayOfWeek,
      periodIndex: Number(formState.periodIndex),
      roomLabel: formState.roomLabel.trim() || undefined,
      notes: formState.notes.trim() || undefined,
      isActive: formState.isActive,
    };

    if (isEditing && editingEntryId) {
      if (!canUpdate) {
        setFormError("لا تملك الصلاحية المطلوبة: timetable-entries.update.");
        return;
      }

      updateMutation.mutate(
        {
          entryId: editingEntryId,
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
      setFormError("لا تملك الصلاحية المطلوبة: timetable-entries.create.");
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        setPage(1);
      },
    });
  };

  const handleStartEdit = (entry: TimetableEntryListItem) => {
    if (!canUpdate) {
      return;
    }

    setFormError(null);
    setEditingEntryId(entry.id);
    setFormState(toFormState(entry));
    setIsFormOpen(true);
  };

  const handleDelete = (entry: TimetableEntryListItem) => {
    if (!canDelete) {
      return;
    }

    const confirmed = window.confirm(
      `تأكيد حذف حصة الجدول: ${entry.section.name} - ${entry.termSubjectOffering.gradeLevelSubject.subject.name}؟`,
    );
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(entry.id, {
      onSuccess: () => {
        if (editingEntryId === entry.id) {
          resetForm();
        }
      },
    });
  };

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasDependenciesReadPermissions =
    canReadAcademicTerms && canReadSections && canReadTermSubjectOfferings;

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setTermFilter("all");
    setSectionFilter("all");
    setOfferingFilter("all");
    setDayFilter("all");
    setActiveFilter("all");
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    setPage(1);
    setTermFilter(filterDraft.term);
    setSectionFilter(filterDraft.section);
    setOfferingFilter(filterDraft.offering);
    setDayFilter(filterDraft.day);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      termFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0,
      offeringFilter !== "all" ? 1 : 0,
      dayFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0,
    ].reduce((acc, value) => acc + value, 0);
  }, [activeFilter, dayFilter, offeringFilter, searchInput, sectionFilter, termFilter]);

  return (
    <PageShell title="الجدول الدراسي">
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(event) => setSearchInput(event.target.value)}
          searchPlaceholder="بحث بالمادة أو الشعبة أو القاعة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر الجدول الدراسي"
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
              value={filterDraft.term}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  term: event.target.value,
                  offering: "all",
                }))
              }
              disabled={!canReadAcademicTerms}
            >
              <option value="all">كل الفصول</option>
              {termOptions.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.code}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.section}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  section: event.target.value,
                }))
              }
              disabled={!canReadSections}
            >
              <option value="all">كل الشعب</option>
              {filterSectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.offering}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  offering: event.target.value,
                }))
              }
              disabled={!canReadTermSubjectOfferings}
            >
              <option value="all">كل العروض</option>
              {filterOfferingOptions.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {offering.gradeLevelSubject.gradeLevel.code} -{" "}
                  {offering.gradeLevelSubject.subject.code}
                </option>
              ))}
            </SelectField>

            <SelectField
              value={filterDraft.day}
              onChange={(event) =>
                setFilterDraft((prev) => ({
                  ...prev,
                  day: event.target.value as TimetableDay | "all",
                }))
              }
            >
              <option value="all">كل الأيام</option>
              {DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {translateTimetableDay(day)}
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
              <option value="all">كل الحالات</option>
              <option value="active">النشطة فقط</option>
              <option value="inactive">غير النشطة فقط</option>
            </SelectField>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>حصص الجدول الدراسي</CardTitle>
              <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              إدارة الحصص المجدولة مع بحث موحد وفلاتر واضحة حسب الفصل والشعبة والمادة واليوم.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {entriesQuery.isPending ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                جارٍ تحميل البيانات...
              </div>
            ) : null}

            {entriesQuery.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {entriesQuery.error instanceof Error
                  ? entriesQuery.error.message
                  : "تعذّر تحميل البيانات."}
              </div>
            ) : null}

            {!entriesQuery.isPending && entries.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                لا توجد حصص مطابقة.
              </div>
            ) : null}

            {entries.map((entry) => (
              <div
                key={entry.id}
                className="space-y-3 rounded-lg border border-border/70 bg-background/70 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {entry.section.name} - {entry.termSubjectOffering.gradeLevelSubject.subject.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الفصل: {entry.academicTerm.name} ({entry.academicTerm.code})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      اليوم: {translateTimetableDay(entry.dayOfWeek)} | الحصة: {entry.periodIndex}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الشعبة: {entry.section.code}
                      {entry.roomLabel ? ` | القاعة: ${entry.roomLabel}` : ""}
                    </p>
                    {entry.notes ? (
                      <p className="text-xs text-muted-foreground">ملاحظات: {entry.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{translateTimetableDay(entry.dayOfWeek)}</Badge>
                    <Badge variant={entry.isActive ? "default" : "outline"}>
                      {entry.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleStartEdit(entry)}
                    disabled={!canUpdate || updateMutation.isPending}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    تعديل
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleDelete(entry)}
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
                  disabled={!pagination || pagination.page <= 1 || entriesQuery.isFetching}
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
                    entriesQuery.isFetching
                  }
                >
                  التالي
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void entriesQuery.refetch()}
                  disabled={entriesQuery.isFetching}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${entriesQuery.isFetching ? "animate-spin" : ""}`}
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
        ariaLabel="إنشاء حصة جدول"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        title={isEditing ? "تعديل حصة جدول" : "إنشاء حصة جدول"}
        onClose={resetForm}
        onSubmit={() => handleSubmitForm()}
        isSubmitting={isFormSubmitting}
        submitLabel={isEditing ? "حفظ التعديلات" : "إنشاء حصة"}
      >
        {!canCreate && !isEditing ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            لا تملك الصلاحية المطلوبة: <code>timetable-entries.create</code>.
          </div>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmitForm}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الفصل الأكاديمي *</label>
              <SelectField
                value={formState.academicTermId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    academicTermId: event.target.value,
                    termSubjectOfferingId: "",
                    sectionId: "",
                  }))
                }
                disabled={!canReadAcademicTerms}
              >
                <option value="">اختر الفصل الدراسي</option>
                {termOptions.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} ({term.code})
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">عرض المادة *</label>
              <SelectField
                value={formState.termSubjectOfferingId}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    termSubjectOfferingId: event.target.value,
                    sectionId: "",
                  }))
                }
                disabled={!canReadTermSubjectOfferings || !formState.academicTermId}
              >
                <option value="">اختر الطرح</option>
                {formOfferings.map((offering) => (
                  <option key={offering.id} value={offering.id}>
                    {offering.gradeLevelSubject.gradeLevel.code} -{" "}
                    {offering.gradeLevelSubject.subject.code}
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
                disabled={!canReadSections || !formState.termSubjectOfferingId}
              >
                <option value="">اختر الشعبة</option>
                {formSectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name} ({section.code})
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">اليوم *</label>
                <SelectField
                  value={formState.dayOfWeek}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      dayOfWeek: event.target.value as TimetableDay,
                    }))
                  }
                >
                  {DAY_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      {translateTimetableDay(day)}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">رقم الحصة *</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={formState.periodIndex}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, periodIndex: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">اسم القاعة</label>
              <Input
                value={formState.roomLabel}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, roomLabel: event.target.value }))
                }
                placeholder="A-204"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">ملاحظات</label>
              <Input
                value={formState.notes}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="ملاحظات اختيارية"
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

            {!hasDependenciesReadPermissions ? (
              <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                يتطلب هذا الجزء صلاحيات القراءة المرتبطة: <code>academic-terms.read</code>,{" "}
                <code>sections.read</code>, <code>term-subject-offerings.read</code>.
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
                  <CalendarClock className="h-4 w-4" />
                )}
                {isEditing ? "حفظ التعديلات" : "إنشاء حصة"}
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
    </PageShell>
  );
}
