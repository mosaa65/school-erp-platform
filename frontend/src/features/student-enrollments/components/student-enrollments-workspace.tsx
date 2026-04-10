"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  GraduationCap,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Undo2,
  ArrowRightLeft,
  Users,
  Calendar,
  Layers,
  CheckCircle2,
  Activity,
  UserCheck,
  ClipboardList,
  Layout,
  Settings2,
  Clock,
  History,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
import { SelectField } from "@/components/ui/select-field";
import { CrudFormSheet } from "@/components/ui/crud-form-sheet";
import { StudentPickerSheet } from "@/components/ui/student-picker-sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { Fab } from "@/components/ui/fab";
import { PageShell } from "@/components/ui/page-shell";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useLookupEnrollmentStatusesQuery } from "@/features/lookup-enrollment-statuses/hooks/use-lookup-enrollment-statuses-query";
import { useGradeLevelOptionsQuery } from "@/features/student-enrollments/hooks/use-grade-level-options-query";
import {
  useCreateStudentEnrollmentMutation,
  useDeleteStudentEnrollmentMutation,
  useUpdateStudentEnrollmentMutation,
} from "@/features/student-enrollments/hooks/use-student-enrollments-mutations";
import { useStudentEnrollmentsQuery } from "@/features/student-enrollments/hooks/use-student-enrollments-query";
import { useAcademicYearOptionsQuery } from "@/features/student-enrollments/hooks/use-academic-year-options-query";
import { useSectionOptionsQuery } from "@/features/student-enrollments/hooks/use-section-options-query";
import type { StudentPickerOption } from "@/features/students/lib/student-picker";
import type {
  StudentEnrollmentDistributionStatus,
  StudentEnrollmentListItem,
  StudentEnrollmentStatus,
} from "@/lib/api/client";

