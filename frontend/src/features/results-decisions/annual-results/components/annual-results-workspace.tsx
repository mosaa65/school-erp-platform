"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  Calculator,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Lock,
  LockOpen,
  Medal,
  GraduationCap,
  Trophy,
  History,
  CheckCircle2,
  Activity,
  ChevronDown,
  ChevronUp,
  Layout,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagementToolbar } from "@/components/ui/management-toolbar";
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
import { PageShell } from "@/components/ui/page-shell";
import { StudentEnrollmentPickerSheet } from "@/components/ui/student-enrollment-picker-sheet";
import { useRbac } from "@/features/auth/hooks/use-rbac";
import { useAcademicYearOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-academic-year-options-query";
import { useSectionOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-section-options-query";
import { useStudentEnrollmentOptionsQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-student-enrollment-options-query";
import { useAnnualGradesQuery } from "@/features/grade-aggregation/annual-grades/hooks/use-annual-grades-query";
import {
  useCalculateAnnualResultsMutation,
  useCreateAnnualResultMutation,
  useDeleteAnnualResultMutation,
  useLockAnnualResultMutation,
  useUnlockAnnualResultMutation,
  useUpdateAnnualResultMutation,
} from "@/features/results-decisions/annual-results/hooks/use-annual-results-mutations";
import { useAnnualResultsQuery } from "@/features/results-decisions/annual-results/hooks/use-annual-results-query";
import { useAcademicTermOptionsQuery } from "@/features/results-decisions/annual-results/hooks/use-academic-term-options-query";
import { usePromotionDecisionOptionsQuery } from "@/features/results-decisions/annual-results/hooks/use-promotion-decision-options-query";
import { translateGradingWorkflowStatus } from "@/lib/i18n/ar";
import type { AnnualGradeListItem, AnnualResultListItem, GradingWorkflowStatus } from "@/lib/api/client";
import { formatNameCodeLabel, formatSectionWithGradeLabel } from "@/lib/option-labels";
import { formatStudentEnrollmentPlacementLabel } from "@/lib/student-enrollment-display";
import { toStudentEnrollmentPickerOption } from "@/features/students/lib/student-enrollment-picker";

type FormState = {
  academicYearId: string;
  sectionId: string;
  studentEnrollmentId: string;
  totalAllSubjects: string;
  maxPossibleTotal: string;
  percentage: string;
  passedSubjectsCount: string;
  failedSubjectsCount: string;
  promotionDecisionId: string;
  status: GradingWorkflowStatus;
  notes: string;
  isActive: boolean;
};

const PAGE_SIZE = 12;
const DEFAULT_FORM: FormState = {
  academicYearId: "",
  sectionId: "",
  studentEnrollmentId: "",
  totalAllSubjects: "",
  maxPossibleTotal: "",
  percentage: "",
  passedSubjectsCount: "",
  failedSubjectsCount: "",
  promotionDecisionId: "",
  status: "DRAFT",
  notes: "",
  isActive: true,
};

function formatAnnualGradeTerms(item: AnnualGradeListItem): string {
  if (item.termTotals.length > 0) {
    const sorted = [...item.termTotals].sort((a, b) => a.academicTerm.sequence - b.academicTerm.sequence);
    return sorted.map((term) => `${term.academicTerm.name}: ${term.termTotal}`).join(" | ");
  }
  return `ف1: ${item.semester1Total} | ف2: ${item.semester2Total}`;
}

function toFormState(item: AnnualResultListItem): FormState {
  return {
    academicYearId: item.academicYearId,
    sectionId: item.studentEnrollment.sectionId,
    studentEnrollmentId: item.studentEnrollmentId,
    totalAllSubjects: String(item.totalAllSubjects),
    maxPossibleTotal: String(item.maxPossibleTotal),
    percentage: String(item.percentage),
    passedSubjectsCount: String(item.passedSubjectsCount),
    failedSubjectsCount: String(item.failedSubjectsCount),
    promotionDecisionId: item.promotionDecisionId,
    status: item.status,
    notes: item.notes ?? "",
    isActive: item.isActive,
  };
}

function AnnualResultSubjectsPanel({ studentEnrollmentId, academicYearId }: { studentEnrollmentId: string; academicYearId: string; }) {
  const annualGradesQuery = useAnnualGradesQuery({ page: 1, limit: 100, academicYearId, studentEnrollmentId });
  const rows = annualGradesQuery.data?.data ?? [];

  if (annualGradesQuery.isPending) return <div className="p-4 text-center text-[10px] font-bold text-muted-foreground italic">جارٍ تحميل كشف المواد...</div>;

  return (
    <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-primary" />
        <h5 className="text-xs font-black uppercase tracking-tight">تفاصيل المحصلة السنوية للمواد</h5>
      </div>
      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-background/40">
            <div className="space-y-1">
              <span className="text-[11px] font-bold block">{row.subject.name}</span>
              <span className="text-[9px] text-muted-foreground font-medium uppercase">{formatAnnualGradeTerms(row)}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[9px] font-black text-muted-foreground uppercase leading-none block">Total</span>
                <span className="text-sm font-black text-primary">{row.annualTotal}</span>
              </div>
              <Badge variant="outline" className={`h-5 text-[8px] font-black ${row.finalStatus.code === 'PASS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-destructive/5 text-destructive border-destructive/10'}`}>
                {row.finalStatus.name}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnnualResultsWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("annual-results.create");
  const canCalculate = hasPermission("annual-results.calculate");
  const canUpdate = hasPermission("annual-results.update");
  const canLock = hasPermission("annual-results.lock");
  const canUnlock = hasPermission("annual-results.unlock");
  const canDelete = hasPermission("annual-results.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [yearFilter, setYearFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [filterDraft, setFilterDraft] = React.useState({ year: "all", section: "all" });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [calcYear, setCalcYear] = React.useState("");
  const [calcSection, setCalcSection] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [calcInfo, setCalcInfo] = React.useState<string | null>(null);

  const academicYearsQuery = useAcademicYearOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const decisionsQuery = usePromotionDecisionOptionsQuery();
  const enrollmentsQuery = useStudentEnrollmentOptionsQuery({ academicYearId: form.academicYearId || undefined, sectionId: form.sectionId || undefined });
  
  const annualResultsQuery = useAnnualResultsQuery({
    page, limit: PAGE_SIZE, search,
    academicYearId: yearFilter === "all" ? undefined : yearFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
  });

  const createMutation = useCreateAnnualResultMutation();
  const calculateMutation = useCalculateAnnualResultsMutation();
  const updateMutation = useUpdateAnnualResultMutation();
  const lockMutation = useLockAnnualResultMutation();
  const unlockMutation = useUnlockAnnualResultMutation();
  const deleteMutation = useDeleteAnnualResultMutation();

  const records = React.useMemo(() => annualResultsQuery.data?.data ?? [], [annualResultsQuery.data?.data]);
  const pagination = annualResultsQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ year: yearFilter, section: sectionFilter });
  }, [isFilterOpen, sectionFilter, yearFilter]);

  const resetFormState = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartCreate = () => {
    if (!canCreate) return;
    setForm(DEFAULT_FORM);
    setIsFormOpen(true);
  };

  const handleStartEdit = (item: AnnualResultListItem) => {
    if (!canUpdate || item.isLocked) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const applyFilters = () => {
    setPage(1);
    setYearFilter(filterDraft.year);
    setSectionFilter(filterDraft.section);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setYearFilter("all");
    setSectionFilter("all");
    setFilterDraft({ year: "all", section: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [searchInput.trim() ? 1 : 0, yearFilter !== "all" ? 1 : 0, sectionFilter !== "all" ? 1 : 0].reduce((acc, v) => acc + v, 0);
  }, [searchInput, sectionFilter, yearFilter]);

  return (
    <PageShell
      title="النتائج السنوية النهائية"
      subtitle="اعتماد وإصدار النتائج النهائية للطلاب بناءً على المحصلة السنوية، متضمنة قرارات الترفيع والرسوب والترتيب المسلكي."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث باسم الطالب..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void annualResultsQuery.refetch()} disabled={annualResultsQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${annualResultsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="تخصيص العرض"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">السنة الدراسية</label>
              <SelectField value={filterDraft.year} onChange={(e) => setFilterDraft(p => ({ ...p, year: e.target.value }))}>
                <option value="all">كل السنوات</option>
                {(academicYearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{formatNameCodeLabel(y.name, y.code)}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الشعبة</label>
              <SelectField value={filterDraft.section} onChange={(e) => setFilterDraft(p => ({ ...p, section: e.target.value }))}>
                <option value="all">كل الشعب</option>
                {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        {/* Action Panel: Auto Calculation */}
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="py-4 border-b border-primary/10">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> معالجة آلية للنتائج
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField value={calcYear} onChange={(e) => setCalcYear(e.target.value)}>
                <option value="">اختر السنة للأتمتة</option>
                {(academicYearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{formatNameCodeLabel(y.name, y.code)}</option>)}
              </SelectField>
              <SelectField value={calcSection} onChange={(e) => setCalcSection(e.target.value)}>
                <option value="">اختر الشعبة للأتمتة</option>
                {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{formatSectionWithGradeLabel(s)}</option>)}
              </SelectField>
            </div>
            <Button
              className="w-full h-10 font-bold gap-2"
              disabled={!canCalculate || calculateMutation.isPending || !calcYear || !calcSection}
              onClick={() => calculateMutation.mutate({ academicYearId: calcYear, sectionId: calcSection }, { onSuccess: (r) => setCalcInfo(r.message) })}
            >
              {calculateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              أرشفة واحتساب النتائج السنوية
            </Button>
            {calcInfo && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">{calcInfo}</div>}
          </CardContent>
        </Card>

        {/* Results Stream */}
        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/60 py-5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" /> كشوف النتائج المعتمدة
              </CardTitle>
              <Badge variant="secondary" className="h-5 px-3 rounded-full text-[10px]">نطاق البحث: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/5 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1 min-w-[300px]">
                      <div className="flex flex-col items-center justify-center p-3 h-14 w-14 rounded-2xl bg-background border border-border/60 group-hover:border-primary/30 transition-all shadow-sm">
                        <span className="text-[10px] font-black text-muted-foreground uppercase leading-none">Rank</span>
                        <span className="text-xl font-black text-primary leading-none mt-1">{item.rankInClass || "-"}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[15px]">{item.studentEnrollment.student.fullName}</p>
                          <Badge variant="outline" className="h-4 text-[8px] font-black uppercase border-emerald-500/20 text-emerald-700 bg-emerald-50/30">
                            {formatNameCodeLabel(item.promotionDecision.name, item.promotionDecision.code)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Layout className="h-3.5 w-3.5" /> <span>{item.studentEnrollment.section.name}</span>
                          <span className="mx-1 opacity-30">•</span>
                          <GraduationCap className="h-3.5 w-3.5" /> <span>{item.academicYear.code}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-right">
                      <div className="px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                        <span className="text-[9px] font-black text-primary/60 uppercase leading-none block">Percentage</span>
                        <span className="text-sm font-black text-primary leading-none">{item.percentage}%</span>
                      </div>
                      <div className="px-3 py-1 bg-muted/20 rounded-lg border border-border/40">
                        <span className="text-[9px] font-black text-muted-foreground uppercase leading-none block">Total</span>
                        <span className="text-sm font-black text-foreground leading-none">{item.totalAllSubjects}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="h-5 text-[8px] font-black uppercase">{translateGradingWorkflowStatus(item.status)}</Badge>
                      {item.isLocked ? <Badge className="h-5 text-[8px] font-black bg-stone-700 uppercase"><Lock className="h-2.5 w-2.5 mr-1" /> Locked</Badge> : <Badge variant="secondary" className="h-5 text-[8px] font-black uppercase text-amber-700 bg-amber-50 border-amber-200"><LockOpen className="h-2.5 w-2.5 mr-1" /> Open</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="outline" size="sm" className="h-8 rounded-lg px-2 text-[11px] font-bold gap-1.5" onClick={() => setExpandedId(prev => prev === item.id ? null : item.id)}>
                        {expandedId === item.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {expandedId === item.id ? "طي الكشف" : "عرض المواد"}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11px] font-bold gap-1.5" onClick={() => handleStartEdit(item)} disabled={!canUpdate || item.isLocked}>
                        <PencilLine className="h-3.5 w-3.5" /> تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-lg px-2"
                        onClick={() => item.isLocked ? unlockMutation.mutate(item.id) : lockMutation.mutate(item.id)}
                        disabled={(item.isLocked && !canUnlock) || (!item.isLocked && !canLock)}
                      >
                        {item.isLocked ? <LockOpen className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {expandedId === item.id && <AnnualResultSubjectsPanel studentEnrollmentId={item.studentEnrollmentId} academicYearId={item.academicYearId} />}
                </div>
              ))}
            </div>

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نمط العرض: كشوفات سنوية مجمعة</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة نتيجة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير النتيجة السنوية" : "رصد نتيجة سنوية جديدة"}
        isSubmitting={isSubmitting}
        onSubmit={(e) => {
           e?.preventDefault();
           if (!form.academicYearId || !form.studentEnrollmentId || !form.promotionDecisionId) {
             setFormError("الحقول الأساسية مطلوبة.");
             return;
           }
           const payload = {
             totalAllSubjects: Number(form.totalAllSubjects),
             maxPossibleTotal: Number(form.maxPossibleTotal),
             percentage: Number(form.percentage),
             passedSubjectsCount: Number(form.passedSubjectsCount),
             failedSubjectsCount: Number(form.failedSubjectsCount),
             promotionDecisionId: form.promotionDecisionId,
             status: form.status,
             notes: form.notes || undefined,
             isActive: form.isActive,
           };
           if (isEditing && editingId) {
             updateMutation.mutate({ annualResultId: editingId, payload }, { onSuccess: resetFormState });
           } else {
             createMutation.mutate({ ...payload, academicYearId: form.academicYearId, studentEnrollmentId: form.studentEnrollmentId }, { onSuccess: resetFormState });
           }
        }}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Search className="h-3.5 w-3.5" /> تحديد الطالب</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">السنة الأكاديمية *</label>
                <SelectField value={form.academicYearId} onChange={(e) => setForm(p => ({ ...p, academicYearId: e.target.value, studentEnrollmentId: "" }))} disabled={isEditing}>
                  <option value="">اختر السنة</option>
                  {(academicYearsQuery.data ?? []).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الطالب المستهدف *</label>
                <StudentEnrollmentPickerSheet
                  value={form.studentEnrollmentId}
                  selectedOption={form.studentEnrollmentId ? toStudentEnrollmentPickerOption((enrollmentsQuery.data ?? []).find(it => it.id === form.studentEnrollmentId)!) : null}
                  onSelect={(opt) => setForm(p => ({ ...p, studentEnrollmentId: opt?.id ?? "" }))}
                  academicYearId={form.academicYearId || undefined}
                  variant="form"
                  scope="annual-results"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> الاحصائيات والقرار</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">قرار الترفيع النهائي *</label>
                <SelectField value={form.promotionDecisionId} onChange={(e) => setForm(p => ({ ...p, promotionDecisionId: e.target.value }))}>
                  <option value="">اختر القرار</option>
                  {(decisionsQuery.data ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">الإجمالي الكلي</label>
                <Input type="number" value={form.totalAllSubjects} onChange={(e) => setForm(p => ({ ...p, totalAllSubjects: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">المجموع الأقصى</label>
                <Input type="number" value={form.maxPossibleTotal} onChange={(e) => setForm(p => ({ ...p, maxPossibleTotal: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">النسبة المئوية</label>
                <Input type="number" value={form.percentage} onChange={(e) => setForm(p => ({ ...p, percentage: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none">حالة الاعتماد</label>
                <SelectField value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value as any }))}>
                  <option value="DRAFT">مسودة</option>
                  <option value="IN_REVIEW">مراجعة</option>
                  <option value="APPROVED">معتمد</option>
                </SelectField>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase leading-none flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> سجل الملاحظات</label>
            <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="أدخل أية ملاحظات حول الحالة السنوية..." />
          </div>

          {formError && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-bold text-center">{formError}</div>}
        </div>
      </CrudFormSheet>
    </PageShell>
  );
}
