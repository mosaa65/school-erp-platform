"use client";

import * as React from "react";
import {
  CalendarClock,
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

const DAY_LABELS: Record<TimetableDay, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

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
  const [search, setSearch] = React.useState("");
  const [termFilter, setTermFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [offeringFilter, setOfferingFilter] = React.useState("all");
  const [dayFilter, setDayFilter] = React.useState<TimetableDay | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">(
    "all",
  );

  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
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
  const filterOfferingOptionsQuery = useTermSubjectOfferingOptionsQuery({
    academicTermId: termFilter === "all" ? undefined : termFilter,
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
    }
  }, [editingEntryId, isEditing, entries]);

  React.useEffect(() => {
    if (!formState.sectionId) {
      return;
    }

    const exists = formSectionOptions.some((section) => section.id === formState.sectionId);
    if (!exists) {
      setFormState((prev) => ({ ...prev, sectionId: "" }));
    }
  }, [formSectionOptions, formState.sectionId]);

  const resetForm = () => {
    setEditingEntryId(null);
    setFormState(DEFAULT_FORM_STATE);
    setFormError(null);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const validateForm = (): boolean => {
    if (!formState.academicTermId || !formState.sectionId || !formState.termSubjectOfferingId) {
      setFormError("الحقول الأساسية مطلوبة: academic term, section, term subject offering.");
      return false;
    }

    const periodIndex = Number(formState.periodIndex);
    if (!Number.isInteger(periodIndex) || periodIndex < 1 || periodIndex > 20) {
      setFormError("periodIndex يجب أن يكون رقمًا صحيحًا بين 1 و 20.");
      return false;
    }

    if (formState.roomLabel.trim().length > 80) {
      setFormError("roomLabel يجب ألا يتجاوز 80 حرف.");
      return false;
    }

    if (formState.notes.trim().length > 255) {
      setFormError("notes يجب ألا يتجاوز 255 حرف.");
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
        setFormError("الفصل الأكاديمي يجب أن يطابق الفصل المرتبط بالـTerm Subject Offering.");
        return false;
      }

      if (selectedSection) {
        if (selectedSection.gradeLevelId !== offering.gradeLevelSubject.gradeLevelId) {
          setFormError("شعبة الصف يجب أن تطابق الصف المرتبط بالـTerm Subject Offering.");
          return false;
        }
      } else {
        setFormError("الشعبة المختارة غير متوافقة مع عرض المادة الحالي.");
        return false;
      }

      if (selectedTerm) {
        if (selectedTerm.academicYearId !== offering.gradeLevelSubject.academicYearId) {
          setFormError(
            "الفصل الأكاديمي وGrade-Level Subject يجب أن يكونا ضمن نفس السنة الأكاديمية.",
          );
          return false;
        }
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
        setFormError("لا تملك صلاحية timetable-entries.update.");
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
      setFormError("لا تملك صلاحية timetable-entries.create.");
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

  return (
    <div className="grid gap-4 xl:grid-cols-[460px_1fr]">
      <Card className="h-fit border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل حصة جدول" : "إنشاء حصة جدول"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "تعديل وقت ومكان الحصة وربطها بالشعبة والفصل."
              : "إضافة حصة جديدة ضمن جدول الفصل الأكاديمي."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!canCreate && !isEditing ? (
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              لا تملك صلاحية <code>timetable-entries.create</code>.
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmitForm}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Academic Term *
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Term Subject Offering *
                </label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الشعبة *</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Day *</label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
                        {DAY_LABELS[day]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Period Index *
                  </label>
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
                <label className="text-xs font-medium text-muted-foreground">Room Label</label>
                <Input
                  value={formState.roomLabel}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, roomLabel: event.target.value }))
                  }
                  placeholder="A-204"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
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
                  يلزم صلاحيات القراءة المرتبطة: <code>academic-terms.read</code>,{" "}
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
                  {isEditing ? "حفظ التعديلات" : "إنشاء Timetable Entry"}
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
            <CardTitle>Timetable Entries</CardTitle>
            <Badge variant="secondary">الإجمالي: {pagination?.total ?? 0}</Badge>
          </div>
          <CardDescription>
            إدارة الحصص المجدولة مع فلترة حسب الفصل والشعبة والمادة واليوم.
          </CardDescription>

          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-2 md:grid-cols-[1fr_180px_180px_220px_160px_140px_auto]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="بحث بالمادة/الشعبة/الغرفة..."
                className="pr-8"
              />
            </div>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={termFilter}
              onChange={(event) => {
                setPage(1);
                setTermFilter(event.target.value);
                setOfferingFilter("all");
              }}
              disabled={!canReadAcademicTerms}
            >
              <option value="all">All terms</option>
              {termOptions.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={sectionFilter}
              onChange={(event) => {
                setPage(1);
                setSectionFilter(event.target.value);
              }}
              disabled={!canReadSections}
            >
              <option value="all">كل الشعب</option>
              {filterSectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={offeringFilter}
              onChange={(event) => {
                setPage(1);
                setOfferingFilter(event.target.value);
              }}
              disabled={!canReadTermSubjectOfferings}
            >
              <option value="all">All offerings</option>
              {filterOfferingOptions.map((offering) => (
                <option key={offering.id} value={offering.id}>
                  {offering.gradeLevelSubject.gradeLevel.code} -{" "}
                  {offering.gradeLevelSubject.subject.code}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={dayFilter}
              onChange={(event) => {
                setPage(1);
                setDayFilter(event.target.value as TimetableDay | "all");
              }}
            >
              <option value="all">All days</option>
              {DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {DAY_LABELS[day]}
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
          {entriesQuery.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              جارٍ التحميل...
            </div>
          ) : null}

          {entriesQuery.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {entriesQuery.error instanceof Error
                ? entriesQuery.error.message
                : "فشل التحميل"}
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
                    Term: {entry.academicTerm.name} ({entry.academicTerm.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Day: {DAY_LABELS[entry.dayOfWeek]} | Period: {entry.periodIndex}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Section: {entry.section.code}
                    {entry.roomLabel ? ` | Room: ${entry.roomLabel}` : ""}
                  </p>
                  {entry.notes ? (
                    <p className="text-xs text-muted-foreground">Notes: {entry.notes}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{entry.dayOfWeek}</Badge>
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
  );
}