type EnrollmentFormState = {
  studentId: string;
  academicYearId: string;
  gradeLevelId: string;
  sectionId: string;
  yearlyEnrollmentNo: string;
  distributionStatus: StudentEnrollmentDistributionStatus;
  enrollmentDate: string;
  status: StudentEnrollmentStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;

const ENROLLMENT_STATUS_LABELS: Record<StudentEnrollmentStatus, string> = {
  NEW: "مستجد (New)",
  TRANSFERRED: "منقول (Transferred)",
  ACTIVE: "منتظم (Active)",
  PROMOTED: "مُرَقّى (Promoted)",
  REPEATED: "إعادة (Repeated)",
  WITHDRAWN: "منسحب (Withdrawn)",
  GRADUATED: "متخرج (Graduated)",
  SUSPENDED: "موقوف (Suspended)",
};

const DISTRIBUTION_STATUS_OPTIONS: Array<{
  code: StudentEnrollmentDistributionStatus;
  nameAr: string;
}> = [
  { code: "PENDING_DISTRIBUTION", nameAr: "بانتظار التوزيع" },
  { code: "ASSIGNED", nameAr: "موزع نهائياً" },
  { code: "TRANSFERRED", nameAr: "تم النقل" },
];

const DEFAULT_FORM_STATE: EnrollmentFormState = {
  studentId: "",
  academicYearId: "",
  gradeLevelId: "",
  sectionId: "",
  yearlyEnrollmentNo: "",
  distributionStatus: "ASSIGNED",
  enrollmentDate: "",
  status: "ACTIVE",
  notes: "",
  isActive: true,
};

function toDateInput(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toDateIso(dateInput: string): string {
  return `${dateInput}T00:00:00.000Z`;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("ar-SA");
}

function toFormState(enrollment: StudentEnrollmentListItem): EnrollmentFormState {
  return {
    studentId: enrollment.studentId,
    academicYearId: enrollment.academicYearId,
    gradeLevelId: enrollment.gradeLevelId ?? enrollment.gradeLevel?.id ?? enrollment.section?.gradeLevel.id ?? "",
    sectionId: enrollment.sectionId ?? "",
    yearlyEnrollmentNo: enrollment.yearlyEnrollmentNo ?? "",
    distributionStatus: enrollment.distributionStatus ?? (enrollment.sectionId ? "ASSIGNED" : "PENDING_DISTRIBUTION"),
    enrollmentDate: toDateInput(enrollment.enrollmentDate),
    status: enrollment.status,
    notes: enrollment.notes ?? "",
    isActive: enrollment.isActive,
  };
}

function buildStudentPickerOption(enrollment: StudentEnrollmentListItem): StudentPickerOption {
  return {
    id: enrollment.studentId,
    title: enrollment.student.fullName,
    subtitle: enrollment.student.admissionNo ? `رقم قبول ${enrollment.student.admissionNo}` : "بدون رقم قبول",
    meta: [enrollment.gradeLevel?.name || enrollment.section?.gradeLevel.name, enrollment.section?.name, enrollment.academicYear.name].filter(Boolean).join(" | "),
  };
}

export function StudentEnrollmentsWorkspace() {
  const router = useRouter();
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("student-enrollments.create");
  const canUpdate = hasPermission("student-enrollments.update");
  const canDelete = hasPermission("student-enrollments.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [gradeLevelFilter, setGradeLevelFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StudentEnrollmentStatus | "all">("all");
  const [distFilter, setDistFilter] = React.useState<StudentEnrollmentDistributionStatus | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", grade: "all", section: "all", status: "all", dist: "all", active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<EnrollmentFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<StudentPickerOption | null>(null);

  const enrollmentsQuery = useStudentEnrollmentsQuery({
    page, limit: PAGE_SIZE, search,
    academicYearId: academicYearFilter === "all" ? undefined : academicYearFilter,
    gradeLevelId: gradeLevelFilter === "all" ? undefined : gradeLevelFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    distributionStatus: distFilter === "all" ? undefined : distFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const gradeLevelsQuery = useGradeLevelOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery({ gradeLevelId: filterDraft.grade === "all" ? undefined : filterDraft.grade });
  const formSectionsQuery = useSectionOptionsQuery({ gradeLevelId: form.gradeLevelId || undefined });

  const createMutation = useCreateStudentEnrollmentMutation();
  const updateMutation = useUpdateStudentEnrollmentMutation();
  const deleteMutation = useDeleteStudentEnrollmentMutation();

  const records = React.useMemo(() => enrollmentsQuery.data?.data ?? [], [enrollmentsQuery.data?.data]);
  const pagination = enrollmentsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: academicYearFilter, grade: gradeLevelFilter, section: sectionFilter, status: statusFilter, dist: distFilter, active: activeFilter });
  }, [academicYearFilter, activeFilter, distFilter, gradeLevelFilter, isFilterOpen, sectionFilter, statusFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM_STATE);
    setFormError(null);
    setSelectedStudent(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM_STATE);
    setSelectedStudent(null);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: StudentEnrollmentListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setSelectedStudent(buildStudentPickerOption(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.academicYearId || !form.gradeLevelId) {
      setFormError("الطالب، السنة الأكاديمية، والصف حقول إلزامية.");
      return;
    }

    const payload = {
      studentId: form.studentId,
      academicYearId: form.academicYearId,
      gradeLevelId: form.gradeLevelId,
      sectionId: form.sectionId || undefined,
      distributionStatus: form.distributionStatus,
      enrollmentDate: form.enrollmentDate ? toDateIso(form.enrollmentDate) : undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ enrollmentId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: StudentEnrollmentListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف قيد الطالب ${item.student.fullName}؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const handleQuickReturnToPending = (item: StudentEnrollmentListItem) => {
    if (!canUpdate || !window.confirm("إعادة القيد لوضع انتظار التوزيع؟ سيتم حذف ربط الشعبة الحالي.")) return;
    updateMutation.mutate({
      enrollmentId: item.id,
      payload: { sectionId: "", distributionStatus: "PENDING_DISTRIBUTION" }
    });
  };

  const applyFilters = () => {
    setPage(1);
    setAcademicYearFilter(filterDraft.year);
    setGradeLevelFilter(filterDraft.grade);
    setSectionFilter(filterDraft.section);
    setStatusFilter(filterDraft.status as any);
    setDistFilter(filterDraft.dist as any);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setAcademicYearFilter("all");
    setGradeLevelFilter("all");
    setSectionFilter("all");
    setStatusFilter("all");
    setDistFilter("all");
    setActiveFilter("all");
    setFilterDraft({ year: "all", grade: "all", section: "all", status: "all", dist: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, academicYearFilter !== "all" ? 1 : 0, gradeLevelFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0, statusFilter !== "all" ? 1 : 0, distFilter !== "all" ? 1 : 0, activeFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [academicYearFilter, activeFilter, distFilter, gradeLevelFilter, searchInput, sectionFilter, statusFilter]);

  return (
    <PageShell
      title="إدارة قيود الطلاب"
      subtitle="تتبع الحالة الأكاديمية للطلاب، توزيع الشعب، وعمليات الترفيع والنقل السنوي."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالطالب، الرقم السنوي، أو الصف..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void enrollmentsQuery.refetch()} disabled={enrollmentsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${enrollmentsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات الفلترة المتقدمة"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">السنة الأكاديمية</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {(academicYearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.code}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">المرحلة / الصف</label>
              <SelectField value={filterDraft.grade} onChange={(e) => setFilterDraft(p => ({ ...p, grade: e.target.value, section: "all" }))}>
                <option value="all">كل الصفوف</option>
                {(gradeLevelsQuery.data ?? []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الشعبة</label>
              <SelectField value={filterDraft.section} onChange={(e) => setFilterDraft(p => ({ ...p, section: e.target.value }))}>
                <option value="all">كل الشعب</option>
                {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name} - {s.gradeLevel.code}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">حالة القيد</label>
              <SelectField value={filterDraft.status} onChange={(e) => setFilterDraft(p => ({ ...p, status: e.target.value }))}>
                <option value="all">كل الحالات</option>
                {Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">التوزيع</label>
              <SelectField value={filterDraft.dist} onChange={(e) => setFilterDraft(p => ({ ...p, dist: e.target.value }))}>
                <option value="all">كل حالات التوزيع</option>
                {DISTRIBUTION_STATUS_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.nameAr}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <UserCheck className="h-5 w-5 text-primary" />
                سجل قيود الطلاب السنوية
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {enrollmentsQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ تحميل القيود...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-colors shadow-sm">
                        <GraduationCap className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.student.fullName}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-secondary-foreground border-border/70 bg-stone-50">
                             {item.academicYear.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Layers className="h-3.5 w-3.5" /> <span>{item.gradeLevel?.name || item.section?.gradeLevel.name}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <Layout className="h-3.5 w-3.5" /> <span>{item.section?.name || "بدون شعبة"}</span>
                          {item.yearlyEnrollmentNo && (
                            <>
                              <span className="mx-1 opacity-30">•</span>
                              <Badge variant="outline" className="h-4 text-[7px] border-primary/20 bg-primary/5 text-primary">ID: {item.yearlyEnrollmentNo}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}`}>
                          {item.isActive ? "Active Enrollment" : "Disabled"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 text-blue-600 bg-blue-50">
                          {ENROLLMENT_STATUS_LABELS[item.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.distributionStatus === "ASSIGNED" && (
                           <Button variant="outline" size="sm" className="h-8 rounded-lg px-2 text-stone-500" onClick={() => handleQuickReturnToPending(item)} title="إعادة للانتظار">
                              <Undo2 className="h-3.5 w-3.5" />
                           </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate}>
                          <PencilLine className="h-3.5 w-3.5" /> تعديل
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item)} disabled={!canDelete}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "تاريخ القيد", val: formatDate(item.enrollmentDate), icon: Calendar },
                      { label: "حالة التوزيع", val: DISTRIBUTION_STATUS_OPTIONS.find(o => o.code === item.distributionStatus)?.nameAr || "-", icon: ArrowRightLeft },
                      { label: "رقم الطالب", val: item.student.admissionNo || "غير محدد", icon: UserCheck },
                      { label: "ملاحظات", val: item.notes || "لا توجد", icon: ClipboardList },
                    ].map((stat, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <stat.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none">{stat.label}</span>
                          <span className="text-[10px] font-black mt-0.5 truncate">{stat.val}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {!enrollmentsQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد سجلات قيود تتوافق مع البحث.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط المعالجة: التحكم المركزي بالقيود</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة قيد" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير قيد الطالب" : "إنشاء قيد سنوي جديد"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> تحديد الطالب والوقت</h4>
            <div className="space-y-3">
              <StudentPickerSheet 
                scope="enrollment-form" 
                value={form.studentId} 
                selectedOption={selectedStudent}
                onSelect={(opt) => {
                  setForm(p => ({ ...p, studentId: opt?.id || "" }));
                  setSelectedStudent(opt);
                }}
                disabled={isEditing}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة الأكاديمية *</label>
                  <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value }))} disabled={isEditing}>
                    <option value="">اختر السنة</option>
                    {(academicYearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name} ({y.code})</option>)}
                  </SelectField>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none">تاريخ القيد</label>
                  <Input type="date" value={form.enrollmentDate} onChange={(e) => setForm(p => ({ ...p, enrollmentDate: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> الموضع الأكاديمي</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الصف الدراسي *</label>
                <SelectField value={form.gradeLevelId} onChange={(e) => setForm(p => ({ ...p, gradeLevelId: e.target.value, sectionId: "" }))}>
                  <option value="">اختر الصف</option>
                  {gradeLevelOptions.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الشعبة المخصصة</label>
                <SelectField value={form.sectionId} onChange={(e) => setForm(p => ({ ...p, sectionId: e.target.value }))}>
                  <option value="">بانتظار التوزيع</option>
                  {formSectionOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> الحالة والتصنيف</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">حالة القيد الأكاديمية *</label>
                <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                  {Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">وضعية التوزيع الحالي</label>
                <SelectField value={form.distributionStatus} onChange={(e) => setForm(p => ({ ...p, distributionStatus: e.target.value as any }))}>
                  {DISTRIBUTION_STATUS_OPTIONS.map(o => <option key={o.code} value={o.code}>{o.nameAr}</option>)}
                </SelectField>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> ملاحظات إضافية</label>
            <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="أدخل أية ملاحظات تتعلق بقيد الطالب..." />
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">القيد نشط (Active)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل القيد للاستفادة من كافة خدمات النظام الأكاديمية</p>
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
