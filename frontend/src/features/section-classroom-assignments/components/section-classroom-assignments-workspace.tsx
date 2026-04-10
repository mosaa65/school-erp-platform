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
  Building2,
  Users,
  Info,
  Layers,
  Star,
  Clock,
  Layout,
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
import { Fab } from "@/components/ui/fab";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { PageShell } from "@/components/ui/page-shell";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
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
  if (!value) return "";
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

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

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
  const [editingItem, setEditingItem] = React.useState<SectionClassroomAssignmentListItem | null>(null);
  const [formState, setFormState] = React.useState<AssignmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

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
  const sectionsQuery = useSectionOptionsQuery({ gradeLevelId: initialGradeLevelId });
  const classroomsQuery = useClassroomOptionsQuery();

  const createMutation = useCreateSectionClassroomAssignmentMutation();
  const updateMutation = useUpdateSectionClassroomAssignmentMutation();
  const deleteMutation = useDeleteSectionClassroomAssignmentMutation();

  const assignments = React.useMemo(() => assignmentsQuery.data?.data ?? [], [assignmentsQuery.data?.data]);
  const pagination = assignmentsQuery.data?.pagination;
  const academicYears = React.useMemo(() => academicYearsQuery.data ?? [], [academicYearsQuery.data]);
  const sections = React.useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data]);
  const classrooms = React.useMemo(() => classroomsQuery.data ?? [], [classroomsQuery.data]);
  const isEditing = editingItem !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const currentAcademicYear = React.useMemo(() => academicYears.find((y) => y.isCurrent) ?? null, [academicYears]);
  const selectedSection = React.useMemo(() => sections.find((s) => s.id === formState.sectionId) ?? null, [formState.sectionId, sections]);

  const resetForm = React.useCallback(() => {
    setEditingItem(null);
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
    const nextYear = initialAcademicYearId ?? currentAcademicYear?.id;
    if (!nextYear) return;
    setFilters(p => p.academicYearId === "all" ? { ...p, academicYearId: nextYear } : p);
    setFilterDraft(p => p.academicYearId === "all" ? { ...p, academicYearId: nextYear } : p);
    setFormState(p => p.academicYearId ? p : { ...p, academicYearId: nextYear });
  }, [currentAcademicYear?.id, initialAcademicYearId]);

  const classroomSuggestion = React.useMemo(() => {
    if (!selectedSection || classrooms.length === 0) return null;
    const sectionCapacity = selectedSection.capacity;
    const sectionBuildingId = selectedSection.building?.id ?? null;
    const sectionBuildingTerms = [selectedSection.building?.nameAr, selectedSection.building?.code].filter(Boolean).map(v => normalizeText(String(v)));

    const ranked = classrooms.map(room => {
      const roomText = normalizeText([room.code, room.name, room.notes ?? "", room.building?.nameAr ?? "", room.building?.code ?? ""].join(" "));
      const matchesBuilding = (sectionBuildingId !== null && room.building?.id === sectionBuildingId) || (sectionBuildingTerms.some(t => t.length > 0 && roomText.includes(t)));
      let score = 0;
      let fits = true;
      if (sectionCapacity !== null) {
        if (room.capacity === null) { score += 1000; fits = false; }
        else if (room.capacity >= sectionCapacity) score += (room.capacity - sectionCapacity);
        else { score += 500 + (sectionCapacity - room.capacity); fits = false; }
      }
      if (matchesBuilding) score -= 200;
      score += (room.activeAssignmentsCount * 10);
      return { room, score, fits, matchesBuilding };
    }).sort((a, b) => a.score - b.score);

    const best = ranked[0];
    return best ? { room: best.room, fits: best.fits, matchesBuilding: best.matchesBuilding } : null;
  }, [classrooms, selectedSection]);

  const handleStartCreate = () => {
    if (!canCreate) return;
    setFormError(null);
    setEditingItem(null);
    setFormState({
      ...DEFAULT_FORM_STATE,
      academicYearId: filters.academicYearId !== "all" ? filters.academicYearId : initialAcademicYearId ?? currentAcademicYear?.id ?? "",
      sectionId: filters.sectionId !== "all" ? filters.sectionId : initialSectionId ?? "",
      classroomId: filters.classroomId !== "all" ? filters.classroomId : initialClassroomId ?? "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formState.academicYearId || !formState.sectionId || !formState.classroomId) {
      setFormError("السنة والشعبة والغرفة حقول مطلوبة.");
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

    if (isEditing && editingItem) {
      updateMutation.mutate({ assignmentId: editingItem.id, payload }, { onSuccess: resetForm });
    } else {
      createMutation.mutate(payload, { onSuccess: resetForm });
    }
  };

  const handleStartEdit = (item: SectionClassroomAssignmentListItem) => {
    if (!canUpdate) return;
    setFormError(null);
    setEditingItem(item);
    setFormState(toFormState(item));
    setIsFormOpen(true);
  };

  const handleDelete = (item: SectionClassroomAssignmentListItem) => {
    if (!canDelete) return;
    const confirmed = window.confirm(`تأكيد حذف ربط ${item.section.name} مع ${item.classroom.name}؟`);
    if (!confirmed) return;
    deleteMutation.mutate(item.id);
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

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0,
      filters.academicYearId !== "all" ? 1 : 0,
      filters.sectionId !== "all" ? 1 : 0,
      filters.classroomId !== "all" ? 1 : 0,
      filters.active !== "all" ? 1 : 0,
      filters.primary !== "all" ? 1 : 0,
    ].reduce((sum, v) => sum + v, 0);
  }, [filters, searchInput]);

  return (
    <PageShell
      title="توزيع الشعب على القاعات"
      subtitle="تخصيص القاعات الدراسية لكل شعبة حسب السنة الأكاديمية والمبنى المتاح."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالشعبة أو القاعة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void assignmentsQuery.refetch()}
              disabled={assignmentsQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${assignmentsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="فلاتر التوزيع"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">
                مسح
              </Button>
              <Button type="button" onClick={applyFilters} className="flex-1">
                تطبيق
              </Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">السنة الدراسية</label>
              <SelectField value={filterDraft.academicYearId} onChange={(e) => setFilterDraft(p => ({ ...p, academicYearId: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الشعبة</label>
              <SelectField value={filterDraft.sectionId} onChange={(e) => setFilterDraft(p => ({ ...p, sectionId: e.target.value }))}>
                <option value="all">كل الشعب</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.gradeLevel.code} - {s.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">القاعة</label>
              <SelectField value={filterDraft.classroomId} onChange={(e) => setFilterDraft(p => ({ ...p, classroomId: e.target.value }))}>
                <option value="all">كل القاعات</option>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الحالة</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">غير نشط فقط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/20 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Layout className="h-5 w-5 text-primary" />
                سجل الربط التشغيلي
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
            <CardDescription>
              تتبع تخصيص الفصول الدراسية للشعب الأكاديمية خلال السنوات المختلفة.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {assignmentsQuery.isPending && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                جارٍ تحميل بيانات التوزيع...
              </div>
            )}

            {!assignmentsQuery.isPending && assignments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground text-center">
                لم يتم تسجيل أي توزيع للقاعات يتوافق مع البحث.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((item) => (
                <div key={item.id} className="group relative space-y-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                        {item.section.gradeLevel.name} - {item.section.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <CalendarRange className="h-3 w-3" />
                        <span>السنة: {item.academicYear.name}</span>
                      </div>
                    </div>
                    {item.isPrimary && (
                      <Badge className="h-5 bg-amber-500 hover:bg-amber-600 text-[9px] font-bold">
                        رئيسي
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold">{item.classroom.name}</span>
                      </div>
                      <Badge variant={item.isActive ? "default" : "outline"} className="h-5 text-[8px]">
                        {item.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>من: {toDateInputValue(item.effectiveFrom) || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>إلى: {toDateInputValue(item.effectiveTo) || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-lg px-2 flex-1 text-[11px] gap-1.5 font-bold"
                      onClick={() => handleStartEdit(item)}
                      disabled={!canUpdate || updateMutation.isPending}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      تعديل
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(item)}
                      disabled={!canDelete || deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-6 mt-2">
              <p className="text-xs text-muted-foreground">
                صفحة <strong className="text-foreground">{pagination?.page ?? 1}</strong> من <strong className="text-foreground">{pagination?.totalPages ?? 1}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!pagination || pagination.page <= 1 || assignmentsQuery.isFetching}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 rounded-2xl"
                  onClick={() =>
                    setPage((prev) => (pagination ? Math.min(prev + 1, pagination.totalPages) : prev))
                  }
                  disabled={!pagination || pagination.page >= pagination.totalPages || assignmentsQuery.isFetching}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab
        icon={<Plus className="h-5 w-5" />}
        label="إضافة توزيع"
        onClick={handleStartCreate}
        disabled={!canCreate}
      />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetForm}
        title={isEditing ? "تعديل بيانات التوزيع" : "إضافة توزيع جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">السنة الدراسية *</label>
              <SelectField value={formState.academicYearId} onChange={(e) => setFormState(p => ({ ...p, academicYearId: e.target.value }))}>
                <option value="">اختر السنة</option>
                {academicYears.map(y => <option key={y.id} value={y.id}>{y.name} {y.isCurrent ? "(الحالية)" : ""}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">الشعبة المستهدفة *</label>
              <SelectField value={formState.sectionId} onChange={(e) => setFormState(p => ({ ...p, sectionId: e.target.value }))}>
                <option value="">اختر الشعبة</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.gradeLevel.code} - {s.name}</option>)}
              </SelectField>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>القاعة الدراسية *</span>
              {classroomSuggestion && (
                <Badge variant="outline" className="h-5 text-[8px] bg-sky-50 text-sky-700 border-sky-200 gap-1 cursor-pointer" onClick={() => setFormState(p => ({ ...p, classroomId: classroomSuggestion.room.id }))}>
                  <Lightbulb className="h-2.5 w-2.5" />
                  اقتراح: {classroomSuggestion.room.name}
                </Badge>
              )}
            </label>
            <SelectField value={formState.classroomId} onChange={(e) => setFormState(p => ({ ...p, classroomId: e.target.value }))}>
              <option value="">اختر القاعة</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.capacity ? `(السعة: ${c.capacity})` : ""}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">فعال من</label>
              <Input type="date" value={formState.effectiveFrom} onChange={(e) => setFormState(p => ({ ...p, effectiveFrom: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">فعال إلى</label>
              <Input type="date" value={formState.effectiveTo} onChange={(e) => setFormState(p => ({ ...p, effectiveTo: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">ملاحظات التوزيع</label>
            <Input value={formState.notes} onChange={(e) => setFormState(p => ({ ...p, notes: e.target.value }))} placeholder="مثال: تخصيص مؤقت لحين انتهاء الصيانة" />
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <Star className={`h-4 w-4 ${formState.isPrimary ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <span className="font-bold">تعيين كقاعة رئيسية للشعبة</span>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={formState.isPrimary} onChange={(e) => setFormState(p => ({ ...p, isPrimary: e.target.checked }))} />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
              <span className="font-bold">تفعيل الربط حالياً</span>
              <input type="checkbox" className="h-5 w-5 rounded-lg border-primary/30 text-primary" checked={formState.isActive} onChange={(e) => setFormState(p => ({ ...p, isActive: e.target.checked }))} />
            </label>
          </div>

          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold text-center">
              {formError}
            </div>
          )}
        </div>
      </CrudFormSheet>
    </PageShell>
  );
}
