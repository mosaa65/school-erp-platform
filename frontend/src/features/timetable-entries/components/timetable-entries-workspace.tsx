"use client";

import * as React from "react";
import { useDebounceEffect } from "@/hooks/use-debounce-effect";
import {
  CalendarClock,
  RefreshCw,
  Plus,
  PencilLine,
  Trash2,
  Calendar,
  Layout,
  Clock,
  MapPin,
  Settings2,
  BookOpen,
  GraduationCap,
  History,
  Grid3X3,
  FileText,
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

export function TimetableEntriesWorkspace() {
  const { hasPermission } = useRbac();
  const canCreate = hasPermission("timetable-entries.create");
  const canUpdate = hasPermission("timetable-entries.update");
  const canDelete = hasPermission("timetable-entries.delete");

  const [page, setPage] = React.useState(1);
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [termFilter, setTermFilter] = React.useState("all");
  const [sectionFilter, setSectionFilter] = React.useState("all");
  const [dayFilter, setDayFilter] = React.useState<TimetableDay | "all">("all");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [filterDraft, setFilterDraft] = React.useState({ term: "all", section: "all", day: "all" as any, active: "all" as any });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<TimetableEntryFormState>(DEFAULT_FORM_STATE);
  const [formError, setFormError] = React.useState<string | null>(null);

  const entriesQuery = useTimetableEntriesQuery({
    page, limit: PAGE_SIZE, search,
    academicTermId: termFilter === "all" ? undefined : termFilter,
    sectionId: sectionFilter === "all" ? undefined : sectionFilter,
    dayOfWeek: dayFilter === "all" ? undefined : dayFilter,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const termsQuery = useAcademicTermOptionsQuery();
  const sectionsQuery = useSectionOptionsQuery();
  const offeringsQuery = useTermSubjectOfferingOptionsQuery({
    academicTermId: form.academicTermId || undefined,
  });

  const createMutation = useCreateTimetableEntryMutation();
  const updateMutation = useUpdateTimetableEntryMutation();
  const deleteMutation = useDeleteTimetableEntryMutation();

  const records = React.useMemo(() => entriesQuery.data?.data ?? [], [entriesQuery.data?.data]);
  const pagination = entriesQuery.data?.pagination;
  const isEditing = editingId !== null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useDebounceEffect(() => {
    setPage(1);
    setSearch(searchInput.trim());
  }, 400, [searchInput]);

  React.useEffect(() => {
    if (!isFilterOpen) return;
    setFilterDraft({ term: termFilter, section: sectionFilter, day: dayFilter, active: activeFilter });
  }, [activeFilter, dayFilter, isFilterOpen, sectionFilter, termFilter]);

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

  const handleStartEdit = (item: TimetableEntryListItem) => {
    if (!canUpdate) return;
    setEditingId(item.id);
    setForm(toFormState(item));
    setIsFormOpen(true);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.academicTermId || !form.sectionId || !form.termSubjectOfferingId) {
      setFormError("كافة الاختيارات الأكاديمية (فصل، شعبة، مادة) مطلوبة.");
      return;
    }

    const payload = {
      academicTermId: form.academicTermId,
      sectionId: form.sectionId,
      termSubjectOfferingId: form.termSubjectOfferingId,
      dayOfWeek: form.dayOfWeek,
      periodIndex: Number(form.periodIndex) || 1,
      roomLabel: form.roomLabel.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    };

    if (isEditing && editingId) {
      updateMutation.mutate({ entryId: editingId, payload }, { onSuccess: resetFormState });
    } else {
      createMutation.mutate(payload, { onSuccess: resetFormState });
    }
  };

  const handleDelete = (item: TimetableEntryListItem) => {
    if (!canDelete || !window.confirm(`تأكيد حذف الحصة من الجدول؟`)) return;
    deleteMutation.mutate(item.id);
  };

  const applyFilters = () => {
    setPage(1);
    setTermFilter(filterDraft.term);
    setSectionFilter(filterDraft.section);
    setDayFilter(filterDraft.day);
    setActiveFilter(filterDraft.active);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setTermFilter("all");
    setSectionFilter("all");
    setDayFilter("all");
    setActiveFilter("all");
    setFilterDraft({ term: "all", section: "all", day: "all", active: "all" });
    setIsFilterOpen(false);
  };

  const activeFiltersCount = React.useMemo(() => {
    return [
      searchInput.trim() ? 1 : 0, termFilter !== "all" ? 1 : 0,
      sectionFilter !== "all" ? 1 : 0, dayFilter !== "all" ? 1 : 0,
      activeFilter !== "all" ? 1 : 0
    ].reduce((acc, v) => acc + v, 0);
  }, [activeFilter, dayFilter, searchInput, sectionFilter, termFilter]);

  return (
    <PageShell
      title="مخطط الجدول الدراسي"
      subtitle="إدارة الحصص اليومية، توزيع القاعات، وتنظيم السير الزمني للعملية التعليمية لكل شعبة."
    >
      <div className="space-y-4">
        <ManagementToolbar
          searchValue={searchInput}
          onSearchChange={(e) => setSearchInput(e.target.value)}
          searchPlaceholder="بحث بالمادة، القاعة، أو الملاحظات..."
          filterCount={activeFiltersCount}
          onFilterClick={() => setIsFilterOpen(true)}
          actions={
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void entriesQuery.refetch()} disabled={entriesQuery.isFetching}>
              <RefreshCw className={`h-4 w-4 ${entriesQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          }
        />

        <FilterDrawer
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          title="خيارات تصفية الجدول"
          actionButtons={
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" onClick={clearFilters} className="flex-1">مسح</Button>
              <Button type="button" onClick={applyFilters} className="flex-1">تطبيق</Button>
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الفصل الدراسي</label>
              <SelectField value={filterDraft.term} onChange={(e) => setFilterDraft(p => ({ ...p, term: e.target.value }))}>
                <option value="all">كل الفصول</option>
                {(termsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الشعبة</label>
              <SelectField value={filterDraft.section} onChange={(e) => setFilterDraft(p => ({ ...p, section: e.target.value }))}>
                <option value="all">كل الشعب</option>
                {(sectionsQuery.data ?? []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">اليوم</label>
              <SelectField value={filterDraft.day} onChange={(e) => setFilterDraft(p => ({ ...p, day: e.target.value as any }))}>
                <option value="all">كافة الأيام</option>
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{translateTimetableDay(d)}</option>)}
              </SelectField>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">الحالة</label>
              <SelectField value={filterDraft.active} onChange={(e) => setFilterDraft(p => ({ ...p, active: e.target.value as any }))}>
                <option value="all">كل السجلات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">غير نشط</option>
              </SelectField>
            </div>
          </div>
        </FilterDrawer>

        <Card className="border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="space-y-3 bg-muted/30 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <CalendarClock className="h-5 w-5 text-primary" />
                سجل الحصص المجدولة
              </CardTitle>
              <Badge variant="secondary" className="rounded-full px-3">الإجمالي: {pagination?.total ?? 0}</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {entriesQuery.isPending && (
              <div className="p-12 text-center text-sm text-muted-foreground font-medium animate-pulse">جارٍ عرض بيانات الجدول...</div>
            )}

            <div className="divide-y divide-border/40">
              {records.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      <div className="flex flex-col items-center justify-center h-12 w-12 rounded-2xl bg-secondary/5 border border-secondary/10 group-hover:bg-secondary/10 transition-colors shadow-sm relative">
                         <Grid3X3 className="h-6 w-6 text-primary/60" />
                         <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black border-2 border-background shadow-sm">
                            {item.periodIndex}
                         </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base">{item.termSubjectOffering.gradeLevelSubject.subject.name}</p>
                          <Badge variant="outline" className="h-5 text-[8px] font-black uppercase text-muted-foreground border-border/70">
                             {translateTimetableDay(item.dayOfWeek)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                          <Layout className="h-3.5 w-3.5" /> <span>{item.section.name} ({item.section.code})</span>
                          <span className="mx-1 opacity-30">•</span>
                          <MapPin className="h-3.5 w-3.5" /> <span>{item.roomLabel || "بدون قاعة"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={item.isActive ? "default" : "outline"} className={`h-5 text-[8px] font-black uppercase ${item.isActive ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                          {item.isActive ? "Scheduled" : "On-Hold"}
                        </Badge>
                        <Badge variant="outline" className="h-5 text-[8px] font-black uppercase border-border/70 text-blue-600 bg-blue-50">
                          <Clock className="h-2.5 w-2.5 mr-1 inline" /> Period {item.periodIndex}
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
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الصف الدراسي</span>
                           <span className="text-[10px] font-bold truncate leading-tight uppercase tracking-tighter">{item.section.gradeLevel.name}</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <Calendar className="h-4 w-4 text-emerald-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">الفصل الأكاديمي</span>
                           <span className="text-[10px] font-bold truncate leading-tight tracking-tight">{item.academicTerm.name} ({item.academicTerm.academicYear?.code ?? ""})</span>
                        </div>
                     </div>
                     <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-border/40 bg-background/50 group-hover:bg-background transition-colors">
                        <FileText className="h-4 w-4 text-amber-500/60 mt-0.5 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-[7px] uppercase font-bold text-muted-foreground leading-none mb-1">ملاحظات الحصة</span>
                           <span className="text-[10px] font-bold truncate leading-tight">
                              {item.notes || "لا يوجد ملاحظات إضافية"}
                           </span>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {!entriesQuery.isPending && records.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground opacity-50">لا توجد حصص مجدولة حالياً.</div>
            )}

            <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 bg-muted/10">
              <p className="text-[10px] text-muted-foreground font-bold italic tracking-wide">نظام التشغيل: الخطة الدراسية الموحدة</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={!pagination || pagination.page <= 1}>السابق</Button>
                <div className="text-[10px] font-bold px-2">Page {pagination?.page ?? 1} / {pagination?.totalPages ?? 1}</div>
                <Button variant="outline" size="sm" className="h-8 rounded-xl px-4 font-bold" onClick={() => setPage(p => (pagination ? Math.min(p + 1, pagination.totalPages || 1) : p))} disabled={!pagination || pagination.page >= pagination.totalPages}>التالي</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Fab icon={<Plus className="h-5 w-5" />} label="إضافة حصة" onClick={handleStartCreate} disabled={!canCreate} />

      <CrudFormSheet
        open={isFormOpen}
        onClose={resetFormState}
        title={isEditing ? "تحرير بيانات الحصة" : "إضافة حصة للجدول الدراسي"}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> السياق التعليمي</h4>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الفصل الأكاديمي *</label>
                <SelectField value={form.academicTermId} onChange={(e) => setForm(p => ({ ...p, academicTermId: e.target.value, sectionId: "", termSubjectOfferingId: "" }))}>
                  <option value="">اختر الفصل</option>
                  {(termsQuery.data ?? []).map(t => <option key={t.id} value={t.id}>{t.name} ({t.academicYear.code})</option>)}
                </SelectField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">عرض المادة *</label>
                    <SelectField value={form.termSubjectOfferingId} onChange={(e) => setForm(p => ({ ...p, termSubjectOfferingId: e.target.value, sectionId: "" }))} disabled={!form.academicTermId}>
                      <option value="">اختر المادة</option>
                      {(offeringsQuery.data ?? []).map(o => <option key={o.id} value={o.id}>{o.gradeLevelSubject.gradeLevel.code} - {o.gradeLevelSubject.subject.name}</option>)}
                    </SelectField>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">الشعبة *</label>
                    <SelectField value={form.sectionId} onChange={(e) => setForm(p => ({ ...p, sectionId: e.target.value }))} disabled={!form.termSubjectOfferingId}>
                      <option value="">اختر الشعبة</option>
                      {(sectionsQuery.data ?? []).filter(s => {
                         const offering = (offeringsQuery.data ?? []).find(o => o.id === form.termSubjectOfferingId);
                         return !offering || s.gradeLevelId === offering.gradeLevelSubject.gradeLevelId;
                      }).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </SelectField>
                 </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> البرمجة الزمنية</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">اليوم *</label>
                <SelectField value={form.dayOfWeek} onChange={(e) => setForm(p => ({ ...p, dayOfWeek: e.target.value as any }))}>
                  {DAY_OPTIONS.map(d => <option key={d} value={d}>{translateTimetableDay(d)}</option>)}
                </SelectField>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">رقم الحصة *</label>
                <Input type="number" min={1} max={20} value={form.periodIndex} onChange={(e) => setForm(p => ({ ...p, periodIndex: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> المكان والملاحظات</h4>
            <div className="grid gap-4">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">القاعة / المعمل (Room Label)</label>
                  <Input value={form.roomLabel} onChange={(e) => setForm(p => ({ ...p, roomLabel: e.target.value }))} placeholder="مثال: قاعة 101" />
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase leading-none px-1">ملاحظات إضافية</label>
                  <Input value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="تنبيهات خاصة بالحصّة..." />
               </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-3">
             <h4 className="text-xs font-bold uppercase text-primary border-b border-border/60 pb-2 flex items-center gap-1.5"><Settings2 className="h-3.5 w-3.5" /> حالة الحصة</h4>
            <label className="flex items-center justify-between cursor-pointer transition-colors group">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground group-hover:text-primary">مجدولة (Active Step)</span>
                <p className="text-[10px] text-muted-foreground">تفعيل ظهور الحصة في تقاويم الطلاب والمعلمين</p>
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
