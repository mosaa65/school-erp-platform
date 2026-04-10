"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import Link from "next/link";
import {
  Briefcase,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  Star,
  UserCheck,
  Settings2,
  Clock,
  Layout,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { SelectField } from "@/components/ui/select-field";
import { Fab } from "@/components/ui/fab";
import { PageShell } from "@/components/ui/page-shell";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import {
  useCreateEmployeeTeachingAssignmentMutation,
  useDeleteEmployeeTeachingAssignmentMutation,
  useUpdateEmployeeTeachingAssignmentMutation,
} from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-employee-teaching-assignments-mutations";
import { useEmployeeTeachingAssignmentsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-employee-teaching-assignments-query";
import { useAcademicYearOptionsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-academic-year-options-query";
import { useEmployeeOptionsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-employee-options-query";
import { useSectionOptionsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-section-options-query";
import { useSubjectOptionsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-subject-options-query";
import { useGradeLevelSubjectMappingOptionsQuery } from "@/features/teaching-assignments/employee-teaching-assignments/hooks/use-grade-level-subject-mapping-options-query";
import type { EmployeeTeachingAssignmentListItem } from "@/lib/api/client";

type AssignmentFormState = {
  employeeId: string;
  sectionId: string;
  subjectId: string;
  academicYearId: string;
  weeklyPeriods: string;
  isPrimary: boolean;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const DEFAULT_FORM_STATE: AssignmentFormState = {
  employeeId: "",
  sectionId: "",
  subjectId: "",
  academicYearId: "",
  weeklyPeriods: "1",
  isPrimary: true,
  isActive: true,
};

function toFormState(assignment: EmployeeTeachingAssignmentListItem): AssignmentFormState {
  return {
    employeeId: assignment.employeeId,
    sectionId: assignment.sectionId,
    subjectId: assignment.subjectId,
    academicYearId: assignment.academicYearId,
    weeklyPeriods: String(assignment.weeklyPeriods),
    isPrimary: assignment.isPrimary,
    isActive: assignment.isActive,
  };
}

export function EmployeeTeachingAssignmentsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("employee-teaching-assignments.create");
  const canUpdate = hasPermission("employee-teaching-assignments.update");
  const canDelete = hasPermission("employee-teaching-assignments.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [employeeFilter, setEmployeeFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ employee: "all", section: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<AssignmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const assignmentsQuery = useEmployeeTeachingAssignmentsQuery({
    page, limit: PAGE_SIZE, search,
    employeeId: employeeFilter === "all" ? undefined : employeeFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const employeesQuery = useEmployeeOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const subjectsQuery = useSubjectOptionsQuery();
  const academicYearsQuery = useAcademicYearOptionsQuery();

  const selectedSection = React.useMemo(() => 
    (sectionsQuery.data ?? []).find(s => s.id === form.sectionId),
    [sectionsQuery.data, form.sectionId]
  );

  const createMutation = useCreateEmployeeTeachingAssignmentMutation();
  const updateMutation = useUpdateEmployeeTeachingAssignmentMutation();
  const deleteMutation = useDeleteEmployeeTeachingAssignmentMutation();

  const records = React.useMemo(() => assignmentsQuery.data?.data ?? [], [assignmentsQuery.data?.data]);
  const pagination = assignmentsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ employee: employeeFilter, section: sectionFilter, active: activeFilter });
  }, [activeFilter, employeeFilter, isFilterOpen, sectionFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM_STATE);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: EmployeeTeachingAssignmentListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.sectionId || !form.subjectId || !form.academicYearId) {
      setFormError("الموظف، المادة، الشعبة، والسنة مقتضيات أساسية.");
      return;
    }

    const payload = {
      employeeId: form.employeeId,
      sectionId: form.sectionId,
      subjectId: form.subjectId,
      academicYearId: form.academicYearId,
      weeklyPeriods: Number(form.weeklyPeriods) || 1,
      isPrimary: form.isPrimary,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ assignmentId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: EmployeeTeachingAssignmentListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف إسناد التدريس لـ ${item.employee.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setEmployeeFilter(filterDraft.employee);
    setSectionFilter(filterDraft.section);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setEmployeeFilter("all");
    setSectionFilter("all");
    setActiveFilter("all");
    setFilterDraft({ employee: "all", section: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, employeeFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, employeeFilter, searchInput, sectionFilter]);

  return (
    <PageShell
      title="مصفوفة إسناد التدريس"
      subtitle="توزيع المهام التعليمية على الكادر الأكاديمي، وتحديد الكثافة الدراسية لكل معلم حسب الشعب والمواد."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالمعلم، المادة، أو الشعبة..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void assignmentsQuery.refetch()} disabled={assignmentsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${assignmentsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="معايير فرز الإسناد"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الموظف (المعلم)</label>
              <SelectField value={filterDraft.employee} onChange={(e) => setFilterDraft(p => ({ ...p, employee: e.target.value }))}>
                <option value="all">كافة المعلمين</option>
                {(employeesQuery.data ?? []).map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الشعبة الدراسية</label>
              <SelectField value={filterDraft.section} onChange={(e) => setFilterDraft(p => ({ ...p, section: e.target.value }))}>
                <option value="all">كافة الشعب</option>
                {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل السجلات</option>
                <option value="active">الإسناد النشط</option>
                <option value="inactive">الإسناد المؤرشف</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Briefcase className="h-5 w-5 text-primary" />
                سجل التكاليف الأكاديمية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {assignmentsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ استرجاع بيانات الإسناد...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-secondary/5 border border-secondary/10 group-hover:bg-secondary/10 transition-colors shadow-sm">
                         <UserCheck className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.employee.fullName}</p>
                          {item.isPrimary && (
                            <Badge variant="default" className="h-5 text-[8px] font-black uppercase bg-amber-500 hover:bg-amber-600 border-none">Primary Teacher</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <BookOpen className="h-3.5 w-3.5" /> <span>{item.subject.name}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Layout className="h-3.5 w-3.5" /> <span>{item.section.name} ({item.section.code})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Authorized" : "Suspended"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 text-emerald-600 bg-emerald-50">
                          <Clock className="h-2.5 w-2.5 mr-1 inline" /> {item.weeklyPeriods} periods
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate}>
                          <PencilLine className="h-3.5 w-3.5" /> تعديل
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <GraduationCap className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">المرحلة والصف</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">{item.section.gradeLevel.name}</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <Calendar className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الدورة الأكاديمية</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">{item.academicYear.name} ({item.academicYear.code})</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <Layers className="h-4 w-4 text-amber-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">حساب المستخدم</span>
                           <span className="text-[10px] font-bold truncate tracking-tight">
                              {item.employee.userAccount ? "مرتبط بحساب" : "بدون حساب دخول"}
                           </span>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {!assignmentsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد تكاليف تدريس مسجلة حالياً.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نظام التوزيع: مصفوفة الكادر الأكاديمي</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إسناد جديد" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحديث بيانات التكليف" : "إصدار قرار إسناد تدريس"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> الطرف الأول: المعلم</h4>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">اختيار الموظف *</label>
              <SelectField value={form.employeeId} onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                <option value="">اختر الموظف</option>
                {(employeesQuery.data ?? []).map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.jobNumber || "N/A"})</option>)}
              </SelectField>
              {form.employeeId && !(employeesQuery.data ?? []).find(e => e.id === form.employeeId)?.userAccount && (
                <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-600 flex items-center gap-2">
                   <Settings2 className="h-3 w-3" /> هذا الموظف ليس لديه حساب دخول للنظام حالياً.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Layout className="h-3.5 w-3.5" /> الطرف الثاني: الشعبة والمادة</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">السنة الأكاديمية *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value }))}>
                  <option value="">اختر السنة</option>
                  {(academicYearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name} ({y.code})</option>)}
                </SelectField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الشعبة *</label>
                  <SelectField value={form.sectionId} onChange={(e) => setForm(p => ({ ...p, sectionId: e.target.value }))}>
                    <option value="">اختر الشعبة</option>
                    {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">المادة *</label>
                  <SelectField value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))}>
                    <option value="">اختر المادة</option>
                    {(subjectsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </SelectField>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> تفاصيل التكليف</h4>
            <div className="grid gap-4 sm:grid-cols-2">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">نصاب الحصص الأسبوعي *</label>
                  <Input type="number" min={1} max={60} value={form.weeklyPeriods} onChange={(e) => setForm(p => ({ ...p, weeklyPeriods: e.target.value }))} placeholder="1" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">دور المعلم</label>
                  <label className="flex h-10 items-center justify-between px-3 rounded-lg border border-border/30 bg-background/50 cursor-pointer">
                    <span className="text-[10px] font-bold uppercase">معلم أساسي للمادة</span>
                    <input type="checkbox" className="h-4 w-4 rounded text-primary" checked={form.isPrimary} onChange={(e) => setForm(p => ({ ...p, isPrimary: e.target.checked }))} />
                  </label>
               </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-3">
             <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> الحالة التشغيلية</h4>
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">إسناد نشط (Effective)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل ظهور المادة في سجلات هذا المعلم</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-primary" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
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
